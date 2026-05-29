/**
 * ExamSetupManager
 * Admin panel tab for structured multi-subject exam setups.
 *
 * Features:
 *  - List of exam setups with status badges and action buttons
 *  - "New Exam Setup" button launches ExamCreationWizard
 *  - Marks Entry drawer: pick a subject → MarksEntryGrid
 *  - Finalize (calculate grades) and Publish (send to parents) buttons
 *  - Per-student results view after publishing
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
  Plus, PenLine, Trophy, Send, Eye, Trash2, Loader2,
  ChevronRight, CheckCircle2, Lock, BarChart3,
} from 'lucide-react';
import { ExamCreationWizard } from './ExamCreationWizard';
import { MarksEntryGrid } from './MarksEntryGrid';
import {
  getExamSetups, getExamSetupById, deleteExamSetup,
  finalizeExamSetup, publishExamSetupResults, getExamSetupResults,
  type ExamSetupBasicDto, type ExamSetupDetailDto,
  type ExamSetupSubjectDto, type StudentExamResultSummaryDto,
} from '@/services/api/examSetupApi';
import { academicApi } from '@/services/api/academicApi';
import { boardApi, type SchoolBoardConfigResponse } from '@/services/api/boardApi';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:        { label: 'Draft',        color: 'text-gray-600 bg-gray-100 border-gray-200' },
  scheduled:    { label: 'Scheduled',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ongoing:      { label: 'Ongoing',      color: 'text-amber-600 bg-amber-50 border-amber-200' },
  marks_entry:  { label: 'Marks Entry',  color: 'text-purple-600 bg-purple-50 border-purple-200' },
  finalized:    { label: 'Finalized',    color: 'text-green-600 bg-green-50 border-green-200' },
  published:    { label: 'Published',    color: 'text-primary bg-primary/10 border-primary/20' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ExamSetupManager() {
  const { toast } = useToast();

  // ─── Filters ────────────────────────────────────────────────────────────────

  const [filterYear, setFilterYear] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBoard, setFilterBoard] = useState<string>('');
  const [years, setYears] = useState<string[]>([]);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);

  // ─── List state ─────────────────────────────────────────────────────────────

  const [setups, setSetups] = useState<ExamSetupBasicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ─── Dialog state ───────────────────────────────────────────────────────────

  const [wizardOpen, setWizardOpen] = useState(false);

  // Marks entry
  const [marksSetup, setMarksSetup] = useState<ExamSetupDetailDto | null>(null);
  const [marksSubject, setMarksSubject] = useState<ExamSetupSubjectDto | null>(null);
  const [marksOpen, setMarksOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Results
  const [resultsSetupId, setResultsSetupId] = useState<string | null>(null);
  const [results, setResults] = useState<StudentExamResultSummaryDto[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Finalize / Publish
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'finalize' | 'publish' | null>(null);
  const [actioning, setActioning] = useState(false);

  // ─── Load list ───────────────────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExamSetups({
        academicYear: filterYear || undefined,
        boardConfigurationId: filterBoard || undefined,
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
  }, [filterYear, filterBoard, filterStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadList(); }, [loadList]);

  // Load academic years for filter
  useEffect(() => {
    academicApi.listAcademicYears(1, 50)
      .then(res => setYears((res.academicYears ?? []).map(a => a.name)))
      .catch(() => {});
    boardApi.getSchoolBoards()
      .then(res => setSchoolBoards(res.boards ?? []))
      .catch(() => {});
  }, []);

  // ─── Open marks entry ────────────────────────────────────────────────────────

  const openMarksEntry = async (setupId: string, subjectId?: string) => {
    setLoadingDetail(true);
    setMarksOpen(true);
    try {
      const detail = await getExamSetupById(setupId);
      setMarksSetup(detail);
      if (subjectId) {
        const sub = detail.subjects.find(s => s.id === subjectId) ?? detail.subjects[0] ?? null;
        setMarksSubject(sub);
      } else {
        setMarksSubject(detail.subjects[0] ?? null);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam setup details.', variant: 'destructive' });
      setMarksOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Open results ────────────────────────────────────────────────────────────

  const openResults = async (setupId: string) => {
    setResultsSetupId(setupId);
    setResultsOpen(true);
    setLoadingResults(true);
    try {
      const data = await getExamSetupResults(setupId);
      setResults(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load results.', variant: 'destructive' });
    } finally {
      setLoadingResults(false);
    }
  };

  // ─── Finalize grades ─────────────────────────────────────────────────────────

  const handleFinalize = async (id: string) => {
    setActioning(true);
    try {
      await finalizeExamSetup(id);
      toast({ title: 'Grades Calculated', description: 'Grades and totals have been finalized for all students.' });
      loadList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to finalize grades.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setActioning(false);
      setActionId(null);
      setActionType(null);
    }
  };

  // ─── Publish results ─────────────────────────────────────────────────────────

  const handlePublish = async (id: string) => {
    setActioning(true);
    try {
      const res = await publishExamSetupResults(id);
      toast({ title: 'Results Published', description: `${res.studentsNotified} guardians notified, ${res.reportCardsGenerated} report cards generated.` });
      loadList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to publish results.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setActioning(false);
      setActionId(null);
      setActionType(null);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteExamSetup(deleteId);
      toast({ title: 'Deleted', description: 'Exam setup deleted.' });
      loadList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Cannot delete this exam setup.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterYear} onValueChange={v => { setFilterYear(v === '_all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v === '_all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Statuses</SelectItem>
              {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {schoolBoards.length > 1 && (
            <Select value={filterBoard} onValueChange={v => { setFilterBoard(v === '_all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="All Boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Boards</SelectItem>
                {schoolBoards.map(b => <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>{b.boardName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button size="sm" onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Exam Setup
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : setups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-muted-foreground">No exam setups found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first structured exam setup to manage marks and publish results.
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Exam Setup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setups.map(setup => {
                  const sc = STATUS_CFG[setup.status] ?? STATUS_CFG.draft;
                  const canFinalize = setup.status === 'marks_entry' && setup.marksEnteredCount === setup.subjectCount;
                  const canPublish = setup.status === 'finalized';
                  const isPublished = setup.status === 'published';
                  return (
                    <TableRow key={setup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm leading-tight">{setup.name}</p>
                          {setup.boardName && (
                            <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">{setup.boardName}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {setup.className}{setup.sectionName ? ` – ${setup.sectionName}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">{setup.academicYear}</TableCell>
                      <TableCell>
                        <span className="text-sm">{setup.marksEnteredCount}/{setup.subjectCount}</span>
                        <span className="text-xs text-muted-foreground ml-1">marks</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sc.color}`}>
                          {sc.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Enter/view marks */}
                          {!isPublished && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openMarksEntry(setup.id)}>
                              <PenLine className="h-3 w-3 mr-1" />
                              {setup.status === 'draft' || setup.status === 'scheduled' ? 'Enter Marks' : 'Marks'}
                            </Button>
                          )}

                          {/* Finalize */}
                          {canFinalize && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => { setActionId(setup.id); setActionType('finalize'); }}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Finalize
                            </Button>
                          )}

                          {/* Publish */}
                          {canPublish && (
                            <Button size="sm" className="h-7 text-xs"
                              onClick={() => { setActionId(setup.id); setActionType('publish'); }}>
                              <Send className="h-3 w-3 mr-1" />Publish
                            </Button>
                          )}

                          {/* View results */}
                          {isPublished && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openResults(setup.id)}>
                              <BarChart3 className="h-3 w-3 mr-1" />Results
                            </Button>
                          )}

                          {/* Delete */}
                          {!isPublished && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(setup.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* ── Wizard ── */}
      <ExamCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => { loadList(); }}        boardConfigurationId={filterBoard || undefined}      />

      {/* ── Marks Entry Dialog ── */}
      <Dialog open={marksOpen} onOpenChange={setMarksOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              {marksSetup?.name ?? 'Marks Entry'}
            </DialogTitle>
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
                isAdmin={true}
                onSaved={loadList}
                onUnlocked={loadList}
              />
            ) : (
              <p className="text-center text-muted-foreground py-10">No subjects configured for this exam setup.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Results Dialog ── */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Student Results
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4">
            {loadingResults ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No results available.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Rank</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-medium text-sm">{r.rank ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.rollNumber ?? '—'}</TableCell>
                      <TableCell className="font-medium text-sm">{r.studentName}</TableCell>
                      <TableCell className="text-sm">{r.totalObtained} / {r.totalMax}</TableCell>
                      <TableCell className="text-sm">{r.percentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-xs">{r.overallGrade}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.cgpa.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                          r.isPass
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : 'text-red-700 bg-red-50 border-red-200'
                        }`}>
                          {r.isPass ? 'Pass' : 'Fail'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Finalize / Publish Confirmation ── */}
      <AlertDialog open={!!actionId && !!actionType} onOpenChange={open => { if (!open) { setActionId(null); setActionType(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'finalize' ? 'Finalize Grades?' : 'Publish Results to Parents?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'finalize'
                ? 'This will calculate grades, totals, and GPA for all students based on their marks. This action can be reviewed before publishing.'
                : 'This will generate report cards and send notifications to guardians. Students will be able to view their results in the parent portal.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actioning}
              onClick={() => {
                if (!actionId) return;
                if (actionType === 'finalize') handleFinalize(actionId);
                else if (actionType === 'publish') handlePublish(actionId);
              }}
            >
              {actioning
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : actionType === 'finalize'
                  ? <CheckCircle2 className="h-4 w-4 mr-2" />
                  : <Send className="h-4 w-4 mr-2" />
              }
              {actionType === 'finalize' ? 'Finalize' : 'Publish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the exam setup and all associated marks entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExamSetupManager;
