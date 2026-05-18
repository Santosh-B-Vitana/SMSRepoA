/**
 * NotificationCenter — API-connected notification bell with dropdown.
 * Pulls live data from /api/notifications/my & /api/notifications/unread-count.
 * Polling every 30 seconds for near-real-time updates.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Info, AlertCircle, CheckCircle, Trash2, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteMyNotification,
  type NotificationItem,
} from "@/services/api/notificationApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Priority / type colour helpers ─────────────────────────────────────────

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "Urgent": return "border-l-red-500";
    case "High":   return "border-l-orange-400";
    case "Normal": return "border-l-blue-400";
    default:       return "border-l-gray-300";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "Exam":
    case "Assignment":
      return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    case "Fee":
    case "Payment":
      return <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />;
    case "Attendance":
      return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ─── Single notification item ────────────────────────────────────────────────

interface ItemProps {
  n: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string) => void;
  markingId: string | null;
  deletingId: string | null;
}

function NotificationListItem({ n, onMarkRead, onDelete, onNavigate, markingId, deletingId }: ItemProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-3 border-b border-l-4 transition-colors hover:bg-muted/40",
        !n.isRead && "bg-blue-50/60 dark:bg-blue-950/20",
        getPriorityColor(n.priority)
      )}
    >
      <div className="mt-0.5">{getTypeIcon(n.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={cn("text-sm leading-snug", !n.isRead && "font-semibold")}>{n.title}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">{formatRelativeTime(n.createdAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
        {n.senderName && (
          <p className="text-xs text-muted-foreground mt-0.5">From: {n.senderName}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {n.actionUrl && (
            <button
              onClick={() => onNavigate(n.actionUrl!)}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View
            </button>
          )}
          {!n.isRead && (
            <button
              onClick={() => onMarkRead(n.id)}
              disabled={markingId === n.id}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {markingId === n.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Check className="h-3 w-3" />}
              Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(n.id)}
            disabled={deletingId === n.id}
            className="text-xs text-destructive hover:underline flex items-center gap-1 disabled:opacity-50 ml-auto"
          >
            {deletingId === n.id
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Trash2 className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const notificationsPageUrl = user?.role === "parent" ? "/parent-notifications" : "/notifications";

  // Unread count — polls every 30 seconds for badge freshness
  const { data: countData } = useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

  // Full list — loaded when sheet opens
  const { data, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => getMyNotifications({ page: 1, pageSize: 30 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: (id) => setMarkingId(id),
    onSettled: () => setMarkingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
    onError: () => toast.error("Failed to mark as read"),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyNotification,
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-unread-count"] });
    },
    onError: () => toast.error("Failed to delete notification"),
  });

  const unreadCount = countData?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount} unread</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs h-7"
              >
                {markAllMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  : <CheckCheck className="h-3 w-3 mr-1" />}
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <NotificationListItem
                  key={n.id}
                  n={n}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onNavigate={(url) => { setOpen(false); navigate(url); }}
                  markingId={markingId}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {data && data.totalPages > 1 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex-shrink-0">
            Showing first 30 of {data.total} notifications.
          </div>
        )}
        <div className="border-t px-4 py-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary flex items-center justify-center gap-1.5"
            onClick={() => { setOpen(false); navigate(notificationsPageUrl); }}
          >
            View all notifications <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
