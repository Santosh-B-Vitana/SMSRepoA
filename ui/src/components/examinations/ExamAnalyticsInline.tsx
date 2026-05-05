import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  BarChart3, BookOpen, Users, Award, TrendingUp, User,
  Download, RefreshCw, Loader2, AlertCircle, Trophy, Search, GraduationCap,
} from "lucide-react";
import apiClient from "@/services/api/apiClient";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";

// ── Response unwrapper ────────────────────────────────────────
// Server: middleware wraps all OK responses → { success, statusCode, data: T, timestamp }
// ExaminationReports controller: returns ReportApiResponse<T> = { success, message, data: T, generatedAt }
// apiClient interceptor unwraps the outer envelope ONCE → so response.data = ReportApiResponse<T>
// Therefore: response.data.data = the actual typed report
async function fetchReport<T>(endpoint: string): Promise<T | null> {
  try {
    const resp = await apiClient.get<{ success: boolean; data: T }>(endpoint);
    return (resp.data as unknown as { data: T }).data ?? null;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────
interface ExamSummaryItem {
  examId: string;
  examName: string;
  examDate: string;
  passPercentage: number;
  failPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  totalStudents: number;
}
interface ResultSummaryReport {
  overallPassPercentage: number;
  overallAverageMarks: number;
  totalStudentsAppeared: number;
  totalStudentsPassed: number;
  totalStudentsFailed: number;
  gradeAPercentage: number;
  gradeBPercentage: number;
  gradeCPercentage: number;
  gradeDPercentage: number;
  gradeEPercentage: number;
  examSummaries: ExamSummaryItem[];
}
interface ExamPerformanceData {
  examName: string;
  examDate: string;
  totalMarks: number;
  passMarks: number;
  averageMarks: number;
  passPercentage: number;
}
interface StudentMarkDetail {
  studentId: string;
  studentName: string;
  rollNumber: string;
  className: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: string;
}
interface StudentMarksData {
  examName: string;
  examDate: string;
  totalStudents: number;
  studentMarks: StudentMarkDetail[];
}
interface ClassMetric {
  classId: string;
  className: string;
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  classAverage: number;
  passPercentage: number;
  highestMarks: number;
  lowestMarks: number;
  performerName: string;
  performerMarks: number;
}
interface ClassAnalysisData {
  classMetrics: ClassMetric[];
  academicYear: string;
  reportGeneratedDate: string;
}
interface GradeSlot {
  gradeSymbol: string;
  gradeRange: string;
  studentCount: number;
  percentage: number;
}
interface GradeDistributionData {
  examName: string;
  examDate: string;
  totalStudents: number;
  gradeDistributions: GradeSlot[];
}
interface SubjectMetric {
  subjectName: string;
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  passPercentage: number;
  topPerformer: string;
  topPerformerMarks: number;
}
interface SubjectPerformanceData {
  examName: string;
  examDate: string;
  subjectMetrics: SubjectMetric[];
}

// ── Shared micro components ────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 gap-3">
      <AlertCircle className="h-10 w-10 text-destructive/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
      </Button>
    </div>
  );
}
function EmptyState({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center py-12 gap-3">
      <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
function ExamSelector({
  exams, value, onChange,
}: { exams: ExamBasic[]; value: string; onChange: (id: string) => void }) {
  const options = exams.reduce<Array<{ id: string; label: string }>>((acc, e) => {
    if (!acc.find(x => x.id === e.id))
      acc.push({ id: e.id, label: `${e.name} — Class ${e.class}${e.section ? ` (${e.section})` : ""}` });
    return acc;
  }, []);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm max-w-md">
        <SelectValue placeholder="Select an exam…" />
      </SelectTrigger>
      <SelectContent>
        {options.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function gradeColor(g: string) {
  const u = (g || "").toUpperCase();
  if (u.startsWith("A")) return "text-emerald-700 bg-emerald-100";
  if (u.startsWith("B")) return "text-blue-700 bg-blue-100";
  if (u.startsWith("C")) return "text-yellow-700 bg-yellow-100";
  if (u === "D") return "text-orange-700 bg-orange-100";
  return "text-red-700 bg-red-100";
}
function downloadCSV(rows: (string | number)[][], filename: string) {
  const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── 1. Result Summary (Overview) ──────────────────────────────
function SummaryPanel() {
  const [report, setReport] = useState<ResultSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const d = await fetchReport<ResultSummaryReport>("/ExaminationReports/result-summary");
    if (d) setReport(d); else setError("Failed to load result summary");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const grades = report ? [
    { label: "A (90–100)", pct: report.gradeAPercentage, color: "bg-emerald-500" },
    { label: "B (80–89)", pct: report.gradeBPercentage, color: "bg-blue-500" },
    { label: "C (70–79)", pct: report.gradeCPercentage, color: "bg-yellow-400" },
    { label: "D (60–69)", pct: report.gradeDPercentage, color: "bg-orange-400" },
    { label: "E (< 60)", pct: report.gradeEPercentage, color: "bg-red-400" },
  ] : [];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <EmptyState />;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Appeared",  value: report.totalStudentsAppeared, cls: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Passed",    value: report.totalStudentsPassed,   cls: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Failed",    value: report.totalStudentsFailed,   cls: "text-red-600",     bg: "bg-red-50" },
          { label: "Pass Rate", value: `${(report.overallPassPercentage ?? 0).toFixed(1)}%`, cls: "text-violet-600", bg: "bg-violet-50" },
          { label: "Avg Marks", value: (report.overallAverageMarks ?? 0).toFixed(1), cls: "text-amber-600", bg: "bg-amber-50" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Grade distribution bar chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> CBSE Grade Distribution
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => downloadCSV([["Grade","Range","Pass%"], ...grades.map(g => [g.label, g.label, `${g.pct.toFixed(1)}%`])], "grade-summary.csv")}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {grades.map(g => (
              <div key={g.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{g.label}</span>
                  <span className="font-semibold">{g.pct.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${g.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, g.pct)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exam-wise summaries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4" /> Exam-wise Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!report.examSummaries?.length ? (
              <p className="text-sm text-muted-foreground p-4">No exam summary data yet</p>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {report.examSummaries.map((e, i) => (
                  <div key={e.examId || i} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{e.examName}</p>
                      <p className="text-xs text-muted-foreground">{e.totalStudents} students · avg {e.averageMarks?.toFixed(1)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`text-sm font-bold ${e.passPercentage >= 75 ? "text-emerald-600" : e.passPercentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {(e.passPercentage ?? 0).toFixed(0)}%
                      </span>
                      <p className="text-xs text-muted-foreground">pass</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── 2. Exam Performance Panel ──────────────────────────────────
function ExamPanel({ exams }: { exams: ExamBasic[] }) {
  const [examId, setExamId] = useState("");
  const [report, setReport] = useState<ExamPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null); setReport(null);
    const d = await fetchReport<ExamPerformanceData>(`/ExaminationReports/exam-performance/${id}`);
    if (d) setReport(d); else setError("Failed to load exam report");
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <ExamSelector exams={exams} value={examId} onChange={(v) => { setExamId(v); load(v); }} />
      </CardContent></Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => load(examId)} />}
      {!examId && !loading && <EmptyState message="Select an exam to view performance data" />}

      {report && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Marks", value: report.totalMarks,                        cls: "text-blue-600" },
              { label: "Pass Marks",  value: report.passMarks,                         cls: "text-amber-600" },
              { label: "Class Avg",   value: (report.averageMarks ?? 0).toFixed(1),    cls: "text-violet-600" },
              { label: "Pass Rate",   value: `${(report.passPercentage ?? 0).toFixed(1)}%`,
                cls: (report.passPercentage ?? 0) >= 75 ? "text-emerald-600" : (report.passPercentage ?? 0) >= 50 ? "text-amber-600" : "text-red-600" },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{report.examName}</CardTitle>
              {report.examDate && <p className="text-xs text-muted-foreground">{new Date(report.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Pass Rate", pct: report.passPercentage ?? 0 },
                { label: "Avg vs Total", pct: report.totalMarks ? ((report.averageMarks ?? 0) / report.totalMarks) * 100 : 0 },
              ].map(bar => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{bar.label}</span>
                    <span>{bar.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${bar.pct >= 75 ? "bg-emerald-500" : bar.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, bar.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── 3. Student Marks Panel ─────────────────────────────────────
function StudentPanel({ exams }: { exams: ExamBasic[] }) {
  const [examId, setExamId] = useState("");
  const [report, setReport] = useState<StudentMarksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null); setReport(null);
    const d = await fetchReport<StudentMarksData>(`/ExaminationReports/student-marks/${id}`);
    if (d) setReport(d); else setError("Failed to load student marks");
    setLoading(false);
  }, []);

  const students = (report?.studentMarks ?? [])
    .filter(s => !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || (s.rollNumber || "").includes(search))
    .sort((a, b) => b.percentage - a.percentage);

  const handleDownload = () => {
    downloadCSV(
      [["Rank", "Roll No.", "Student", "Class", "Marks", "%", "Grade", "Status"],
        ...students.map((s, i) => [i + 1, s.rollNumber || "—", s.studentName, s.className, `${s.marksObtained}/${s.totalMarks}`, `${s.percentage.toFixed(1)}%`, s.grade, s.status])],
      "student-marks.csv"
    );
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-3">
          <ExamSelector exams={exams} value={examId} onChange={(v) => { setExamId(v); load(v); setSearch(""); }} />
          {report && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8 h-9 text-sm w-52" placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </>
          )}
        </div>
      </CardContent></Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => load(examId)} />}
      {!examId && !loading && <EmptyState message="Select an exam to view student-wise marks" />}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total",    value: report.totalStudents },
              { label: "Passed",   value: students.filter(s => s.status?.toLowerCase() === "pass").length },
              { label: "Failed",   value: students.filter(s => s.status?.toLowerCase() !== "pass").length },
              { label: "Pass Rate",value: `${students.length ? (students.filter(s => s.status?.toLowerCase() === "pass").length / students.length * 100).toFixed(1) : 0}%` },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold mt-1">{k.value}</p>
              </CardContent></Card>
            ))}
          </div>

          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Rank</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Student</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Marks</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Progress</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Grade</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No students found</td></tr>
                  ) : students.map((s, i) => (
                    <tr key={s.studentId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i <= 2 ? "bg-gray-100 text-gray-700" : "bg-muted text-muted-foreground"}`}>
                          {i === 0 ? "🥇" : i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.studentName}</div>
                        <div className="text-xs text-muted-foreground">Roll {s.rollNumber || "—"} · {s.className}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{s.marksObtained}/{s.totalMarks}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.percentage >= 75 ? "bg-emerald-500" : s.percentage >= 33 ? "bg-blue-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, s.percentage)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{s.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColor(s.grade)}`}>{s.grade || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status?.toLowerCase() === "pass" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {s.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}

// ── 4. Class Analysis Panel ────────────────────────────────────
function ClassPanel() {
  const [report, setReport] = useState<ClassAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const d = await fetchReport<ClassAnalysisData>("/ExaminationReports/class-analysis");
    if (d) setReport(d); else setError("Failed to load class analysis");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = [...(report?.classMetrics ?? [])].sort((a, b) => b.classAverage - a.classAverage);
  const maxAvg = sorted[0]?.classAverage || 100;
  const totalStudents = sorted.reduce((s, c) => s + c.totalStudents, 0);
  const totalPassed = sorted.reduce((s, c) => s + c.passedStudents, 0);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Classes",         value: sorted.length },
          { label: "Total Students",  value: totalStudents },
          { label: "Overall Average", value: sorted.length ? (sorted.reduce((s, c) => s + c.classAverage, 0) / sorted.length).toFixed(1) : "—" },
          { label: "Overall Pass%",   value: `${totalStudents ? (totalPassed / totalStudents * 100).toFixed(1) : 0}%` },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Average Marks by Class</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => downloadCSV([["#","Class","Students","Pass%","Average","Highest","Lowest","Top Student"],
                  ...sorted.map((c, i) => [i+1, c.className, c.totalStudents, `${c.passPercentage.toFixed(1)}%`, c.classAverage.toFixed(1), c.highestMarks, c.lowestMarks, c.performerName])],
                  "class-analysis.csv")}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorted.map((c, i) => (
              <div key={c.classId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                    <span className="font-medium">{c.className}</span>
                  </div>
                  <span className="font-semibold">{c.classAverage.toFixed(1)}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-violet-500" : "bg-primary/60"}`}
                    style={{ width: `${maxAvg ? (c.classAverage / maxAvg) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Class-wise Detail</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {["#", "Class", "Students", "Pass%", "Avg", "Top Student"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((c, i) => (
                    <tr key={c.classId} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-semibold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{c.className}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{c.totalStudents}</td>
                      <td className={`px-3 py-2.5 font-semibold ${c.passPercentage === 100 ? "text-emerald-600" : c.passPercentage >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                        {c.passPercentage.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5">{c.classAverage.toFixed(1)}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{c.performerName || "—"}</div>
                        {c.performerMarks > 0 && <div className="text-muted-foreground">{c.performerMarks} marks</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── 5. Grade Distribution Panel ────────────────────────────────
function GradePanel({ exams }: { exams: ExamBasic[] }) {
  const [examId, setExamId] = useState("");
  const [report, setReport] = useState<GradeDistributionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null); setReport(null);
    const d = await fetchReport<GradeDistributionData>(`/ExaminationReports/grade-distribution/${id}`);
    if (d) setReport(d); else setError("Failed to load grade distribution");
    setLoading(false);
  }, []);

  const GRADE_BAR: Record<string, string> = { A: "bg-emerald-500", B: "bg-blue-500", C: "bg-yellow-400", D: "bg-orange-400", E: "bg-red-400" };
  const maxCount = Math.max(...(report?.gradeDistributions?.map(g => g.studentCount) || [1]), 1);

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <ExamSelector exams={exams} value={examId} onChange={(v) => { setExamId(v); load(v); }} />
      </CardContent></Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => load(examId)} />}
      {!examId && !loading && <EmptyState message="Select an exam to view grade distribution" />}

      {report && !loading && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{report.examName}</CardTitle>
              <p className="text-xs text-muted-foreground">{report.totalStudents} students</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(report.gradeDistributions || []).map(g => (
                <div key={g.gradeSymbol} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold px-2 py-0.5 rounded text-xs ${gradeColor(g.gradeSymbol)}`}>{g.gradeSymbol}</span>
                      <span className="text-muted-foreground">{g.gradeRange}</span>
                    </div>
                    <span className="font-semibold">{g.studentCount} ({g.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${GRADE_BAR[g.gradeSymbol] || "bg-gray-400"}`}
                      style={{ width: `${maxCount ? (g.studentCount / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Grade Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Grade</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Range</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Students</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(report.gradeDistributions || []).map(g => (
                    <tr key={g.gradeSymbol} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${gradeColor(g.gradeSymbol)}`}>{g.gradeSymbol}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{g.gradeRange}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{g.studentCount}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{g.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── 6. Subject Performance Panel ───────────────────────────────
function SubjectPanel({ exams }: { exams: ExamBasic[] }) {
  const [examId, setExamId] = useState("");
  const [report, setReport] = useState<SubjectPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"averageMarks" | "passPercentage">("averageMarks");

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null); setReport(null);
    const d = await fetchReport<SubjectPerformanceData>(`/ExaminationReports/subject-performance/${id}`);
    if (d) setReport(d); else setError("Failed to load subject performance");
    setLoading(false);
  }, []);

  const sorted = [...(report?.subjectMetrics ?? [])].sort((a, b) => b[sortKey] - a[sortKey]);
  const maxAvg = sorted[0]?.averageMarks || 100;

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-3 items-center">
          <ExamSelector exams={exams} value={examId} onChange={(v) => { setExamId(v); load(v); }} />
          {sorted.length > 0 && (
            <>
              <Select value={sortKey} onValueChange={v => setSortKey(v as typeof sortKey)}>
                <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="averageMarks">Sort: Avg Marks</SelectItem>
                  <SelectItem value="passPercentage">Sort: Pass Rate</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1"
                onClick={() => downloadCSV([["Subject","Students","Pass%","Avg","Highest","Lowest","Top Performer"],
                  ...sorted.map(s => [s.subjectName, s.totalStudents, `${s.passPercentage.toFixed(1)}%`, s.averageMarks.toFixed(1), s.highestMarks, s.lowestMarks, s.topPerformer || "—"])],
                  "subject-performance.csv")}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </>
          )}
        </div>
      </CardContent></Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => load(examId)} />}
      {!examId && !loading && <EmptyState message="Select an exam to view subject performance" />}
      {report && !loading && sorted.length === 0 && <EmptyState message="No subject data for this exam" />}

      {report && !loading && sorted.length > 0 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Strongest Subject</p>
                </div>
                <p className="font-bold">{sorted[0].subjectName}</p>
                <p className="text-sm text-emerald-700 mt-0.5">{sorted[0].averageMarks.toFixed(1)} avg · {sorted[0].passPercentage.toFixed(1)}% pass</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Needs Improvement</p>
                </div>
                <p className="font-bold">{sorted[sorted.length - 1].subjectName}</p>
                <p className="text-sm text-red-700 mt-0.5">{sorted[sorted.length - 1].averageMarks.toFixed(1)} avg · {sorted[sorted.length - 1].passPercentage.toFixed(1)}% pass</p>
              </CardContent>
            </Card>
          </div>

          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Subject</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Students</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Pass%</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Average</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">High</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Low</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((s, i) => (
                    <tr key={s.subjectName} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.subjectName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{s.totalStudents}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${s.passPercentage >= 75 ? "text-emerald-600" : s.passPercentage >= 50 ? "text-blue-600" : "text-red-600"}`}>
                        {s.passPercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? "bg-emerald-500" : "bg-blue-400"}`}
                              style={{ width: `${maxAvg ? (s.averageMarks / maxAvg) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{s.averageMarks.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{s.highestMarks}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{s.lowestMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab config ─────────────────────────────────────────────
const TABS = [
  { id: "summary", label: "Overview",            Icon: BarChart3 },
  { id: "exam",    label: "Exam Performance",     Icon: Award },
  { id: "student", label: "Student Marks",        Icon: User },
  { id: "class",   label: "Class Analysis",       Icon: Users },
  { id: "grade",   label: "Grade Distribution",   Icon: TrendingUp },
  { id: "subject", label: "Subject Performance",  Icon: BookOpen },
];

// ── Root export ────────────────────────────────────────────────
export default function ExamAnalyticsInline() {
  const [active, setActive] = useState("summary");
  const [exams, setExams] = useState<ExamBasic[]>([]);

  useEffect(() => {
    examinationApi.getExams({}, 1, 500).then(r => setExams(r.items || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Sub-navigation pill row */}
      <div className="flex gap-1 flex-wrap border-b pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              active === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <t.Icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="min-h-64">
        {active === "summary" && <SummaryPanel />}
        {active === "exam"    && <ExamPanel exams={exams} />}
        {active === "student" && <StudentPanel exams={exams} />}
        {active === "class"   && <ClassPanel />}
        {active === "grade"   && <GradePanel exams={exams} />}
        {active === "subject" && <SubjectPanel exams={exams} />}
      </div>
    </div>
  );
}
