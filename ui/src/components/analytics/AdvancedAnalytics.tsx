
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, BookOpen, DollarSign,
  Calendar, Target, Award, GraduationCap, Activity,
  AlertTriangle, CheckCircle, UserCheck, BriefcaseBusiness,
} from "lucide-react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { staffApi } from "@/services/api/staffApi";
import { toast } from "sonner";

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

function StatCard({
  label, value, sub, icon: Icon, loading, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; loading?: boolean; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
            {sub && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                <span className="text-xs text-muted-foreground truncate">{sub}</span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-primary shrink-0 ml-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

export function AdvancedAnalytics() {
  const [attendanceDays, setAttendanceDays] = useState(30);
  const [feeMonths, setFeeMonths]           = useState(6);

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: overview, isLoading: overviewLoading, error: overviewErr } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn:  () => analyticsApi.getOverviewStats(),
    staleTime: 2 * 60_000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn:  () => analyticsApi.getDashboardSummary(),
    staleTime: 2 * 60_000,
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['analytics', 'attendance', attendanceDays],
    queryFn:  () => analyticsApi.getAttendanceAnalytics(attendanceDays),
    staleTime: 60_000,
  });

  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['analytics', 'enrollment'],
    queryFn:  () => analyticsApi.getEnrollmentAnalytics(),
    staleTime: 5 * 60_000,
  });

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['analytics', 'performance'],
    queryFn:  () => analyticsApi.getPerformanceAnalytics(),
    staleTime: 5 * 60_000,
  });

  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ['analytics', 'fees', feeMonths],
    queryFn:  () => analyticsApi.getFeeAnalytics(feeMonths),
    staleTime: 60_000,
  });

  const { data: allStaff, isLoading: staffLoading } = useQuery({
    queryKey: ['analytics', 'staff-list'],
    queryFn:  () => staffApi.list(1, 200),
    staleTime: 5 * 60_000,
  });

  if (overviewErr) {
    toast.error('Failed to load analytics data');
  }

  // â”€â”€ Derived chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const attendanceChartData = (attendance?.dailyData ?? []).map(d => ({
    date: d.date.slice(5), // MM-DD
    present: d.presentCount,
    absent:  d.absentCount,
    late:    d.lateCount,
    pct:     d.attendancePercentage,
  }));

  const subjectChartData = (performance?.bySubject ?? []).map(s => ({
    subject:  s.subject,
    avg:      Number(s.averagePercentage.toFixed(1)),
    passRate: Number(s.passRate.toFixed(1)),
  }));

  const enrollmentChartData = (enrollment?.byClass ?? [])
    .slice(0, 10)
    .map(c => ({ name: c.className, students: c.totalStudents, fill: c.fillPercentage ?? 0 }));

  const feeChartData = (fees?.monthlyData ?? []).map(m => ({
    month:     m.month,
    collected: m.collected,
    pending:   m.pending,
    overdue:   m.overdue,
  }));

  const overviewPieData = overview
    ? [
        { name: 'Active Students', value: overview.activeStudents },
        { name: 'Inactive', value: overview.totalStudents - overview.activeStudents },
      ]
    : [];

  // ── Staff analytics derived data ──────────────────────────────────────────
  const staffList = allStaff?.staff ?? [];
  const teachingStaff    = staffList.filter(s => ['teacher','senior teacher','class teacher','subject teacher','head of department','principal','vice principal'].some(t => (s.designation ?? '').toLowerCase().includes(t)));
  const nonTeachingStaff = staffList.filter(s => !teachingStaff.some(t => t.id === s.id));

  // Department distribution
  const deptMap: Record<string, number> = {};
  for (const s of staffList) {
    const dept = s.department || 'Unknown';
    deptMap[dept] = (deptMap[dept] ?? 0) + 1;
  }
  const deptChartData = Object.entries(deptMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Teaching vs Non-Teaching pie
  const staffTypePie = [
    { name: 'Teaching', value: teachingStaff.length },
    { name: 'Non-Teaching', value: nonTeachingStaff.length },
  ].filter(d => d.value > 0);

  // Active vs Inactive (use status field if available)
  const activeStaffCount   = (allStaff?.staff ?? []).filter(s => (s.status ?? 'active').toLowerCase() === 'active').length;
  const inactiveStaffCount = staffList.length - activeStaffCount;

  const staffStudentRatio = overview?.totalStudents && staffList.length > 0
    ? (overview.totalStudents / staffList.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Advanced Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
      </div>

      {/* Top KPI cards - live data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Students"
          value={overviewLoading ? 'â€“' : (overview?.activeStudents ?? 0)}
          sub={`${overview?.totalStudents ?? 0} total`}
          icon={Users}
          loading={overviewLoading}
          trend="up"
        />
        <StatCard
          label="Today's Attendance"
          value={summaryLoading ? 'â€“' : `${Math.round(summary?.todayAttendancePercentage ?? 0)}%`}
          sub={`${summary?.todayAbsentStudents ?? 0} absent today`}
          icon={Calendar}
          loading={summaryLoading}
          trend={(summary?.todayAttendancePercentage ?? 0) >= 90 ? 'up' : 'down'}
        />
        <StatCard
          label="Pending Fees"
          value={feesLoading ? 'â€“' : formatCurrency(fees?.totalPending ?? 0)}
          sub={`Collection rate ${fees?.collectionRate?.toFixed(1) ?? 0}%`}
          icon={DollarSign}
          loading={feesLoading}
          trend={(fees?.collectionRate ?? 0) >= 80 ? 'up' : 'down'}
        />
        <StatCard
          label="Upcoming Exams"
          value={summaryLoading ? 'â€“' : (summary?.upcomingExams ?? 0)}
          sub="Next 7 days"
          icon={Award}
          loading={summaryLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        {/* â”€â”€ Overview Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Staff', value: overview?.totalStaff, sub: `${overview?.activeStaff} active`, icon: Users },
              { label: 'Classes', value: overview?.totalClasses, icon: GraduationCap },
              { label: 'Books Issued', value: overview?.booksIssued, sub: `${overview?.totalBooks} total`, icon: BookOpen },
              { label: 'Pending Admissions', value: overview?.pendingAdmissions, icon: Activity },
              { label: 'Health Alerts', value: overview?.openHealthAlerts, icon: AlertTriangle },
              { label: 'Transport', value: overview?.transportStudents, icon: Target },
            ].map(({ label, value, sub, icon: Ic }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center space-y-1">
                  <Ic className="h-5 w-5 mx-auto text-muted-foreground" />
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-12 mx-auto" />
                  ) : (
                    <p className="text-xl font-bold">{value ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student active/inactive pie */}
            <Card>
              <CardHeader>
                <CardTitle>Student Status</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={overviewPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {overviewPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Enrollment by class (top 10) */}
            <Card>
              <CardHeader>
                <CardTitle>Enrollment by Class</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollmentLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : enrollmentChartData.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">No class data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={enrollmentChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="students" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* â”€â”€ Attendance Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="attendance" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Attendance Analytics</h2>
            <Select
              value={String(attendanceDays)}
              onValueChange={v => setAttendanceDays(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Average Attendance', value: `${attendance?.averageAttendancePercentage?.toFixed(1) ?? 0}%` },
              { label: 'Highest Day', value: `${attendance?.highestAttendancePercentage?.toFixed(1) ?? 0}%` },
              { label: 'Lowest Day', value: `${attendance?.lowestAttendancePercentage?.toFixed(1) ?? 0}%` },
              { label: 'Perfect Days', value: attendance?.perfectAttendanceDays ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  {attendanceLoading ? <Skeleton className="h-7 w-14 mx-auto mb-1" /> : <p className="text-xl font-bold">{value}</p>}
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : attendanceChartData.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">No attendance data for this range</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={attendanceChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="absent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(val) => [Number(val).toLocaleString(), '']} />
                    <Legend />
                    <Area type="monotone" dataKey="present" stroke="#22c55e" fill="url(#present)" strokeWidth={2} name="Present" />
                    <Area type="monotone" dataKey="absent"  stroke="#ef4444" fill="url(#absent)"  strokeWidth={2} name="Absent" />
                    <Area type="monotone" dataKey="late"    stroke="#f59e0b" fill="#f59e0b"        fillOpacity={0.3} strokeWidth={2} name="Late" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ Performance Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="performance" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Exams', value: performance?.totalExams ?? 0 },
              { label: 'Total Results', value: performance?.totalResults ?? 0 },
              { label: 'Overall Average', value: `${performance?.overallAveragePercentage?.toFixed(1) ?? 0}%` },
              { label: 'Overall Pass Rate', value: `${performance?.overallPassRate?.toFixed(1) ?? 0}%` },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  {perfLoading ? <Skeleton className="h-7 w-14 mx-auto mb-1" /> : <p className="text-xl font-bold">{value}</p>}
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : subjectChartData.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">No exam results available</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={subjectChartData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(val) => [`${val}%`, '']} />
                    <Legend />
                    <Bar dataKey="avg"      fill="#6366f1" name="Avg %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="passRate" fill="#22c55e" name="Pass Rate %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Subject table */}
          {!perfLoading && subjectChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Subject Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 px-3">Subject</th>
                        <th className="text-right py-2 px-3">Results</th>
                        <th className="text-right py-2 px-3">Avg %</th>
                        <th className="text-right py-2 px-3">Pass</th>
                        <th className="text-right py-2 px-3">Fail</th>
                        <th className="text-right py-2 px-3">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(performance?.bySubject ?? []).map((s) => (
                        <tr key={s.subject} className="border-b hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3 font-medium">{s.subject}</td>
                          <td className="py-2 px-3 text-right">{s.totalResults}</td>
                          <td className="py-2 px-3 text-right">{s.averagePercentage.toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right text-green-600">{s.passCount}</td>
                          <td className="py-2 px-3 text-right text-red-500">{s.failCount}</td>
                          <td className="py-2 px-3 text-right">
                            <Badge variant={s.passRate >= 80 ? 'default' : s.passRate >= 60 ? 'secondary' : 'destructive'}>
                              {s.passRate.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* â”€â”€ Financial Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="financial" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fee Analytics</h2>
            <Select
              value={String(feeMonths)}
              onValueChange={v => setFeeMonths(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Billed',    value: formatCurrency(fees?.totalBilled    ?? 0) },
              { label: 'Collected',       value: formatCurrency(fees?.totalCollected ?? 0) },
              { label: 'Pending',         value: formatCurrency(fees?.totalPending   ?? 0) },
              { label: 'Overdue',         value: formatCurrency(fees?.totalOverdue   ?? 0) },
              { label: 'Collection Rate', value: `${fees?.collectionRate?.toFixed(1) ?? 0}%` },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  {feesLoading ? <Skeleton className="h-7 w-16 mx-auto mb-1" /> : <p className="text-xl font-bold">{value}</p>}
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(fees?.collectionRate ?? 0) < 60 && !feesLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Fee collection rate is below 60%. Consider sending payment reminders.
              </AlertDescription>
            </Alert>
          )}

          {(fees?.collectionRate ?? 0) >= 90 && !feesLoading && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Excellent fee collection rate of {fees?.collectionRate?.toFixed(1)}%!
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Monthly Fee Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : feeChartData.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">No fee data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={feeChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val) => [formatCurrency(Number(val)), '']} />
                    <Legend />
                    <Bar dataKey="collected" stackId="a" fill="#22c55e" name="Collected"  radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending"   stackId="a" fill="#f59e0b" name="Pending"    />
                    <Bar dataKey="overdue"   stackId="a" fill="#ef4444" name="Overdue"    radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Staff Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="staff" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Staff Analytics</h2>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Staff',
                value: staffLoading ? '—' : staffList.length,
                icon: Users,
                sub: `${activeStaffCount} active`,
              },
              {
                label: 'Teaching Staff',
                value: staffLoading ? '—' : teachingStaff.length,
                icon: GraduationCap,
                sub: `${nonTeachingStaff.length} non-teaching`,
              },
              {
                label: 'Active Staff',
                value: staffLoading ? '—' : activeStaffCount,
                icon: UserCheck,
                sub: inactiveStaffCount > 0 ? `${inactiveStaffCount} inactive` : 'All active',
              },
              {
                label: 'Student : Teacher Ratio',
                value: staffLoading || overviewLoading ? '—' : staffStudentRatio,
                icon: BriefcaseBusiness,
                sub: 'students per staff',
              },
            ].map(({ label, value, icon: Ic, sub }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Ic className="h-7 w-7 text-primary shrink-0" />
                    <div>
                      {staffLoading ? (
                        <Skeleton className="h-7 w-14 mb-1" />
                      ) : (
                        <p className="text-2xl font-bold">{value}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teaching vs Non-Teaching pie */}
            <Card>
              <CardHeader>
                <CardTitle>Teaching vs Non-Teaching</CardTitle>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : staffTypePie.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">No staff data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={staffTypePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {staffTypePie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Department distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Staff by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : deptChartData.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">No department data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={deptChartData} layout="vertical" margin={{ left: 16, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Staff" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Staff directory table */}
          {!staffLoading && staffList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Staff Directory ({staffList.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Department</th>
                        <th className="text-left py-2 px-3">Designation</th>
                        <th className="text-left py-2 px-3">Experience</th>
                        <th className="text-left py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.slice(0, 15).map((s) => (
                        <tr key={s.id} className="border-b hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3 font-medium">
                            {s.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim()}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{s.department ?? '—'}</td>
                          <td className="py-2 px-3">{s.designation ?? '—'}</td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {s.experience ? `${s.experience} yrs` : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={(s.status ?? 'active').toLowerCase() === 'active' ? 'default' : 'secondary'}
                              className="capitalize text-xs"
                            >
                              {s.status ?? 'Active'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {staffList.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Showing 15 of {staffList.length} staff members. Go to{' '}
                      <a href="/staff" className="text-primary hover:underline">Staff page</a>{' '}
                      to see all.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

