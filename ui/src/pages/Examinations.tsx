import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award, Calendar, TrendingUp, Plus, BarChart3,
  Clock, CheckCircle2, AlertCircle, GraduationCap,
  Loader2, PenLine, ClipboardList,
  Zap, LayoutDashboard, Trophy,
} from "lucide-react";
import ExamAnalyticsInline from "@/components/examinations/ExamAnalyticsInline";
import { ExamsListTab } from "@/components/examinations/ExamsListTab";
import { ExamResultsTab } from "@/components/examinations/ExamResultsTab";
import examinationApi, { ExamBasic, ExamStats } from "@/services/api/examinationApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

// ─── Types ────────────────────────────────────────────────────
interface ExamEvent {
  key: string;
  examName: string;
  examType: string;
  academicYear: string;
  classGroup: string;
  section: string;
  subjects: string[];
  dateFrom: string;
  dateTo: string;
  status: string;
  examIds: string[];
}

interface GeneratedReportCard {
  id: string;
  studentName: string;
  class: string;
  section: string;
  rollNumber: string;
  academicYear: string;
  examType: string;
  percentage: number;
  grade: string;
  totalMarks: number;
  maxTotalMarks: number;
  subjects: Array<{
    subject: string;
    totalMarks: number;
    maxMarks: number;
    grade: string;
    gradePoint: number;
    theoryMarks?: number;
    practicalMarks?: number;
  }>;
  rank?: number;
  teacherRemarks?: string;
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function groupExamsIntoEvents(exams: ExamBasic[]): ExamEvent[] {
  const groups: Record<string, ExamEvent> = {};
  for (const exam of exams) {
    const key = [exam.name, exam.class, exam.section ?? "", exam.examType ?? "", exam.academicYear ?? ""].join("|");
    if (!groups[key]) {
      groups[key] = {
        key, examName: exam.name, examType: exam.examType ?? "",
        academicYear: exam.academicYear ?? "", classGroup: exam.class,
        section: exam.section ?? "", subjects: [],
        dateFrom: exam.date, dateTo: exam.date,
        status: exam.status, examIds: [],
      };
    }
    const ev = groups[key];
    ev.examIds.push(exam.id);
    if (!ev.subjects.includes(exam.subject)) ev.subjects.push(exam.subject);
    if (exam.date < ev.dateFrom) ev.dateFrom = exam.date;
    if (exam.date > ev.dateTo) ev.dateTo = exam.date;
    if (exam.status === "completed") ev.status = "completed";
    else if (exam.status === "ongoing" && ev.status !== "completed") ev.status = "ongoing";
  }
  return Object.values(groups).sort((a, b) => b.dateTo.localeCompare(a.dateTo));
}

const EXAM_TYPE_META: Record<string, { label: string; color: string; order: number }> = {
  "unit-test":   { label: "Unit Tests",       color: "bg-yellow-100 text-yellow-700 border-yellow-200",  order: 0 },
  "quarterly":   { label: "Quarterly Exams",   color: "bg-blue-100 text-blue-700 border-blue-200",       order: 1 },
  "half-yearly": { label: "Half Yearly Exams", color: "bg-purple-100 text-purple-700 border-purple-200", order: 2 },
  "pre-board":   { label: "Pre-Board Exams",   color: "bg-orange-100 text-orange-700 border-orange-200", order: 3 },
  "annual":      { label: "Annual Exams",      color: "bg-green-100 text-green-700 border-green-200",    order: 4 },
  "practical":   { label: "Practicals",        color: "bg-cyan-100 text-cyan-700 border-cyan-200",       order: 5 },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled",   color: "text-blue-600 bg-blue-50 border-blue-200" },
  ongoing:   { label: "In Progress", color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Results In",  color: "text-green-600 bg-green-50 border-green-200" },
  draft:     { label: "Draft",       color: "text-gray-600 bg-gray-100 border-gray-200" },
};

function fmtRange(from: string, to: string) {
  const f = new Date(from), t = new Date(to);
  if (from === to) return f.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${f.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${t.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

// ─── Exam Event Card ──────────────────────────────────────────
function ExamEventCard({ event, onEnterMarks, onViewSchedule }: {
  event: ExamEvent; onEnterMarks: () => void; onViewSchedule: () => void;
}) {
  const sc = STATUS_CFG[event.status] ?? STATUS_CFG.draft;
  const tm = EXAM_TYPE_META[event.examType];
  const isMarksEntered = event.status === "completed" || event.status === "ongoing";
  const steps = [
    { label: "Scheduled",     done: true },
    { label: "Marks Entered", done: isMarksEntered },
    { label: "Published",     done: event.status === "completed" },
  ];
  return (
    <Card className="hover:shadow-md transition-all border hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm leading-tight">{event.examName}</h3>
              {tm && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tm.color}`}>{event.examType.replace(/-/g, " ")}</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />Class {event.classGroup}{event.section ? ` – ${event.section}` : ""}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtRange(event.dateFrom, event.dateTo)}</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{event.subjects.length} subj.</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.subjects.slice(0, 4).map(s => (
                <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s}</span>
              ))}
              {event.subjects.length > 4 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">+{event.subjects.length - 4}</span>}
            </div>
          </div>
          <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-full border ${sc.color}`}>{sc.label}</span>
        </div>
        {/* Stepper */}
        <div className="flex items-center gap-1 mt-3">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {s.done ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                {s.label}
              </div>
              {i < steps.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />}
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onViewSchedule}>
            <Eye className="h-3 w-3 mr-1" /> Schedule
          </Button>
          <Button size="sm" className="h-7 text-xs flex-1" onClick={onEnterMarks}>
            <PenLine className="h-3 w-3 mr-1" /> Enter Marks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ stats, statsLoading, events, eventsLoading, academicYear, onNavigate }: {
  stats: Partial<ExamStats>;
  statsLoading: boolean;
  events: ExamEvent[];
  eventsLoading: boolean;
  academicYear: string;
  onNavigate: (tab: string, event?: ExamEvent) => void;
}) {
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pendingMarks = useMemo(() =>
    events.filter(e => e.status !== "completed" && new Date(e.dateTo) < today)
      .sort((a, b) => a.dateTo.localeCompare(b.dateTo))
  , [events, today]);

  const upcoming = useMemo(() =>
    events.filter(e => { const d = new Date(e.dateFrom); return d >= today && d <= in30Days; })
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom)).slice(0, 8)
  , [events, today, in30Days]);

  const termProgress = useMemo(() => [
    { type: "unit-test",   label: "Unit Tests"  },
    { type: "quarterly",   label: "Quarterly"   },
    { type: "half-yearly", label: "Half-Yearly" },
    { type: "annual",      label: "Annual"      },
  ].map(t => {
    const all = events.filter(e => e.examType === t.type);
    const done = all.filter(e => e.status === "completed").length;
    return { ...t, total: all.length, done };
  }), [events]);

  const kpis = [
    { label: "Total Exams",  value: stats.totalExams ?? 0,     icon: <Award className="h-5 w-5 text-blue-500" />,    bg: "bg-blue-50",   ring: "ring-blue-100" },
    { label: "Upcoming",     value: stats.scheduledExams ?? 0, icon: <Calendar className="h-5 w-5 text-violet-500" />, bg: "bg-violet-50", ring: "ring-violet-100" },
    { label: "Live Now",     value: stats.ongoingExams ?? 0,   icon: <Zap className="h-5 w-5 text-amber-500" />,      bg: "bg-amber-50",  ring: "ring-amber-100" },
    { label: "Completed",    value: stats.completedExams ?? 0, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, bg: "bg-green-50", ring: "ring-green-100" },
    { label: "Pass Rate",    value: `${Math.round(stats.passPercentage ?? 0)}%`, icon: <TrendingUp className="h-5 w-5 text-rose-500" />, bg: "bg-rose-50", ring: "ring-rose-100" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className={`ring-1 ${k.ring} border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
                <div className={`h-8 w-8 rounded-full ${k.bg} flex items-center justify-center`}>{k.icon}</div>
              </div>
              <p className="text-2xl font-bold">
                {statsLoading ? <span className="text-sm text-muted-foreground animate-pulse">—</span> : k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: Pending + Upcoming */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Action Required
                {pendingMarks.length > 0 && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingMarks.length} pending</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : pendingMarks.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">All caught up!</p>
                    <p className="text-xs text-green-700">No mark entries overdue.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingMarks.slice(0, 6).map(ev => (
                    <div key={ev.key} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 p-3 hover:bg-amber-50 transition-colors">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ev.examName}</p>
                          <p className="text-xs text-muted-foreground">Class {ev.classGroup}{ev.section ? ` – ${ev.section}` : ""} · Due {new Date(ev.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs shrink-0 ml-3" onClick={() => onNavigate("marks", ev)}>Enter Marks</Button>
                    </div>
                  ))}
                  {pendingMarks.length > 6 && (
                    <button className="text-xs text-primary hover:underline w-full text-center py-1" onClick={() => onNavigate("exams")}>
                      + {pendingMarks.length - 6} more pending
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" /> Upcoming Exams
                  <span className="ml-auto text-xs text-muted-foreground">Next 30 days</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {upcoming.map(ev => {
                    const daysLeft = Math.ceil((new Date(ev.dateFrom).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const tm = EXAM_TYPE_META[ev.examType];
                    return (
                      <div key={ev.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${daysLeft <= 3 ? "bg-red-100 text-red-700" : daysLeft <= 7 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {daysLeft}d
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ev.examName}</p>
                            <p className="text-xs text-muted-foreground">Class {ev.classGroup} · {new Date(ev.dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                          </div>
                        </div>
                        {tm && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${tm.color}`}>{ev.examType.replace(/-/g, " ")}</span>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Term cycle + top performers */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" /> Term Cycle
                <span className="ml-auto text-xs text-muted-foreground">{academicYear}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {termProgress.map(t => (
                <div key={t.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground">{t.total === 0 ? "Not started" : `${t.done}/${t.total}`}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${t.total === 0 ? "" : t.done === t.total ? "bg-green-500" : t.done > 0 ? "bg-amber-400" : "bg-blue-300"}`}
                      style={{ width: `${t.total ? (t.done / t.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {stats.topPerformers && stats.topPerformers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stats.topPerformers.slice(0, 5).map((p, i) => (
                    <div key={p.studentId} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium">{p.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{p.class}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-600">{p.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Printable Report Card ────────────────────────────────────
function PrintableReportCard({ card, onBack }: { card: GeneratedReportCard; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">← Back</Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
      <div className="bg-white border rounded-xl p-8 shadow-sm print:shadow-none print:border-none max-w-2xl mx-auto">
        <div className="text-center border-b pb-5 mb-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wide">Academic Report Card</h2>
          <p className="text-sm text-muted-foreground">{card.academicYear} · {card.examType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b">
          {[
            { label: "Student Name",   value: card.studentName },
            { label: "Class / Section", value: `${card.class}${card.section ? ` – ${card.section}` : ""}` },
            { label: "Roll Number",    value: card.rollNumber || "—" },
            { label: "Generated",      value: new Date(card.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{f.label}</p>
              <p className="font-bold">{f.value}</p>
            </div>
          ))}
        </div>

        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b">
              {["Subject", "Marks", "Max", "%", "Grade"].map(h => (
                <th key={h} className="text-center py-2 font-semibold text-xs text-muted-foreground uppercase first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {(card.subjects || []).map(s => {
              const pct = s.maxMarks ? (s.totalMarks / s.maxMarks) * 100 : 0;
              return (
                <tr key={s.subject}>
                  <td className="py-2 font-medium">{s.subject}</td>
                  <td className="py-2 text-center">{s.totalMarks}</td>
                  <td className="py-2 text-center text-muted-foreground">{s.maxMarks}</td>
                  <td className="py-2 text-center text-muted-foreground">{pct.toFixed(1)}%</td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${pct >= 90 ? "bg-emerald-100 text-emerald-700" : pct >= 75 ? "bg-blue-100 text-blue-700" : pct >= 60 ? "bg-yellow-100 text-yellow-700" : pct >= 33 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                      {s.grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-center">{card.totalMarks}</td>
              <td className="py-2 text-center text-muted-foreground">{card.maxTotalMarks}</td>
              <td className="py-2 text-center">{(card.percentage ?? 0).toFixed(1)}%</td>
              <td className="py-2 text-center">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">{card.grade}</span>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-around items-center p-4 bg-muted/40 rounded-xl border mb-5">
          {[
            { label: "Overall %", value: `${(card.percentage ?? 0).toFixed(1)}%`, cls: "" },
            { label: "Grade",     value: card.grade,    cls: "text-primary" },
            { label: "Result",    value: (card.percentage ?? 0) >= 33 ? "PASS" : "FAIL", cls: (card.percentage ?? 0) >= 33 ? "text-green-600" : "text-red-600" },
          ].map(f => (
            <div key={f.label} className="text-center">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className={`text-2xl font-bold ${f.cls}`}>{f.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-6 border-t">
          {["Class Teacher", "Principal"].map(sig => (
            <div key={sig} className="text-center">
              <div className="h-10 border-b border-gray-400 w-36 mb-1" />
              <p className="text-xs text-muted-foreground">{sig}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Report Card Tab ──────────────────────────────────────────
function ReportCardTab({ academicYear }: { academicYear: string }) {
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string; rollNumber: string; generated: boolean }[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [teacherRemarks, setTeacherRemarks] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [viewCard, setViewCard] = useState<GeneratedReportCard | null>(null);

  const examTypes = ["unit-test", "quarterly", "half-yearly", "annual", "pre-board", "practical"];
  const standards = Array.from(new Set(allClasses.map(c => c.standard))).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  const sections = selectedClass ? allClasses.filter(c => c.standard === selectedClass).map(c => c.section).sort() : [];

  useEffect(() => { academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    studentApi.list({ classFilter: selectedClass, pageSize: 500 })
      .then(r => {
        const raw = r.students || [];
        const filt = selectedSection === "all" ? raw : raw.filter(s => s.section === selectedSection);
        setStudents(filt.map(s => ({ id: s.id, name: s.name, rollNumber: s.rollNumber ?? "", generated: false })));
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedSection]);

  const handleGenerate = async (studentId: string) => {
    if (!selectedExamType) { toast.error("Select exam type first"); return; }
    setGenerating(studentId);
    try {
      const result = await examinationApi.generateReportCard({
        schoolId: "", studentId,
        academicYear: academicYear || "", examType: selectedExamType,
        teacherRemarks: teacherRemarks || undefined,
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, generated: true } : s));
      if (result) setViewCard(result as unknown as GeneratedReportCard);
      toast.success("Report card generated");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? "Failed to generate report card");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedExamType) { toast.error("Select exam type first"); return; }
    if (!students.length) return;
    setGenerating("all");
    let ok = 0, fail = 0;
    for (const s of students) {
      try {
        await examinationApi.generateReportCard({ schoolId: "", studentId: s.id, academicYear: academicYear || "", examType: selectedExamType, teacherRemarks: teacherRemarks || undefined });
        ok++;
        setStudents(prev => prev.map(st => st.id === s.id ? { ...st, generated: true } : st));
      } catch { fail++; }
    }
    setGenerating(null);
    toast.success(`Generated ${ok} cards${fail ? `, ${fail} failed` : ""}`);
  };

  if (viewCard) return <PrintableReportCard card={viewCard} onBack={() => setViewCard(null)} />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Generate Report Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Class *</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("all"); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{standards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Exam Type *</Label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{examTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Remarks</Label>
              <Input className="h-9 text-sm" placeholder="Optional teacher remarks…" value={teacherRemarks} onChange={e => setTeacherRemarks(e.target.value)} />
            </div>
          </div>
          {selectedClass && selectedExamType && students.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {students.length} students · {students.filter(s => s.generated).length} generated
              </span>
              <Button onClick={handleGenerateAll} disabled={generating === "all"} className="gap-2">
                {generating === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Generate All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {loadingStudents ? "Loading…" : `${students.length} students`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : students.length === 0 ? (
              <p className="text-center p-8 text-muted-foreground text-sm">No students found</p>
            ) : (
              <div className="divide-y">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        {s.rollNumber && <p className="text-xs text-muted-foreground">Roll #{s.rollNumber}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.generated && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>}
                      <Button size="sm" variant={s.generated ? "outline" : "default"} className="h-7 text-xs gap-1"
                        onClick={() => handleGenerate(s.id)} disabled={!!generating || !selectedExamType}>
                        {generating === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : s.generated
                            ? <><Eye className="h-3.5 w-3.5" /> View</>
                            : <><Download className="h-3.5 w-3.5" /> Generate</>
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── All Exams Tab ────────────────────────────────────────────
function AllExamsTab({ events, loading, onEnterMarks, onViewSchedule, onRefresh }: {
  events: ExamEvent[]; loading: boolean;
  onEnterMarks: (ev: ExamEvent) => void; onViewSchedule: (ev: ExamEvent) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const uniqueClasses = Array.from(new Set(events.map(ev => ev.classGroup)))
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

  const filtered = events.filter(ev => {
    const ms = !search || ev.examName.toLowerCase().includes(search.toLowerCase()) || ev.classGroup.includes(search);
    const mc = filterClass === "all" || ev.classGroup === filterClass;
    const mst = filterStatus === "all" || ev.status === filterStatus;
    return ms && mc && mst;
  });

  const TYPE_ORDER = ["unit-test", "quarterly", "half-yearly", "pre-board", "annual", "practical"];
  const byType = filtered.reduce<Record<string, ExamEvent[]>>((acc, ev) => {
    const t = ev.examType || "other";
    (acc[t] ??= []).push(ev);
    return acc;
  }, {});
  const typeKeys = Object.keys(byType).sort((a, b) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search exam name or class…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {uniqueClasses.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="ongoing">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">{events.length === 0 ? "No exams yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mt-1">{events.length === 0 ? "Create your first exam from the Schedule tab" : "Try adjusting filters"}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">{filtered.length} exam group{filtered.length !== 1 ? "s" : ""}</p>
          {typeKeys.map(typeKey => {
            const tm = EXAM_TYPE_META[typeKey];
            const typeEvs = byType[typeKey];
            const done = typeEvs.filter(e => e.status === "completed").length;
            const byClass: Record<string, ExamEvent[]> = {};
            for (const ev of typeEvs) {
              const cls = `Class ${ev.classGroup}${ev.section ? ` – ${ev.section}` : ""}`;
              (byClass[cls] ??= []).push(ev);
            }
            return (
              <div key={typeKey} className="border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tm?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {typeKey.replace(/-/g, " ") || "Other"}
                    </span>
                    <span className="text-sm font-semibold">{tm?.label ?? "Other"}</span>
                    <span className="text-xs text-muted-foreground">({typeEvs.length})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600 font-medium">{done} done</span>
                    {typeEvs.length - done > 0 && <span className="text-muted-foreground">· {typeEvs.length - done} pending</span>}
                  </div>
                </div>
                <div className="divide-y">
                  {Object.entries(byClass)
                    .sort(([a], [b]) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0))
                    .map(([cls, clsEvs]) => (
                      <div key={cls} className="px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Users className="h-3 w-3" />{cls}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {clsEvs.map(ev => (
                            <ExamEventCard key={ev.key} event={ev}
                              onEnterMarks={() => onEnterMarks(ev)}
                              onViewSchedule={() => onViewSchedule(ev)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Examinations() {
  const { academicYear } = useAcademicYear();
  const [activeTab, setActiveTab] = useState("overview");
  const [resultsSetupId, setResultsSetupId] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<Partial<ExamStats>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<ExamEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const loadStats = () => {
    setStatsLoading(true);
    examinationApi.getExamStats(academicYear ? { academicYear } : {})
      .then(d => setStats(d)).catch(() => {}).finally(() => setStatsLoading(false));
  };
  const loadAllEvents = () => {
    setEventsLoading(true);
    examinationApi.getExams(academicYear ? { academicYear } : {}, 1, 1000)
      .then(r => setAllEvents(groupExamsIntoEvents(r.items ?? [])))
      .catch(() => setAllEvents([])).finally(() => setEventsLoading(false));
  };
  useEffect(() => { loadStats(); loadAllEvents(); }, [academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnterMarks = (setupId: string) => {
    setResultsSetupId(setupId);
    setActiveTab("results");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" /> Examinations
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Plan · Timetable · Enter Marks · Results — full exam lifecycle</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          {[
            { value: "overview",  icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
            { value: "exams",     icon: <ClipboardList className="h-4 w-4" />,   label: "All Exams" },
            { value: "results",   icon: <PenLine className="h-4 w-4" />,         label: "Results" },
            { value: "analytics", icon: <BarChart3 className="h-4 w-4" />,       label: "Analytics" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
              {t.icon}<span>{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab stats={stats} statsLoading={statsLoading} events={allEvents}
            eventsLoading={eventsLoading} academicYear={academicYear ?? ""} onNavigate={(tab, ev) => {
              if (tab === "marks") { setActiveTab("results"); }
              else setActiveTab(tab);
            }} />
        </TabsContent>

        <TabsContent value="exams" className="mt-4">
          <ExamsListTab onEnterMarks={handleEnterMarks} />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <ExamResultsTab initialSetupId={resultsSetupId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <ExamAnalyticsInline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
