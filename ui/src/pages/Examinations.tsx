
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award, Calendar, TrendingUp, Users, Plus, FileText, BarChart3,
  Clock, CheckCircle2, AlertCircle, BookOpen, GraduationCap, Download,
  Search, ArrowRight, Loader2, RefreshCw, PenLine, ClipboardList,
  ChevronRight, Eye, Pencil
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExamTimetableCreator from "@/components/examinations/ExamTimetableCreator";
import ResultsManager from "@/pages/academics/ResultsManager";
import examinationApi, { ExamBasic, ExamStats } from "@/services/api/examinationApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { studentApi } from "@/services/api/studentApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { toast } from "sonner";

// ─── Exam event (grouped by name+class+type) ─────────────
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
  totalStudents: number;
  resultsEntered: number;
  status: string;
  examIds: string[];
}

function groupExamsIntoEvents(exams: ExamBasic[]): ExamEvent[] {
  const groups: Record<string, ExamEvent> = {};
  for (const exam of exams) {
    const key = [exam.name, exam.class, exam.section ?? "", exam.examType ?? "", exam.academicYear ?? ""].join("|");
    if (!groups[key]) {
      groups[key] = {
        key,
        examName: exam.name,
        examType: exam.examType ?? "",
        academicYear: exam.academicYear ?? "",
        classGroup: exam.class,
        section: exam.section ?? "",
        subjects: [],
        dateFrom: exam.date,
        dateTo: exam.date,
        totalStudents: 0,
        resultsEntered: 0,
        status: exam.status,
        examIds: [],
      };
    }
    const ev = groups[key];
    ev.examIds.push(exam.id);
    if (!ev.subjects.includes(exam.subject)) ev.subjects.push(exam.subject);
    if (exam.date < ev.dateFrom) ev.dateFrom = exam.date;
    if (exam.date > ev.dateTo) ev.dateTo = exam.date;
    // aggregate status — completed wins, otherwise scheduled
    if (exam.status === "completed") ev.status = "completed";
    else if (exam.status === "ongoing" && ev.status !== "completed") ev.status = "ongoing";
  }
  return Object.values(groups).sort((a, b) => b.dateTo.localeCompare(a.dateTo));
}

const examTypeColors: Record<string, string> = {
  "quarterly":   "bg-blue-100 text-blue-700 border-blue-200",
  "half-yearly": "bg-purple-100 text-purple-700 border-purple-200",
  "annual":      "bg-green-100 text-green-700 border-green-200",
  "pre-board":   "bg-orange-100 text-orange-700 border-orange-200",
  "unit-test":   "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: "Scheduled",    icon: <Clock className="h-3.5 w-3.5" />,         color: "text-blue-600 bg-blue-50 border-blue-200" },
  ongoing:   { label: "In Progress",  icon: <AlertCircle className="h-3.5 w-3.5" />,    color: "text-amber-600 bg-amber-50 border-amber-200" },
  completed: { label: "Results In",   icon: <CheckCircle2 className="h-3.5 w-3.5" />,   color: "text-green-600 bg-green-50 border-green-200" },
  draft:     { label: "Draft",        icon: <Pencil className="h-3.5 w-3.5" />,         color: "text-gray-600 bg-gray-100 border-gray-200" },
};

