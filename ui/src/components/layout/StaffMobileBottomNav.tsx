/**
 * StaffMobileBottomNav
 * Native-app bottom bar for staff/teacher users (mobile only).
 *
 * Layout:  [Classes] [Attendance]  (● HOME ●)  [Assignments] [More]
 *
 * - Center Home FAB floats above the bar
 * - 4 side tabs with per-color active highlight
 * - "More" bottom sheet with staff-relevant actions
 * - Settings page intentionally excluded (admin-only)
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, BookOpen, CalendarCheck, ClipboardList, Grid3x3,
  LogOut, KeyRound, X, ChevronRight, Bell, BookMarked,
  Clock, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadCount } from "@/services/api/notificationApi";

// ─── Route → active tab ──────────────────────────────────────────────────────
function resolveActiveTab(pathname: string): string {
  if (pathname === "/staff-dashboard") return "home";
  if (pathname.startsWith("/my-classes") || pathname.startsWith("/staff-class")) return "classes";
  if (pathname.startsWith("/attendance")) return "attendance";
  if (pathname.startsWith("/assignments")) return "assignments";
  return "";
}

// ─── Accent colours ──────────────────────────────────────────────────────────
const ACCENT = {
  classes:     { pill: "bg-blue-100 dark:bg-blue-900/40",     icon: "text-blue-600 dark:text-blue-400",     lbl: "text-blue-600 dark:text-blue-400"     },
  attendance:  { pill: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400", lbl: "text-emerald-600 dark:text-emerald-400" },
  assignments: { pill: "bg-amber-100 dark:bg-amber-900/40",   icon: "text-amber-600 dark:text-amber-400",   lbl: "text-amber-600 dark:text-amber-400"   },
  more:        { pill: "bg-slate-100 dark:bg-slate-800",      icon: "text-slate-600 dark:text-slate-300",   lbl: "text-slate-600 dark:text-slate-300"   },
};

// ─── Side-tab button ─────────────────────────────────────────────────────────
function SideTab({
  id, icon, label, badge, active, onClick,
}: {
  id: keyof typeof ACCENT;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  const a = ACCENT[id];
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center justify-center flex-1 h-full gap-[3px] active:scale-90 transition-transform duration-150 select-none"
    >
      <div className={cn(
        "relative flex items-center justify-center w-11 h-8 rounded-2xl transition-all duration-200",
        active ? a.pill : "bg-transparent",
      )}>
        <span className={cn("transition-colors duration-200", active ? a.icon : "text-muted-foreground")}>
          {icon}
        </span>
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className={cn(
        "text-[10px] leading-none font-medium transition-colors duration-200",
        active ? cn(a.lbl, "font-bold") : "text-muted-foreground",
      )}>
        {label}
      </span>
    </button>
  );
}

// ─── More bottom sheet ────────────────────────────────────────────────────────
function MoreSheet({
  open, onClose, onNavigate, onLogout, unreadCount,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  unreadCount: number;
}) {
  const ACTIONS = [
    { icon: <Users className="h-5 w-5" />,         label: "Students",          sub: "Browse & manage students",   path: "/students",           grad: "from-blue-500 to-blue-700",       bg: "bg-blue-50 dark:bg-blue-950/40"       },
    { icon: <Bell className="h-5 w-5" />,           label: "Notifications",     sub: "Announcements & alerts",     path: "/notifications",      grad: "from-rose-500 to-pink-600",       bg: "bg-rose-50 dark:bg-rose-950/40",      badge: unreadCount },
    { icon: <BookMarked className="h-5 w-5" />,     label: "Class Diary",       sub: "Enter homework & notes",     path: "/staff-diary",        grad: "from-emerald-500 to-teal-600",    bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { icon: <Clock className="h-5 w-5" />,          label: "My Attendance",     sub: "Your attendance record",     path: "/my-attendance",      grad: "from-sky-500 to-blue-600",        bg: "bg-sky-50 dark:bg-sky-950/40"         },
    { icon: <ClipboardList className="h-5 w-5" />,  label: "Timetable",         sub: "Class schedule",             path: "/timetable",          grad: "from-violet-500 to-purple-600",   bg: "bg-violet-50 dark:bg-violet-950/40"   },
    { icon: <KeyRound className="h-5 w-5" />,       label: "Change Password",   sub: "Update credentials",         path: "__change_password",   grad: "from-slate-500 to-slate-700",     bg: "bg-slate-50 dark:bg-slate-900/60"     },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[70] bg-background/96 backdrop-blur-2xl rounded-t-[28px]",
          "shadow-[0_-8px_60px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div>
            <p className="font-bold text-base leading-tight">More</p>
            <p className="text-xs text-muted-foreground">All teacher tools</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => { onClose(); onNavigate(a.path); }}
              className={cn(
                "w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/50 hover:border-border",
                "transition-all active:scale-[0.97] text-left", a.bg,
              )}
            >
              <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", a.grad)}>
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
              </div>
              {a.badge != null && a.badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {a.badge > 99 ? "99+" : a.badge}
                </span>
              )}
              {(a.badge == null || a.badge === 0) && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
        <div className="px-4 pb-2">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 active:scale-[0.97] transition-transform text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-rose-700 dark:text-rose-400 leading-tight">Sign Out</p>
              <p className="text-xs text-muted-foreground mt-0.5">Log out of staff account</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StaffMobileBottomNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { logout } = useAuth();

  const [moreOpen,    setMoreOpen]    = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeTab = resolveActiveTab(location.pathname);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  function go(path: string) {
    if (path === "__change_password") {
      navigate("/staff-dashboard?changePassword=1");
    } else {
      navigate(path);
    }
  }

  return (
    <>
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onNavigate={go}
        onLogout={logout}
        unreadCount={unreadCount}
      />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/93 dark:bg-background/96 backdrop-blur-2xl border-t border-border/60 shadow-[0_-4px_30px_rgba(0,0,0,0.10)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}
        aria-label="Staff navigation"
      >
        {/* 72-px tappable strip */}
        <div className="relative flex items-center" style={{ height: "72px" }}>

          {/* ── Left 2 tabs ── */}
          <SideTab
            id="classes"
            icon={<BookOpen className="h-[22px] w-[22px]" strokeWidth={activeTab === "classes" ? 2.5 : 1.8} />}
            label="Classes"
            active={activeTab === "classes"}
            onClick={() => go("/my-classes")}
          />
          <SideTab
            id="attendance"
            icon={<CalendarCheck className="h-[22px] w-[22px]" strokeWidth={activeTab === "attendance" ? 2.5 : 1.8} />}
            label="Attendance"
            active={activeTab === "attendance"}
            onClick={() => go("/attendance")}
          />

          {/* ── Centre spacer for FAB ── */}
          <div className="w-[72px] shrink-0" aria-hidden="true" />

          {/* ── Right 2 tabs ── */}
          <SideTab
            id="assignments"
            icon={<ClipboardList className="h-[22px] w-[22px]" strokeWidth={activeTab === "assignments" ? 2.5 : 1.8} />}
            label="Work"
            active={activeTab === "assignments"}
            onClick={() => go("/assignments")}
          />
          <SideTab
            id="more"
            icon={<Grid3x3 className="h-[22px] w-[22px]" strokeWidth={moreOpen ? 2.5 : 1.8} />}
            label="More"
            active={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
          />

          {/* ── Floating Home FAB ── */}
          <button
            onClick={() => go("/staff-dashboard")}
            aria-current={activeTab === "home" ? "page" : undefined}
            aria-label="Dashboard"
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              "w-[56px] h-[56px] rounded-full",
              "flex flex-col items-center justify-center gap-[3px]",
              "ring-[3px] ring-background dark:ring-background",
              "active:scale-90 transition-all duration-200 select-none",
              activeTab === "home"
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_6px_24px_rgba(16,185,129,0.50)]"
                : "bg-gradient-to-br from-emerald-400/90 to-teal-500/90 shadow-[0_4px_16px_rgba(16,185,129,0.30)]",
            )}
            style={{ bottom: "34px" }}
          >
            <Home className="h-[22px] w-[22px] text-white" strokeWidth={activeTab === "home" ? 2.5 : 2} />
            <span className="text-[9px] font-bold text-white/90 leading-none">Home</span>
          </button>
        </div>
      </nav>
    </>
  );
}
