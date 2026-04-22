
import { useEffect, useState } from "react";
import { BookOpen, Calendar, Award, Users, Clock, MessageSquare, TrendingUp } from "lucide-react";
import { StatsCard } from "../../components/dashboard/StatsCard";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

const gradeProgressData = [
  { month: 'Sep', grade: 85 },
  { month: 'Oct', grade: 87 },
  { month: 'Nov', grade: 89 },
  { month: 'Dec', grade: 88 },
  { month: 'Jan', grade: 91 },
  { month: 'Feb', grade: 92 }
];

const subjectPerformance = [
  { subject: 'Math', score: 92 },
  { subject: 'Science', score: 88 },
  { subject: 'English', score: 95 },
  { subject: 'History', score: 85 },
  { subject: 'Geography', score: 90 }
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState({
    attendance: 96.2,
    averageGrade: "A",
    assignmentsPending: 3,
    upcomingExams: 2
  });

  const todayClasses = [
  { time: "08:00 - 08:45", subject: "Mathematics", teacher: "Mr. Anil Kumar", room: "Room 101" },
  { time: "09:00 - 09:45", subject: "English", teacher: "Ms. Priya Singh", room: "Room 205" },
  { time: "11:00 - 11:45", subject: "Science", teacher: "Dr. Rajesh Sharma", room: "Lab 1" },
  { time: "14:00 - 14:45", subject: "History", teacher: "Ms. Ananya Sharma", room: "Room 303" }
  ];

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
