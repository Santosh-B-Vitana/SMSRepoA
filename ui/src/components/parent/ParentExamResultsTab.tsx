/**
 * ParentExamResultsTab
 * Shows all published structured exam results for a single student.
 *
 * Algorithm:
 *  1. Fetch all published exam setups (status=published, up to 50)
 *  2. For each setup, call getStudentExamSetupResult(setupId, studentId)
 *     — skip setups where the student is not enrolled (404 = ignored)
 *  3. Render results as expandable cards, one per exam setup
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Trophy, ChevronDown, ChevronUp, Award, TrendingUp,
  CheckCircle2, XCircle, BookOpen, BarChart3, Download, Loader2, ChevronDown as CaretDown,
} from 'lucide-react';
import {
  getExamSetups, getStudentExamSetupResult,
  type ExamSetupBasicDto, type StudentExamResultSummaryDto,
} from '@/services/api/examSetupApi';
import { useSchool } from '@/contexts/SchoolContext';
import { generateProfessionalReportCard } from '@/utils/professionalPdfGenerator';
import { toast } from 'sonner';

// ─── Grade colour map ─────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-purple-700 bg-purple-50 border-purple-200',
  A:    'text-green-700  bg-green-50  border-green-200',
  'B+': 'text-blue-700   bg-blue-50   border-blue-200',
  B:    'text-cyan-700   bg-cyan-50   border-cyan-200',
  C:    'text-yellow-700 bg-yellow-50 border-yellow-200',
  D:    'text-orange-700 bg-orange-50 border-orange-200',
  E:    'text-pink-700   bg-pink-50   border-pink-200',
  F:    'text-red-700    bg-red-50    border-red-200',
};

function GradePill({ grade }: { grade?: string }) {
  if (!grade) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = GRADE_COLORS[grade] ?? 'text-gray-700 bg-gray-50 border-gray-200';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded border text-xs font-bold ${cls}`}>
      {grade}
    </span>
  );
}

// ─── Exam Result Card ─────────────────────────────────────────────────────────

interface ExamResultCardProps {
  setup: ExamSetupBasicDto;
  result: StudentExamResultSummaryDto;
  studentId: string;
  defaultExpanded?: boolean;
}

function ExamResultCard({ setup, result, studentId, defaultExpanded = false }: ExamResultCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [downloading, setDownloading] = useState(false);
  const { schoolInfo } = useSchool();

  const scoreColor =
    result.percentage >= 75 ? 'text-green-600' :
    result.percentage >= 50 ? 'text-blue-600'  :
    result.percentage >= 33 ? 'text-amber-600' : 'text-red-600';

  const coreSubjects = (result.subjects ?? []).filter(s => !s.isElective);
  const electiveSubjects = (result.subjects ?? []).filter(s => s.isElective);

  const handleDownload = (format: 'a4' | 'letter' = 'a4') => {
    if (!schoolInfo) { toast.error('School info not loaded yet'); return; }
    setDownloading(true);
    try {
      const schoolData = {
        name: schoolInfo.name,
        address: schoolInfo.address ?? '',
        phone: schoolInfo.phone ?? '',
        email: schoolInfo.email ?? '',
        principalName: schoolInfo.principalName,
        websiteUrl: schoolInfo.websiteUrl,
      };
      const reportData = {
        studentName: result.studentName,
        studentId: studentId,
        class: setup.className,
        section: setup.sectionName ?? '',
        academicYear: setup.academicYear,
        examName: setup.name,
        rollNo: result.rollNumber ?? '',
        subjects: (result.subjects ?? []).map(s => ({
          name: s.subjectName,
          marks: Number(s.obtainedMarks),
          maxMarks: Number(s.maxMarks),
          grade: s.grade ?? ''
        })),
        totalMarks: Number(result.totalObtained),
        totalMaxMarks: Number(result.totalMax),
        percentage: Number(result.percentage),
        overallGrade: result.overallGrade ?? '',
        rank: result.rank,
        remarks: result.isPass ? 'Pass' : 'Fail',
      };
      const doc = generateProfessionalReportCard(schoolData, reportData, format);
      doc.save(`ReportCard_${result.studentName.replace(/\s+/g, '_')}_${setup.name.replace(/\s+/g, '_')}.pdf`);
      toast.success(`Report card downloaded (${format.toUpperCase()})`);
    } catch (e) {
      toast.error('Failed to generate report card');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="overflow-hidden border hover:border-primary/30 transition-colors">
      {/* Summary row */}
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm">{setup.name}</h3>
              {setup.boardName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                  {setup.boardName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>{setup.academicYear}{setup.term ? ` · ${setup.term}` : ''}</span>
              <span>Class {setup.className}{setup.sectionName ? ` – ${setup.sectionName}` : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Report Card
                  <CaretDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('a4')}>
                  PDF (A4)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('letter')}>
                  PDF (Letter)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-right">
              <p className={`text-xl font-bold ${scoreColor}`}>{result.percentage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{Number(result.totalObtained)}/{Number(result.totalMax)}</p>
            </div>
            <GradePill grade={result.overallGrade} />
            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
              result.isPass
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {result.isPass ? 'Pass' : 'Fail'}
            </span>
            {result.rank && (
              <span className="text-xs text-muted-foreground">#{result.rank}</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={result.percentage} className="h-1.5 mt-3" />

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-6 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3 mr-1" />Hide subject details</>
          ) : (
            <><ChevronDown className="h-3 w-3 mr-1" />Show subject details ({(result.subjects ?? []).length})</>
          )}
        </Button>
      </CardContent>

      {/* Subject breakdown */}
      {expanded && (
        <div className="border-t bg-muted/20">
          {[{ label: 'Core Subjects', subjects: coreSubjects }, { label: 'Elective Subjects', subjects: electiveSubjects }]
            .filter(g => g.subjects.length > 0)
            .map(group => (
              <div key={group.label} className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {group.label}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs py-2">Subject</TableHead>
                      {group.subjects.some(s => s.theoryMarks !== undefined) && (
                        <TableHead className="text-xs py-2 text-right">Theory</TableHead>
                      )}
                      {group.subjects.some(s => s.practicalMarks !== undefined) && (
                        <TableHead className="text-xs py-2 text-right">Practical</TableHead>
                      )}
                      {group.subjects.some(s => s.internalMarks !== undefined) && (
                        <TableHead className="text-xs py-2 text-right">Internal</TableHead>
                      )}
                      <TableHead className="text-xs py-2 text-right">Total</TableHead>
                      <TableHead className="text-xs py-2 text-right">%</TableHead>
                      <TableHead className="text-xs py-2 text-center">Grade</TableHead>
                      <TableHead className="text-xs py-2 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.subjects.map((sub, si) => (
                      <TableRow key={`${sub.subjectName}-${si}`} className={sub.isAbsent ? 'opacity-60' : ''}>
                        <TableCell className="text-sm py-2 font-medium">
                          {sub.subjectName}
                          {sub.isAbsent && <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">Absent</span>}
                        </TableCell>
                        {group.subjects.some(s => s.theoryMarks !== undefined) && (
                          <TableCell className="text-sm py-2 text-right">{sub.theoryMarks ?? '—'}</TableCell>
                        )}
                        {group.subjects.some(s => s.practicalMarks !== undefined) && (
                          <TableCell className="text-sm py-2 text-right">{sub.practicalMarks ?? '—'}</TableCell>
                        )}
                        {group.subjects.some(s => s.internalMarks !== undefined) && (
                          <TableCell className="text-sm py-2 text-right">{sub.internalMarks ?? '—'}</TableCell>
                        )}
                        <TableCell className="text-sm py-2 text-right font-medium">
                          {Number(sub.obtainedMarks)}/{Number(sub.maxMarks)}
                        </TableCell>
                        <TableCell className="text-sm py-2 text-right">{sub.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-center py-2"><GradePill grade={sub.grade} /></TableCell>
                        <TableCell className="text-center py-2">
                          {sub.isAbsent ? (
                            <span className="text-xs text-amber-600">Absent</span>
                          ) : sub.isPass ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ParentExamResultsTabProps {
  studentId: string;
  /**
   * "latest"   — shows only the most recent result (prominent)
   * "previous" — shows all results except the latest (historical list)
   * "all"      — default: shows stats + latest + previous
   */
  mode?: "latest" | "previous" | "all";
}

interface ExamResultEntry {
  setup: ExamSetupBasicDto;
  result: StudentExamResultSummaryDto;
}

export function ParentExamResultsTab({ studentId, mode = "all" }: ParentExamResultsTabProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ExamResultEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get all published exam setups (up to 50, sorted newest first by backend)
      const page = await getExamSetups({ status: 'published', pageSize: 50, page: 1 });
      const setups = page.items ?? [];

      // Fan-out: for each setup, try to get this student's result
      const results = await Promise.allSettled(
        setups.map(async s => {
          const result = await getStudentExamSetupResult(s.id, studentId);
          return { setup: s, result };
        })
      );

      const found: ExamResultEntry[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') found.push(r.value);
        // 404/rejected = student not enrolled in that setup, skip silently
      }

      // Sort by most recent first (use startDate or name)
      found.sort((a, b) =>
        (b.setup.startDate ?? '').localeCompare(a.setup.startDate ?? '')
      );
      setEntries(found);
    } catch {
      // Non-critical — entries stays empty
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    // For "previous" mode inside academics tab, show a small inline note
    if (mode === "previous") {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No previous exam results yet. Once additional exams are completed, they'll appear here.
        </p>
      );
    }
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">No published exam results yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Results will appear here once the school publishes them.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = entries[0];
  const previous = entries.slice(1);
  const passed = entries.filter(e => e.result.isPass).length;
  const avgPct = entries.reduce((s, e) => s + e.result.percentage, 0) / entries.length;

  // ── "latest" mode: stats + the most recent exam only ──────────────────────
  if (mode === "latest") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Exams Taken</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{passed}/{entries.length}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{avgPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            Latest Result
          </p>
          <ExamResultCard setup={latest.setup} result={latest.result} studentId={studentId} defaultExpanded />
        </div>
      </div>
    );
  }

  // ── "previous" mode: historical list only (no latest) ─────────────────────
  if (mode === "previous") {
    if (previous.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No previous results yet — only one exam is recorded so far.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {previous.map(e => (
          <ExamResultCard key={e.setup.id} setup={e.setup} result={e.result} studentId={studentId} />
        ))}
      </div>
    );
  }

  // ── "all" mode (default) ───────────────────────────────────────────────────
  return (    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Exams Taken</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{passed}/{entries.length}</p>
            <p className="text-xs text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{avgPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest exam — shown prominently */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Latest Result
        </p>
        <ExamResultCard setup={latest.setup} result={latest.result} studentId={studentId} defaultExpanded />
      </div>

      {/* Previous exams — compact list */}
      {previous.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Previous Results
          </p>
          <div className="space-y-2">
            {previous.map(e => (
              <ExamResultCard key={e.setup.id} setup={e.setup} result={e.result} studentId={studentId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ParentExamResultsTab;
