import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award, Calendar, TrendingUp, BarChart3,
  Clock, CheckCircle2, AlertCircle, GraduationCap,
  Loader2, PenLine, ClipboardList,
  Zap, LayoutDashboard, Trophy,
  Users, BookOpen, ChevronRight, Eye, Printer, Download, Search, RefreshCw,
} from "lucide-react";
import ExamAnalyticsInline from "@/components/examinations/ExamAnalyticsInline";
import { CCETab } from "./CCEManagement";
import { ExamsListTab } from "@/components/examinations/ExamsListTab";
import { ExamResultsTab } from "@/components/examinations/ExamResultsTab";
import examinationApi, { ExamBasic, ExamStats } from "@/services/api/examinationApi";
import { getExamSetups, getStudentExamSetupResult, type ExamSetupBasicDto } from "@/services/api/examSetupApi";
import { academicApi } from "@/services/api/academicApi";
import { studentApi } from "@/services/api/studentApi";
import type { ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useSchool } from "@/contexts/SchoolContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { generateProfessionalReportCard } from "@/utils/professionalPdfGenerator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  draft:     { label: "Draft",       color: "text-muted-foreground bg-muted border-border" },
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
  const { t } = useLanguage();
  const sc = STATUS_CFG[event.status] ?? STATUS_CFG.draft;
  const tm = EXAM_TYPE_META[event.examType];
  const isMarksEntered = event.status === "completed" || event.status === "ongoing";
  const statusLabels: Record<string, string> = {
    scheduled: t('exams.status.scheduled'),
    ongoing: t('exams.status.inProgress'),
    completed: t('exams.status.resultsIn'),
    draft: t('exams.status.draft'),
  };
  const steps = [
    { label: t('exams.card.stepper.scheduled'),     done: true },
    { label: t('exams.card.stepper.marksEntered'), done: isMarksEntered },
    { label: t('exams.card.stepper.published'),     done: event.status === "completed" },
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
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{event.subjects.length} {t('exams.card.subjectsAbbrev')}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.subjects.slice(0, 4).map(s => (
                <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s}</span>
              ))}
              {event.subjects.length > 4 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">+{event.subjects.length - 4}</span>}
            </div>
          </div>
          <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-full border ${sc.color}`}>{statusLabels[event.status] ?? t('exams.status.draft')}</span>
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
            <Eye className="h-3 w-3 mr-1" /> {t('exams.card.btn.schedule')}
          </Button>
          <Button size="sm" className="h-7 text-xs flex-1" onClick={onEnterMarks}>
            <PenLine className="h-3 w-3 mr-1" /> {t('exams.card.btn.enterMarks')}
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
  const { t } = useLanguage();
  const { hasUserPermission } = usePermissions();
  const canEditExams = hasUserPermission('Examinations', 'Edit');
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

  const recentCompleted = useMemo(() =>
    events.filter(e => e.status === "completed")
      .sort((a, b) => b.dateTo.localeCompare(a.dateTo)).slice(0, 5)
  , [events]);

  const termProgress = useMemo(() => [
    { type: "unit-test",   label: t('exams.overview.termCycle.unitTests') },
    { type: "quarterly",   label: t('exams.overview.termCycle.quarterly') },
    { type: "half-yearly", label: t('exams.overview.termCycle.halfYearly') },
    { type: "annual",      label: t('exams.overview.termCycle.annual') },
  ].map(item => {
    const all = events.filter(e => e.examType === item.type);
    const done = all.filter(e => e.status === "completed").length;
    return { ...item, total: all.length, done };
  }), [events]);

  const kpis = [
    { label: t('exams.overview.kpi.totalExams'),  value: stats.totalExams ?? 0,     icon: <Award className="h-5 w-5 text-blue-500" />,    bg: "bg-blue-50",   ring: "ring-blue-100" },
    { label: t('exams.overview.kpi.upcoming'),     value: stats.scheduledExams ?? 0, icon: <Calendar className="h-5 w-5 text-violet-500" />, bg: "bg-violet-50", ring: "ring-violet-100" },
    { label: t('exams.overview.kpi.liveNow'),     value: stats.ongoingExams ?? 0,   icon: <Zap className="h-5 w-5 text-amber-500" />,      bg: "bg-amber-50",  ring: "ring-amber-100" },
    { label: t('exams.overview.kpi.completed'),    value: stats.completedExams ?? 0, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, bg: "bg-green-50", ring: "ring-green-100" },
    { label: t('exams.overview.kpi.passRate'),    value: `${Math.round(stats.passPercentage ?? 0)}%`, icon: <TrendingUp className="h-5 w-5 text-rose-500" />, bg: "bg-rose-50", ring: "ring-rose-100" },
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
        {/* Left: Pending + Upcoming + Recent Completed */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> {t('exams.overview.actionRequired.title')}
                {pendingMarks.length > 0 && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingMarks.length} pending</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('exams.overview.actionRequired.loading')}</div>
              ) : pendingMarks.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{t('exams.overview.actionRequired.allCaughtUp')}</p>
                    <p className="text-xs text-green-700">{t('exams.overview.actionRequired.noOverdue')}</p>
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
                      {canEditExams && (
                        <Button size="sm" className="h-7 text-xs shrink-0 ml-3" onClick={() => onNavigate("marks", ev)}>{t('exams.overview.actionRequired.btn.enterMarks')}</Button>
                      )}
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
                  <Calendar className="h-4 w-4 text-blue-500" /> {t('exams.overview.upcoming.title')}
                  <span className="ml-auto text-xs text-muted-foreground">{t('exams.overview.upcoming.next30Days')}</span>
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

          {/* Recent completed exams */}
          {recentCompleted.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> {t('exams.overview.recentResults.title')}
                  <button className="ml-auto text-xs text-primary hover:underline" onClick={() => onNavigate("results")}>
                    {t('exams.overview.recentResults.viewLink')}
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentCompleted.map(ev => {
                    const tm = EXAM_TYPE_META[ev.examType];
                    return (
                      <div key={ev.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                            <Trophy className="h-4 w-4 text-green-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ev.examName}</p>
                            <p className="text-xs text-muted-foreground">
                              Class {ev.classGroup}{ev.section ? ` – ${ev.section}` : ""} ·{" "}
                              {new Date(ev.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {tm && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tm.color}`}>{ev.examType.replace(/-/g, " ")}</span>}
                          <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onNavigate("results")}>
                            <Eye className="h-3 w-3 mr-1" /> {t('exams.overview.recentResults.btn.results')}
                          </Button>
                        </div>
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
                <BarChart3 className="h-4 w-4 text-violet-500" /> {t('exams.overview.termCycle.title')}
                <span className="ml-auto text-xs text-muted-foreground">{academicYear}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {termProgress.map(item => (
                <div key={item.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.total === 0 ? t('exams.overview.termCycle.notStarted') : `${item.done}/${item.total}`}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${item.total === 0 ? "" : item.done === item.total ? "bg-green-500" : item.done > 0 ? "bg-amber-400" : "bg-blue-300"}`}
                      style={{ width: `${item.total ? (item.done / item.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top performers - show even if empty with a placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> {t('exams.overview.topPerformers.title')}
                <span className="ml-auto text-xs text-muted-foreground">{academicYear}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {statsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : stats.topPerformers && stats.topPerformers.length > 0 ? (
                <div className="divide-y">
                  {stats.topPerformers.slice(0, 5).map((p, i) => (
                    <div key={p.studentId} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium">{p.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{p.class}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-600">{p.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                  <Trophy className="h-8 w-8 opacity-25" />
                  <p className="text-xs text-center">{t('exams.overview.topPerformers.empty')}</p>
                  <button className="text-xs text-primary hover:underline" onClick={() => onNavigate("results")}>{t('exams.overview.topPerformers.goToResults')}</button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Printable Report Card ────────────────────────────────────
function PrintableReportCard({ card, onBack }: { card: GeneratedReportCard; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">← Back</Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
      <div className="bg-card border rounded-xl p-8 shadow-sm print:shadow-none print:border-none max-w-2xl mx-auto print:bg-white">
        <div className="text-center border-b pb-5 mb-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wide">{t('exams.reportCard.title')}</h2>
          <p className="text-sm text-muted-foreground">{card.academicYear} · {card.examType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b">
          {[
            { label: t('exams.reportCard.field.studentName'),   value: card.studentName },
            { label: t('exams.reportCard.field.classSection'), value: `${card.class}${card.section ? ` – ${card.section}` : ""}` },
            { label: t('exams.reportCard.field.rollNumber'),    value: card.rollNumber || "—" },
            { label: t('exams.reportCard.field.generated'),      value: new Date(card.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
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
              {[t('exams.reportCard.table.subject'), t('exams.reportCard.table.marks'), t('exams.reportCard.table.max'), t('exams.reportCard.table.pct'), t('exams.reportCard.table.grade')].map(h => (
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
              <td className="py-2">{t('exams.reportCard.table.total')}</td>
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
            { label: t('exams.reportCard.summary.overallPct'), value: `${(card.percentage ?? 0).toFixed(1)}%`, cls: "" },
            { label: t('exams.reportCard.summary.grade'),     value: card.grade,    cls: "text-primary" },
            { label: t('exams.reportCard.summary.result'),    value: (card.percentage ?? 0) >= 33 ? t('exams.reportCard.result.pass') : t('exams.reportCard.result.fail'), cls: (card.percentage ?? 0) >= 33 ? "text-green-600" : "text-red-600" },
          ].map(f => (
            <div key={f.label} className="text-center">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className={`text-2xl font-bold ${f.cls}`}>{f.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-6 border-t">
          {[t('exams.reportCard.signature.classTeacher'), "Principal"].map(sig => (
            <div key={sig} className="text-center">
              <div className="h-10 border-b border-border w-36 mb-1" />
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
  const { schoolInfo } = useSchool();
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [publishedSetups, setPublishedSetups] = useState<ExamSetupBasicDto[]>([]);
  const [loadingSetups, setLoadingSetups] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string; rollNumber: string; generated: boolean }[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [teacherRemarks, setTeacherRemarks] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [viewCard, setViewCard] = useState<GeneratedReportCard | null>(null);
  const [search, setSearch] = useState("");
  const [reportFormat, setReportFormat] = useState<"a4" | "letter">("a4");

  const standards = Array.from(new Set(allClasses.map(c => c.standard))).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  const sections = selectedClass ? allClasses.filter(c => c.standard === selectedClass).map(c => c.section).sort() : [];

  // Selected exam setup
  const selectedSetup = publishedSetups.find(s => s.id === selectedSetupId);
  const selectedExamType = selectedSetup?.examType ?? "";

  // Load classes once
  useEffect(() => { academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(() => {}); }, []);

  // Load published exam setups for current academic year
  useEffect(() => {
    if (!academicYear) return;
    setLoadingSetups(true);
    getExamSetups({ status: 'published', academicYear, pageSize: 200 })
      .then(r => setPublishedSetups(r.items ?? []))
      .catch(() => setPublishedSetups([]))
      .finally(() => setLoadingSetups(false));
  }, [academicYear]);

  // Filter setups by selected class standard
  const filteredSetups = useMemo(() => {
    if (!selectedClass) return publishedSetups;
    return publishedSetups.filter(s => {
      // className may be like "10", "Class 10", "10-A" — match by standard
      const name = s.className ?? "";
      return name === selectedClass || name.startsWith(selectedClass + "-") || name.startsWith(selectedClass + " ") || name.includes(` ${selectedClass}`) || name.includes(`${selectedClass}`);
    });
  }, [publishedSetups, selectedClass]);

  // Load students when class/section changes
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

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
  }, [students, search]);

  const handleGenerate = async (studentId: string, fmt: "a4" | "letter" = reportFormat) => {
    if (!selectedSetupId) { toast.error("Select a published exam first"); return; }
    setGenerating(studentId);
    try {
      const result = await getStudentExamSetupResult(selectedSetupId, studentId);
      const setup = selectedSetup!;
      const schoolData = {
        name: schoolInfo?.name ?? "School",
        address: schoolInfo?.address ?? "",
        phone: schoolInfo?.phone ?? "",
        email: schoolInfo?.email ?? "",
        principalName: schoolInfo?.principalName,
        websiteUrl: schoolInfo?.websiteUrl,
      };
      const reportData = {
        studentName: result.studentName,
        studentId: result.studentId,
        class: setup.className,
        section: setup.sectionName ?? "",
        academicYear: setup.academicYear,
        examName: setup.name,
        rollNo: result.rollNumber ?? "",
        subjects: (result.subjects ?? []).map(s => ({
          name: s.subjectName,
          marks: Number(s.obtainedMarks),
          maxMarks: Number(s.maxMarks),
          grade: s.grade ?? "",
        })),
        totalMarks: Number(result.totalObtained),
        totalMaxMarks: Number(result.totalMax),
        percentage: Number(result.percentage),
        overallGrade: result.overallGrade ?? "",
        rank: result.rank,
        remarks: teacherRemarks || (result.isPass ? "Pass" : "Fail"),
      };
      const doc = generateProfessionalReportCard(schoolData, reportData, fmt);
      doc.save(`ReportCard_${result.studentName.replace(/\s+/g, "_")}_${setup.name.replace(/\s+/g, "_")}.pdf`);
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, generated: true } : s));
      toast.success(`Report card downloaded (${fmt.toUpperCase()})`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err?.response?.data?.message ?? err?.message ?? "No results found for this student in the selected exam";
      toast.error(msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedSetupId) { toast.error("Select a published exam first"); return; }
    if (!students.length) return;
    setGenerating("all");
    let ok = 0, fail = 0;
    for (const s of students) {
      try {
        await handleGenerate(s.id, reportFormat);
        ok++;
      } catch { fail++; }
    }
    setGenerating(null);
    if (ok > 0) toast.success(`Generated ${ok} cards${fail ? `, ${fail} failed` : ""}`);
  };

  // viewCard no longer used — PDFs are generated directly via jsPDF

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
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("all"); setSelectedSetupId(""); }}>
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
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Published Exam *
                {filteredSetups.length === 0 && selectedClass && !loadingSetups && (
                  <span className="text-amber-600 font-normal ml-2 normal-case">(no published exams for this class)</span>
                )}
              </Label>
              <Select value={selectedSetupId} onValueChange={setSelectedSetupId} disabled={filteredSetups.length === 0}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingSetups ? "Loading…" : filteredSetups.length === 0 ? "No published exams" : "Select published exam"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSetups.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.className}{s.sectionName ? ` · ${s.sectionName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Teacher Remarks</Label>
              <Input className="h-9 text-sm" placeholder="Optional remarks for all students' cards…" value={teacherRemarks} onChange={e => setTeacherRemarks(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">PDF Format</Label>
              <Select value={reportFormat} onValueChange={v => setReportFormat(v as "a4" | "letter")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">PDF – A4</SelectItem>
                  <SelectItem value="letter">PDF – Letter (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && selectedSetupId && students.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {students.length} students · {students.filter(s => s.generated).length} generated
              </span>
              <Button onClick={handleGenerateAll} disabled={generating === "all"} className="gap-2">
                {generating === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Generate All ({reportFormat.toUpperCase()})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="text-muted-foreground">
                {loadingStudents ? "Loading students…" : `${students.length} students`}
                {selectedSetup && (
                  <span className="ml-2 font-normal text-foreground">· {selectedSetup.name}</span>
                )}
              </span>
              {students.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-xs w-48" placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : students.length === 0 ? (
              <p className="text-center p-8 text-muted-foreground text-sm">No students found for this class/section.</p>
            ) : (
              <ScrollArea style={{ maxHeight: '480px' }}>
                <div className="divide-y">
                  {filteredStudents.map((s, i) => (
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant={s.generated ? "outline" : "default"}
                              className="h-7 text-xs gap-1"
                              disabled={!!generating || !selectedSetupId}
                            >
                              {generating === s.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : s.generated
                                  ? <Eye className="h-3.5 w-3.5" />
                                  : <Download className="h-3.5 w-3.5" />
                              }
                              {s.generated ? "Re-generate" : "Generate"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleGenerate(s.id, "a4")}>
                              PDF – A4
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerate(s.id, "letter")}>
                              PDF – Letter (US)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClass && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl gap-3">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Select a class to generate report cards</p>
          <p className="text-xs">Only published exams are shown — publish results first in the Results tab.</p>
        </div>
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
  const { t } = useLanguage();
  const examTypeLabel = (typeKey: string) => {
    const map: Record<string, string> = {
      "unit-test":   t('exams.type.unitTest'),
      "quarterly":   t('exams.type.quarterly'),
      "half-yearly": t('exams.type.halfYearly'),
      "pre-board":   t('exams.type.preBoard'),
      "annual":      t('exams.type.annual'),
      "practical":   t('exams.type.practicals'),
    };
    return map[typeKey] ?? (typeKey.replace(/-/g, " ") || "Other");
  };
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
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tm?.color ?? "bg-muted text-muted-foreground border-border"}`}>
                      {typeKey.replace(/-/g, " ") || "Other"}
                    </span>
                    <span className="text-sm font-semibold">{examTypeLabel(typeKey)}</span>
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
  const { t } = useLanguage();
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
            <Award className="h-7 w-7 text-primary" /> {t('exams.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('exams.subtitle')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 h-auto">
          {[
            { value: "overview",      icon: <LayoutDashboard className="h-4 w-4" />, label: t('exams.tabs.overview') },
            { value: "exams",         icon: <ClipboardList className="h-4 w-4" />,   label: t('exams.tabs.allExams') },
            { value: "results",       icon: <PenLine className="h-4 w-4" />,         label: t('exams.tabs.results') },
            { value: "report-cards",  icon: <Trophy className="h-4 w-4" />,          label: t('exams.tabs.reportCards') },
            { value: "analytics",     icon: <BarChart3 className="h-4 w-4" />,       label: t('exams.tabs.analytics') },
            { value: "cce",           icon: <BookOpen className="h-4 w-4" />,        label: t('exams.tabs.cce') },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
              {tab.icon}<span>{tab.label}</span>
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

        <TabsContent value="report-cards" className="mt-4">
          <ReportCardTab academicYear={academicYear ?? ""} />
        </TabsContent>

        <TabsContent value="cce" className="mt-4">
          <CCETab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
