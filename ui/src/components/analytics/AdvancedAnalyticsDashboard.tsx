import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, Users, DollarSign, BookOpen, Calendar } from 'lucide-react';
import { analyticsApi, type DashboardSummaryResponse } from '@/services/api/analyticsApi';

// Mock data for charts
const enrollmentData = [
  { month: 'Jan', students: 450, staff: 45 },
  { month: 'Feb', students: 465, staff: 46 },
  { month: 'Mar', students: 480, staff: 47 },
  { month: 'Apr', students: 495, staff: 48 },
  { month: 'May', students: 510, staff: 49 },
  { month: 'Jun', students: 525, staff: 50 }
];

const feeCollectionData = [
  { month: 'Jan', collected: 450000, pending: 50000 },
  { month: 'Feb', collected: 480000, pending: 45000 },
  { month: 'Mar', collected: 500000, pending: 40000 },
  { month: 'Apr', collected: 520000, pending: 35000 },
  { month: 'May', collected: 540000, pending: 30000 },
  { month: 'Jun', collected: 560000, pending: 25000 }
];

const attendanceData = [
  { day: 'Mon', percentage: 95 },
  { day: 'Tue', percentage: 93 },
  { day: 'Wed', percentage: 94 },
  { day: 'Thu', percentage: 96 },
  { day: 'Fri', percentage: 92 },
  { day: 'Sat', percentage: 88 }
];

const classDistribution = [
  { name: 'Class 1', value: 60 },
  { name: 'Class 2', value: 58 },
  { name: 'Class 3', value: 62 },
  { name: 'Class 4', value: 55 },
  { name: 'Class 5', value: 50 }
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdvancedAnalyticsDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getDashboardSummary()
      .then(d => setSummary(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into school performance
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.totalStudents ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active enrolment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">
                {(summary?.pendingFees ?? 0) >= 100000
                  ? `₹${((summary?.pendingFees ?? 0) / 100000).toFixed(1)}L`
                  : `₹${((summary?.pendingFees ?? 0) / 1000).toFixed(0)}K`}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Outstanding dues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-14" /> : (
              <div className="text-2xl font-bold">{Math.round(summary?.todayAttendancePercentage ?? 0)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? null : (summary?.todayAttendancePercentage ?? 0) >= 90
                ? <span className="text-green-600">On target</span>
                : <span className="text-amber-600">Below target</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold">{summary?.upcomingExams ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="enrollment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollment">Enrollment Trends</TabsTrigger>
          <TabsTrigger value="fees">Fee Collection</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="distribution">Class Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student & Staff Growth</CardTitle>
              <CardDescription>Monthly enrollment trends over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="students" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" />
                  <Area type="monotone" dataKey="staff" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Analysis</CardTitle>
              <CardDescription>Monthly collected vs pending fees</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={feeCollectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="collected" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="pending" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance Trends</CardTitle>
              <CardDescription>Daily attendance percentage for current week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class-wise Student Distribution</CardTitle>
              <CardDescription>Number of students per class</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={classDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {classDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
