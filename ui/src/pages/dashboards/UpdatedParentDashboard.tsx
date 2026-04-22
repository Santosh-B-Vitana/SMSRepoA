import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Calendar, 
  Bell, 
  BookOpen, 
  GraduationCap,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Award,
  CreditCard,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { MultiChildComparison } from "@/components/parent/MultiChildComparison";
import { TransportTrackingWidget } from "@/components/parent/TransportTrackingWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

export default function UpdatedParentDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Mock data for parent dashboard
  const childInfo = {
    name: "Arjun Sharma",
    class: "Class 10-A",
    rollNo: "2024001",
    attendance: "92%",
    performance: "Excellent"
  };

  const recentActivities = [
    { type: "Assignment", title: "Math Assignment submitted", time: "2 hours ago", status: "completed" },
    { type: "Exam", title: "Physics Unit Test", time: "Yesterday", status: "completed" },
    { type: "Fee", title: "Monthly fee payment due", time: "3 days", status: "pending" },
    { type: "Event", title: "Science Fair participation", time: "1 week ago", status: "completed" }
  ];

  const upcomingEvents = [
    { title: "Parent-Teacher Meeting", date: "Sept 15, 2025", type: "meeting" },
    { title: "Annual Sports Day", date: "Sept 20, 2025", type: "event" },
    { title: "Half-yearly Exams", date: "Oct 1, 2025", type: "exam" }
  ];

  const notifications = [
    { title: "Fee Payment Reminder", message: "Monthly fee payment is due in 3 days", type: "warning", time: "1 day ago" },
    { title: "Assignment Submitted", message: "Math assignment has been submitted successfully", type: "success", time: "2 hours ago" },
    { title: "Attendance Alert", message: "Please ensure regular attendance", type: "info", time: "3 days ago" },
    { title: "Exam Results", message: "Physics unit test results are available", type: "info", time: "1 week ago" }
  ];

  const feesSummary = {
    totalDue: 15000,
    pendingAmount: 5000,
    nextDueDate: "Sept 15, 2025",
    status: "pending"
  };

  // Mock multiple children data for comparison
  const children = [
    {
      id: "child1",
      name: "Arjun Sharma",
      class: "Class 10-A",
      rollNo: "2024001",
      attendance: 92,
      performance: "Excellent",
      averageMarks: 88,
      rank: 3,
      totalStudents: 45
    },
    {
      id: "child2",
      name: "Ananya Sharma",
      class: "Class 8-B",
      rollNo: "2024156",
      attendance: 95,
      performance: "Outstanding",
      averageMarks: 92,
      rank: 2,
      totalStudents: 40
    }
  ];

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground variant="gradient" className="fixed inset-0 -z-10 opacity-20" />
      
      <div className="relative space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                {t('dashboard.welcomeBack')}, Parent!
              </h1>
              <p className="text-muted-foreground text-lg">
                {t('dashboard.trackProgress')}
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          </div>
        </AnimatedWrapper>

        {/* Child Overview Cards */}
        <AnimatedWrapper variant="fadeInUp" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernCard variant="glass" className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
              <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.student')}</p>
                <p className="font-semibold">{childInfo.name}</p>
                <p className="text-xs text-muted-foreground">{childInfo.class} • Roll: {childInfo.rollNo}</p>
              </div>
            </div>
              </CardContent>
            </ModernCard>

            <ModernCard variant="glass" className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
              <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.attendance')}</p>
                <p className="font-semibold text-green-600">{childInfo.attendance}</p>
                <p className="text-xs text-muted-foreground">{t('profile.thisMonth')}</p>
              </div>
            </div>
              </CardContent>
            </ModernCard>

            <ModernCard variant="glass" className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.performance')}</p>
                <p className="font-semibold text-blue-600">{childInfo.performance}</p>
                <p className="text-xs text-muted-foreground">{t('profile.overallGrade')}</p>
              </div>
            </div>
              </CardContent>
            </ModernCard>

            <ModernCard variant="glass" className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-500">
              <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('fees.pending')} Fees</p>
                <p className="font-semibold text-orange-600">₹{feesSummary.pendingAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Due: {feesSummary.nextDueDate}</p>
              </div>
            </div>
              </CardContent>
            </ModernCard>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activities */}
            <div className="lg:col-span-2">
              <ModernCard variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('activities.recentActivities')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'Assignment' ? 'bg-blue-100' :
                        activity.type === 'Exam' ? 'bg-purple-100' :
                        activity.type === 'Fee' ? 'bg-orange-100' :
                        'bg-green-100'
                      }`}>
                        {activity.type === 'Assignment' && <BookOpen className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'Exam' && <GraduationCap className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'Fee' && <AlertCircle className="h-4 w-4 text-orange-600" />}
                        {activity.type === 'Event' && <Award className="h-4 w-4 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                      {activity.status === 'completed' ? t('activities.completed') : t('activities.pending')}
                    </Badge>
                  </div>
                ))}
                  </div>
                </CardContent>
              </ModernCard>

              {/* Fees Summary Card */}
              <ModernCard variant="glass" className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('fees.feeSummary')}
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/fees')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('fees.viewDetails')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('fees.totalFees')}</p>
                  <p className="text-xl font-bold">₹{feesSummary.totalDue.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('fees.pending')}</p>
                  <p className="text-xl font-bold text-orange-600">₹{feesSummary.pendingAmount.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('fees.nextDue')}</p>
                  <p className="text-sm font-medium">{feesSummary.nextDueDate}</p>
                  <Button size="sm" className="mt-2 w-full">
                    {t('fees.payNow')}
                  </Button>
                </div>
                </div>
              </CardContent>
            </ModernCard>
          </div>

          {/* Upcoming Events & Notifications */}
          <div className="space-y-6">
            <ModernCard variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('activities.upcomingEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {event.type}
                    </Badge>
                  </div>
                ))}
                </div>
              </CardContent>
            </ModernCard>

            <ModernCard variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notifications.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className={`mt-1 ${
                        notification.type === 'warning' ? 'text-orange-500' :
                        notification.type === 'success' ? 'text-green-500' :
                        'text-blue-500'
                      }`}>
                        {notification.type === 'warning' && <AlertCircle className="h-4 w-4" />}
                        {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
                        {notification.type === 'info' && <Bell className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </CardContent>
            </ModernCard>
          </div>
        </div>
      </AnimatedWrapper>

        {/* Additional Tabs for Enhanced Features */}
        <AnimatedWrapper variant="fadeInUp" delay={0.4}>
          <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Compare Children</TabsTrigger>
          <TabsTrigger value="transport">Transport Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Main dashboard overview displayed above
          </p>
        </TabsContent>

        <TabsContent value="comparison">
          {children.length >= 2 ? (
            <MultiChildComparison children={children} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Multi-child comparison available when you have multiple children enrolled
              </CardContent>
            </Card>
          )}
        </TabsContent>

          <TabsContent value="transport">
            <TransportTrackingWidget childId={childInfo.name} />
          </TabsContent>
        </Tabs>
      </AnimatedWrapper>
    </div>
    </div>
  );
}