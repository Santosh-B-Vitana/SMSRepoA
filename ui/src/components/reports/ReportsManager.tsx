import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCheck, Award, FileText, BarChart3,
  Calendar, TrendingUp, Building, Eye, Download,
  ArrowRight, Clock, CheckCircle2, AlertCircle,
  PieChart, BookOpen, GraduationCap,
} from "lucide-react";
import { ReportGenerator } from "./ReportGenerator";

// ─── Quick-access tiles ────────────────────────────────────────────────────────

interface CategoryTile {
  title: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  badgeClass: string;
  href: string;
  tag?: string;
}

const QUICK_LINKS: CategoryTile[] = [
  {
    title: "Students",
    description: "Browse student profiles, academic history, attendance and fee status",
    icon: Users,
    colorClass: "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300",
    badgeClass: "bg-blue-100 text-blue-700",
    href: "/students",
    tag: "People",
  },
  {
    title: "Staff & Teachers",
    description: "View teacher profiles, class assignments, payroll and attendance records",
    icon: UserCheck,
    colorClass: "bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-300",
    badgeClass: "bg-violet-100 text-violet-700",
    href: "/staff",
    tag: "People",
  },
  {
    title: "Advanced Analytics",
    description: "In-depth charts on attendance trends, fee collection and exam performance",
    icon: BarChart3,
    colorClass: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
    badgeClass: "bg-emerald-100 text-emerald-700",
    href: "/advanced-analytics",
    tag: "Insights",
  },
  {
    title: "Exam Performance",
    description: "Subject-wise exam result analysis across classes and sections",
    icon: Award,
    colorClass: "bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300",
    badgeClass: "bg-amber-100 text-amber-700",
    href: "/reports/exam-performance",
    tag: "Academics",
  },
  {
    title: "Student Marks",
    description: "Individual student marks, grades and performance breakdown",
    icon: FileText,
    colorClass: "bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300",
    badgeClass: "bg-orange-100 text-orange-700",
    href: "/reports/student-marks",
    tag: "Academics",
  },
  {
    title: "Class Analysis",
    description: "Class-level comparison of attendance, results and academic performance",
    icon: GraduationCap,
    colorClass: "bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300",
    badgeClass: "bg-sky-100 text-sky-700",
    href: "/reports/class-analysis",
    tag: "Academics",
  },
  {
    title: "Grade Distribution",
    description: "How grades are distributed across subjects and classes this year",
    icon: PieChart,
    colorClass: "bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
    badgeClass: "bg-rose-100 text-rose-700",
    href: "/reports/grade-distribution",
    tag: "Academics",
  },
  {
    title: "Subject Performance",
    description: "Subject-wise pass rates, averages and top performers",
    icon: BookOpen,
    colorClass: "bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300",
    badgeClass: "bg-teal-100 text-teal-700",
    href: "/reports/subject-performance",
    tag: "Academics",
  },
  {
    title: "Exam Summary",
    description: "High-level overview of all exams and consolidated results",
    icon: TrendingUp,
    colorClass: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300",
    badgeClass: "bg-indigo-100 text-indigo-700",
    href: "/reports/exam-summary",
    tag: "Academics",
  },
  {
    title: "Report Cards",
    description: "Generate and download printable student report cards",
    icon: Calendar,
    colorClass: "bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300",
    badgeClass: "bg-pink-100 text-pink-700",
    href: "/report-cards",
    tag: "Documents",
  },
  {
    title: "DISE Report",
    description: "Government DISE compliance report for submission to education dept.",
    icon: Building,
    colorClass: "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
    badgeClass: "bg-gray-100 text-gray-700",
    href: "/reports/dise",
    tag: "Government",
  },
];

// ─── Mock history data ─────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  {
    id: "1", name: "Student Attendance Report", type: "student-attendance",
    generatedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    status: "completed", format: "PDF",
  },
  {
    id: "2", name: "Fee Collection Report – Q1", type: "fee-collection",
    generatedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
    status: "completed", format: "Excel",
  },
  {
    id: "3", name: "Exam Results – Mid Term", type: "exam-results",
    generatedAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    status: "completed", format: "PDF",
  },
  {
    id: "4", name: "Staff Attendance – June 2025", type: "staff-attendance",
    generatedAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
    status: "failed", format: "CSV",
  },
  {
    id: "5", name: "Academic Performance Report", type: "performance",
    generatedAt: new Date(Date.now() - 86400_000).toISOString(),
    status: "completed", format: "PDF",
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ReportsManager() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(MOCK_HISTORY);

  const handleGenerate = (config: unknown) => {
    const cfg = config as { name?: string; type: string; format: string; id: string; generatedAt: string };
    const newReport = {
      id:          cfg.id,
      name:        cfg.name ?? cfg.type,
      type:        cfg.type,
      generatedAt: cfg.generatedAt,
      status:      "completed" as const,
      format:      cfg.format.toUpperCase(),
    };
    setHistory(prev => [newReport, ...prev]);
  };

  const completedCount  = history.filter(r => r.status === "completed").length;
  const thisMonthCount  = history.filter(r => {
    const d = new Date(r.generatedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Browse student and staff records, or generate custom reports for any module.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Reports",  value: history.length,  icon: FileText,      color: "text-blue-500" },
          { label: "This Month",     value: thisMonthCount,  icon: Calendar,      color: "text-violet-500" },
          { label: "Completed",      value: completedCount,  icon: CheckCircle2,  color: "text-green-500" },
          { label: "Failed",         value: history.length - completedCount, icon: AlertCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 shrink-0 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Access – People ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">People</h2>
          <Badge variant="outline" className="text-xs">Quick Access</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_LINKS.filter(c => c.tag === "People").map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.title}
                onClick={() => navigate(cat.href)}
                className={`group text-left p-5 rounded-xl border-2 transition-all duration-150 cursor-pointer ${cat.colorClass}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cat.badgeClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{cat.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Report Categories ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Academic & Financial Reports</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.filter(c => c.tag !== "People").map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.title}
                onClick={() => navigate(cat.href)}
                className={`group text-left p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer ${cat.colorClass}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cat.badgeClass} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground">{cat.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.badgeClass}`}>
                          {cat.tag}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-1 ml-2" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Generate / History / Scheduled tabs ── */}
      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Custom Report</TabsTrigger>
          <TabsTrigger value="history">Report History ({history.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <ReportGenerator onGenerate={handleGenerate} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.format}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Clock className="h-3.5 w-3.5" />
                          {timeAgo(report.generatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === "completed" ? "default" : "destructive"}>
                          {report.status === "completed" ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Completed</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" />Failed</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={report.status !== "completed"}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={report.status !== "completed"}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <Card className="py-14 text-center border-dashed">
            <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">No scheduled reports</p>
            <p className="text-xs text-muted-foreground mt-1">
              Schedule automated reports to be generated and emailed at regular intervals.
            </p>
            <Button variant="outline" className="mt-4" disabled>
              Schedule a Report
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
