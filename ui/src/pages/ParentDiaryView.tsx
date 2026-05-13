/**
 * ParentDiaryView — Premium redesign with diary-book feel
 * Real diary experience: timeline, expandable cards, category colors, mini-calendar sidebar
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Calendar, Search, ChevronDown, ChevronUp,
  GraduationCap, Users, User, FileText, BookMarked,
  Loader2, AlertCircle, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import {
  diaryApi, type DiaryEntry, type DiaryCategory,
  CATEGORY_CONFIG, PRIORITY_CONFIG, type DiaryPriority,
} from "@/services/api/diaryApi";

/* ── helpers ──────────────────────────────────────────────────────────────── */
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function fmtShort(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
function initials(name: string) { return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(); }

/* Category left-strip colors */
const CAT_STRIP: Record<string, string> = {
  homework:    "#8b5cf6",
  announcement:"#3b82f6",
  exam:        "#f59e0b",
  behavior:    "#ef4444",
  achievement: "#10b981",
  reminder:    "#0ea5e9",
  note:        "#64748b",
  activity:    "#ec4899",
  health:      "#22c55e",
  trip:        "#f97316",
};

/* ── DiaryCard ────────────────────────────────────────────────────────────── */
function DiaryCard({ entry }: { entry: DiaryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[entry.category as DiaryCategory] ?? CATEGORY_CONFIG.note;
  const strip = CAT_STRIP[entry.category] ?? "#64748b";
  const needsExpand = entry.content.length > 220;
  const urgent = entry.priority === "urgent";
  const high   = entry.priority === "high";

  return (
    <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-md ${
      urgent ? "border-rose-200 dark:border-rose-900" :
      high   ? "border-amber-200 dark:border-amber-900" :
      "border-border"
    }`} style={{ background: "var(--background)" }}>
      {/* Left category strip */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ background: strip }} />

      <div className="pl-4 pr-4 py-4">
        <div className="flex items-start gap-3">
          {/* Category emoji badge */}
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.bg} border ${cat.border}`}>
            {cat.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-foreground leading-tight flex-1">{entry.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color} ${cat.border}`}>{cat.label}</span>
                {urgent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">Urgent</span>}
                {high   && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Important</span>}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
              {entry.staffName && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{entry.staffName}</span>
              )}
              {entry.diaryType === "class" ? (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />{entry.className ?? "Class"}{entry.sectionName ? ` · ${entry.sectionName}` : ""}&nbsp;(Class-wide)
                </span>
              ) : (
                <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />Personal note</span>
              )}
              <span className="flex items-center gap-1 ml-auto font-medium">
                <Calendar className="h-3 w-3" />{fmtShort(entry.diaryDate)}
              </span>
            </div>

            {/* Content */}
            <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${!expanded && needsExpand ? "line-clamp-3" : ""}`}>
              {entry.content}
            </p>
            {needsExpand && (
              <button className="flex items-center gap-0.5 text-xs font-medium mt-1.5 hover:underline" style={{ color: strip }}
                onClick={() => setExpanded(!expanded)}>
                {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
              </button>
            )}
            {entry.attachmentUrl && (
              <a href={entry.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium mt-2 hover:underline text-blue-600 dark:text-blue-400">
                <FileText className="h-3.5 w-3.5" />{entry.attachmentName ?? "View attachment"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MiniCalendar ─────────────────────────────────────────────────────────── */
function MiniCalendar({ year, month, dotDates, onPrev, onNext }: { year: number; month: number; dotDates: Set<string>; onPrev: () => void; onNext: () => void }) {
  const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
  const today = new Date();
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-3.5 w-3.5" /></button>
        <span className="text-xs font-bold">{monthName}</span>
        <button onClick={onNext} className="p-1 rounded-lg hover:bg-muted transition-colors"><ArrowRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-[9px] text-center font-bold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const hasDot = dotDates.has(iso);
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={i} className={`relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[11px] font-medium transition-colors ${isToday ? "bg-violet-600 text-white" : hasDot ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-bold" : "text-foreground/70 hover:bg-muted"}`}>
              {day}
              {hasDot && !isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══ Main ═══════════════════════════════════════════════════════════════════ */
export default function ParentDiaryView() {
  const [children,       setChildren]       = useState<StudentBasic[]>([]);
  const [selectedChildId,setSelectedChildId]= useState("");
  const [entries,        setEntries]        = useState<DiaryEntry[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [search,          setSearch]          = useState("");
  const [categoryFilter,  setCategoryFilter]  = useState("all");
  const [fromDate,        setFromDate]        = useState(daysAgo(30));
  const [toDate,          setToDate]          = useState(new Date().toISOString().split("T")[0]);
  const [calYear,         setCalYear]         = useState(new Date().getFullYear());
  const [calMonth,        setCalMonth]        = useState(new Date().getMonth());

  /* Load children */
  useEffect(() => {
    (async () => {
      try {
        const data = await studentApi.getMyChildren();
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      } catch { toast.error("Failed to load children"); }
      finally { setLoading(false); }
    })();
  }, []);

  /* Load entries */
  const loadEntries = useCallback(async () => {
    if (!selectedChildId) return;
    setEntriesLoading(true);
    try {
      const data = await diaryApi.getForParent(selectedChildId, {
        fromDate, toDate,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      });
      setEntries(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load diary entries"); }
    finally { setEntriesLoading(false); }
  }, [selectedChildId, fromDate, toDate, categoryFilter]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  /* Filter */
  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.staffName?.toLowerCase().includes(q));
  }, [entries, search]);

  /* Group by date */
  const grouped = useMemo(() => {
    const g: Record<string, DiaryEntry[]> = {};
    filtered.forEach(e => { if (!g[e.diaryDate]) g[e.diaryDate] = []; g[e.diaryDate].push(e); });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [filtered]);

  /* Calendar dot dates */
  const dotDates = useMemo(() => new Set(entries.map(e => e.diaryDate)), [entries]);

  /* Category counts */
  const catCounts = useMemo(() => {
    const m: Partial<Record<DiaryCategory, number>> = {};
    entries.forEach(e => { m[e.category as DiaryCategory] = (m[e.category as DiaryCategory] ?? 0) + 1; });
    return m;
  }, [entries]);

  const urgentCount = entries.filter(e => e.priority === "urgent").length;
  const currentChild = children.find(c => c.id === selectedChildId);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900" />
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <BookMarked className="absolute inset-0 m-auto h-6 w-6 text-violet-600" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Opening diary…</p>
      </div>
    </div>
  );

  if (children.length === 0) return (
    <Card><CardContent className="p-14 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" />
      <p className="font-semibold">No children linked</p>
      <p className="text-sm text-muted-foreground mt-1">Contact school admin to link your child.</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ─── Hero header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: "linear-gradient(135deg,#065f46 0%,#059669 60%,#0d9488 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 30%,rgba(255,255,255,0.07) 0%,transparent 50%)" }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookMarked className="h-4 w-4 text-white/60" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/55">Teacher's Diary</span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              {currentChild ? `${currentChild.name.split(" ")[0]}'s Diary` : "Class Diary"}
            </h1>
            <p className="text-sm text-white/50 mt-1">Teacher notes, homework & announcements</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {urgentCount > 0 && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500 text-white animate-pulse flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />{urgentCount} Urgent
              </span>
            )}
            <span className="text-[11px] text-white/45">{filtered.length} entries</span>
          </div>
        </div>
      </div>

      {/* ─── Child switcher ──────────────────────────────────────────── */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map(c => {
            const sel = selectedChildId === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedChildId(c.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 transition-all whitespace-nowrap ${sel ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border hover:border-emerald-300 bg-card"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${sel ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  {initials(c.name)}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${sel ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.class}{c.section ? ` · ${c.section}` : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Category pills ──────────────────────────────────────────── */}
      {Object.keys(catCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter("all")}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${categoryFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
            All ({entries.length})
          </button>
          {(Object.entries(catCounts) as [DiaryCategory, number][]).sort(([,a],[,b]) => b - a).map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => setCategoryFilter(active ? "all" : cat)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${active ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1` : `border-border text-muted-foreground hover:${cfg.border} hover:${cfg.color}`}`}>
                <span>{cfg.emoji}</span>{cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Main layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">

        {/* ── Left sidebar ─── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mini calendar */}
          <MiniCalendar
            year={calYear} month={calMonth} dotDates={dotDates}
            onPrev={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); }}
            onNext={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); }}
          />

          {/* Date range filter */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date Range</p>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-muted-foreground">From</label>
                <Input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs mt-0.5" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">To</label>
                <Input type="date" value={toDate} min={fromDate} max={new Date().toISOString().split("T")[0]} onChange={e => setToDate(e.target.value)} className="h-8 text-xs mt-0.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Last 7d", days: 7 },
                { label: "Last 30d", days: 30 },
                { label: "Last 90d", days: 90 },
                { label: "This year", days: 365 },
              ].map(({ label, days }) => (
                <button key={label} onClick={() => { setFromDate(daysAgo(days)); setToDate(new Date().toISOString().split("T")[0]); }}
                  className="text-[11px] font-medium px-2 py-1.5 rounded-lg border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Categories</p>
            <div className="space-y-1.5">
              {(Object.entries(CATEGORY_CONFIG) as [DiaryCategory, typeof CATEGORY_CONFIG[DiaryCategory]][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span>{cfg.emoji}</span>
                  <span className="text-muted-foreground">{cfg.label}</span>
                  {catCounts[key] !== undefined && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{catCounts[key]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timeline ─── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by title, content or teacher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
          </div>

          {entriesLoading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : grouped.length === 0 ? (
            <Card>
              <CardContent className="p-14 text-center">
                <BookMarked className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">No diary entries</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {entries.length === 0 ? "No entries from teachers yet in this date range." : "No entries match your search."}
                </p>
                {entries.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setFromDate(daysAgo(90)); setToDate(new Date().toISOString().split("T")[0]); }}>
                    Expand to last 90 days
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, dayEntries]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{fmtDate(date)}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground shrink-0">{dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}</span>
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-3 pl-1">
                    {dayEntries.map(entry => <DiaryCard key={entry.id} entry={entry} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
