import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, ShieldCheck, Lock, Plus, Pencil, Trash2, RefreshCw, Search,
  Users, Key, LayoutGrid, Loader2, CheckCircle2, AlertCircle, X,
  ChevronLeft, ChevronRight, UserCog, Settings2, GraduationCap,
  BookOpen, Banknote, UserCheck, Building2, Car, Home, HeartPulse,
  ClipboardList, Info, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import roleApi, {
  RoleResponse, PermissionGroupResponse, UserWithRolesResponse,
  RoleStatsResponse, CreateRoleDto, UpdateRoleDto
} from "@/services/api/roleApi";
import { academicApi, type TeacherAssignmentResponse } from "@/services/api/academicApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";

// ─── Role configuration ───────────────────────────────────────────────────────

type AccessScope = "Full" | "Broad" | "Standard" | "Domain" | "Limited";
type RoleTier = "System" | "Leadership" | "Academic" | "Finance & HR" | "Operations" | "Support";

interface RoleConfig {
  tier: RoleTier;
  scope: AccessScope;
  keyModules: string[];
  bg: string;
  border: string;
  iconColor: string;
  badge: string;
  tierColor: string;
  scopeBadge: string;
  icon: React.ElementType;
}

const SCOPE_ORDER: AccessScope[] = ["Full", "Broad", "Standard", "Domain", "Limited"];

const ROLE_CONFIG: Record<string, RoleConfig> = {
  "Admin": {
    tier: "System", scope: "Full",
    keyModules: ["All Modules"],
    bg: "from-red-50 to-red-100/50", border: "border-red-200",
    iconColor: "text-red-600", badge: "bg-red-100 text-red-700 border-red-200",
    tierColor: "text-red-600", scopeBadge: "bg-red-100 text-red-700", icon: Shield,
  },
  "Principal": {
    tier: "Leadership", scope: "Broad",
    keyModules: ["Students", "Exams", "Staff", "Attendance", "Analytics"],
    bg: "from-purple-50 to-purple-100/50", border: "border-purple-200",
    iconColor: "text-purple-600", badge: "bg-purple-100 text-purple-700 border-purple-200",
    tierColor: "text-purple-600", scopeBadge: "bg-purple-100 text-purple-700", icon: GraduationCap,
  },
  "Vice Principal": {
    tier: "Leadership", scope: "Broad",
    keyModules: ["Students", "Exams", "Timetable", "Attendance", "Grades"],
    bg: "from-violet-50 to-violet-100/50", border: "border-violet-200",
    iconColor: "text-violet-600", badge: "bg-violet-100 text-violet-700 border-violet-200",
    tierColor: "text-violet-600", scopeBadge: "bg-violet-100 text-violet-700", icon: GraduationCap,
  },
  "Head of Department": {
    tier: "Academic", scope: "Standard",
    keyModules: ["Exams", "Grades", "Timetable", "Attendance"],
    bg: "from-blue-50 to-blue-100/50", border: "border-blue-200",
    iconColor: "text-blue-600", badge: "bg-blue-100 text-blue-700 border-blue-200",
    tierColor: "text-blue-600", scopeBadge: "bg-blue-100 text-blue-700", icon: BookOpen,
  },
  "Class Teacher": {
    tier: "Academic", scope: "Standard",
    keyModules: ["Students", "Attendance", "Grades", "Health"],
    bg: "from-sky-50 to-sky-100/50", border: "border-sky-200",
    iconColor: "text-sky-600", badge: "bg-sky-100 text-sky-700 border-sky-200",
    tierColor: "text-sky-600", scopeBadge: "bg-sky-100 text-sky-700", icon: BookOpen,
  },
  "Teacher": {
    tier: "Academic", scope: "Limited",
    keyModules: ["Attendance", "Grades", "Assignments", "Timetable"],
    bg: "from-cyan-50 to-cyan-100/50", border: "border-cyan-200",
    iconColor: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    tierColor: "text-cyan-600", scopeBadge: "bg-cyan-100 text-cyan-700", icon: BookOpen,
  },
  "Accountant": {
    tier: "Finance & HR", scope: "Domain",
    keyModules: ["Fees", "Payroll", "Reports", "Analytics"],
    bg: "from-emerald-50 to-emerald-100/50", border: "border-emerald-200",
    iconColor: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tierColor: "text-emerald-600", scopeBadge: "bg-emerald-100 text-emerald-700", icon: Banknote,
  },
  "HR Manager": {
    tier: "Finance & HR", scope: "Domain",
    keyModules: ["Staff", "Payroll", "Attendance", "UserMgmt"],
    bg: "from-teal-50 to-teal-100/50", border: "border-teal-200",
    iconColor: "text-teal-600", badge: "bg-teal-100 text-teal-700 border-teal-200",
    tierColor: "text-teal-600", scopeBadge: "bg-teal-100 text-teal-700", icon: UserCheck,
  },
  "Librarian": {
    tier: "Operations", scope: "Domain",
    keyModules: ["Library", "Reports"],
    bg: "from-amber-50 to-amber-100/50", border: "border-amber-200",
    iconColor: "text-amber-600", badge: "bg-amber-100 text-amber-700 border-amber-200",
    tierColor: "text-amber-600", scopeBadge: "bg-amber-100 text-amber-700", icon: BookOpen,
  },
  "Transport Manager": {
    tier: "Operations", scope: "Domain",
    keyModules: ["Transport", "Reports"],
    bg: "from-orange-50 to-orange-100/50", border: "border-orange-200",
    iconColor: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200",
    tierColor: "text-orange-600", scopeBadge: "bg-orange-100 text-orange-700", icon: Car,
  },
  "Hostel Warden": {
    tier: "Operations", scope: "Domain",
    keyModules: ["Hostel", "Health", "Attendance"],
    bg: "from-lime-50 to-lime-100/50", border: "border-lime-200",
    iconColor: "text-lime-700", badge: "bg-lime-100 text-lime-700 border-lime-200",
    tierColor: "text-lime-700", scopeBadge: "bg-lime-100 text-lime-700", icon: Home,
  },
  "Admissions Officer": {
    tier: "Operations", scope: "Domain",
    keyModules: ["Admissions", "Students", "Communication"],
    bg: "from-pink-50 to-pink-100/50", border: "border-pink-200",
    iconColor: "text-pink-600", badge: "bg-pink-100 text-pink-700 border-pink-200",
    tierColor: "text-pink-600", scopeBadge: "bg-pink-100 text-pink-700", icon: ClipboardList,
  },
  "Counselor": {
    tier: "Support", scope: "Domain",
    keyModules: ["Health", "Communication", "Students"],
    bg: "from-rose-50 to-rose-100/50", border: "border-rose-200",
    iconColor: "text-rose-600", badge: "bg-rose-100 text-rose-700 border-rose-200",
    tierColor: "text-rose-600", scopeBadge: "bg-rose-100 text-rose-700", icon: HeartPulse,
  },
  "Parent": {
    tier: "Support", scope: "Limited",
    keyModules: ["School Connect", "Fees", "Notifications", "Child Profile"],
    bg: "from-indigo-50 to-indigo-100/50", border: "border-indigo-200",
    iconColor: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    tierColor: "text-indigo-600", scopeBadge: "bg-indigo-100 text-indigo-700", icon: Users,
  },
};

