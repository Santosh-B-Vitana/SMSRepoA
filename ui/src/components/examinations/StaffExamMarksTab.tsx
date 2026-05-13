/**
 * StaffExamMarksTab
 *
 * Staff-facing marks entry for exam setups where the staff member
 * is assigned to one or more subjects.
 *
 * Flow:
 *  1. Load all exam setups assigned to this staff (my-assignments)
 *  2. Filter by classId so staff only sees exams for THIS class
 *  3. Select exam → load full detail → filter to staff's subjects only
 *  4. MarksEntryGrid per subject tab
 *  5. After all subjects saved → show status note (admin finalizes)
 */
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, CheckCircle2, PenLine, Info, RefreshCw, Loader2,
} from 'lucide-react';
import { MarksEntryGrid } from './MarksEntryGrid';
import {
  getExamSetups, getExamSetupById,
  type ExamSetupBasicDto, type ExamSetupDetailDto, type ExamSetupSubjectDto,
} from '@/services/api/examSetupApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'text-gray-600 bg-gray-100 border-gray-200' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-600 bg-blue-50 border-blue-200' },
  marks_entry: { label: 'Marks Entry', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  finalized:   { label: 'Finalized',   color: 'text-green-600 bg-green-50 border-green-200' },
  published:   { label: 'Published',   color: 'text-primary bg-primary/10 border-primary/20' },
};

// ─── Right panel: subjects + grid ─────────────────────────────────────────────

function ExamMarksPanel({
  examId,
  staffId,
  onMarksSaved,
}: {
  examId: string;
  staffId: string;
  onMarksSaved: () => void;
}) {
  const { toast } = useToast();
  const [setup, setSetup] = useState<ExamSetupDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getExamSetupById(examId);
      setSetup(d);
      // Default to first subject assigned to this staff
      const mySubjects = (d.subjects ?? []).filter(
        s => !s.assignedStaffId || s.assignedStaffId === staffId
      );
      if (!activeSubject && mySubjects.length) {
        setActiveSubject(mySubjects[0].id);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [examId, staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveSubject('');
    load();
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!setup) return null;

  // For published exams show all subjects (read-only results view);
  // for active exams only show subjects assigned to this staff.
  const mySubjects: ExamSetupSubjectDto[] = (setup.subjects ?? []).filter(
    (s) => setup.status === 'published' || !s.assignedStaffId || s.assignedStaffId === staffId
  );

  if (mySubjects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
        <Info className="h-8 w-8 opacity-30" />
        <p className="text-sm">No subjects are assigned to you for this exam.</p>
        <p className="text-xs">Contact your administrator to get assigned.</p>
      </div>
    );
  }

  const isPublished = setup.status === 'published';
  const lockedCount = mySubjects.filter(s => s.status === 'locked').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base">{setup.name}</h3>
          <p className="text-xs text-muted-foreground">
            {setup.className}{setup.sectionName ? ` · ${setup.sectionName}` : ''} · {setup.academicYear}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 ${STATUS_CFG[setup.status]?.color ?? ''}`}
        >
          {STATUS_CFG[setup.status]?.label ?? setup.status}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: mySubjects.length ? `${(lockedCount / mySubjects.length) * 100}%` : '0%' }}
          />
        </div>
        <span className="shrink-0">{lockedCount}/{mySubjects.length} subjects locked</span>
      </div>

      {isPublished ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Results have been published. Marks are now read-only.
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          Enter marks for each subject and save. Once done, your administrator will finalize and publish the results.
        </div>
      )}

      {/* Subject tabs */}
      <Tabs value={activeSubject} onValueChange={setActiveSubject}>
        <ScrollArea className="w-full pb-1">
          <TabsList className="inline-flex h-auto gap-1 flex-wrap">
            {mySubjects.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="text-xs py-1 px-2.5 gap-1">
                {s.status === 'locked'
                  ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  : <PenLine className="h-3 w-3 shrink-0" />}
                {s.subjectName}
                {s.isElective && (
                  <span className="text-amber-500 text-xs">(E)</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {mySubjects.map(s => (
          <TabsContent key={s.id} value={s.id} className="mt-3">
            <MarksEntryGrid
              examSetupId={setup.id}
              examSetupSubjectId={s.id}
              readOnly={s.status === 'locked' || isPublished}
              onSaved={() => {
                load();
                onMarksSaved();
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StaffExamMarksTabProps {
  staffId: string;
  classId: string;
  sectionId?: string;
  academicYear: string;
}

export function StaffExamMarksTab({
  staffId,
  classId,
  academicYear,
}: StaffExamMarksTabProps) {
  const { toast } = useToast();
  const [exams, setExams] = useState<ExamSetupBasicDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExamSetups({ classId, academicYear, pageSize: 100 });
      const filtered = res.items ?? [];
      setExams(filtered);
      if (!selectedId && filtered.length > 0) {
        // Prefer active marks-entry exam
        const priority =
          filtered.find(e => e.status === 'marks_entry') ??
          filtered.find(e => e.status === 'published') ??
          filtered[0];
        setSelectedId(priority.id);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load exam assignments.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadExams(); }, [loadExams]);

  if (loading) {
    return (
      <div className="flex gap-4 min-h-[400px]">
        <div className="w-60 shrink-0 space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No Exams Found</p>
        <p className="text-xs text-center max-w-xs">
          No exams have been set up for this class yet.
          Contact your administrator to create an exam.
        </p>
        <Button variant="outline" size="sm" onClick={loadExams}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left: exam list */}
      <div className="w-60 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Exams ({exams.length})
          </p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadExams}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <ScrollArea className="h-[540px]">
          <div className="space-y-1.5 pr-1">
            {exams.map(e => {
              const sc = STATUS_CFG[e.status] ?? STATUS_CFG.draft;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors text-sm ${
                    selectedId === e.id
                      ? 'bg-primary/5 border-primary/40 shadow-sm'
                      : 'hover:bg-muted/60 border-transparent'
                  }`}
                >
                  <div className="font-medium leading-tight truncate">{e.name}</div>
                  <div className="flex items-center justify-between mt-1 gap-1.5">
                    <span className="text-xs text-muted-foreground truncate">{e.examType}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 shrink-0 ${sc.color}`}
                    >
                      {sc.label}
                    </Badge>
                  </div>
                  {(e.startDate || e.endDate) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.startDate ? new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      {e.endDate ? ` – ${new Date(e.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.marksEnteredCount}/{e.subjectCount} subjects done
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right: marks panel */}
      <div className="flex-1 border rounded-xl p-4 overflow-auto">
        {selectedId ? (
          <ExamMarksPanel
            key={selectedId}
            examId={selectedId}
            staffId={staffId}
            onMarksSaved={loadExams}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select an exam from the list.
          </div>
        )}
      </div>
    </div>
  );
}
