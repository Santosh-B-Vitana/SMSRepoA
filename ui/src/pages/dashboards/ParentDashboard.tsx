import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Bell, BadgeIndianRupee, BookOpen,
  GraduationCap, CheckCircle, XCircle, Timer, ArrowRight,
  Loader2, AlertCircle, ChevronRight, KeyRound, MessageSquare,
  BookMarked, Sparkles, TrendingUp, Trophy, Clock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { studentApi, type StudentBasic, type StudentProfileSummary } from "@/services/api/studentApi";
import { notificationApi, type NotificationItem } from "@/services/api/notificationApi";
import {
  getExamSetups, getStudentExamSetupResult,
  type ExamSetupBasicDto, type StudentExamResultSummaryDto,
} from "@/services/api/examSetupApi";
import { diaryApi, type DiaryEntry, CATEGORY_CONFIG, type DiaryCategory } from "@/services/api/diaryApi";
import { toast } from "sonner";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

interface ChildDashboardData {
  child: StudentBasic;
  summary: StudentProfileSummary | null;
  loading: boolean;
}

const SUBJECT_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-orange-500"];

function gradeColors(pct: number) {
  if (pct >= 90) return { text: "text-emerald-700 dark:text-emerald-400", light: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800", label: "Excellent" };
  if (pct >= 75) return { text: "text-blue-700 dark:text-blue-400",       light: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",             label: "Good"      };
  if (pct >= 60) return { text: "text-amber-700 dark:text-amber-400",     light: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",         label: "Average"   };
  if (pct >= 40) return { text: "text-orange-700 dark:text-orange-400",   light: "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800",     label: "Below Avg" };
  return               { text: "text-rose-700 dark:text-rose-400",         light: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800",             label: "Needs Help"};
}
function attColor(p: number) { return p >= 90 ? "text-emerald-600" : p >= 75 ? "text-blue-600" : p >= 60 ? "text-amber-600" : "text-rose-600"; }
function formatTimeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24); if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function AttRing({ pct }: { pct: number }) {
  const r = 30, c = 2 * Math.PI * r, fill = Math.min(pct, 100) / 100 * c;
  const clr = pct >= 90 ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="6" stroke="currentColor" className="text-muted/25" />
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="6" stroke={clr} strokeLinecap="round"
        strokeDasharray={`${fill} ${c}`} transform="rotate(-90 38 38)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="38" y="43" textAnchor="middle" fontSize="13" fontWeight="800" fill={clr}>{pct}%</text>
    </svg>
  );
}

function StatCard({ g, icon, label, value, sub, dot }: {
  g: string; icon: React.ReactNode; label: string; value: string; sub: string;
  dot: "emerald"|"amber"|"rose"|"blue"|"slate";
}) {
  const dotCls = { emerald:"bg-emerald-400", amber:"bg-amber-400", rose:"bg-rose-400", blue:"bg-blue-400", slate:"bg-slate-400" }[dot];
  return (
    <Card className="overflow-hidden">
      <div className={`h-[3px] bg-gradient-to-r ${g}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${g} flex items-center justify-center text-white shrink-0`}>{icon}</div>
          <div className={`w-2 h-2 rounded-full mt-1 ${dotCls}`} />
        </div>
        <p className="text-[1.6rem] font-black leading-none mt-1 tracking-tight">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { schoolInfo } = useSchool();
  const navigate = useNavigate();

  const [children,      setChildren]      = useState<StudentBasic[]>([]);
  const [childData,     setChildData]     = useState<Map<string, ChildDashboardData>>(new Map());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [selectedChild, setSelectedChild] = useState("");
  const [pwOpen,        setPwOpen]        = useState(false);
  const [diaryEntries,  setDiaryEntries]  = useState<DiaryEntry[]>([]);
  const [expandedExam,  setExpandedExam]  = useState<string | null>(null);
  const [examEntries,   setExamEntries]   = useState<{ setup: ExamSetupBasicDto; result: StudentExamResultSummaryDto }[]>([]);
  const [examLoading,   setExamLoading]   = useState(false);

  const requirePwChange = !!(user as Record<string, unknown>)?.requirePasswordChange;
  useEffect(() => { if (requirePwChange) setPwOpen(true); }, [requirePwChange]);

  const loadExams = useCallback(async (sid: string) => {
    setExamLoading(true);
    try {
      const res = await getExamSetups({ status: "published", pageSize: 10 });
      const found: typeof examEntries = [];
      await Promise.allSettled((res.items ?? []).map(async setup => {
        try { found.push({ setup, result: await getStudentExamSetupResult(setup.id, sid) }); } catch { /* not in exam */ }
      }));
      found.sort((a, b) => (b.setup.startDate ?? b.setup.createdAt ?? "").localeCompare(a.setup.startDate ?? a.setup.createdAt ?? ""));
      setExamEntries(found);
    } catch { setExamEntries([]); } finally { setExamLoading(false); }
  }, []);

  const loadDiary = useCallback(async (sid: string) => {
    try {
      const from = new Date(); from.setDate(from.getDate() - 30);
      const data = await diaryApi.getForParent(sid, { fromDate: from.toISOString().split("T")[0], toDate: new Date().toISOString().split("T")[0] });
      setDiaryEntries(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch { setDiaryEntries([]); }
  }, []);

  useEffect(() => { if (selectedChild) { loadExams(selectedChild); loadDiary(selectedChild); } }, [selectedChild, loadExams, loadDiary]);

  useEffect(() => {
    (async () => {
      try {
        const [kids, notif] = await Promise.all([
          studentApi.getMyChildren(),
          notificationApi.getMyNotifications({ page: 1, pageSize: 5 }).catch(() => ({ notifications: [], unreadCount: 0, total: 0, page: 1, pageSize: 5, totalPages: 0 })),
        ]);
        setChildren(kids); setNotifications(notif.notifications); setUnreadCount(notif.unreadCount);
        if (kids.length > 0) {
          setSelectedChild(kids[0].id);
          const map = new Map<string, ChildDashboardData>();
          kids.forEach(k => map.set(k.id, { child: k, summary: null, loading: true }));
          setChildData(new Map(map));
          const results = await Promise.allSettled(kids.map(k => studentApi.profileSummary(k.id)));
          results.forEach((r, i) => { map.set(kids[i].id, { child: kids[i], summary: r.status === "fulfilled" ? r.value : null, loading: false }); });
          setChildData(new Map(map));
        }
      } catch { toast.error("Failed to load dashboard data"); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900" />
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <GraduationCap className="absolute inset-0 m-auto h-6 w-6 text-violet-600" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading your child's dashboard…</p>
      </div>
    </div>
  );

  if (children.length === 0) return (
    <div className="space-y-6">
      <HeroBanner name={user?.name} school={schoolInfo?.name} child={null} />
      <Card><CardContent className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold">No Children Linked</h3>
        <p className="text-sm text-muted-foreground max-w-md">Your account does not have any children linked yet. Contact the school administration.</p>
        <Badge variant="secondary">Contact School Admin</Badge>
      </CardContent></Card>
    </div>
  );

  const curData  = childData.get(selectedChild);
  const curChild = children.find(c => c.id === selectedChild);
  const summary  = curData?.summary;
  const attPct   = summary?.attendance?.attendancePercent ?? 0;
  const latest   = examEntries[0];

  return (
    <div className="space-y-5 pb-8">
      <HeroBanner name={user?.name} school={schoolInfo?.name} child={curChild ?? null} />
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} forced={requirePwChange} onSuccess={logout} />

      {children.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {children.map(c => {
            const sel = selectedChild === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedChild(c.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all whitespace-nowrap min-w-fit ${sel ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-border hover:border-violet-300 bg-card"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sel ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>{c.name.charAt(0)}</div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${sel ? "text-violet-700 dark:text-violet-300" : ""}`}>{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.class}{c.section ? ` · ${c.section}` : ""}</p>
                </div>
                {sel && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 ml-1" />}
              </button>
            );
          })}
        </div>
      )}

      {curData?.loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard g="from-violet-500 to-violet-700" icon={<Calendar className="h-4 w-4" />} label="Attendance" value={`${attPct}%`} sub={`${summary?.attendance?.presentDays ?? 0} / ${summary?.attendance?.totalDays ?? 0} days`} dot={attPct >= 75 ? "emerald" : "amber"} />
          <StatCard g="from-blue-500 to-indigo-600" icon={<Trophy className="h-4 w-4" />} label="Latest Grade" value={examLoading ? "…" : (latest?.result.overallGrade ?? (latest ? `${latest.result.percentage.toFixed(0)}%` : "—"))} sub={latest ? latest.setup.name : "No results yet"} dot="blue" />
          <StatCard g={summary?.fee?.pendingAmount ? "from-amber-500 to-orange-600" : "from-emerald-500 to-emerald-700"} icon={<BadgeIndianRupee className="h-4 w-4" />} label="Pending Fees" value={`₹${((summary?.fee?.pendingAmount ?? 0) / 1000).toFixed(1)}K`} sub={summary?.fee?.pendingAmount ? `of ₹${((summary?.fee?.totalAmount ?? 0) / 1000).toFixed(1)}K total` : "All clear! ✓"} dot={summary?.fee?.pendingAmount ? "amber" : "emerald"} />
          <StatCard g={unreadCount > 0 ? "from-rose-500 to-rose-700" : "from-slate-400 to-slate-600"} icon={<Bell className="h-4 w-4" />} label="Notifications" value={`${unreadCount}`} sub={unreadCount > 0 ? "unread messages" : "All caught up"} dot={unreadCount > 0 ? "rose" : "slate"} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {summary && (
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center"><Calendar className="h-4 w-4 text-violet-600" /></span>
                    Attendance Overview
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/child-profile")}>Full Report <ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <AttRing pct={attPct} />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Academic year</span>
                      <span className={`font-black text-xl ${attColor(attPct)}`}>{attPct}%</span>
                    </div>
                    <Progress value={attPct} className="h-2" />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, val: summary.attendance?.presentDays ?? 0, label: "Present", cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" },
                        { icon: <XCircle    className="h-4 w-4 text-rose-500" />,    val: summary.attendance?.absentDays  ?? 0, label: "Absent",  cls: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300" },
                        { icon: <Timer      className="h-4 w-4 text-amber-500" />,   val: summary.attendance?.lateDays    ?? 0, label: "Late",    cls: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" },
                      ].map(({ icon, val, label, cls }) => (
                        <div key={label} className={`flex items-center gap-1.5 p-2 rounded-xl ${cls}`}>
                          {icon}<div><p className="text-base font-black leading-none">{val}</p><p className="text-[10px] opacity-70 mt-0.5">{label}</p></div>
                        </div>
                      ))}
                    </div>
                    {attPct < 75 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">Attendance below 75%. Regular attendance required to avoid exam de-bar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center"><Trophy className="h-4 w-4 text-blue-600" /></span>
                  Exam Performance
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/child-profile")}>All Results <ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {examLoading ? (
                <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
              ) : examEntries.length > 0 ? (
                <div className="space-y-2">
                  {examEntries.slice(0, 4).map((e, idx) => {
                    const gc = gradeColors(e.result.percentage);
                    const open = expandedExam === e.setup.id;
                    return (
                      <div key={e.setup.id} className={`rounded-xl border cursor-pointer transition-all hover:shadow-sm ${idx === 0 ? "ring-2 ring-blue-200 dark:ring-blue-900" : ""}`} onClick={() => setExpandedExam(open ? null : e.setup.id)}>
                        <div className="flex items-center gap-3 p-3">
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${gc.light}`}>
                            <span className={`text-sm font-black leading-none ${gc.text}`}>{e.result.overallGrade ?? `${Math.round(e.result.percentage)}%`}</span>
                            <span className={`text-[8px] font-bold opacity-70 ${gc.text}`}>{gc.label}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate flex-1">{e.setup.name}</p>
                              {idx === 0 && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 shrink-0 px-1.5">Latest</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={e.result.percentage} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">{e.result.totalObtained}/{e.result.totalMax} · {e.result.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
                        </div>
                        {open && (e.result.subjects ?? []).length > 0 && (
                          <div className="px-3 pb-3 border-t">
                            <p className="text-[11px] font-semibold text-muted-foreground pt-2 pb-1.5 uppercase tracking-wide">Subject Breakdown</p>
                            <div className="space-y-1.5">
                              {(e.result.subjects ?? []).map((s, si) => {
                                const sp = s.maxMarks > 0 ? (s.marksObtained / s.maxMarks) * 100 : 0;
                                return (
                                  <div key={si} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${SUBJECT_COLORS[si % SUBJECT_COLORS.length]}`} />
                                    <span className="text-xs flex-1 truncate">{s.subjectName}</span>
                                    <div className="w-20 shrink-0"><Progress value={sp} className="h-1.5" /></div>
                                    <span className="text-xs text-muted-foreground w-14 text-right font-medium">{s.marksObtained}/{s.maxMarks}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No exam results published yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center"><BookMarked className="h-4 w-4 text-emerald-600" /></span>
                  Teacher's Diary
                  {diaryEntries.some(d => d.priority === "urgent") && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">Urgent</span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/parent-diary")}>Open Diary <ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {diaryEntries.length > 0 ? (
                <div className="space-y-2">
                  {diaryEntries.map(entry => {
                    const cat = CATEGORY_CONFIG[entry.category as DiaryCategory] ?? CATEGORY_CONFIG.note;
                    return (
                      <button key={entry.id} onClick={() => navigate("/parent-diary")}
                        className={`w-full text-left p-3 rounded-xl border hover:shadow-sm transition-all group ${
                          entry.priority === "urgent" ? "border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900" :
                          entry.priority === "high"   ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900" :
                          "border-border hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-900"
                        }`}>
                        <div className="flex items-start gap-2.5">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${cat.bg} border ${cat.border}`}>{cat.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate">{entry.title}</p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(entry.diaryDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${cat.bg} ${cat.color} ${cat.border}`}>{cat.label}</span>
                              {entry.staffName && <span className="text-[10px] text-muted-foreground">by {entry.staffName}</span>}
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-emerald-600 transition-colors shrink-0 mt-1" />
                        </div>
                      </button>
                    );
                  })}
                  <Button variant="outline" size="sm" className="w-full mt-1 text-xs gap-1" onClick={() => navigate("/parent-diary")}>
                    <BookOpen className="h-3.5 w-3.5" /> View Full Diary
                  </Button>
                </div>
              ) : (
                <div className="py-7 text-center">
                  <BookMarked className="h-9 w-9 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent diary entries from teachers</p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => navigate("/parent-diary")}>Open Diary</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {summary?.fee && (
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center"><BadgeIndianRupee className="h-3.5 w-3.5 text-amber-600" /></span>
                  Fee Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">₹{summary.fee.paidAmount.toLocaleString("en-IN")} paid</span>
                    <span className="font-semibold">₹{summary.fee.totalAmount.toLocaleString("en-IN")} total</span>
                  </div>
                  <Progress value={summary.fee.totalAmount > 0 ? (summary.fee.paidAmount / summary.fee.totalAmount) * 100 : 0} className="h-2.5" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                    <p className="text-[10px] text-muted-foreground">Paid</p>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">₹{(summary.fee.paidAmount / 1000).toFixed(1)}K</p>
                  </div>
                  <div className={`p-2.5 rounded-xl text-center border ${summary.fee.pendingAmount > 0 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"}`}>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                    <p className={`text-sm font-black ${summary.fee.pendingAmount > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{summary.fee.pendingAmount > 0 ? `₹${(summary.fee.pendingAmount / 1000).toFixed(1)}K` : "Nil ✓"}</p>
                  </div>
                </div>
                {summary.fee.pendingAmount > 0 && (
                  <Button size="sm" className="w-full text-white border-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" onClick={() => navigate(`/parent-fees/${selectedChild}/pay`)}>
                    <BadgeIndianRupee className="h-3.5 w-3.5 mr-1" /> Pay ₹{summary.fee.pendingAmount.toLocaleString("en-IN")}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/parent-fees")}>View All Transactions</Button>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center"><Bell className="h-3.5 w-3.5 text-rose-600" /></span>
                  Notifications
                  {unreadCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white leading-none">{unreadCount}</span>}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/parent-notifications")}>All <ChevronRight className="h-3.5 w-3.5 ml-0.5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-1.5">
                  {notifications.slice(0, 4).map(n => (
                    <div key={n.id} className={`flex gap-2 p-2 rounded-lg ${!n.isRead ? "bg-primary/5" : ""}`}>
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.isRead ? "bg-violet-500" : "bg-transparent"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug line-clamp-2 ${!n.isRead ? "font-semibold" : ""}`}>{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-3">All caught up! 🎉</p>}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <GraduationCap className="h-4 w-4" />,    label: "Profile",  path: "/child-profile",       cls: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
                  { icon: <Trophy className="h-4 w-4" />,           label: "Results",  path: "/child-profile",       cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
                  { icon: <BookMarked className="h-4 w-4" />,       label: "Diary",    path: "/parent-diary",        cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
                  { icon: <BadgeIndianRupee className="h-4 w-4" />, label: "Fees",     path: "/parent-fees",         cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
                  { icon: <Bell className="h-4 w-4" />,             label: "Alerts",   path: "/parent-notifications", cls: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
                  { icon: <MessageSquare className="h-4 w-4" />,   label: "Connect",  path: "/school-connect",      cls: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40" },
                ].map(({ icon, label, path, cls }) => (
                  <button key={label} onClick={() => navigate(path)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:shadow-sm hover:border-violet-200 dark:hover:border-violet-800 transition-all group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls} transition-transform group-hover:scale-110`}>{icon}</div>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground leading-none">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" className="w-full gap-2 text-sm" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" /> Change Password
          </Button>
        </div>
      </div>

      {children.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-600" /> All Children Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map(c => {
                const d = childData.get(c.id); const s = d?.summary; const isSel = selectedChild === c.id;
                return (
                  <button key={c.id} onClick={() => { setSelectedChild(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`text-left p-4 rounded-2xl border-2 hover:shadow-md transition-all ${isSel ? "border-violet-500 bg-violet-50/50 dark:bg-violet-950/20" : "border-border hover:border-violet-300"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${isSel ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>{c.name.charAt(0)}</div>
                      <div><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.class}{c.section ? ` · ${c.section}` : ""}</p></div>
                    </div>
                    {d?.loading ? <div className="h-12 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                    : s ? (
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30"><p className="text-sm font-black text-violet-700 dark:text-violet-300">{s.attendance?.attendancePercent ?? 0}%</p><p className="text-[9px] text-muted-foreground">Attendance</p></div>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30"><p className="text-sm font-black text-blue-700 dark:text-blue-300">{s.exams?.results?.[0]?.grade ?? "—"}</p><p className="text-[9px] text-muted-foreground">Last Grade</p></div>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30"><p className="text-sm font-black text-amber-700 dark:text-amber-300">₹{((s.fee?.pendingAmount ?? 0) / 1000).toFixed(0)}K</p><p className="text-[9px] text-muted-foreground">Due</p></div>
                      </div>
                    ) : <p className="text-xs text-muted-foreground text-center py-2">No data</p>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HeroBanner({ name, school, child }: { name?: string; school?: string; child: StudentBasic | null }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  const day = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg,#5b21b6 0%,#4f46e5 50%,#2563eb 100%)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 15% 50%,rgba(255,255,255,0.09) 0%,transparent 50%),radial-gradient(circle at 85% 15%,rgba(255,255,255,0.07) 0%,transparent 40%)" }} />
      <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute -top-4  -right-4  w-32 h-32 rounded-full border border-white/8  pointer-events-none" />
      <div className="absolute -bottom-8 -left-8  w-40 h-40 rounded-full border border-white/8  pointer-events-none" />
      <div className="relative p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="h-4 w-4 text-white/60" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/55">{school ?? "Parent Portal"}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
              {greeting}, <span className="text-violet-200">{name?.split(" ")[0] ?? "Parent"}</span>
            </h1>
            <p className="text-sm text-white/45 mt-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />{day}
            </p>
          </div>
          {child && (
            <div className="shrink-0 text-right hidden sm:block">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-black text-white mx-auto mb-1.5 overflow-hidden">
                {child.photoUrl ? <img src={child.photoUrl} className="w-full h-full object-cover" alt="" /> : child.name.charAt(0)}
              </div>
              <p className="text-xs font-bold text-white">{child.name}</p>
              <p className="text-[10px] text-white/55">{child.class}{child.section ? ` · ${child.section}` : ""}</p>
              {child.rollNumber && <p className="text-[10px] text-white/40">Roll #{child.rollNumber}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
