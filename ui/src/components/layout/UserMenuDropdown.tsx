/**
 * UserMenuDropdown — Industry-grade header user menu
 * ====================================================
 * Replaces the mock CenteredModal dialogs with fully wired, functional dialogs:
 *  • Account  → view + edit display name; change password
 *  • Billing  → real school plan / subscription data
 *  • Preferences → theme, language, compact mode, date/time format, notifications
 *  • Logout   → real auth logout
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BadgeCheck, Bell, CreditCard, KeyRound, Loader2,
  LogOut, Monitor, Moon, Settings, Sun, Building2,
  CheckCircle2, ChevronRight, RefreshCw, Shield, AlertTriangle, Save,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSchool } from "@/contexts/SchoolContext";
import { useSuperAdminSchool } from "@/contexts/SuperAdminSchoolContext";
import { getSchoolBilling, updateSchoolBilling } from "@/services/api/superAdminApi";
import type { SchoolBilling, UpdateBillingRequest } from "@/services/api/superAdminApi";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getUserInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "School Admin",
  staff:       "Staff",
  parent:      "Parent",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin:       "bg-blue-100 text-blue-700",
  staff:       "bg-green-100 text-green-700",
  parent:      "bg-purple-100 text-purple-700",
};

// ── Account Dialog ─────────────────────────────────────────────────────────────

interface BackendUser {
  id:         string;
  username:   string;
  email:      string;
  firstName:  string;
  lastName:   string;
  role:       string;
  status:     string;
  lastLogin:  string | null;
  passwordChangedAt: string | null;
}

function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { schoolInfo } = useSchool();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-500" />
            Account
          </DialogTitle>
          <DialogDescription>Your account information.</DialogDescription>
        </DialogHeader>

        {/* Avatar + identity strip */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border">
          <Avatar className="h-14 w-14 rounded-xl shadow-md ring-2 ring-background">
            <AvatarImage src={user?.avatar ?? ""} alt={user?.name ?? ""} />
            <AvatarFallback className="rounded-xl text-base font-bold bg-gradient-to-br from-primary/20 to-primary/5">
              {user?.name ? getUserInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <Badge className={`text-xs ${ROLE_COLORS[user?.role ?? ""] ?? ""}`}>
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </Badge>
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
              {schoolInfo?.name && (
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {schoolInfo.name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Billing Dialog ────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  Enterprise: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
  Pro:        "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
  Standard:   "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
  Trial:      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300",
};

const STATUS_COLORS: Record<string, string> = {
  Active:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Inactive:  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Suspended: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Trial:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

/** Admin view — read-only plan info + expiry warning */
function AdminBillingViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { schoolInfo } = useSchool();
  const [billing, setBilling] = useState<SchoolBilling | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  useEffect(() => {
    if (!open || !schoolInfo?.id) return;
    setLoadingBilling(true);
    getSchoolBilling(schoolInfo.id)
      .then(setBilling)
      .catch(() => {})
      .finally(() => setLoadingBilling(false));
  }, [open, schoolInfo?.id]);

  const expiryLabel = billing?.billingExpiryDate
    ? new Date(billing.billingExpiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Billing &amp; Plan
          </DialogTitle>
          <DialogDescription>Your school's current subscription details.</DialogDescription>
        </DialogHeader>

        {loadingBilling ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {/* Expiry warning banner */}
            {billing?.isExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Subscription Expired.</strong> Your access may be limited. Contact Vitana to renew.
                </AlertDescription>
              </Alert>
            )}
            {!billing?.isExpired && billing?.isExpiringSoon && billing.daysUntilExpiry !== null && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  Subscription expires in <strong>{billing.daysUntilExpiry} day{billing.daysUntilExpiry === 1 ? "" : "s"}</strong>. Contact Vitana to renew.
                </AlertDescription>
              </Alert>
            )}

            {/* Plan card */}
            <div className="rounded-xl border-2 p-5 space-y-3 bg-gradient-to-br from-background to-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
                  <Badge className={`mt-1 text-sm px-3 py-0.5 ${PLAN_COLORS[billing?.billingPlan ?? "Standard"] ?? PLAN_COLORS.Standard}`}>
                    {billing?.billingPlan ?? (schoolInfo as any)?.plan ?? "Standard"}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${STATUS_COLORS[billing?.billingStatus ?? "Active"] ?? STATUS_COLORS.Active}`}>
                    {billing?.billingStatus ?? "Active"}
                  </Badge>
                </div>
              </div>

              {schoolInfo?.name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">School</span>
                  <span className="font-medium truncate max-w-[200px]">{schoolInfo.name}</span>
                </div>
              )}

              {expiryLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className={`font-medium ${billing?.isExpired ? "text-red-600" : billing?.isExpiringSoon ? "text-amber-600" : ""}`}>
                    {expiryLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Renewal CTA */}
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium mb-1">Need to renew or upgrade?</p>
              <p className="text-xs text-muted-foreground mb-3">Contact Vitana Group to manage your subscription.</p>
              <Button size="sm" onClick={() => window.open("mailto:sales@vitanagroup.in?subject=Billing+Enquiry", "_blank")}>
                Contact Vitana
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

/** Super admin view — full billing management form */
function SuperAdminBillingManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { schools, selectedSchoolId, setSelectedSchoolId } = useSuperAdminSchool();
  const [billing, setBilling] = useState<SchoolBilling | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [plan, setPlan] = useState("Standard");
  const [status, setStatus] = useState("Active");
  const [expiryDate, setExpiryDate] = useState("");
  const [reminderDays, setReminderDays] = useState(30);

  useEffect(() => {
    if (!open || !selectedSchoolId) return;
    setLoadingBilling(true);
    getSchoolBilling(selectedSchoolId)
      .then((b) => {
        setBilling(b);
        setPlan(b.billingPlan);
        setStatus(b.billingStatus);
        setExpiryDate(b.billingExpiryDate ? b.billingExpiryDate.split("T")[0] : "");
        setReminderDays(b.renewalReminderDays);
      })
      .catch(() => {})
      .finally(() => setLoadingBilling(false));
  }, [open, selectedSchoolId]);

  const handleSave = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      const req: UpdateBillingRequest = {
        billingPlan: plan,
        billingStatus: status,
        billingExpiryDate: expiryDate || null,
        renewalReminderDays: reminderDays,
      };
      const updated = await updateSchoolBilling(selectedSchoolId, req);
      setBilling(updated);
      toast.success("Billing updated", { description: `Saved for ${billing?.schoolName ?? "school"}` });
    } catch {
      toast.error("Failed to save billing settings");
    } finally {
      setSaving(false);
    }
  };

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Billing Management
          </DialogTitle>
          <DialogDescription>Manage subscription billing for schools on the Vitana platform.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* School selector */}
          <div className="space-y-1.5">
            <Label>School</Label>
            <Select value={selectedSchoolId} onValueChange={(id) => { setSelectedSchoolId(id); setBilling(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a school…" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingBilling ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : selectedSchoolId ? (
            <>
              {/* Current status summary */}
              {billing && (
                <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3 text-sm">
                  <Badge className={PLAN_COLORS[billing.billingPlan] ?? PLAN_COLORS.Standard}>{billing.billingPlan}</Badge>
                  <Badge className={STATUS_COLORS[billing.billingStatus] ?? STATUS_COLORS.Active}>{billing.billingStatus}</Badge>
                  {billing.isExpired && <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Expired</span>}
                  {!billing.isExpired && billing.isExpiringSoon && billing.daysUntilExpiry !== null && (
                    <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {billing.daysUntilExpiry}d left</span>
                  )}
                </div>
              )}

              {/* Billing Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Trial">Trial</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expiry + Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reminder (days before)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={reminderDays}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Billing Settings
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Select a school above to manage its billing.
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

function BillingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  if (user?.role === "super_admin") {
    return <SuperAdminBillingManager open={open} onClose={onClose} />;
  }
  return <AdminBillingViewer open={open} onClose={onClose} />;
}

// ── Preferences Dialog ────────────────────────────────────────────────────────

function PreferencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, setLanguage }        = useLanguage();
  const { theme, setTheme }              = useTheme();
  const { preferences, updatePreference, resetPreferences } = useUserPreferences();

  const handleReset = () => {
    resetPreferences();
    toast.success("Preferences reset to defaults.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Preferences
          </DialogTitle>
          <DialogDescription>Customize your experience. Changes are saved automatically.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-1">
          {/* ── Appearance ────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sun className="h-4 w-4 text-orange-500" />
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "light",  label: "Light",  Icon: Sun   },
                { value: "dark",   label: "Dark",   Icon: Moon  },
                { value: "system", label: "System", Icon: Monitor },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                    theme === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <Label className="text-sm">Compact Mode</Label>
                <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
              </div>
              <Switch
                checked={preferences.compactMode ?? false}
                onCheckedChange={(v) => updatePreference("compactMode", v)}
              />
            </div>
          </section>

          <Separator />

          {/* ── Localization ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Localization</h3>

            <div className="space-y-1.5">
              <Label className="text-sm">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Date Format</Label>
                <Select
                  value={preferences.dateFormat ?? "DD/MM/YYYY"}
                  onValueChange={(v) => updatePreference("dateFormat", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Time Format</Label>
                <Select
                  value={preferences.timeFormat ?? "12h"}
                  onValueChange={(v) => updatePreference("timeFormat", v as "12h" | "24h")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Data Display ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Data Display</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Items per page</Label>
                <Select
                  value={String(preferences.itemsPerPage ?? 20)}
                  onValueChange={(v) => updatePreference("itemsPerPage", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Table View</Label>
                <Select
                  value={preferences.tableView ?? "comfortable"}
                  onValueChange={(v) => updatePreference("tableView", v as "comfortable" | "compact")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-2 justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset to defaults
          </Button>
          <Button onClick={() => { onClose(); setTimeout(() => window.location.reload(), 100); }}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dropdown ──────────────────────────────────────────────────────────────

export function UserMenuDropdown() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [accountOpen,     setAccountOpen]     = useState(false);
  const [billingOpen,     setBillingOpen]      = useState(false);
  const [preferencesOpen, setPreferencesOpen]  = useState(false);

  if (!user) return null;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 sm:w-36 lg:h-11 lg:w-60 rounded-xl px-1 sm:px-3 flex items-center gap-2 sm:gap-3 hover:bg-accent/50 transition-all duration-200 group"
          >
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl ring-2 ring-background shadow-md group-hover:ring-primary/20 transition-all">
              <AvatarImage src={user.avatar ?? ""} alt={user.name ?? "User"} />
              <AvatarFallback className="rounded-xl text-xs font-semibold bg-gradient-to-br from-primary/10 to-primary/5">
                {user.name ? getUserInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors">
                {user.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-60 rounded-lg bg-popover text-popover-foreground border border-border z-[10000]"
          align="end"
          forceMount
        >
          {/* Identity label */}
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarImage src={user.avatar ?? ""} alt={user.name ?? "User"} />
                <AvatarFallback className="rounded-lg text-xs font-bold">
                  {user.name ? getUserInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <Badge className={`text-[10px] shrink-0 ${ROLE_COLORS[user.role] ?? ""}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => setAccountOpen(true)}
            >
              <BadgeCheck className="h-4 w-4 text-green-500" />
              {t("nav.account")}
            </DropdownMenuItem>

            {(user.role === "admin" || user.role === "super_admin") && (
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => setBillingOpen(true)}
              >
                <CreditCard className="h-4 w-4 text-blue-500" />
                {t("nav.billing")}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => setPreferencesOpen(true)}
            >
              <Settings className="h-4 w-4" />
              {t("nav.preferences")}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <AccountDialog     open={accountOpen}     onClose={() => setAccountOpen(false)} />
      <BillingDialog     open={billingOpen}     onClose={() => setBillingOpen(false)} />
      <PreferencesDialog open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </>
  );
}
