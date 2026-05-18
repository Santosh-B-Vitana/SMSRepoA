import { useEffect, useState } from "react";
import {
  Megaphone, Loader2, Bell, Pin, AlertTriangle, Info,
  Calendar, Users, User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getParentAnnouncements,
  type AnnouncementBasic,
  type AnnouncementPriority,
} from "@/services/api/announcementApi";

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const PRIORITY_CONFIG: Record<AnnouncementPriority, {
  label: string; badgeClass: string; icon: React.ReactNode
}> = {
  urgent: { label: "Urgent",  badgeClass: "bg-rose-100 text-rose-700 border-rose-200",   icon: <AlertTriangle className="h-3 w-3" /> },
  high:   { label: "High",    badgeClass: "bg-amber-100 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
  normal: { label: "Normal",  badgeClass: "bg-blue-100 text-blue-700 border-blue-200",    icon: <Info className="h-3 w-3" /> },
  low:    { label: "Low",     badgeClass: "bg-gray-100 text-gray-500 border-gray-200",    icon: <Info className="h-3 w-3" /> },
};

const AUDIENCE_LABEL: Record<string, string> = {
  all:     "Everyone",
  parents: "Parents",
  class:   "Class",
  section: "Section",
};

// ── AnnouncementCard ─────────────────────────────────────────────────────────

function AnnouncementCard({ a }: { a: AnnouncementBasic }) {
  const prio = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.normal;
  const [expanded, setExpanded] = useState(false);
  const long = a.content.length > 250;

  return (
    <Card className={`transition-all hover:shadow-sm ${a.isPinned ? "border-violet-200 dark:border-violet-900/60" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* header row */}
        <div className="flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center ${a.isPinned ? "bg-violet-100 text-violet-600 dark:bg-violet-950/40" : "bg-muted text-muted-foreground"}`}>
            {a.isPinned ? <Pin className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-1">
              <h3 className="text-sm font-bold flex-1 leading-snug">{a.title}</h3>
              {a.isPinned && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                  Pinned
                </span>
              )}
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${prio.badgeClass}`}>
                {prio.icon}{prio.label}
              </span>
            </div>
            {/* meta */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {a.createdByStaffName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{a.createdByStaffName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{AUDIENCE_LABEL[a.targetAudience] ?? a.targetAudience}
                {a.targetClassName && ` · ${a.targetClassName}`}
                {a.targetSectionName && ` ${a.targetSectionName}`}
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <Calendar className="h-3 w-3" />{fmtDate(a.publishedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* content */}
        <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pl-[3.25rem] ${!expanded && long ? "line-clamp-4" : ""}`}>
          {a.content}
        </p>
        {long && (
          <button
            className="pl-[3.25rem] text-xs font-medium text-primary hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {a.attachmentUrl && (
          <a
            href={a.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pl-[3.25rem] inline-block text-xs font-medium text-blue-600 hover:underline"
          >
            View attachment
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const FILTERS = ["All", "Urgent", "High", "Pinned"] as const;
type Filter = typeof FILTERS[number];

export default function ParentAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementBasic[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<Filter>("All");

  useEffect(() => {
    (async () => {
      try {
        const data = await getParentAnnouncements();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Failed to load announcements");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = announcements.filter(a => {
    if (filter === "Urgent") return a.priority === "urgent";
    if (filter === "High")   return a.priority === "high" || a.priority === "urgent";
    if (filter === "Pinned") return a.isPinned;
    return true;
  });

  // Pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
  });

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground mt-1">School notices and updates for your family</p>
      </div>

      {/* filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "Pinned" && <Pin className="h-3.5 w-3.5 mr-1.5" />}
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "All" ? "No announcements yet" : `No ${filter.toLowerCase()} announcements`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => <AnnouncementCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
