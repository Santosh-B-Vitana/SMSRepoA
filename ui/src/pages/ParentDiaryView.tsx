/**
 * ParentDiaryView — Parent portal diary view
 * Shows diary entries from teachers, filtered by child and category.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Calendar, Search, Filter, ChevronDown, ChevronUp,
  GraduationCap, Users, Star, Eye, Bell, FileText, User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import {
  diaryApi, type DiaryEntry, type DiaryCategory,
  CATEGORY_CONFIG, PRIORITY_CONFIG, type DiaryPriority,
} from "@/services/api/diaryApi";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Entry card for parents ───────────────────────────────────────────────────

function ParentDiaryCard({ entry }: { entry: DiaryEntry }) {
  const cat = CATEGORY_CONFIG[entry.category as DiaryCategory] ?? CATEGORY_CONFIG.note;
  const pri = PRIORITY_CONFIG[entry.priority as DiaryPriority] ?? PRIORITY_CONFIG.normal;
  const [expanded, setExpanded] = useState(false);
  const needsExpand = entry.content.length > 200;

  return (
    <Card className={`border-l-4 ${entry.priority === "urgent" ? "border-l-rose-500" : entry.priority === "high" ? "border-l-amber-500" : "border-l-transparent"} hover:shadow-sm transition-all`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Category icon */}
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.bg} border ${cat.border}`}>
            {cat.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex flex-wrap items-start gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0">{entry.title}</h3>
              <div className="flex gap-1.5 shrink-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color} ${cat.border}`}>
                  {cat.emoji} {cat.label}
                </span>
                {entry.priority === "urgent" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                    Urgent
                  </span>
                )}
                {entry.priority === "high" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Important
                  </span>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] text-muted-foreground">
              {entry.staffName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{entry.staffName}
                </span>
              )}
              {entry.diaryType === "class" ? (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {entry.className ?? "Class"}{entry.sectionName ? ` · ${entry.sectionName}` : ""} (Class-wide)
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />Personal note
                </span>
              )}
              <span className="flex items-center gap-1 ml-auto">
                <Calendar className="h-3 w-3" />{formatDate(entry.diaryDate)}
              </span>
            </div>

            {/* Content */}
            <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${!expanded && needsExpand ? "line-clamp-3" : ""}`}>
              {entry.content}
            </p>
            {needsExpand && (
              <button
                className="flex items-center gap-0.5 text-xs text-primary mt-1.5 hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
              </button>
            )}

            {entry.attachmentUrl && (
              <a
                href={entry.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary mt-2 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {entry.attachmentName ?? "Attachment"}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParentDiaryView() {
  const { user } = useAuth();
  const [children, setChildren] = useState<StudentBasic[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  // ── Load children ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await studentApi.getMyChildren();
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg ?? "Failed to load children data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load diary entries ────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!selectedChildId) return;
    setEntriesLoading(true);
    try {
      const data = await diaryApi.getForParent(selectedChildId, {
        fromDate, toDate,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      });
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to load diary entries");
    } finally {
      setEntriesLoading(false);
    }
  }, [selectedChildId, fromDate, toDate, categoryFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.staffName?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // ── Group entries by date ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, DiaryEntry[]> = {};
    filtered.forEach(e => {
      const d = e.diaryDate;
      if (!g[d]) g[d] = [];
      g[d].push(e);
    });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  // Stats
  const categoryCounts = useMemo(() => {
    const m: Partial<Record<DiaryCategory, number>> = {};
    entries.forEach(e => { m[e.category as DiaryCategory] = (m[e.category as DiaryCategory] ?? 0) + 1; });
    return m;
  }, [entries]);

  const currentChild = children.find(c => c.id === selectedChildId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="space-y-2 text-center">
          <div className="h-8 w-8 animate-spin border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading diary…</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium">No children linked</p>
          <p className="text-sm text-muted-foreground mt-1">Contact school admin to link your child.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Student Diary</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Notes, observations and messages from your child's teachers
        </p>
      </div>

      {/* Child selector + Stats */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => {
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                    selectedChildId === c.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <Avatar className="h-6 w-6">
                    {c.photoUrl && <img src={c.photoUrl} alt="" />}
                    <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Quick category counts */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {(Object.entries(categoryCounts) as [DiaryCategory, number][])
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                className={[
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                  CATEGORY_CONFIG[cat].bg,
                  CATEGORY_CONFIG[cat].border,
                  CATEGORY_CONFIG[cat].color,
                  categoryFilter === cat ? "ring-2 ring-offset-1 ring-primary/40" : "",
                ].join(" ")}
              >
                {CATEGORY_CONFIG[cat].emoji}
                <span>{count}</span>
                <span className="opacity-70">{CATEGORY_CONFIG[cat].label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search diary…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(Object.keys(CATEGORY_CONFIG) as DiaryCategory[]).map(c => (
                  <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-xs">
              <Input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs w-36" />
              <span className="text-muted-foreground">–</span>
              <Input type="date" value={toDate} min={fromDate} max={new Date().toISOString().split("T")[0]} onChange={e => setToDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      {entriesLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-24" /></Card>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No diary entries</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {entries.length === 0
                ? "No entries from teachers yet in this date range"
                : "No entries match your search"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayEntries]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  <Calendar className="h-3 w-3" />
                  {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {dayEntries.map(entry => (
                  <ParentDiaryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
