/**
 * StaffExamMarksTab
 * Staff-facing panel that shows exam setups where the logged-in staff
 * has been assigned as the subject teacher, and lets them enter marks.
 *
 * Flow:
 *  1. Load "my assignments" via GET /examinations/exam-setup/my-assignments
 *  2. Each card shows: exam name, class, subject, date range, status
 *  3. Click "Enter Marks" → opens MarksEntryGrid for that subject
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  PenLine, BookOpen, Users, Calendar, Trophy, Loader2,
  Lock, CheckCircle2, Clock,
} from 'lucide-react';
import { MarksEntryGrid } from '@/components/examinations/MarksEntryGrid';
import {
  getMyExamAssignments, getExamSetupById,
  type ExamSetupBasicDto, type ExamSetupSubjectDto, type ExamSetupDetailDto,
} from '@/services/api/examSetupApi';
import { academicApi } from '@/services/api/academicApi';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:        { label: 'Draft',       color: 'text-gray-600 bg-gray-100 border-gray-200',     icon: <Clock className="h-3 w-3" /> },
  scheduled:    { label: 'Scheduled',   color: 'text-blue-600 bg-blue-50 border-blue-200',      icon: <Calendar className="h-3 w-3" /> },
  ongoing:      { label: 'Ongoing',     color: 'text-amber-600 bg-amber-50 border-amber-200',   icon: <PenLine className="h-3 w-3" /> },
  marks_entry:  { label: 'Marks Entry', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: <PenLine className="h-3 w-3" /> },
  finalized:    { label: 'Finalized',   color: 'text-green-600 bg-green-50 border-green-200',   icon: <CheckCircle2 className="h-3 w-3" /> },
  published:    { label: 'Published',   color: 'text-primary bg-primary/10 border-primary/20',  icon: <CheckCircle2 className="h-3 w-3" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffExamMarksTab() {
  const { toast } = useToast();

  const [filterYear, setFilterYear] = useState<string>('');
  const [years, setYears] = useState<string[]>([]);

  const [setups, setSetups] = useState<ExamSetupBasicDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [marksSetup, setMarksSetup] = useState<ExamSetupDetailDto | null>(null);
  const [marksSubject, setMarksSubject] = useState<ExamSetupSubjectDto | null>(null);
  const [marksOpen, setMarksOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Load academic years ─────────────────────────────────────────────────────

  useEffect(() => {
    academicApi.listAcademicYears(1, 50)
      .then(res => setYears((res.academicYears ?? []).map(a => a.name)))
      .catch(() => {});
  }, []);

  // ─── Load my assignments ─────────────────────────────────────────────────────

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyExamAssignments(filterYear || undefined);
      setSetups(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load your exam assignments.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // ─── Open marks entry ────────────────────────────────────────────────────────

  const openMarks = async (setupId: string) => {
    setLoadingDetail(true);
    setMarksOpen(true);
    try {
      const detail = await getExamSetupById(setupId);
      setMarksSetup(detail);
      setMarksSubject(detail.subjects[0] ?? null);
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam details.', variant: 'destructive' });
      setMarksOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filterYear} onValueChange={v => setFilterYear(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : setups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-muted-foreground">No exam assignments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have not been assigned as the subject teacher for any active exam setup.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {setups.map(setup => {
            const sc = STATUS_CFG[setup.status] ?? STATUS_CFG.draft;
            const isLocked = setup.status === 'finalized' || setup.status === 'published';
            const canEnter = !isLocked;

            return (
              <Card key={setup.id} className="hover:shadow-md transition-shadow border hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight truncate">{setup.name}</p>
                      {setup.boardName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{setup.boardName}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>Class {setup.className}{setup.sectionName ? ` – ${setup.sectionName}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span>{setup.subjectCount} subject{setup.subjectCount !== 1 ? 's' : ''} · {setup.marksEnteredCount} with marks</span>
                    </div>
                    {(setup.startDate || setup.endDate) && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{fmtDate(setup.startDate)} – {fmtDate(setup.endDate)}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={canEnter ? 'default' : 'outline'}
                    className="w-full h-7 text-xs"
                    onClick={() => openMarks(setup.id)}
                  >
                    {isLocked
                      ? <><Lock className="h-3 w-3 mr-1" />View Marks</>
                      : <><PenLine className="h-3 w-3 mr-1" />Enter Marks</>
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Marks Entry Dialog */}
      <Dialog open={marksOpen} onOpenChange={setMarksOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              {marksSetup?.name ?? 'Marks Entry'}
            </DialogTitle>
            {/* Subject selector tabs (staff may be assigned to multiple subjects) */}
            {marksSetup && marksSetup.subjects.length > 1 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {marksSetup.subjects.map(sub => (
                  <button
                    key={sub.id}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      marksSubject?.id === sub.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                    onClick={() => setMarksSubject(sub)}
                  >
                    {sub.subjectName}
                    {sub.status === 'locked' && <Lock className="h-2.5 w-2.5 ml-1 inline" />}
                  </button>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : marksSetup && marksSubject ? (
              <MarksEntryGrid
                examSetupId={marksSetup.id}
                examSetupSubjectId={marksSubject.id}
                readOnly={marksSubject.status === 'locked'}
                onSaved={loadAssignments}
              />
            ) : (
              <p className="text-center text-muted-foreground py-10">
                No subjects found for this exam setup.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StaffExamMarksTab;