const DEFAULT_CONFIG: RoleConfig = {
  tier: "System", scope: "Limited", keyModules: [],
  bg: "from-slate-50 to-slate-100/50", border: "border-slate-200",
  iconColor: "text-slate-600", badge: "bg-slate-100 text-slate-700 border-slate-200",
  tierColor: "text-slate-600", scopeBadge: "bg-slate-100 text-slate-700", icon: Shield,
};

function getRoleConfig(name: string): RoleConfig {
  return ROLE_CONFIG[name] ?? DEFAULT_CONFIG;
}

// Hierarchy rank for sorting the Staff & Access table
const ROLE_HIERARCHY: Record<string, number> = {
  "Admin": 0,
  "Principal": 1,
  "Vice Principal": 2,
  "Head of Department": 3,
  "Class Teacher": 4,
  "Teacher": 5,
  "HR Manager": 6,
  "Accountant": 7,
  "Librarian": 8,
  "Transport Manager": 9,
  "Hostel Warden": 10,
  "Admissions Officer": 11,
  "Counselor": 12,
  "Parent": 13,
};

const PORTAL_ROLE_RANK: Record<string, number> = {
  admin: 0, super_admin: -1, principal: 1, vice_principal: 2, teacher: 5, staff: 5, parent: 13, student: 14,
};

function getUserHierarchyRank(u: UserWithRolesResponse): number {
  // Users without login accounts sort last (need action taken)
  const loginBonus = u.hasLoginAccount ? 0 : 1000;
  // Portal role gives a base rank — use lowercase for case-insensitive match
  const baseRank = PORTAL_ROLE_RANK[(u.primaryRole ?? "").toLowerCase()] ?? 50;
  // If they have assigned roles, find the minimum (highest) rank
  const roleRank = u.assignedRoles.reduce<number>((min, r) => {
    const rank = ROLE_HIERARCHY[r.name ?? ""] ?? 99;
    return Math.min(min, rank);
  }, 99);
  return loginBonus + Math.min(baseRank, roleRank);
}

const SCOPE_COLORS: Record<AccessScope, string> = {
  Full:     "bg-red-100 text-red-700 border-red-200",
  Broad:    "bg-purple-100 text-purple-700 border-purple-200",
  Standard: "bg-blue-100 text-blue-700 border-blue-200",
  Domain:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  Limited:  "bg-slate-100 text-slate-600 border-slate-200",
};

