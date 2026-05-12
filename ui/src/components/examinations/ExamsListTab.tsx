/**
 * ExamsListTab
 * "All Exams" tab — powered by ExamSetup data.
 *
 * Features:
 *  - Filterable list of exam setups (year, class, status, search)
 *  - Card per exam: name, type badge, class/section, dates, status, subject count, lifecycle stepper
 *  - Timetable dialog: subject schedule table (date/time/venue/staff)
 *  - Reschedule dialog: update per-subject date/time/venue
 *  - Navigate to Results tab via onEnterMarks
 *  - Create exam via wizard (+ button)
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, RefreshCw, Calendar, Clock, MapPin, User,
  PenLine, Trash2, Loader2, CheckCircle2, ChevronRight,
  BookOpen, Eye, LayoutList,
} from 'lucide-react';
import { ExamCreationWizard } from './ExamCreationWizard';
import {
  getExamSetups, deleteExamSetup, updateExamSetup,
  type ExamSetupBasicDto, type ExamSetupDetailDto, type ExamSetupSubjectDto,
} from '@/services/api/examSetupApi';
import { getExamSetupById } from '@/services/api/examSetupApi';
import { academicApi } from '@/services/api/academicApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'text-gray-600 bg-gray-100 border-gray-200' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-600 bg-blue-50 border-blue-200' },
  marks_entry: { label: 'Marks Entry', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  finalized:   { label: 'Finalized',   color: 'text-green-600 bg-green-50 border-green-200' },
  published:   { label: 'Published',   color: 'text-primary bg-primary/10 border-primary/20' },
};

const LIFECYCLE_STEPS = ['Draft', 'Marks Entry', 'Finalized', 'Published'];
const STATUS_TO_STEP: Record<string, number> = {
  draft: 0, scheduled: 0, marks_entry: 1, finalized: 2, published: 3,
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(t?: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Timetable Dialog ─────────────────────────────────────────────────────────

function TimetableDialog({
  setup, onClose,
}: { setup: ExamSetupDetailDto | null; onClose: () => void }) {
  if (!setup) return null;
  const subjects = setup.subjects ?? [];

  return (
    <Dialog open={!!setup} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Exam Timetable — {setup.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{setup.className}{setup.sectionName ? ` · ${setup.sectionName}` : ''} · {setup.academicYear}</p>
        </DialogHeader>

        {subjects.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No subjects configured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.subjectName}</div>
                    {s.isElective && <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 mt-0.5">Elective</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(s.examDate)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.startTime ? `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{s.venue ?? '—'}</TableCell>
                  <TableCell className="text-sm">{s.assignedStaffName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${
                      s.status === 'locked' ? 'text-green-700 bg-green-50 border-green-200' :
                      s.status === 'marks_entry' ? 'text-purple-600 bg-purple-50 border-purple-200' :
                      'text-gray-500 bg-gray-50 border-gray-200'
                    }`}>{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Reschedule Dialog ────────────────────────────────────────────────────────

interface RescheduleState {
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
}

function RescheduleDialog({
  setup,
  onClose,
  onSaved,
}: { setup: ExamSetupDetailDto | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, RescheduleState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!setup) return;
    const init: Record<string, RescheduleState> = {};
    for (const s of setup.subjects ?? []) {
      init[s.id] = {
        examDate: s.examDate ?? '',
        startTime: s.startTime ?? '',
        endTime: s.endTime ?? '',
        venue: s.venue ?? '',
      };
    }
    setRows(init);
  }, [setup]);

  const updateRow = (id: string, field: keyof RescheduleState, val: string) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const handleSave = async () => {
    if (!setup) return;
    setSaving(true);
    try {
      const subjects = (setup.subjects ?? []).map(s => {
        const r = rows[s.id] ?? {};
        return {
          subjectId: s.subjectId,
          isElective: s.isElective,
          maxTheoryMarks: s.maxTheoryMarks,
          maxPracticalMarks: s.maxPracticalMarks,
          maxInternalMarks: s.maxInternalMarks,
          passingMarks: s.passingMarks,
          assignedStaffId: s.assignedStaffId ?? undefined,
          examDate: r.examDate || undefined,
          startTime: r.startTime || undefined,
          endTime: r.endTime || undefined,
          venue: r.venue || undefined,
          subjectOrder: s.subjectOrder,
        };
      });
      await updateExamSetup(setup.id, {
        examTypeId: setup.isCustomType ? undefined : undefined, // keep unchanged — only subjects updated
        isCustomType: setup.isCustomType,
        customTypeName: setup.customTypeName,
        classId: setup.classId,
        sectionId: setup.sectionId,
        boardConfigurationId: setup.boardConfigurationId,
        academicYear: setup.academicYear,
        term: setup.term,
        startDate: setup.startDate,
        endDate: setup.endDate,
        subjects,
      });
      toast({ title: 'Rescheduled', description: 'Exam timetable updated successfully.' });
      onSaved();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to reschedule exam.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!setup) return null;
  const subjects = setup.subjects ?? [];

  return (
    <Dialog open={!!setup} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Reschedule — {setup.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Update exam dates, times, and venues per subject.</p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {subjects.map(s => {
            const r = rows[s.id] ?? { examDate: '', startTime: '', endTime: '', venue: '' };
            return (
              <div key={s.id} className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">{s.subjectName}{s.isElective ? ' (Elective)' : ''}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <input
                      type="date"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={r.examDate}
                      onChange={e => updateRow(s.id, 'examDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Start Time</label>
                    <input
                      type="time"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={r.startTime}
                      onChange={e => updateRow(s.id, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">End Time</label>
                    <input
                      type="time"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={r.endTime}
                      onChange={e => updateRow(s.id, 'endTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Venue</label>
                    <input
                      type="text"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      placeholder="e.g. Hall A"
                      value={r.venue}
                      onChange={e => updateRow(s.id, 'venue', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Timetable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({
  setup, onEnterMarks, onViewTimetable, onReschedule, onDelete,
}: {
  setup: ExamSetupBasicDto;
  onEnterMarks: () => void;
  onViewTimetable: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const sc = STATUS_CFG[setup.status] ?? STATUS_CFG.draft;
  const currentStep = STATUS_TO_STEP[setup.status] ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{setup.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {setup.className}{setup.sectionName ? ` · ${setup.sectionName}` : ''} · {setup.academicYear}
            </p>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${sc.color}`}>{sc.label}</Badge>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />{setup.examType || 'Custom'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />{fmtDate(setup.startDate)}
            {setup.endDate && setup.endDate !== setup.startDate ? ` – ${fmtDate(setup.endDate)}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <LayoutList className="h-3 w-3" />{setup.subjectCount} subject{setup.subjectCount !== 1 ? 's' : ''}
          </span>
          {(setup.marksEnteredCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />{setup.marksEnteredCount}/{setup.subjectCount} marked
            </span>
          )}
        </div>

        {/* Lifecycle stepper */}
        <div className="flex items-center gap-1">
          {LIFECYCLE_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                i <= currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
              }`} />
              <span className={`text-xs ${i === currentStep ? 'text-primary font-medium' : 'text-muted-foreground/60'}`}>
                {step}
              </span>
              {i < LIFECYCLE_STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={onEnterMarks}>
            <PenLine className="h-3 w-3" /> Enter Marks
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onViewTimetable}>
            <Eye className="h-3 w-3" /> Timetable
          </Button>
          {setup.status !== 'published' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onReschedule}>
              <Clock className="h-3 w-3" /> Reschedule
            </Button>
          )}
          {setup.status !== 'published' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 ml-auto" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExamsListTabProps {
  onEnterMarks: (setupId: string) => void;
}

export function ExamsListTab({ onEnterMarks }: ExamsListTabProps) {
  const { toast } = useToast();

  const [setups, setSetups] = useState<ExamSetupBasicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [years, setYears] = useState<string[]>([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [timetableSetup, setTimetableSetup] = useState<ExamSetupDetailDto | null>(null);
  const [rescheduleSetup, setRescheduleSetup] = useState<ExamSetupDetailDto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load academic years for filter
  useEffect(() => {
    academicApi.listAcademicYears(1, 50)
      .then(res => setYears((res.academicYears ?? []).map(a => a.name)))
      .catch(() => {});
  }, []);

  const loadSetups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExamSetups({
        academicYear: filterYear || undefined,
        status: filterStatus || undefined,
        page,
        pageSize: 20,
      });
      setSetups(res.items ?? []);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam setups.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSetups(); }, [loadSetups]);

  const openTimetable = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getExamSetupById(id);
      setTimetableSetup(detail);
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam details.', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const openReschedule = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getExamSetupById(id);
      setRescheduleSetup(detail);
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam details.', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExamSetup(deleteId);
      toast({ title: 'Deleted', description: 'Exam setup deleted.' });
      setDeleteId(null);
      loadSetups();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete exam setup.', variant: 'destructive' });
    }
  };

  const filtered = setups.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.className.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search exams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterYear || '__all__'} onValueChange={v => { setFilterYear(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus || '__all__'} onValueChange={v => { setFilterStatus(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            {Object.entries(STATUS_CFG).map(([v, cfg]) => (
              <SelectItem key={v} value={v}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={loadSetups} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <Button onClick={() => setWizardOpen(true)} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" /> New Exam
        </Button>
      </div>

      {/* Grid */}
      {loading || loadingDetail ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">No exam setups found.</p>
          <Button onClick={() => setWizardOpen(true)} variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Create First Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(setup => (
            <ExamCard
              key={setup.id}
              setup={setup}
              onEnterMarks={() => onEnterMarks(setup.id)}
              onViewTimetable={() => openTimetable(setup.id)}
              onReschedule={() => openReschedule(setup.id)}
              onDelete={() => setDeleteId(setup.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm self-center text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Dialogs */}
      <ExamCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => loadSetups()}
      />

      <TimetableDialog
        setup={timetableSetup}
        onClose={() => setTimetableSetup(null)}
      />

      <RescheduleDialog
        setup={rescheduleSetup}
        onClose={() => setRescheduleSetup(null)}
        onSaved={loadSetups}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the exam setup and all associated marks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
