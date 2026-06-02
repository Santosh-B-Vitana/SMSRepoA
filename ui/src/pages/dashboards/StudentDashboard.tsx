
import { useEffect, useState } from "react";
import { BookOpen, Calendar, Award, Clock, TrendingUp, Loader2 } from "lucide-react";
import { StatsCard } from "../../components/dashboard/StatsCard";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { studentApi, StudentProfileSummary, StudentResponse } from "@/services/api/studentApi";
import { timetableApi, TimetablePeriod } from "@/services/api/timetableApi";
import { academicApi } from "@/services/api/academicApi";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfileSummary | null>(null);
  const [todayPeriods, setTodayPeriods] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const studentRecord: StudentResponse = await studentApi.getMe();
        const summary = await studentApi.profileSummary(studentRecord.id);
        setProfile(summary);

        // Load today's timetable for the student's class
        const classes = await academicApi.listClasses(1, 200);
        const myClass = classes.classes.find(c => c.name === studentRecord.class);
        if (myClass) {
          const timetables = await timetableApi.list(myClass.id);
          if (timetables.timetables.length > 0) {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const detail = await timetableApi.getDetail(timetables.timetables[0].id);
            const filtered = detail.periods
              .filter(p => p.dayOfWeek === today && p.periodType !== 'break' && p.periodType !== 'lunch')
              .sort((a, b) => a.periodNumber - b.periodNumber);
            setTodayPeriods(filtered);
          }
        }
      } catch {
        // errors are silently handled — dashboard shows empty states
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Aggregate subject performance from exam results
  const subjectPerformance = profile?.exams?.results
    ? Object.entries(
        profile.exams.results.reduce((acc, r) => {
          if (!acc[r.subject]) acc[r.subject] = { total: 0, count: 0 };
          acc[r.subject].total += r.percentage;
          acc[r.subject].count++;
          return acc;
        }, {} as Record<string, { total: number; count: number }>)
      ).map(([subject, { total, count }]) => ({
        subject,
        score: Math.round(total / count),
      }))
    : [];

  const avgPercentage = subjectPerformance.length > 0
    ? Math.round(subjectPerformance.reduce((s, x) => s + x.score, 0) / subjectPerformance.length)
    : null;
  const avgGrade = avgPercentage !== null
    ? avgPercentage >= 90 ? 'A+' : avgPercentage >= 80 ? 'A' : avgPercentage >= 70 ? 'B' : avgPercentage >= 60 ? 'C' : 'D'
    : '--';

  const attendancePercent = profile?.attendance?.attendancePercent ?? null;

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground variant="particles" className="fixed inset-0 -z-10" />

      <div className="space-y-8 animate-fade-in relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div>
            <h1 className="text-display">Hello, {user?.name}!</h1>
            <p className="text-muted-foreground mt-2">
              Your daily schedule and academic progress overview.
            </p>
          </div>
        </AnimatedWrapper>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <AnimatedWrapper variant="fadeInUp" delay={0.2}>
              <div className="mobile-stats grid gap-3 sm:gap-4 lg:gap-6">
                <StatsCard
                  title="My Attendance"
                  value={attendancePercent !== null ? `${attendancePercent.toFixed(1)}%` : '--'}
                  icon={Calendar}
                />
                <StatsCard
                  title="Average Grade"
                  value={avgGrade}
                  icon={Award}
                />
                <StatsCard
                  title="Absent Days"
                  value={profile?.attendance?.absentDays ?? '--'}
                  icon={BookOpen}
                />
                <StatsCard
                  title="Exam Results"
                  value={profile?.exams?.results?.length ?? '--'}
                  icon={Clock}
                />
              </div>
            </AnimatedWrapper>

            <AnimatedWrapper variant="fadeInUp" delay={0.3}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {/* Today's Classes */}
                <ModernCard variant="glass">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Today's Classes
                  </h3>
                  <div className="space-y-3">
                    {todayPeriods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
                    ) : (
                      todayPeriods.map((period) => (
                        <div key={period.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{period.subjectName ?? 'Subject'}</p>
                            <p className="text-xs text-muted-foreground">
                              {period.teacherName ?? 'Teacher'}
                              {period.room ? ` • ${period.room}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {period.startTime?.slice(0, 5)} - {period.endTime?.slice(0, 5)}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Period {period.periodNumber}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ModernCard>

                {/* Recent Exam Results */}
                <ModernCard variant="glass">
                  <h3 className="text-lg font-semibold mb-4">Recent Exam Results</h3>
                  <div className="space-y-3">
                    {profile?.exams?.results?.length ? (
                      profile.exams.results.slice(0, 4).map((result, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary">
                          <p className="font-medium text-sm">{result.examName} — {result.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.marksObtained}/{result.totalMarks} ({result.percentage.toFixed(0)}%)
                            {result.grade ? ` • Grade: ${result.grade}` : ''}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No exam results available yet.</p>
                    )}
                  </div>
                </ModernCard>
              </div>
            </AnimatedWrapper>

            {/* Subject Performance Chart */}
            {subjectPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Subject Performance
                  </CardTitle>
                  <CardDescription>Average scores by subject from exam results</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="score" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Attendance Summary */}
            {profile?.attendance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Attendance Summary
                  </CardTitle>
                  <CardDescription>Your attendance for this academic period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Attendance</span>
                      <span className="text-sm text-muted-foreground">
                        {profile.attendance.attendancePercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={profile.attendance.attendancePercent} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="font-semibold text-green-600">{profile.attendance.presentDays}</p>
                      <p className="text-muted-foreground">Present</p>
                    </div>
                    <div>
                      <p className="font-semibold text-red-600">{profile.attendance.absentDays}</p>
                      <p className="text-muted-foreground">Absent</p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-600">{profile.attendance.lateDays}</p>
                      <p className="text-muted-foreground">Late</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}


  return (
    <div className="relative min-h-screen">
      <AnimatedBackground variant="particles" className="fixed inset-0 -z-10" />
      
      <div className="space-y-8 animate-fade-in relative z-10">
        {/* Welcome Section */}
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div>
        <h1 className="text-display">Hello, {user?.name}!</h1>
        <p className="text-muted-foreground mt-2">
            Your daily schedule and academic progress overview.
          </p>
          </div>
        </AnimatedWrapper>

        {/* Stats Cards - Mobile responsive */}
        <AnimatedWrapper variant="fadeInUp" delay={0.2}>
          <div className="mobile-stats grid gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="My Attendance"
          value={`${studentData.attendance}%`}
          icon={Calendar}
        />
        <StatsCard
          title="Average Grade"
          value={studentData.averageGrade}
          icon={Award}
        />
        <StatsCard
          title="Pending Assignments"
          value={studentData.assignmentsPending}
          icon={BookOpen}
        />
        <StatsCard
          title="Upcoming Exams"
            value={studentData.upcomingExams}
            icon={Clock}
          />
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Today's Classes */}
            <ModernCard variant="glass">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Today's Classes
              </h3>
              <div className="space-y-3">
                {todayClasses.map((classItem, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{classItem.subject}</p>
                      <p className="text-xs text-muted-foreground">{classItem.teacher} • {classItem.room}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{classItem.time}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        45 min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ModernCard>

            {/* Assignments & Exams */}
            <ModernCard variant="glass">
              <h3 className="text-lg font-semibold mb-4">Assignments & Exams</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/5 border-l-4 border-warning">
                  <p className="font-medium text-sm">Math Assignment</p>
                  <p className="text-xs text-muted-foreground">Due: Tomorrow</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 border-l-4 border-destructive">
                  <p className="font-medium text-sm">Science Project</p>
                  <p className="text-xs text-muted-foreground">Due: March 15, 2024</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary">
                  <p className="font-medium text-sm">History Exam</p>
                  <p className="text-xs text-muted-foreground">March 18, 2024</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary">
                  <p className="font-medium text-sm">English Exam</p>
                  <p className="text-xs text-muted-foreground">March 20, 2024</p>
                </div>
              </div>
            </ModernCard>
          </div>
        </AnimatedWrapper>

        {/* Academic Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Grade Progress Trend
              </CardTitle>
              <CardDescription>Your performance over the semester</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={gradeProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[80, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line type="monotone" dataKey="grade" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Subject Performance
              </CardTitle>
              <CardDescription>Latest test scores by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="score" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning Goals Progress</CardTitle>
            <CardDescription>Track your progress towards semester goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mathematics Mastery</span>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Reading Challenge</span>
                <span className="text-sm text-muted-foreground">70%</span>
              </div>
              <Progress value={70} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Science Projects</span>
                <span className="text-sm text-muted-foreground">95%</span>
              </div>
              <Progress value={95} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
