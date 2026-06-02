import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bell, Pin, AlertCircle, Search, RefreshCw, Megaphone, CheckCircle2,
} from "lucide-react";
import {
  getMyAnnouncements, markAnnouncementAsRead,
  type AnnouncementBasic, type AnnouncementPriority,
} from "@/services/api/announcementApi";
// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<AnnouncementPriority, string> = {
  low:    "bg-gray-100  text-gray-700  border-gray-200",
  normal: "bg-blue-100  text-blue-700  border-blue-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100   text-red-700   border-red-200",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as AnnouncementPriority;
  return (
    <Badge variant="outline" className={PRIORITY_BADGE[p] ?? ""}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </Badge>
  );
}

// ─── Detail Dialog ─────────────────────────────────────────────────────────

function DetailDialog({
  announcement,
  staffId,
  open,
  onClose,
  onRead,
}: {
  announcement: AnnouncementBasic | null;
  staffId: string;
  open: boolean;
  onClose: () => void;
  onRead: (id: string) => void;
}) {
  const markRead = useMutation({
    mutationFn: () =>
      markAnnouncementAsRead({
        announcementId: announcement!.id,
        recipientType: "Staff",
        recipientId: staffId,
      }),
    onSuccess: () => onRead(announcement!.id),
    onError: () => {/* silently ignore — not critical */},
  });

  if (!announcement) return null;

  const handleOpen = (o: boolean) => {
    if (o && announcement) {
      // Mark as read silently on open
      markRead.mutate();
    }
    if (!o) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {announcement.isPinned && <Pin className="h-4 w-4 text-orange-500 shrink-0" />}
            {announcement.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={announcement.priority} />
            <Badge variant="secondary" className="capitalize">
              {announcement.targetAudience === "class" && announcement.targetClassName
                ? `Class: ${announcement.targetClassName}`
                : announcement.targetAudience}
            </Badge>
            {!announcement.isActive && (
              <Badge variant="outline" className="bg-gray-100 text-gray-500">Inactive</Badge>
            )}
            {announcement.isExpired && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Expired</Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-3">
            <span>Posted: {fmtDate(announcement.publishedDate)}</span>
            <span>Expires: {fmtDate(announcement.expiryDate)}</span>
            {announcement.createdByStaffName && (
              <span className="col-span-2">By: {announcement.createdByStaffName}</span>
            )}
          </div>
          {announcement.attachmentUrl && (
            <a
              href={announcement.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              View Attachment
            </a>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  a,
  onClick,
  isRead,
}: {
  a: AnnouncementBasic;
  onClick: () => void;
  isRead: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-sm transition-shadow border-l-4 ${
        a.priority === "urgent" ? "border-l-red-500" :
        a.priority === "high"   ? "border-l-orange-500" :
        a.priority === "normal" ? "border-l-blue-400" :
        "border-l-gray-200"
      } ${!isRead ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {a.isPinned && <Pin className="h-3 w-3 text-orange-500 shrink-0" />}
              {!isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
              <p className="font-medium text-sm truncate">{a.title}</p>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.content}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={a.priority} />
              <span className="text-xs text-muted-foreground">{fmtDate(a.publishedDate)}</span>
              {a.targetAudience === "class" && a.targetClassName && (
                <Badge variant="outline" className="text-xs">Class {a.targetClassName}</Badge>
              )}
            </div>
          </div>
          {isRead ? (
            <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
          ) : (
            <Bell className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StaffAnnouncementsViewProps {
  staffId?: string; // kept for future use but resolution is server-side
}

export function StaffAnnouncementsView({ staffId: _staffId }: StaffAnnouncementsViewProps) {
  const { user } = useAuth();
  const staffId = _staffId ?? user?.id ?? "";
  const [search, setSearch]         = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selected, setSelected]     = useState<AnnouncementBasic | null>(null);
  const [readIds, setReadIds]        = useState<Set<string>>(new Set());

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["my-announcements"],
    queryFn: () => getMyAnnouncements(),
    staleTime: 60_000,
  });

  const handleRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const filtered = announcements.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchPriority = filterPriority === "all" || a.priority === filterPriority;
    return matchSearch && matchPriority;
  });

  // Pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
  });

  const unreadCount = announcements.filter(a => !readIds.has(a.id) && a.unreadCount > 0).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread announcement${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search announcements…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <AlertCircle className="h-10 w-10" />
          <p className="font-medium">No announcements for you</p>
          <p className="text-sm">Check back later or ask your administrator.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => (
            <AnnouncementCard
              key={a.id}
              a={a}
              isRead={readIds.has(a.id) || (a.readCount > 0 && a.unreadCount === 0)}
              onClick={() => setSelected(a)}
            />
          ))}
        </div>
      )}

      <DetailDialog
        announcement={selected}
        staffId={staffId}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRead={handleRead}
      />
    </div>
  );
}
