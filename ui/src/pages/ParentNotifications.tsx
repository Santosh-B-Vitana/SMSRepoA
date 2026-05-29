import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Loader2, Calendar, Award,
  BadgeIndianRupee, MessageSquare, Check, CheckCheck, Filter,
  BookOpen, ExternalLink, GraduationCap, Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notificationApi, type NotificationItem } from "@/services/api/notificationApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const TYPES = ["All", "Diary", "Fee", "Exam", "Attendance", "Announcement", "Assignment", "Message", "Payment"];

export default function ParentNotifications() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<StudentBasic[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState("All");
  const [marking, setMarking] = useState<Set<string>>(new Set());

  // Load children on mount
  useEffect(() => {
    studentApi.getMyChildren()
      .then(kids => {
        setChildren(kids);
        // Default to "all" if only one child or none — no need to filter
      })
      .catch(() => {})
      .finally(() => setChildrenLoading(false));
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 20 };
      if (selectedType !== "All") params.type = selectedType;
      if (selectedChild !== "all") params.studentId = selectedChild;
      const res = await notificationApi.getMyNotifications(params as any);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, selectedChild]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Reset to page 1 when child or type changes
  const handleChildSelect = (childId: string) => {
    setSelectedChild(childId);
    setPage(1);
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setPage(1);
  };

  const handleMarkRead = async (id: string) => {
    setMarking(prev => new Set(prev).add(id));
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setMarking(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Child selector — only shown when parent has 2+ children */}
      {!childrenLoading && children.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Filter by child
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => handleChildSelect("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 ${
                selectedChild === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              All children
            </button>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 ${
                  selectedChild === child.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={child.photoUrl} />
                  <AvatarFallback className="text-[9px]">
                    {child.firstName?.[0]}{child.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {child.firstName} {child.lastName}
                {child.class && <span className="opacity-70 text-xs">· {child.class}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TYPES.map(type => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            size="sm"
            onClick={() => handleTypeSelect(type)}
            className="shrink-0"
          >
            <TypeIcon type={type} />
            <span className="ml-1.5">{type}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {selectedType === "All" ? "No notifications yet" : `No ${selectedType.toLowerCase()} notifications`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const childForNotif = notif.studentId ? children.find(c => c.id === notif.studentId) : null;
            return (
            <Card
              key={notif.id}
              className={`transition-all hover:shadow-sm ${!notif.isRead ? "border-primary/30 bg-primary/[0.02]" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="shrink-0 mt-0.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(notif.type)}`}>
                      <TypeIcon type={notif.type} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className={`text-sm ${!notif.isRead ? "font-semibold" : "font-medium"}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                          {/* Show child chip when viewing all children and notification is child-specific */}
                          {selectedChild === "all" && childForNotif && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              <GraduationCap className="h-3 w-3" />
                              {childForNotif.firstName} {childForNotif.lastName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{notif.content}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{notif.type}</Badge>
                          {notif.priority !== "Normal" && (
                            <Badge
                              variant={notif.priority === "High" || notif.priority === "Urgent" ? "destructive" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {notif.priority}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(notif.createdAt)}</span>
                          {notif.actionUrl && (
                            <button
                              onClick={() => navigate(notif.actionUrl!)}
                              className="text-xs text-primary flex items-center gap-1 hover:underline ml-auto"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </button>
                          )}
                        </div>
                      </div>
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          disabled={marking.has(notif.id)}
                          onClick={() => handleMarkRead(notif.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === "diary") return <BookOpen className="h-4 w-4" />;
  if (t.includes("fee") || t.includes("payment")) return <BadgeIndianRupee className="h-4 w-4" />;
  if (t.includes("exam") || t.includes("result")) return <Award className="h-4 w-4" />;
  if (t.includes("attendance")) return <Calendar className="h-4 w-4" />;
  if (t.includes("announce")) return <MessageSquare className="h-4 w-4" />;
  if (t.includes("message")) return <MessageSquare className="h-4 w-4" />;
  if (t === "all") return <Filter className="h-3.5 w-3.5" />;
  return <Bell className="h-4 w-4" />;
}

function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t === "diary") return "bg-violet-100 text-violet-600";
  if (t.includes("fee") || t.includes("payment")) return "bg-amber-100 text-amber-600";
  if (t.includes("exam") || t.includes("result")) return "bg-blue-100 text-blue-600";
  if (t.includes("attendance")) return "bg-green-100 text-green-600";
  if (t.includes("announce")) return "bg-purple-100 text-purple-600";
  return "bg-gray-100 text-gray-600";
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
