import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Calendar, Award, Bell, BadgeIndianRupee, TrendingUp,
  BookOpen, GraduationCap, CheckCircle, XCircle, Timer, ArrowRight,
  Loader2, AlertCircle, ChevronRight
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { studentApi, type StudentBasic, type StudentProfileSummary } from "@/services/api/studentApi";
import { notificationApi, type NotificationItem } from "@/services/api/notificationApi";
import { toast } from "sonner";

interface ChildDashboardData {
  child: StudentBasic;
  summary: StudentProfileSummary | null;
  loading: boolean;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<StudentBasic[]>([]);
  const [childData, setChildData] = useState<Map<string, ChildDashboardData>>(new Map());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [childrenData, notifData] = await Promise.all([
        studentApi.getMyChildren(),
        notificationApi.getMyNotifications({ page: 1, pageSize: 5 }).catch(() => ({
          notifications: [], unreadCount: 0, total: 0, page: 1, pageSize: 5, totalPages: 0
        })),
      ]);

      setChildren(childrenData);
      setNotifications(notifData.notifications);
      setUnreadCount(notifData.unreadCount);

      if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].id);

        const dataMap = new Map<string, ChildDashboardData>();
        childrenData.forEach(c => dataMap.set(c.id, { child: c, summary: null, loading: true }));
        setChildData(new Map(dataMap));

        const summaries = await Promise.allSettled(
          childrenData.map(c => studentApi.profileSummary(c.id))
        );

        summaries.forEach((result, idx) => {
          const childId = childrenData[idx].id;
          if (result.status === "fulfilled") {
            dataMap.set(childId, { child: childrenData[idx], summary: result.value, loading: false });
          } else {
            dataMap.set(childId, { child: childrenData[idx], summary: null, loading: false });
          }
        });
        setChildData(new Map(dataMap));
      }
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <WelcomeHeader name={user?.name} />
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Children Linked</h3>
            <p className="text-muted-foreground max-w-md">
              Your account does not have any children linked yet. Please contact the school administration to link your children to your parent portal account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentData = childData.get(selectedChildId);
  const currentChild = children.find(c => c.id === selectedChildId);
  const summary = currentData?.summary;

  return (
    <div className="space-y-6">
      <WelcomeHeader name={user?.name} />

      {children.length > 1 ? (
        <div className="flex items-center gap-3 pb-2 overflow-x-auto">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all min-w-fit ${
                selectedChildId === child.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                selectedChildId === child.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {child.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${selectedChildId === child.id ? "text-primary" : ""}`}>
                  {child.name}
                </p>
                <p className="text-xs text-muted-foreground">{child.class} {child.section ? `- ${child.section}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      ) : currentChild ? (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {currentChild.photoUrl ? (
                <img src={currentChild.photoUrl} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <GraduationCap className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{currentChild.name}</h3>
              <p className="text-sm text-muted-foreground">
                {currentChild.class} {currentChild.section ? `- ${currentChild.section}` : ""} | Roll No: {currentChild.rollNumber}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentData?.loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DashStatsCard
              icon={<Calendar className="h-5 w-5" />}
              label="Attendance"
              value={`${summary.attendance?.attendancePercent ?? 0}%`}
              color={getAttendanceColor(summary.attendance?.attendancePercent ?? 0)}
              sublabel={`${summary.attendance?.presentDays ?? 0} of ${summary.attendance?.totalDays ?? 0} days`}
            />
            <DashStatsCard
              icon={<Award className="h-5 w-5" />}
              label="Latest Grade"
              value={summary.exams?.results?.[0]?.grade ?? "-"}
              color="blue"
              sublabel={summary.exams?.results?.[0] ? `${summary.exams.results[0].subject}: ${summary.exams.results[0].percentage.toFixed(0)}%` : "No results yet"}
            />
            <DashStatsCard
              icon={<BadgeIndianRupee className="h-5 w-5" />}
              label="Pending Fees"
              value={`\u20B9${(summary.fee?.pendingAmount ?? 0).toLocaleString("en-IN")}`}
              color={summary.fee?.pendingAmount ? "amber" : "green"}
              sublabel={summary.fee?.status === "Paid" ? "All clear" : `of \u20B9${(summary.fee?.totalAmount ?? 0).toLocaleString("en-IN")}`}
            />
            <DashStatsCard
              icon={<Bell className="h-5 w-5" />}
              label="Notifications"
              value={unreadCount.toString()}
              color={unreadCount > 0 ? "red" : "green"}
              sublabel={unreadCount > 0 ? "unread messages" : "All caught up"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Attendance Overview
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/child-profile")}>
                      View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Overall Attendance</span>
                      <span className="text-sm font-semibold">{summary.attendance?.attendancePercent ?? 0}%</span>
                    </div>
                    <Progress value={summary.attendance?.attendancePercent ?? 0} className="h-3" />
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">{summary.attendance?.presentDays ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">{summary.attendance?.absentDays ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium">{summary.attendance?.lateDays ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Recent Exam Results
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/child-profile")}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {summary.exams?.results && summary.exams.results.length > 0 ? (
                    <div className="space-y-3">
                      {summary.exams.results.slice(0, 5).map((result, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              result.percentage >= 80 ? "bg-green-100 text-green-700" :
                              result.percentage >= 60 ? "bg-blue-100 text-blue-700" :
                              result.percentage >= 40 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {result.grade || "-"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{result.subject}</p>
                              <p className="text-xs text-muted-foreground">{result.examName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{result.marksObtained}/{result.totalMarks}</p>
                            <p className="text-xs text-muted-foreground">{result.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6">No exam results available yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BadgeIndianRupee className="h-4 w-4 text-primary" />
                      Fee Summary
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/parent-fees")}>
                      Details <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {summary.fee ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Fee</span>
                          <span className="font-medium">{"\u20B9"}{summary.fee.totalAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="font-medium text-green-600">{"\u20B9"}{summary.fee.paidAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pending</span>
                          <span className={`font-semibold ${summary.fee.pendingAmount > 0 ? "text-amber-600" : "text-green-600"}`}>
                            {"\u20B9"}{summary.fee.pendingAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <Progress value={summary.fee.totalAmount > 0 ? (summary.fee.paidAmount / summary.fee.totalAmount) * 100 : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {summary.fee.totalAmount > 0 ? ((summary.fee.paidAmount / summary.fee.totalAmount) * 100).toFixed(0) : 0}% paid
                      </p>
                      {summary.fee.pendingAmount > 0 && (
                        <Button className="w-full" size="sm" onClick={() => navigate(`/parent-fees/${selectedChildId}/pay`)}>
                          <BadgeIndianRupee className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No fee data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">{unreadCount}</Badge>
                      )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/parent-notifications")}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.slice(0, 4).map(notif => (
                        <div key={notif.id} className={`flex gap-3 p-2 rounded-lg transition-colors ${!notif.isRead ? "bg-primary/5" : ""}`}>
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? "bg-primary" : "bg-transparent"}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${!notif.isRead ? "font-medium" : ""}`}>{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(notif.createdAt)}</p>
                          </div>
                          <NotifTypeIcon type={notif.type} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No notifications</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <QuickLink icon={<User className="h-4 w-4" />} label="Child Profile" onClick={() => navigate("/child-profile")} />
                    <QuickLink icon={<BookOpen className="h-4 w-4" />} label="Academic Results" onClick={() => navigate("/child-profile")} />
                    <QuickLink icon={<BadgeIndianRupee className="h-4 w-4" />} label="Fee Payments" onClick={() => navigate("/parent-fees")} />
                    <QuickLink icon={<Bell className="h-4 w-4" />} label="All Notifications" onClick={() => navigate("/parent-notifications")} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {children.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Children Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {children.map(child => {
                    const data = childData.get(child.id);
                    const s = data?.summary;
                    return (
                      <div
                        key={child.id}
                        className="p-4 rounded-xl border hover:border-primary/40 transition-all cursor-pointer"
                        onClick={() => { setSelectedChildId(child.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{child.name}</p>
                            <p className="text-xs text-muted-foreground">{child.class} {child.section ? `- ${child.section}` : ""}</p>
                          </div>
                        </div>
                        {data?.loading ? (
                          <div className="h-16 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : s ? (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold text-blue-600">{s.attendance?.attendancePercent ?? 0}%</p>
                              <p className="text-[10px] text-muted-foreground">Attendance</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-purple-600">{s.exams?.results?.[0]?.grade ?? "-"}</p>
                              <p className="text-[10px] text-muted-foreground">Latest Grade</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-amber-600">{"\u20B9"}{((s.fee?.pendingAmount ?? 0) / 1000).toFixed(0)}K</p>
                              <p className="text-[10px] text-muted-foreground">Due</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No data</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Unable to load details for this child.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WelcomeHeader({ name }: { name?: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{greeting}, {name?.split(" ")[0] ?? "Parent"}</h1>
      <p className="text-muted-foreground mt-1">Here is an overview of your children's progress</p>
    </div>
  );
}

function DashStatsCard({ icon, label, value, color, sublabel }: { icon: React.ReactNode; label: string; value: string; color: string; sublabel?: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <Card className={`border ${colorMap[color] ?? "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
        <p className="text-2xl font-bold">{value}</p>
        {sublabel && <p className="text-xs opacity-60 mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors group">
      <div className="flex items-center gap-2.5">
        <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
    </button>
  );
}

function NotifTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes("fee") || t.includes("payment")) return <BadgeIndianRupee className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  if (t.includes("exam") || t.includes("result")) return <Award className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  if (t.includes("attendance")) return <Calendar className="h-3.5 w-3.5 text-green-500 shrink-0" />;
  return <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getAttendanceColor(percent: number): string {
  if (percent >= 90) return "green";
  if (percent >= 75) return "blue";
  if (percent >= 60) return "amber";
  return "red";
}
