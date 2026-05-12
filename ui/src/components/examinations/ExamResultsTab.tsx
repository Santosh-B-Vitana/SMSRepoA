/**
 * ExamResultsTab
 * Results management tab — marks entry + results view.
 *
 * Layout:
 *  - Left panel: list of exam setups, filtered by status
 *  - Right panel: for selected exam —
 *    - Subject selector tabs
 *    - MarksEntryGrid per subject
 *    - Finalize button (marks_entry status, all subjects locked)
 *    - Publish button (finalized)
 *    - Results table (published)
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  PenLine, CheckCircle2, Send, Loader2, BookOpen, Trophy,
  TrendingUp, Users, Award,
} from 'lucide-react';
import { MarksEntryGrid } from './MarksEntryGrid';
import {
  getExamSetups, getExamSetupById, finalizeExamSetup,
  publishExamSetupResults, getExamSetupResults,
  type ExamSetupBasicDto, type ExamSetupDetailDto,
  type StudentExamResultSummaryDto,
} from '@/services/api/examSetupApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'text-gray-600 bg-gray-100 border-gray-200' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-600 bg-blue-50 border-blue-200' },
  marks_entry: { label: 'Marks Entry', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  finalized:   { label: 'Finalized',   color: 'text-green-600 bg-green-50 border-green-200' },
  published:   { label: 'Published',   color: 'text-primary bg-primary/10 border-primary/20' },
};

// ─── Results View ─────────────────────────────────────────────────────────────

function ResultsView({ setupId }: { setupId: string }) {
  const { toast } = useToast();
  const [results, setResults] = useState<StudentExamResultSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getExamSetupResults(setupId)
      .then(r => setResults(r ?? []))
      .catch(() => toast({ title: 'Error', description: 'Failed to load results.', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [setupId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
        <Trophy className="h-8 w-8 opacity-30" />
        <p className="text-sm">No results published yet.</p>
      </div>
    );
  }

  // Summary stats
  const passed = results.filter(r => r.isPass).length;
  const avgPct = results.length ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1) : '0';
  const top = results.reduce((a, b) => b.percentage > a.percentage ? b : a, results[0]);

  return (
    <div className="space-y-4">
      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Students</p>
              <p className="text-xl font-bold">{results.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
              <p className="text-xl font-bold">{Math.round(passed / results.length * 100)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Award className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-xl font-bold">{avgPct}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {top && (
        <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          🏆 Topper: <span className="font-semibold text-amber-800">{top.studentName}</span> — {top.percentage.toFixed(1)}% ({top.overallGrade})
        </div>
      )}

      {/* Results table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Marks</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>CGPA</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results
              .slice()
              .sort((a, b) => b.percentage - a.percentage)
              .map((r, i) => (
                <TableRow key={r.studentId}>
                  <TableCell className="text-center font-medium text-muted-foreground text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.studentName}</div>
                    {r.rollNumber && <div className="text-xs text-muted-foreground">Roll: {r.rollNumber}</div>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.totalObtained} / {r.totalMax}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{r.percentage.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{r.overallGrade}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.cgpa.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${
                      r.isPass ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'
                    }`}>
                      {r.isPass ? 'Pass' : 'Fail'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function ExamPanel({ setupId, onRefreshList }: { setupId: string; onRefreshList: () => void }) {
  const { toast } = useToast();
  const [setup, setSetup] = useState<ExamSetupDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [finalizing, setFinalizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const loadSetup = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getExamSetupById(setupId);
      setSetup(d);
      if (!activeSubject && d.subjects?.length) {
        setActiveSubject(d.subjects[0].id);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [setupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveSubject('');
    loadSetup();
  }, [setupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await finalizeExamSetup(setup!.id);
      toast({ title: 'Finalized', description: 'Grades calculated successfully.' });
      await loadSetup();
      onRefreshList();
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message ?? 'Failed to finalize.', variant: 'destructive' });
    } finally {
      setFinalizing(false);
      setConfirmFinalize(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await publishExamSetupResults(setup!.id);
      toast({ title: 'Published!', description: res.message ?? `Results published. ${res.studentsNotified} students notified.` });
      await loadSetup();
      onRefreshList();
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message ?? 'Failed to publish.', variant: 'destructive' });
    } finally {
      setPublishing(false);
      setConfirmPublish(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!setup) return null;

  const subjects = setup.subjects ?? [];
  const allLocked = subjects.length > 0 && subjects.every(s => s.status === 'locked');
  const canFinalize = (setup.status === 'marks_entry' || setup.status === 'draft') && allLocked;
  const canPublish = setup.status === 'finalized';
  const isPublished = setup.status === 'published';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-base">{setup.name}</h2>
          <p className="text-xs text-muted-foreground">
            {setup.className}{setup.sectionName ? ` · ${setup.sectionName}` : ''} · {setup.academicYear}
            {setup.term ? ` · Term ${setup.term}` : ''}
          </p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_CFG[setup.status]?.color ?? ''}`}>
          {STATUS_CFG[setup.status]?.label ?? setup.status}
        </Badge>
      </div>

      {/* Actions */}
      {!isPublished && (
        <div className="flex gap-2 flex-wrap">
          {canFinalize && (
            <Button size="sm" className="gap-1" onClick={() => setConfirmFinalize(true)} disabled={finalizing}>
              {finalizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Calculate Grades
            </Button>
          )}
          {canPublish && (
            <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => setConfirmPublish(true)} disabled={publishing}>
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Publish Results
            </Button>
          )}
          {!canFinalize && !canPublish && setup.status !== 'draft' && (
            <p className="text-xs text-muted-foreground self-center">
              {subjects.length === 0 ? 'No subjects configured.' :
               `Enter marks for all subjects then calculate grades (${subjects.filter(s => s.status !== 'locked').length} subject${subjects.filter(s => s.status !== 'locked').length !== 1 ? 's' : ''} remaining).`}
            </p>
          )}
          {setup.status === 'draft' && !canFinalize && (
            <p className="text-xs text-muted-foreground self-center">
              Select a subject tab below to begin entering marks.
            </p>
          )}
        </div>
      )}

      {/* Published → show results */}
      {isPublished ? (
        <ResultsView setupId={setup.id} />
      ) : (
        /* Marks entry by subject */
        subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No subjects configured for this exam.</p>
        ) : (
          <Tabs value={activeSubject} onValueChange={setActiveSubject}>
            <ScrollArea className="w-full" style={{ maxWidth: '100%' }}>
              <TabsList className="flex gap-1 h-auto flex-wrap">
                {subjects.map(s => (
                  <TabsTrigger key={s.id} value={s.id} className="text-xs py-1 px-2 gap-1">
                    {s.status === 'locked'
                      ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                      : <PenLine className="h-3 w-3" />}
                    {s.subjectName}
                    {s.isElective && <span className="text-amber-500 text-xs">(E)</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            {subjects.map(s => (
              <TabsContent key={s.id} value={s.id} className="mt-3">
                <MarksEntryGrid
                  examSetupId={setup.id}
                  examSetupSubjectId={s.id}
                  readOnly={s.status === 'locked'}
                  onSaved={loadSetup}
                />
              </TabsContent>
            ))}
          </Tabs>
        )
      )}

      {/* Confirm dialogs */}
      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Calculate Grades?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock all marks and calculate grades for every student. Marks cannot be edited after finalization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Calculate Grades
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Results?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish results to parents and generate report cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={publishing} className="bg-green-600 hover:bg-green-700">
              {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExamResultsTabProps {
  initialSetupId?: string;
}

export function ExamResultsTab({ initialSetupId }: ExamResultsTabProps) {
  const [setups, setSetups] = useState<ExamSetupBasicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(initialSetupId ?? '');

  const loadSetups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExamSetups({ pageSize: 100 });
      const items = res.items ?? [];
      setSetups(items);
      if (!selectedId && items.length > 0) {
        // Prefer an exam with marks_entry or finalized status
        const priority = items.find(s => s.status === 'marks_entry' || s.status === 'finalized') ?? items[0];
        setSelectedId(priority.id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSetups(); }, [loadSetups]);

  useEffect(() => {
    if (initialSetupId) setSelectedId(initialSetupId);
  }, [initialSetupId]);

  if (loading) {
    return (
      <div className="grid grid-cols-[260px,1fr] gap-4">
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (setups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">No exam setups found. Create an exam first from the All Exams tab.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left: exam list */}
      <div className="w-64 shrink-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-1.5 pr-1">
            {setups.map(s => {
              const sc = STATUS_CFG[s.status] ?? STATUS_CFG.draft;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors text-sm ${
                    selectedId === s.id
                      ? 'bg-primary/5 border-primary/40 shadow-sm'
                      : 'hover:bg-muted/60 border-transparent'
                  }`}
                >
                  <div className="font-medium leading-tight truncate">{s.name}</div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-xs text-muted-foreground truncate">{s.className}{s.sectionName ? ` · ${s.sectionName}` : ''}</span>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 shrink-0 ${sc.color}`}>{sc.label}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.marksEnteredCount}/{s.subjectCount} locked</div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right: panel */}
      <div className="flex-1 border rounded-xl p-4 overflow-auto">
        {selectedId ? (
          <ExamPanel key={selectedId} setupId={selectedId} onRefreshList={loadSetups} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select an exam from the list.
          </div>
        )}
      </div>
    </div>
  );
}