// Tier display order
const TIER_ORDER: RoleTier[] = ["System", "Leadership", "Academic", "Finance & HR", "Operations", "Support"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const ALL_ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-muted/50 mb-4">{icon}</div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ─── Permission Matrix Dialog ─────────────────────────────────────────────────

function PermissionMatrixDialog({ role, onClose }: { role: RoleResponse; onClose: () => void }) {
  const [groups, setGroups] = useState<PermissionGroupResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cfg = getRoleConfig(role.name);
  const { t } = useLanguage();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([roleApi.getPermissionsGrouped(), roleApi.getRolePermissionIds(role.id)])
      .then(([g, ids]) => { if (mounted) { setGroups(g); setSelectedIds(new Set(ids)); } })
      .catch(() => toast.error("Failed to load permissions"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [role.id]);

  function toggle(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleModule(group: PermissionGroupResponse, checked: boolean) {
    setSelectedIds(prev => { const n = new Set(prev); group.permissions.forEach(p => checked ? n.add(p.id) : n.delete(p.id)); return n; });
  }
  function toggleAction(action: string, checked: boolean) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      groups.forEach(g => g.permissions.filter(p => p.action === action).forEach(p => checked ? n.add(p.id) : n.delete(p.id)));
      return n;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await roleApi.setRolePermissions(role.id, Array.from(selectedIds));
      toast.success(`Permissions saved for ${role.displayName ?? role.name}`);
      onClose();
    } catch { toast.error("Failed to save permissions"); }
    finally { setSaving(false); }
  }

  const usedActions = ALL_ACTIONS.filter(a => groups.some(g => g.permissions.some(p => p.action === a)));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${cfg.bg} border ${cfg.border}`}>
              <Key className={`h-5 w-5 ${cfg.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-lg">{role.displayName ?? role.name} — {t('roles.card.permissionMatrixButton')}</DialogTitle>
              <p className="text-sm text-muted-foreground">{selectedIds.size} {t('roles.permMatrix.selectedCount')} {groups.reduce((a, g) => a + g.permissions.length, 0)} {t('roles.permMatrix.permissionsSelected')}</p>
            </div>
            {role.isSystemRole && <Badge variant="outline" className="ml-auto gap-1 text-xs"><Lock className="h-3 w-3" />{t('roles.permMatrix.systemReadOnly')}</Badge>}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="text-left p-3 font-medium text-muted-foreground w-52 rounded-tl-lg">{t('roles.permMatrix.moduleHeader')}</th>
                    {usedActions.map(a => (
                      <th key={a} className="p-3 text-center w-24 font-medium">
                        <div className="flex flex-col items-center gap-1.5">
                          <span>{t(`roles.permMatrix.action${a}`)}</span>
                          {!role.isSystemRole && (
                            <Checkbox
                              checked={groups.every(g => { const p = g.permissions.find(p2 => p2.action === a); return p ? selectedIds.has(p.id) : true; })}
                              onCheckedChange={c => toggleAction(a, !!c)}
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => {
                    const allChecked = group.permissions.every(p => selectedIds.has(p.id));
                    const someChecked = group.permissions.some(p => selectedIds.has(p.id));
                    return (
                      <tr key={group.module} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {!role.isSystemRole && (
                              <Checkbox
                                checked={allChecked}
                                data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                                onCheckedChange={c => toggleModule(group, !!c)}
                              />
                            )}
                            <span className="font-medium">{group.module}</span>
                            <span className="text-xs text-muted-foreground">({group.permissions.length})</span>
                          </div>
                        </td>
                        {usedActions.map(a => {
                          const perm = group.permissions.find(p => p.action === a);
                          return (
                            <td key={a} className="p-3 text-center">
                              {perm ? (
                                <Checkbox
                                  checked={selectedIds.has(perm.id)}
                                  onCheckedChange={() => !role.isSystemRole && toggle(perm.id)}
                                  disabled={role.isSystemRole}
                                  className="mx-auto"
                                />
                              ) : <span className="text-muted-foreground/30">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={onClose}>{t('roles.permMatrix.close')}</Button>
          {!role.isSystemRole && (
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t('roles.permMatrix.savePermissions')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Role Dialog ────────────────────────────────────────────────

function RoleFormDialog({ role, onClose, onSaved }: { role?: RoleResponse; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [displayName, setDisplayName] = useState(role?.displayName ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Role name is required"); return; }
    setSaving(true);
    try {
      if (role) {
        await roleApi.updateRole(role.id, { displayName: displayName || undefined, description: description || undefined });
        toast.success("Role updated");
      } else {
        await roleApi.createRole({ name: name.trim(), displayName: displayName || undefined, description: description || undefined });
        toast.success("Role created");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{role ? t('roles.form.editTitle') : t('roles.form.createTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('roles.form.roleKeyLabel')} <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. lab_assistant" disabled={!!role} autoFocus />
            {!role && <p className="text-xs text-muted-foreground">{t('roles.form.roleKeyHint')}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('roles.form.displayNameLabel')}</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Lab Assistant" />
          </div>
          <div className="space-y-2">
            <Label>{t('roles.form.descriptionLabel')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this role do?" rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('roles.form.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {role ? t('roles.form.saveChanges') : t('roles.form.createRole')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Class Teacher Removal Confirmation Dialog ────────────────────────────────

function ClassTeacherRemovalDialog({
  user,
  assignment,
  onForceRemove,
  onReplaceAndRemove,
  onCancel,
}: {
  user: UserWithRolesResponse;
  assignment: TeacherAssignmentResponse;
  onForceRemove: () => Promise<void>;
  onReplaceAndRemove: (newStaffId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [staffList, setStaffList] = useState<StaffBasic[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [replacementId, setReplacementId] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [forceRemoving, setForceRemoving] = useState(false);
  const acting = replacing || forceRemoving;
  const { t } = useLanguage();

  useEffect(() => {
    setLoadingStaff(true);
    staffApi.list({ status: "active", pageSize: 200 })
      .then(r => {
        const others = (r.staff ?? []).filter(s => s.id !== user.staffId);
        setStaffList(others);
      })
      .catch(() => toast.error("Could not load staff list"))
      .finally(() => setLoadingStaff(false));
  }, [user.staffId]);

  const classLabel = [assignment.className, assignment.sectionName].filter(Boolean).join(" – ");
  const staffName = `${user.firstName} ${user.lastName}`;

  async function handleReplace() {
    if (!replacementId) { toast.error("Please select a replacement teacher"); return; }
    setReplacing(true);
    try {
      await onReplaceAndRemove(replacementId);
    } finally {
      setReplacing(false);
    }
  }

  async function handleForce() {
    setForceRemoving(true);
    try {
      await onForceRemove();
    } finally {
      setForceRemoving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </span>
            <span className="text-amber-700">{t('roles.ctConflict.title')}</span>
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            <span className="font-medium text-foreground">{staffName}</span> is the class teacher
            for <span className="font-semibold text-foreground">{classLabel}</span>. Choose how to
            handle this before removing the role.
          </DialogDescription>
        </DialogHeader>

        {/* Current assignment info strip */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3.5 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100/80">
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('roles.ctConflict.currentAssignmentLabel')}
            </p>
            <p className="text-sm font-semibold truncate">{classLabel}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* ── Path A: Assign replacement (recommended) ── */}
          <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-800">{t('roles.ctConflict.assignReplacementTitle')}</p>
            </div>

            {loadingStaff ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('roles.ctConflict.loadingStaff')}
              </div>
            ) : (
              <Select value={replacementId} onValueChange={setReplacementId} disabled={acting}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={t('roles.ctConflict.selectReplacementPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {staffList.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {t('roles.ctConflict.noOtherStaff')}
                    </div>
                  ) : (
                    staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span>{s.firstName} {s.lastName}</span>
                        {s.designation && (
                          <span className="ml-1.5 text-xs text-muted-foreground">— {s.designation}</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            <p className="text-xs text-muted-foreground">
              The selected teacher will be assigned to <strong>{classLabel}</strong> before the role is removed.
            </p>

            <Button
              onClick={handleReplace}
              disabled={!replacementId || acting}
              className="w-full gap-2"
            >
              {replacing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t('roles.ctConflict.replaceAndRemove')}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('roles.ctConflict.or')}</span>
            <div className="flex-1 border-t" />
          </div>

          {/* ── Path B: Force remove (danger) ── */}
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-800">{t('roles.ctConflict.forceRemoveTitle')}</p>
            </div>
            <p className="text-xs text-red-700/80 leading-relaxed">
              <strong>{classLabel}</strong> will have no class teacher until one is manually reassigned.
            </p>
            <Button
              variant="destructive"
              onClick={handleForce}
              disabled={acting}
              className="w-full gap-2"
            >
              {forceRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {t('roles.ctConflict.forceRemoveButton')}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-1">
          <Button variant="ghost" onClick={onCancel} disabled={acting} className="w-full">
            {t('roles.ctConflict.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Role Dialog ───────────────────────────────────────────────────────

function AssignRoleDialog({ user, roles, onClose, onSaved }: {
  user: UserWithRolesResponse; roles: RoleResponse[]; onClose: () => void; onSaved: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  // Keep local copy of assigned roles so optimistic removal updates the list immediately
  const [localRoles, setLocalRoles] = useState(user.assignedRoles);

  // Class teacher removal flow
  const [ctCheck, setCtCheck] = useState<{
    roleId: string;
    assignment: TeacherAssignmentResponse;
  } | null>(null);

  const assignedIds = new Set(localRoles.map(r => r.id));
  const available = roles.filter(r => r.isActive && !assignedIds.has(r.id));
  const selectedRole = roles.find(r => r.id === roleId);
  const selectedCfg = selectedRole ? getRoleConfig(selectedRole.name) : null;
  const { t } = useLanguage();

  async function handleAssign() {
    if (!roleId) { toast.error("Select a role"); return; }
    setSaving(true);
    try {
      await roleApi.assignRoleToUser(user.id, roleId);
      const newRole = roles.find(r => r.id === roleId);
      if (newRole) setLocalRoles(prev => [...prev, { id: newRole.id, name: newRole.name, displayName: newRole.displayName, isActive: true }]);
      setRoleId("");
      toast.success(`Role assigned to ${user.firstName} ${user.lastName}`);
      onSaved(); onClose();
    } catch { toast.error("Failed to assign role"); }
    finally { setSaving(false); }
  }

  async function handleRemove(rid: string) {
    const role = localRoles.find(r => r.id === rid);
    const isClassTeacherRole = role?.name?.toLowerCase() === "class teacher";

    // If removing "Class Teacher" role and we have a staffId, check for existing assignment
    if (isClassTeacherRole && user.staffId) {
      setSaving(true);
      try {
        const result = await academicApi.getTeacherAssignmentsForStaff(user.staffId);
        const ctAssignment = (result?.assignments ?? []).find((a: TeacherAssignmentResponse) => a.isClassTeacher);
        if (ctAssignment) {
          // Show the class teacher conflict dialog
          setCtCheck({ roleId: rid, assignment: ctAssignment });
          return;
        }
        // No active class teacher assignment — remove role directly
      } catch {
        toast.error("Failed to check class teacher assignment");
        return;
      } finally {
        setSaving(false);
      }
    }

    // Standard role removal
    setSaving(true);
    try {
      await roleApi.removeRoleFromUser(user.id, rid);
      setLocalRoles(prev => prev.filter(r => r.id !== rid));
      toast.success("Role removed");
      onSaved();
    } catch { toast.error("Failed to remove role"); }
    finally { setSaving(false); }
  }

  async function handleClassTeacherForceRemove() {
    if (!ctCheck) return;
    setSaving(true);
    try {
      // Clear the class teacher assignment first (preserves subject assignments if any)
      await academicApi.unsetClassTeacher(ctCheck.assignment.id);
      // Then remove the role from the user
      await roleApi.removeRoleFromUser(user.id, ctCheck.roleId);
      setLocalRoles(prev => prev.filter(r => r.id !== ctCheck.roleId));
      toast.success("Class Teacher role removed. No replacement assigned.");
      onSaved();
    } catch { toast.error("Failed to remove class teacher role"); }
    finally { setSaving(false); setCtCheck(null); }
  }

  async function handleClassTeacherReplaceAndRemove(newStaffId: string) {
    if (!ctCheck) return;
    setSaving(true);
    try {
      const a = ctCheck.assignment;
      // 1. Assign the replacement teacher as class teacher for the same class/section
      await academicApi.assignTeacher({
        schoolId: a.schoolId,
        staffId: newStaffId,
        classId: a.classId,
        sectionId: a.sectionId,
        isClassTeacher: true,
        academicYear: a.academicYear ?? "",
      });
      // 2. Clear the class teacher flag on the old assignment
      //    (deletes pure class-teacher records, preserves subject-teacher records)
      await academicApi.unsetClassTeacher(a.id);
      // 3. Remove the role from this user
      await roleApi.removeRoleFromUser(user.id, ctCheck.roleId);
      setLocalRoles(prev => prev.filter(r => r.id !== ctCheck.roleId));
      toast.success("Class teacher replaced and role removed.");
      onSaved();
    } catch { toast.error("Failed to replace class teacher"); }
    finally { setSaving(false); setCtCheck(null); }
  }

  return (
    <>
    {ctCheck && (
      <ClassTeacherRemovalDialog
        user={user}
        assignment={ctCheck.assignment}
        onForceRemove={handleClassTeacherForceRemove}
        onReplaceAndRemove={handleClassTeacherReplaceAndRemove}
        onCancel={() => setCtCheck(null)}
      />
    )}
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            Manage Roles — {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('roles.assignDialog.currentlyAssigned')}</p>
            {localRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{t('roles.assignDialog.noRolesAssigned')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {localRoles.map(r => {
                  const c = getRoleConfig(r.name ?? "");
                  return (
                    <Badge key={r.id} variant="outline" className={`gap-1.5 pr-1 ${c.badge}`}>
                      {r.displayName ?? r.name}
                      <button onClick={() => handleRemove(r.id)} disabled={saving} className="ml-0.5 hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('roles.assignDialog.addRole')}</p>
            <div className="flex gap-2">
              <Select value={roleId} onValueChange={setRoleId} disabled={available.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={available.length === 0 ? t('roles.assignDialog.allRolesAlreadyAssigned') : t('roles.assignDialog.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {available.map(r => {
                    const c = getRoleConfig(r.name);
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <span>{r.displayName ?? r.name}</span>
                          <Badge variant="outline" className={`text-xs ${c.scopeBadge} border-current/30`}>{t(`roles.scope.${c.scope}`)}</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!roleId || saving} className="shrink-0 gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('roles.assignDialog.assign')}
              </Button>
            </div>

            {/* Role preview */}
            {selectedRole && selectedCfg && (
              <div className={`mt-2 p-3 rounded-lg bg-gradient-to-br ${selectedCfg.bg} border ${selectedCfg.border}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className={`text-xs ${SCOPE_COLORS[selectedCfg.scope]} border-current/30`}>{t(`roles.scope.${selectedCfg.scope}`)} {t('roles.scope.accessSuffix')}</Badge>
                  <span className="text-xs text-muted-foreground">{selectedCfg.tier}</span>
                </div>
                {selectedRole.description && <p className="text-xs text-muted-foreground">{selectedRole.description}</p>}
                {selectedCfg.keyModules.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCfg.keyModules.map(m => (
                      <span key={m} className="text-xs px-1.5 py-0.5 bg-white/70 rounded border border-current/20 font-medium">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>{t('roles.assignDialog.done')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteRoleDialog({ role, onClose, onDeleted }: { role: RoleResponse; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  async function confirm() {
    setLoading(true);
    try {
      await roleApi.deleteRole(role.id);
      toast.success(`Role "${role.displayName ?? role.name}" deleted`);
      onDeleted(); onClose();
    } catch { toast.error("Could not delete role — it may have active user assignments"); }
    finally { setLoading(false); }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />{t('roles.deleteDialog.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <strong>{role.displayName ?? role.name}</strong>? {t('roles.deleteDialog.cannotDeleteMsg')}
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('roles.deleteDialog.cancel')}</Button>
          <Button variant="destructive" onClick={confirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} {t('roles.deleteDialog.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({ role, onEdit, onDelete, onPermissions }: {
  role: RoleResponse; onEdit: () => void; onDelete: () => void; onPermissions: () => void;
}) {
  const cfg = getRoleConfig(role.name);
  const RoleIcon = cfg.icon;
  const label = role.displayName ?? role.name;
  const [showDesc, setShowDesc] = useState(false);
  const { t } = useLanguage();

  return (
    <Card className={`bg-gradient-to-br ${cfg.bg} border ${cfg.border} transition-all hover:shadow-md group`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg bg-white/70 border ${cfg.border}`}>
              <RoleIcon className={`h-4 w-4 ${cfg.iconColor}`} />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground font-mono">{role.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {role.isSystemRole
              ? <Badge variant="outline" className="text-xs gap-1 border-current/30 text-muted-foreground"><Lock className="h-2.5 w-2.5" />{t('roles.card.systemBadge')}</Badge>
              : <Badge variant="outline" className="text-xs text-muted-foreground">{t('roles.card.customBadge')}</Badge>
            }
          </div>
        </div>

        {/* Tier + Scope row */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-medium ${cfg.tierColor}`}>{t(`roles.tier.${cfg.tier.replace(' & ', '')}`)}</span>
          <span className="text-muted-foreground/40">•</span>
          <Badge variant="outline" className={`text-xs border-current/30 ${SCOPE_COLORS[cfg.scope]}`}>{t(`roles.scope.${cfg.scope}`)} {t('roles.scope.accessSuffix')}</Badge>
        </div>

        {/* Key modules */}
        {cfg.keyModules.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cfg.keyModules.map(m => (
              <span key={m} className="text-xs px-1.5 py-0.5 bg-white/60 rounded border border-current/20 font-medium text-foreground/70">{m}</span>
            ))}
          </div>
        )}

        {/* Description toggle */}
        {role.description && (
          <button
            onClick={() => setShowDesc(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <Info className="h-3 w-3" />
            {showDesc ? t('roles.card.hideDescription') : t('roles.card.whatCanThisRoleDo')}
          </button>
        )}
        {showDesc && role.description && (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{role.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{role.userCount} {t('roles.card.usersCount')}</span>
          <span className="flex items-center gap-1"><Key className="h-3.5 w-3.5" />{role.permissionCount} {t('roles.card.permissionsCount')}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="flex-1 text-xs gap-1 h-8" onClick={onPermissions}>
            <LayoutGrid className="h-3.5 w-3.5" /> {t('roles.card.permissionMatrixButton')}
          </Button>
          {!role.isSystemRole && (
            <>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onEdit} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 hover:text-destructive hover:border-destructive" onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role Tier Section ────────────────────────────────────────────────────────

const TIER_ICONS: Record<RoleTier, React.ElementType> = {
  "System":       ShieldCheck,
  "Leadership":   GraduationCap,
  "Academic":     BookOpen,
  "Finance & HR": Banknote,
  "Operations":   Building2,
  "Support":      HeartPulse,
};

function RoleTierSection({ tier, roles, onEdit, onDelete, onPermissions }: {
  tier: RoleTier;
  roles: RoleResponse[];
  onEdit: (r: RoleResponse) => void;
  onDelete: (r: RoleResponse) => void;
  onPermissions: (r: RoleResponse) => void;
}) {
  const { t } = useLanguage();
  if (roles.length === 0) return null;
  const TierIcon = TIER_ICONS[tier];
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <TierIcon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t(`roles.tier.${tier.replace(' & ', '')}`)}</h2>
        <Badge variant="secondary" className="text-xs">{roles.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(r => (
          <RoleCard key={r.id} role={r}
            onEdit={() => onEdit(r)}
            onDelete={() => onDelete(r)}
            onPermissions={() => onPermissions(r)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoleManagement() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const isCurrentUserSuperAdmin = currentUser?.role === "super_admin";
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [stats, setStats] = useState<RoleStatsResponse | null>(null);
  const [users, setUsers] = useState<UserWithRolesResponse[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [permMatrixRole, setPermMatrixRole] = useState<RoleResponse | null>(null);
  const [editRole, setEditRole] = useState<RoleResponse | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleResponse | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [assignUser, setAssignUser] = useState<UserWithRolesResponse | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  async function handleProvision(staffId: string) {
    setProvisioningId(staffId);
    try {
      await roleApi.provisionStaffLogin(staffId);
      toast.success("Login account created with default role. Temp password: ChangeMe@123");
      loadUsers(usersPage);
    } catch {
      toast.error("Failed to create login account");
    } finally {
      setProvisioningId(null);
    }
  }

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [r, s] = await Promise.all([roleApi.getRoles({ page: 1, pageSize: 100 }), roleApi.getStats()]);
      setRoles(r.roles ?? r.items ?? []);
      setStats(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load roles";
      toast.error(msg);
      console.error("Load roles error:", err);
    }
    finally { setRolesLoading(false); }
  }, []);

  const loadUsers = useCallback(async (page: number) => {
    setUsersLoading(true);
    try {
      const r = await roleApi.getUsersWithRoles({ page, pageSize: PAGE_SIZE, staffOnly: true });
      if (!r || !r.users) {
        toast.error("Invalid response from server");
        return;
      }
      // Sort by hierarchy: Admin first, then Principal, VP, etc.
      const sorted = [...r.users].sort((a, b) => getUserHierarchyRank(a) - getUserHierarchyRank(b));
      setUsers(sorted);
      setUsersTotal(r.total ?? 0);
    } catch (err: unknown) { 
      const msg = err instanceof Error ? err.message : "Failed to load users";
      toast.error(msg);
      console.error("Load users error:", err);
    }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  function handleUsersTabOpen() { if (users.length === 0) loadUsers(1); }

  function handlePageChange(p: number) { setUsersPage(p); loadUsers(p); }

  const filteredRoles = roles.filter(r =>
    search === "" ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by tier using config
  const rolesByTier = TIER_ORDER.reduce<Record<RoleTier, RoleResponse[]>>((acc, tier) => {
    acc[tier] = filteredRoles.filter(r => (getRoleConfig(r.name).tier === tier));
    return acc;
  }, {} as Record<RoleTier, RoleResponse[]>);

  // Custom roles not matching any known config go to their own section
  const customRoles = filteredRoles.filter(r => !r.isSystemRole);
  const systemRoles = filteredRoles.filter(r => r.isSystemRole);

  const totalPages = Math.ceil(usersTotal / PAGE_SIZE);

  // Scope breakdown for stats bar
  const scopeCounts = SCOPE_ORDER.reduce<Record<AccessScope, number>>((acc, s) => {
    acc[s] = systemRoles.filter(r => getRoleConfig(r.name).scope === s).length;
    return acc;
  }, {} as Record<AccessScope, number>);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-muted-foreground" />{t('roles.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('roles.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRoles} disabled={rolesLoading} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${rolesLoading ? "animate-spin" : ""}`} />{t('roles.refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateRole(true)} className="gap-1">
            <Plus className="h-4 w-4" />{t('roles.newCustomRole')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rolesLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <StatCard icon={<Shield className="h-5 w-5 text-blue-500" />} label={t('roles.stats.totalRoles')} value={stats?.totalRoles ?? 0} sub={`${stats?.systemRoles ?? 0} system · ${stats?.customRoles ?? 0} custom`} />
            <StatCard icon={<GraduationCap className="h-5 w-5 text-purple-500" />} label={t('roles.stats.leadership')} value={(scopeCounts["Full"] ?? 0) + (scopeCounts["Broad"] ?? 0)} sub="Admin + Principal + VP" />
            <StatCard icon={<BookOpen className="h-5 w-5 text-sky-500" />} label={t('roles.stats.academicStaff')} value={scopeCounts["Standard"] ?? 0} sub="HOD + Class + Subject Teachers" />
            <StatCard icon={<Users className="h-5 w-5 text-emerald-500" />} label={t('roles.stats.usersWithRoles')} value={stats?.totalUsersWithRoles ?? 0} sub={t('roles.stats.usersWithRolesSub')} />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roles" onValueChange={v => v === "users" && handleUsersTabOpen()}>
        <TabsList>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" />{t('roles.tabs.rolesPermissions')}</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />{t('roles.tabs.staffAccess')}</TabsTrigger>
        </TabsList>

        {/* ── Roles Tab ── */}
        <TabsContent value="roles" className="space-y-8 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t('roles.search.placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {search && (
              <Button size="sm" variant="ghost" onClick={() => setSearch("")} className="gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />{t('roles.search.clear')}
              </Button>
            )}
            <p className="text-sm text-muted-foreground ml-auto hidden md:block">
              {filteredRoles.length} roles · {systemRoles.length} system · {customRoles.length} custom
            </p>
          </div>

          {rolesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : filteredRoles.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-8 w-8 text-muted-foreground" />}
              title={t('roles.emptyState.noRolesFound')}
              description={search ? t('roles.emptyState.tryDifferentSearch') : t('roles.emptyState.noRolesYet')}
              action={!search ? <Button size="sm" onClick={() => setShowCreateRole(true)} className="gap-1"><Plus className="h-4 w-4" />{t('roles.emptyState.newRoleButton')}</Button> : undefined}
            />
          ) : (
            <div className="space-y-8">
              {TIER_ORDER.map(tier => (
                <RoleTierSection
                  key={tier} tier={tier}
                  roles={rolesByTier[tier] ?? []}
                  onEdit={setEditRole}
                  onDelete={setDeleteRole}
                  onPermissions={setPermMatrixRole}
                />
              ))}
              {/* Custom roles not in predefined tiers */}
              {customRoles.filter(r => !getRoleConfig(r.name) || getRoleConfig(r.name) === DEFAULT_CONFIG).length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('roles.section.customRoles')}</h2>
                    <Badge variant="secondary" className="text-xs">{customRoles.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customRoles.map(r => (
                      <RoleCard key={r.id} role={r} onEdit={() => setEditRole(r)} onDelete={() => setDeleteRole(r)} onPermissions={() => setPermMatrixRole(r)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Staff & Access Tab ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />{t('roles.staffTable.title')}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => loadUsers(usersPage)} disabled={usersLoading} className="gap-1">
                <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? "animate-spin" : ""}`} />{t('roles.staffTable.refresh')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : users.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-muted-foreground" />}
                  title={t('roles.staffTable.noStaffFound')}
                  description={t('roles.staffTable.noStaffDescription')}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold">{t('roles.staffTable.staffMember')}</TableHead>
                        <TableHead className="font-semibold">{t('roles.staffTable.email')}</TableHead>
                        <TableHead className="font-semibold">{t('roles.staffTable.assignedRoles')}</TableHead>
                        <TableHead className="font-semibold">{t('roles.staffTable.accessScope')}</TableHead>
                        <TableHead className="font-semibold">{t('roles.staffTable.status')}</TableHead>
                        <TableHead className="text-right font-semibold">{t('roles.staffTable.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => {
                        // Compute highest scope
                        const highestScope = user.assignedRoles.reduce<AccessScope | null>((best, r) => {
                          const scope = getRoleConfig(r.name ?? "").scope;
                          if (!best) return scope;
                          return SCOPE_ORDER.indexOf(scope) < SCOPE_ORDER.indexOf(best) ? scope : best;
                        }, null);

                        return (
                          <TableRow key={user.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {(user.firstName?.[0] ?? user.username?.[0] ?? "U").toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm leading-tight">{user.firstName} {user.lastName}</p>
                                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {user.assignedRoles.length === 0 ? (
                                  <span className="text-xs text-muted-foreground italic">{t('roles.staffTable.unassigned')}</span>
                                ) : user.assignedRoles.slice(0, 2).map(r => {
                                  const c = getRoleConfig(r.name ?? "");
                                  return (
                                    <Badge key={r.id} variant="outline" className={`text-xs ${c.badge}`}>
                                      {r.displayName ?? r.name}
                                    </Badge>
                                  );
                                })}
                                {user.assignedRoles.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">+{user.assignedRoles.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {highestScope ? (
                                <Badge variant="outline" className={`text-xs border-current/30 ${SCOPE_COLORS[highestScope]}`}>{highestScope}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium
                                ${user.status?.toLowerCase() === "active"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>{user.status ?? "—"}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.hasLoginAccount ? (
                                // Admin row: greyed out — no role changes needed for the system admin
                                (user.primaryRole ?? "").toLowerCase() === "admin" ? (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 opacity-40 cursor-not-allowed" disabled>
                                    <UserCog className="h-3 w-3" />{t('roles.staffTable.manage')}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setAssignUser(user)}>
                                    <UserCog className="h-3 w-3" />{t('roles.staffTable.manage')}
                                  </Button>
                                )
                              ) : (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 px-2 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                  disabled={provisioningId === user.staffId}
                                  onClick={() => user.staffId && handleProvision(user.staffId)}
                                >
                                  {provisioningId === user.staffId
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Key className="h-3 w-3" />
                                  }
                                  {t('roles.staffTable.createLogin')}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {(usersPage - 1) * PAGE_SIZE + 1}–{Math.min(usersPage * PAGE_SIZE, usersTotal)} of {usersTotal} staff
                      </p>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={usersPage === 1} onClick={() => handlePageChange(usersPage - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-2">{usersPage} / {totalPages}</span>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={usersPage === totalPages} onClick={() => handlePageChange(usersPage + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {permMatrixRole && <PermissionMatrixDialog role={permMatrixRole} onClose={() => setPermMatrixRole(null)} />}
      {showCreateRole && <RoleFormDialog onClose={() => setShowCreateRole(false)} onSaved={loadRoles} />}
      {editRole && <RoleFormDialog role={editRole} onClose={() => setEditRole(null)} onSaved={loadRoles} />}
      {deleteRole && <DeleteRoleDialog role={deleteRole} onClose={() => setDeleteRole(null)} onDeleted={loadRoles} />}
      {assignUser && (
        <AssignRoleDialog
          user={assignUser} roles={roles}
          onClose={() => setAssignUser(null)}
          onSaved={() => { loadUsers(usersPage); loadRoles(); }}
        />
      )}
    </div>
  );
}