// ─── Exam Event Card ──────────────────────────────────────
function ExamEventCard({
  event,
  onEnterMarks,
  onViewSchedule,
}: {
  event: ExamEvent;
  onEnterMarks: () => void;
  onViewSchedule: () => void;
}) {
  const sc = statusConfig[event.status] ?? statusConfig.draft;
  const typeColor = examTypeColors[event.examType] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const dateRange = event.dateFrom === event.dateTo
    ? new Date(event.dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : `${new Date(event.dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(event.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  // Workflow progress
  const isMarksEntered = event.status === "completed" || event.status === "ongoing";
  const steps = [
    { label: "Scheduled",    done: true },
    { label: "Marks Entered", done: isMarksEntered },
    { label: "Published",    done: event.status === "completed" },
  ];

  return (
    <Card className="hover:shadow-md transition-all border hover:border-primary/30 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Name + type badge */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-base leading-tight">{event.examName}</h3>
              {event.examType && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${typeColor}`}>
                  {event.examType.replace("-", " ")}
                </span>
              )}
            </div>
            {/* Class + date */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Class {event.classGroup}{event.section ? ` – ${event.section}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateRange}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {event.subjects.length} subject{event.subjects.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Subjects chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              {event.subjects.slice(0, 5).map(s => (
                <span key={s} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
              ))}
              {event.subjects.length > 5 && (
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">+{event.subjects.length - 5} more</span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${sc.color}`}>
            {sc.icon}
            {sc.label}
          </div>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center gap-1 mt-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                step.done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              }`}>
                {step.done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {step.label}
              </div>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onViewSchedule}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            View Schedule
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onEnterMarks}>
            <PenLine className="h-3.5 w-3.5 mr-1" />
            Enter Marks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Report Card Generator ────────────────────────────────
function ReportCardTab({ academicYear }: { academicYear: string }) {
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string; rollNumber: string }[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [teacherRemarks, setTeacherRemarks] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  const examTypes = ["quarterly", "half-yearly", "annual", "pre-board", "unit-test"];
  const availableStandards = Array.from(new Set(allClasses.map(c => c.standard))).sort(
    (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
  );
  const availableSections = selectedClass
    ? allClasses.filter(c => c.standard === selectedClass).map(c => c.section).sort()
    : [];

  useEffect(() => {
    academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    studentApi.list({ classFilter: selectedClass, pageSize: 500 })
      .then(r => {
        const raw = r.students || [];
        const filtered = selectedSection === "all" ? raw : raw.filter(s => s.section === selectedSection);
        setStudents(filtered.map(s => ({ id: s.id, name: s.name, rollNumber: s.rollNumber ?? "" })));
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedSection]);

  const handleGenerate = async (studentId: string) => {
    if (!selectedExamType) { toast.error("Please select exam type"); return; }
    setGenerating(studentId);
    try {
      await examinationApi.generateReportCard({
        schoolId: "",
        studentId,
        academicYear: academicYear || "",
        examType: selectedExamType,
        teacherRemarks: teacherRemarks || undefined,
      });
      toast.success("Report card generated successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to generate report card");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedExamType) { toast.error("Please select exam type"); return; }
    if (!students.length) { toast.error("No students loaded"); return; }
    setGenerating("all");
    let success = 0;
    let failed = 0;
    for (const s of students) {
      try {
        await examinationApi.generateReportCard({
          schoolId: "",
          studentId: s.id,
          academicYear: academicYear || "",
          examType: selectedExamType,
          teacherRemarks: teacherRemarks || undefined,
        });
        success++;
      } catch {
        failed++;
      }
    }
    setGenerating(null);
    toast.success(`Generated ${success} report cards${failed ? `, ${failed} failed` : ""}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Generate Report Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Class *</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("all"); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {availableStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={!selectedClass ? "Select class first" : "All"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Exam Type *</Label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select exam type" /></SelectTrigger>
                <SelectContent>
                  {examTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("-", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Teacher Remarks</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Optional remarks..."
                value={teacherRemarks}
                onChange={e => setTeacherRemarks(e.target.value)}
              />
            </div>
          </div>

          {selectedClass && selectedExamType && students.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {students.length} student{students.length !== 1 ? "s" : ""} in {selectedClass}{selectedSection !== "all" ? ` – ${selectedSection}` : ""}
              </span>
              <Button
                onClick={handleGenerateAll}
                disabled={generating === "all"}
                className="gap-2"
              >
                {generating === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Generate All Report Cards
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student list */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium">
              {loadingStudents ? "Loading students…" : `${students.length} students`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm">
                No students found for selected class/section
              </div>
            ) : (
              <div className="divide-y">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.rollNumber && <div className="text-xs text-muted-foreground">Roll #{s.rollNumber}</div>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleGenerate(s.id)}
                      disabled={!!generating || !selectedExamType}
                    >
                      {generating === s.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                      Generate
                    </Button>
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

// ─── Main Page ───────────────────────────────────────────
export default function Examinations() {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();
  const [activeTab, setActiveTab] = useState("exams");
  const [triggerNewExam, setTriggerNewExam] = useState(false);

  // Stats
  const [stats, setStats] = useState<Partial<ExamStats>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // All exams for the hub
  const [allEvents, setAllEvents] = useState<ExamEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Filters for All Exams tab
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  // Load stats
  useEffect(() => {
    setStatsLoading(true);
    // Include academicYear in filter for correct stats
    const filter = academicYear ? { academicYear } : {};
    examinationApi.getExamStats(filter)
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [academicYear]);

  // Load all exams and group into events
  const loadAllEvents = () => {
    setEventsLoading(true);
    // Include academicYear in filter to ensure correct results
    const filter = academicYear ? { academicYear } : {};
    examinationApi.getExams(filter, 1, 1000)
      .then(res => setAllEvents(groupExamsIntoEvents(res.items ?? [])))
      .catch((err) => {
        console.error('Failed to load exams:', err);
        setAllEvents([]);
      })
      .finally(() => setEventsLoading(false));
  };
  useEffect(() => { loadAllEvents(); }, [academicYear]);

  // Filtered events
  const filteredEvents = allEvents.filter(ev => {
    const matchSearch = !search || ev.examName.toLowerCase().includes(search.toLowerCase()) || ev.classGroup.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || ev.examType === filterType;
    const matchStatus = filterStatus === "all" || ev.status === filterStatus;
    const matchClass = filterClass === "all" || ev.classGroup === filterClass;
    return matchSearch && matchType && matchStatus && matchClass;
  });

  // Unique classes for filter dropdown
  const uniqueClasses = Array.from(new Set(allEvents.map(ev => ev.classGroup)))
    .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));

  // Group filtered events by class for organized display
  const groupedByClass: Record<string, ExamEvent[]> = {};
  for (const ev of filteredEvents) {
    const cls = `Class ${ev.classGroup}${ev.section ? ` – ${ev.section}` : ""}`;
    if (!groupedByClass[cls]) groupedByClass[cls] = [];
    groupedByClass[cls].push(ev);
  }
  const classKeys = Object.keys(groupedByClass).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  const kpiCards = [
    { label: "Total Exams",   value: stats.totalExams ?? 0,     sub: "This year",        icon: <Award className="h-5 w-5 text-blue-500" />,    bg: "bg-blue-50" },
    { label: "Upcoming",      value: stats.scheduledExams ?? 0, sub: "Scheduled",         icon: <Calendar className="h-5 w-5 text-violet-500" />, bg: "bg-violet-50" },
    { label: "In Progress",   value: stats.ongoingExams ?? 0,   sub: "Happening now",     icon: <Clock className="h-5 w-5 text-amber-500" />,    bg: "bg-amber-50" },
    { label: "Completed",     value: stats.completedExams ?? 0, sub: "Results available", icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, bg: "bg-green-50" },
    { label: "Avg Pass Rate", value: `${Math.round(stats.passPercentage ?? 0)}%`, sub: "This year", icon: <TrendingUp className="h-5 w-5 text-rose-500" />, bg: "bg-rose-50" },
  ];

  const analyticsLinks = [
    { title: "Result Summary",     desc: "Overall performance metrics",         icon: "📊", path: "/reports/exam-summary" },
    { title: "Exam Performance",   desc: "Exam-wise performance analysis",       icon: "📈", path: "/reports/exam-performance" },
    { title: "Student Report",     desc: "Individual student marks & grades",    icon: "👤", path: "/reports/student-marks" },
    { title: "Class Analysis",     desc: "Class-wise performance comparison",    icon: "👥", path: "/reports/class-analysis" },
    { title: "Grade Distribution", desc: "Statistical grade distribution",       icon: "📉", path: "/reports/grade-distribution" },
    { title: "Subject Performance",desc: "Subject-wise performance metrics",     icon: "📚", path: "/reports/subject-performance" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" />
            Examinations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create exams, enter marks, generate report cards — all in one place
          </p>
        </div>
        <Button onClick={() => { setTriggerNewExam(true); setActiveTab("schedule"); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Exam
        </Button>
      </div>

      {/* ── KPI Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
                <div className={`h-8 w-8 rounded-full ${k.bg} flex items-center justify-center`}>
                  {k.icon}
                </div>
              </div>
              <div className="text-2xl font-bold">
                {statsLoading ? <span className="text-muted-foreground text-base">—</span> : k.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="exams" className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span>All Exams</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
            <PenLine className="h-4 w-4" />
            <span>Enter Marks</span>
          </TabsTrigger>
          <TabsTrigger value="reportcards" className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span>Report Cards</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-col py-2 gap-0.5 text-xs sm:text-sm sm:flex-row sm:gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* ── All Exams Tab ─────────────────────────────────── */}
        <TabsContent value="exams" className="mt-4">
          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search exams or classes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map(cls => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                <SelectValue placeholder="Exam type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half-yearly">Half Yearly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="pre-board">Pre-Board</SelectItem>
                <SelectItem value="unit-test">Unit Test</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="ongoing">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={loadAllEvents}>
              <RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed rounded-xl">
              <Award className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-muted-foreground mb-2">
                {allEvents.length === 0 ? "No exams yet" : "No exams match filters"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {allEvents.length === 0
                  ? "Create your first exam to get started"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {allEvents.length === 0 && (
                <Button onClick={() => { setTriggerNewExam(true); setActiveTab("schedule"); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Exam
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{filteredEvents.length} exam event{filteredEvents.length !== 1 ? "s" : ""} across {classKeys.length} class{classKeys.length !== 1 ? "es" : ""}</p>
              </div>

              {classKeys.map(classLabel => {
                const events = groupedByClass[classLabel];
                // Sub-group by exam type within each class
                const byType: Record<string, ExamEvent[]> = {};
                for (const ev of events) {
                  const typeLbl = ev.examType ? ev.examType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Other";
                  if (!byType[typeLbl]) byType[typeLbl] = [];
                  byType[typeLbl].push(ev);
                }
                const typeKeys = Object.keys(byType).sort();

                return (
                  <div key={classLabel} className="border rounded-xl overflow-hidden bg-card">
                    {/* Class Header */}
                    <div className="px-5 py-3 bg-muted/40 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{classLabel}</h3>
                          <p className="text-xs text-muted-foreground">{events.length} exam{events.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {events.some(e => e.status === "scheduled") && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            {events.filter(e => e.status === "scheduled").length} Upcoming
                          </span>
                        )}
                        {events.some(e => e.status === "completed") && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                            {events.filter(e => e.status === "completed").length} Done
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Exam type groups */}
                    <div className="divide-y">
                      {typeKeys.map(typeLbl => (
                        <div key={typeLbl} className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                              examTypeColors[byType[typeLbl][0].examType] ?? "bg-gray-100 text-gray-700 border-gray-200"
                            }`}>
                              {typeLbl}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {byType[typeLbl].length} exam{byType[typeLbl].length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {byType[typeLbl].map(ev => (
                              <ExamEventCard
                                key={ev.key}
                                event={ev}
                                onEnterMarks={() => setActiveTab("marks")}
                                onViewSchedule={() => setActiveTab("schedule")}
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
        </TabsContent>

        {/* ── Schedule Tab ──────────────────────────────────── */}
        <TabsContent value="schedule" className="mt-4">
          <ExamTimetableCreator openCreateOnMount={triggerNewExam} key={triggerNewExam ? "new" : "default"} />
        </TabsContent>

        {/* ── Enter Marks Tab ───────────────────────────────── */}
        <TabsContent value="marks" className="mt-4">
          {/* Guidance banner */}
          <div className="flex items-start gap-3 p-4 mb-5 rounded-lg bg-blue-50 border border-blue-200">
            <PenLine className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Enter Marks</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Select a class and exam below to load the marks entry grid. Click individual cells to enter marks, or mark students as absent.
              </p>
            </div>
          </div>
          <ResultsManager />
        </TabsContent>

        {/* ── Report Cards Tab ──────────────────────────────── */}
        <TabsContent value="reportcards" className="mt-4">
          {/* Guidance banner */}
          <div className="flex items-start gap-3 p-4 mb-5 rounded-lg bg-green-50 border border-green-200">
            <GraduationCap className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Report Cards</p>
              <p className="text-sm text-green-700 mt-0.5">
                Select a class and exam type to generate report cards for individual students or the entire class at once. Marks must be entered before generating report cards.
              </p>
            </div>
          </div>
          <ReportCardTab academicYear={academicYear ?? ""} />
        </TabsContent>

        {/* ── Analytics Tab ─────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Performance Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">Detailed analysis and reports for exam performance</p>
          </div>

          {stats.topPerformers && stats.topPerformers.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stats.topPerformers.slice(0, 5).map((p, i) => (
                    <div key={p.studentId} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-amber-100 text-amber-700" :
                          i === 1 ? "bg-gray-100 text-gray-700" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>#{p.rank ?? i + 1}</span>
                        <div>
                          <div className="font-medium text-sm">{p.studentName}</div>
                          <div className="text-xs text-muted-foreground">{p.class}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">{p.percentage}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsLinks.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="p-4 border rounded-xl hover:bg-accent hover:border-primary/40 transition-all text-left group"
              >
                <div className="text-3xl mb-3">{link.icon}</div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{link.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
                <div className="flex items-center gap-1 text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
