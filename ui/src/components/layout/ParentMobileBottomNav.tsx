/**
 * ParentMobileBottomNav
 * Native-app bottom bar for parent users (mobile only).
 *
 * Layout:  [Kids] [Fees]  (● HOME ●)  [Alerts] [More]
 *
 * - Center Home button floats above the bar (FAB-style)
 * - 4 side tabs with per-color active highlight (no overlap)
 * - Frosted-glass surface, iOS safe-area support
 * - Live unread-notification badge on Alerts
 * - "More" bottom sheet with full action grid + logout
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, Wallet, Bell, Grid3x3,
  BookMarked, Trophy, MessageSquare, CalendarDays, LogOut,
  KeyRound, X, GraduationCap, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadCount } from "@/services/api/notificationApi";

// ─── Accent colours for the 4 side tabs ─────────────────────────────────────
const ACCENT = {
  kids:   { pill: "bg-blue-100 dark:bg-blue-900/40",   icon: "text-blue-600 dark:text-blue-400",   lbl: "text-blue-600 dark:text-blue-400"   },
  fees:   { pill: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600 dark:text-amber-400", lbl: "text-amber-600 dark:text-amber-400" },
  alerts: { pill: "bg-rose-100 dark:bg-rose-900/40",   icon: "text-rose-600 dark:text-rose-400",   lbl: "text-rose-600 dark:text-rose-400"   },
  more:   { pill: "bg-slate-100 dark:bg-slate-800",    icon: "text-slate-600 dark:text-slate-300", lbl: "text-slate-600 dark:text-slate-300" },
};

// ─── Route → active tab resolution ───────────────────────────────────────────
function resolveActiveTab(pathname: string): string {
  if (pathname === "/parent-dashboard") return "home";
  if (pathname.startsWith("/child-profile")) return "kids";
  if (pathname.startsWith("/parent-fees")) return "fees";
  if (pathname.startsWith("/parent-notifications")) return "alerts";
  return "";
}

// ─── Side-tab button (used for Kids / Fees / Alerts / More) ─────────────────
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
      {/* Icon container — pill highlight when active */}
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
      {/* Label */}
      <span className={cn(
        "text-[10px] leading-none font-medium transition-colors duration-200",
        active ? cn(a.lbl, "font-bold") : "text-muted-foreground",
      )}>
        {label}
      </span>
    </button>
  );
}

// ─── More Bottom Sheet ────────────────────────────────────────────────────────
function MoreSheet({
  open,
  onClose,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  const actions = [
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "Exam Results",
      sub: "Report cards & marks",
      path: "/child-profile",
      color: "from-violet-500 to-purple-600",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      icon: <BookMarked className="h-5 w-5" />,
      label: "Class Diary",
      sub: "Homework & notes",
      path: "/parent-diary",
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: <CalendarDays className="h-5 w-5" />,
      label: "Leave Requests",
      sub: "Apply & track leaves",
      path: "/child-profile",
      color: "from-sky-500 to-blue-600",
      bg: "bg-sky-50 dark:bg-sky-950/40",
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: "School Connect",
      sub: "Message teachers",
      path: "/school-connect",
      color: "from-cyan-500 to-indigo-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
    },
    {
      icon: <GraduationCap className="h-5 w-5" />,
      label: "Student Profile",
      sub: "Full details & docs",
      path: "/child-profile",
      color: "from-blue-500 to-blue-700",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      label: "Change Password",
      sub: "Update credentials",
      path: "__change_password",
      color: "from-slate-500 to-slate-700",
      bg: "bg-slate-50 dark:bg-slate-900/60",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[70] bg-background/95 backdrop-blur-2xl rounded-t-[28px] shadow-[0_-8px_60px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div>
            <p className="font-bold text-base leading-tight">More</p>
            <p className="text-xs text-muted-foreground">All parent features</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="px-4 py-3 space-y-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                onClose();
                onNavigate(a.path);
              }}
              className={cn(
                "w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/50 hover:border-border transition-all active:scale-[0.97] text-left",
                a.bg,
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shrink-0",
                  a.color,
                )}
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-left active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-rose-700 dark:text-rose-400 leading-tight">Sign Out</p>
              <p className="text-xs text-muted-foreground mt-0.5">Log out of parent account</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ParentMobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [moreOpen, setMoreOpen]         = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);

  const activeTab = resolveActiveTab(location.pathname);

  // Fetch unread notification count
  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    void fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Close More sheet on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  function go(path: string) {
    if (path === "__change_password") {
      // Programmatically navigate to home and trigger the PW dialog there
      navigate("/parent-dashboard?changePassword=1");
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
      />

      {/*
       * Bottom bar
       * Layout: [Kids] [Fees]  spacer  [Alerts] [More]
       * The floating Home FAB sits in the spacer, protruding above the bar.
       */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/93 dark:bg-background/96 backdrop-blur-2xl border-t border-border/60 shadow-[0_-4px_30px_rgba(0,0,0,0.10)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}
        aria-label="Parent navigation"
      >
        {/* 72-px tappable strip */}
        <div className="relative flex items-center" style={{ height: "72px" }}>

          {/* ── Left 2 tabs ── */}
          <SideTab
            id="kids"
            icon={<Users className="h-[22px] w-[22px]" strokeWidth={activeTab === "kids" ? 2.5 : 1.8} />}
            label="Kids"
            active={activeTab === "kids"}
            onClick={() => go("/child-profile")}
          />
          <SideTab
            id="fees"
            icon={<Wallet className="h-[22px] w-[22px]" strokeWidth={activeTab === "fees" ? 2.5 : 1.8} />}
            label="Fees"
            active={activeTab === "fees"}
            onClick={() => go("/parent-fees")}
          />

          {/* ── Centre spacer for the FAB ── */}
          <div className="w-[72px] shrink-0" aria-hidden="true" />

          {/* ── Right 2 tabs ── */}
          <SideTab
            id="alerts"
            icon={<Bell className="h-[22px] w-[22px]" strokeWidth={activeTab === "alerts" ? 2.5 : 1.8} />}
            label="Alerts"
            badge={unreadCount}
            active={activeTab === "alerts"}
            onClick={() => go("/parent-notifications")}
          />
          <SideTab
            id="more"
            icon={<Grid3x3 className="h-[22px] w-[22px]" strokeWidth={moreOpen ? 2.5 : 1.8} />}
            label="More"
            active={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
          />

          {/* ── Floating Home FAB — sits at bar-top, protruding 20 px above ── */}
          <button
            onClick={() => go("/parent-dashboard")}
            aria-current={activeTab === "home" ? "page" : undefined}
            aria-label="Home"
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              "w-[56px] h-[56px] rounded-full",
              "flex flex-col items-center justify-center gap-[3px]",
              "ring-[3px] ring-background dark:ring-background",
              "active:scale-90 transition-all duration-200 select-none",
              activeTab === "home"
                ? "bg-gradient-to-br from-violet-500 to-blue-600 shadow-[0_6px_24px_rgba(109,40,217,0.50)]"
                : "bg-gradient-to-br from-violet-400/90 to-blue-500/90 shadow-[0_4px_16px_rgba(109,40,217,0.28)]",
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
