import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserPlus, Clock, CheckCircle, XCircle, Eye, Search, Phone, Building2,
  CalendarClock, LogOut, UserCheck, AlertCircle, RefreshCw, ClipboardList, Loader2,
  Car, IdCard, ChevronLeft, ChevronRight, BadgeCheck, Link2, ShieldOff
} from "lucide-react";
import {
  visitorApi, VisitorBasic, VisitorFull, VisitorPreRegistration, VisitorStats,
  VisitorFilters, CheckInDto, PreRegisterDto
} from "@/services/api/visitorApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { usePermissions } from "@/contexts/PermissionsContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSES = [
  { value: "meeting",     label: "Meeting" },
  { value: "delivery",    label: "Delivery" },
  { value: "maintenance", label: "Maintenance" },
  { value: "support",     label: "Support" },
  { value: "interview",   label: "Interview" },
  { value: "official",    label: "Official" },
  { value: "other",       label: "Other" },
];

const ID_TYPES = ["Aadhar Card", "PAN Card", "Passport", "Driving License", "Voter ID", "Employee ID", "Student ID"];

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  checked_in:  { label: "Checked In",  className: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle },
  checked_out: { label: "Checked Out", className: "bg-slate-100 text-slate-700 border-slate-200",  icon: LogOut },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-700 border-red-200",         icon: XCircle },
};

const PRE_REG_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-100 text-amber-800" },
  approved:  { label: "Approved",  className: "bg-blue-100 text-blue-800" },
  arrived:   { label: "Arrived",   className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function visitorDisplayName(v: VisitorBasic): string {
  return v.visitorName || v.name || "Unknown";
}

// ─── Live Clock Badge ────────────────────────────────────────────────────────

function LiveDuration({ checkInTime }: { checkInTime: string }) {
  const [mins, setMins] = useState(() =>
    Math.floor((Date.now() - new Date(checkInTime).getTime()) / 60000)
  );
  useEffect(() => {
    const id = setInterval(() => setMins(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 60000)), 30000);
    return () => clearInterval(id);
  }, [checkInTime]);
  return <span className="font-mono text-xs tabular-nums">{formatDuration(mins)}</span>;
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600", icon: Clock };
  const Icon = info.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${info.className}`}>
      <Icon className="h-3 w-3" />{info.label}
    </Badge>
  );
}

// ─── Check-In Dialog ─────────────────────────────────────────────────────────

function CheckInDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [historyPhone, setHistoryPhone] = useState("");
  const [history, setHistory] = useState<VisitorBasic[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CheckInDto>({
    name: "", phone: "", purpose: "meeting", personToMeet: "",
    email: "", idProof: "", idProofNumber: "", hasVehicle: false, vehicleNumber: "", studentId: "",
  });

  useEffect(() => {
    studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  async function lookupHistory() {
    if (!historyPhone || historyPhone.length < 10) return;
    try {
      const h = await visitorApi.getHistory(historyPhone);
      setHistory(h ?? []);
      if (h?.length > 0) {
        const last = h[0];
        setForm(p => ({ ...p, name: visitorDisplayName(last), phone: last.phone ?? historyPhone }));
        toast.info("Previous visit history loaded");
      } else {
        toast.info("No previous visits for this phone number");
      }
    } catch { /* silent */ }
  }

  function fillFromHistory(v: VisitorBasic) {
    setForm(p => ({ ...p, name: visitorDisplayName(v), phone: v.phone ?? p.phone }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error("Visitor name is required"); return; }
    if (!form.phone) { toast.error("Phone number is required"); return; }
    if (!form.purpose) { toast.error("Purpose is required"); return; }
    if (!form.personToMeet) { toast.error("Person to meet is required"); return; }
    setSaving(true);
    try {
      const payload: CheckInDto = { ...form };
      if (!payload.studentId) delete payload.studentId;
      await visitorApi.checkIn(payload);
      toast.success(`${form.name} checked in successfully`);
      onSuccess(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally { setSaving(false); }
  }

  function set(k: keyof CheckInDto, v: unknown) { setForm(p => ({ ...p, [k]: v })); }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />Visitor Check-In
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone lookup */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Lookup — Returning Visitor?</p>
            <div className="flex gap-2">
              <Input value={historyPhone} onChange={e => setHistoryPhone(e.target.value)} placeholder="Enter phone to check history..." className="flex-1" />
              <Button type="button" variant="secondary" onClick={lookupHistory} className="shrink-0">Lookup</Button>
            </div>
            {history.length > 0 && (
              <div className="text-xs space-y-1 max-h-28 overflow-y-auto">
                {history.slice(0, 5).map(v => (
                  <button key={v.id} type="button" onClick={() => fillFromHistory(v)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent flex justify-between items-center">
                    <span>{visitorDisplayName(v)} · {v.purpose}</span>
                    <span className="text-muted-foreground">{new Date(v.checkInTime).toLocaleDateString("en-IN")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Visitor's full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose *</Label>
              <Select value={form.purpose} onValueChange={v => set("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Person to Meet *</Label>
            <Input value={form.personToMeet} onChange={e => set("personToMeet", e.target.value)} placeholder="Teacher / Staff / Principal name..." />
          </div>

          {/* ID Verification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ID Proof Type</Label>
              <Select value={form.idProof ?? ""} onValueChange={v => set("idProof", v)}>
                <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ID Number</Label>
              <Input value={form.idProofNumber ?? ""} onChange={e => set("idProofNumber", e.target.value)} placeholder="ID number" />
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hasVehicle" checked={form.hasVehicle} onChange={e => set("hasVehicle", e.target.checked)} className="h-4 w-4 rounded" />
            <Label htmlFor="hasVehicle" className="cursor-pointer">Arrived with vehicle</Label>
            {form.hasVehicle && (
              <Input className="ml-2 flex-1" value={form.vehicleNumber ?? ""} onChange={e => set("vehicleNumber", e.target.value)} placeholder="Vehicle number (MH 01 AB 1234)" />
            )}
          </div>

          {/* Student link */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span>Link to Student (Optional) — e.g. parent visiting for specific student</span>
            </div>
            <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student by name..." className="text-sm" />
            <Select value={form.studentId ?? "_none_"} onValueChange={v => set("studentId", v === "_none_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {filteredStudents.slice(0, 50).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.class} {s.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Check In Visitor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pre-Register Dialog ──────────────────────────────────────────────────────

function PreRegisterDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PreRegisterDto>({
    visitorName: "", visitorPhone: "", visitorEmail: "", purpose: "meeting",
    personToMeet: "", expectedDate: new Date().toISOString().split("T")[0], expectedTime: "",
  });
  function set(k: keyof PreRegisterDto, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.visitorName || !form.visitorPhone || !form.personToMeet) {
      toast.error("Name, phone, and person to meet are required"); return;
    }
    setSaving(true);
    try {
      await visitorApi.createPreRegistration(form);
      toast.success("Visitor pre-registered successfully");
      onSuccess(); onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />Pre-Register Visitor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Visitor Name *</Label>
              <Input value={form.visitorName} onChange={e => set("visitorName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.visitorPhone} onChange={e => set("visitorPhone", e.target.value)} placeholder="+91 9876543210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.visitorEmail ?? ""} onChange={e => set("visitorEmail", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purpose *</Label>
              <Select value={form.purpose} onValueChange={v => set("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Person to Meet *</Label>
              <Input value={form.personToMeet} onChange={e => set("personToMeet", e.target.value)} placeholder="Principal, Teacher..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expected Date *</Label>
              <Input type="date" value={form.expectedDate} onChange={e => set("expectedDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Time</Label>
              <Input type="time" value={form.expectedTime ?? ""} onChange={e => set("expectedTime", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Pre-Register
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Visit Detail Dialog ──────────────────────────────────────────────────────

function VisitDetailDialog({ visitId, onClose, onCheckOut }: {
  visitId: string; onClose: () => void; onCheckOut: (id: string) => void;
}) {
  const { hasUserPermission } = usePermissions();
  const canManageVisitors = hasUserPermission('Visitor', 'Create');
  const [visit, setVisit] = useState<VisitorFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    visitorApi.getById(visitId)
      .then(v => setVisit(v))
      .catch(() => toast.error("Failed to load visit details"))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent><Skeleton className="h-60 w-full" /></DialogContent>
    </Dialog>
  );
  if (!visit) return null;

  const statusInfo = STATUS_MAP[visit.status] ?? STATUS_MAP.checked_out;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <span>{visitorDisplayName(visit)}</span>
            </div>
            <Badge variant="outline" className={`gap-1 ${statusInfo.className}`}>
              <statusInfo.icon className="h-3 w-3" />{statusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{visit.phone ?? "—"}</div>
            <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{visit.organization ?? "—"}</div>
            <div><span className="text-muted-foreground">Visit #:</span> <span className="font-mono text-xs">{visit.visitNumber}</span></div>
            <div><span className="text-muted-foreground">Pass #:</span> <span className="font-mono text-xs">{visit.passNumber ?? "—"}</span></div>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Purpose</p><p className="font-medium capitalize">{visit.purpose}</p></div>
            <div><p className="text-xs text-muted-foreground">Meeting</p><p className="font-medium">{visit.personToMeet ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Check In</p><p className="font-medium">{new Date(visit.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p></div>
            <div><p className="text-xs text-muted-foreground">Check Out</p><p className="font-medium">{visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
            {visit.visitDuration != null && <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{formatDuration(visit.visitDuration)}</p></div>}
            {visit.itemsCarried && <div><p className="text-xs text-muted-foreground">Items Carried</p><p className="font-medium">{visit.itemsCarried}</p></div>}
          </div>
          {(visit.idType || visit.idProof) && (
            <div className="flex items-center gap-2 text-sm">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <span>{visit.idType ?? visit.idProof}</span>
              {visit.idNumber && <span className="font-mono text-xs">#{visit.idNumber ?? visit.idProofNumber}</span>}
            </div>
          )}
          {visit.hasVehicle && visit.vehicleNumber && (
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-muted-foreground" />{visit.vehicleNumber}
            </div>
          )}
          {visit.remarks && <div className="text-sm text-muted-foreground italic">"{visit.remarks}"</div>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {visit.status === "checked_in" && canManageVisitors && (
            <Button className="gap-1 bg-amber-600 hover:bg-amber-700" onClick={() => { onCheckOut(visit.id); onClose(); }}>
              <LogOut className="h-4 w-4" />Check Out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VisitorManagement() {
  const { hasUserPermission } = usePermissions();
  const canViewVisitors    = hasUserPermission('Visitor', 'View');
  const canManageVisitors  = hasUserPermission('Visitor', 'Create');
  const canDeleteVisitors  = hasUserPermission('Visitor', 'Delete');

  const [tab, setTab] = useState("live");
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [liveVisitors, setLiveVisitors] = useState<VisitorBasic[]>([]);
  const [todayVisitors, setTodayVisitors] = useState<VisitorBasic[]>([]);
  const [allVisitors, setAllVisitors] = useState<VisitorBasic[]>([]);
  const [preRegs, setPreRegs] = useState<VisitorPreRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPurpose, setFilterPurpose] = useState("");
  const PAGE_SIZE = 20;

  // Dialogs
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showPreReg, setShowPreReg] = useState(false);
  const [viewVisitId, setViewVisitId] = useState<string | undefined>();

  const refreshTimer = useRef<ReturnType<typeof setInterval>>();

  const loadLiveAndStats = useCallback(async () => {
    try {
      const [live, s] = await Promise.all([
        visitorApi.getCurrentlyInside(),
        visitorApi.getStats(),
      ]);
      setLiveVisitors(live ?? []);
      setStats(s);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load live data");
    } finally { setLoading(false); }
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const t = await visitorApi.getToday();
      setTodayVisitors(t ?? []);
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async (p: number) => {
    setAllLoading(true);
    try {
      const filters: VisitorFilters = {};
      if (search)        filters.searchQuery = search;
      if (filterStatus)  filters.status = filterStatus;
      if (filterPurpose) filters.purpose = filterPurpose;
      const result = await visitorApi.getVisitors(filters, p, PAGE_SIZE);
      setAllVisitors(result.items ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.totalCount ?? 0);
    } catch { /* silent */ }
    finally { setAllLoading(false); }
  }, [search, filterStatus, filterPurpose]);

  const loadPreRegs = useCallback(async () => {
    try {
      const r = await visitorApi.getPreRegistrations();
      setPreRegs(r ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadLiveAndStats();
    loadToday();
    // Auto-refresh live every 30s
    refreshTimer.current = setInterval(loadLiveAndStats, 30000);
    return () => clearInterval(refreshTimer.current);
  }, [loadLiveAndStats, loadToday]);

  useEffect(() => {
    if (tab === "all") { setPage(1); loadAll(1); }
    if (tab === "prereg") loadPreRegs();
  }, [tab, loadAll, loadPreRegs]);

  useEffect(() => {
    if (tab === "all") { setPage(1); loadAll(1); }
  }, [search, filterStatus, filterPurpose]);

  async function handleCheckOut(id: string) {
    try {
      await visitorApi.checkOut(id);
      toast.success("Visitor checked out");
      loadLiveAndStats();
      loadToday();
      if (tab === "all") loadAll(page);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Check-out failed"); }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this visit?")) return;
    try {
      await visitorApi.cancelVisit(id, "Cancelled by staff");
      toast.success("Visit cancelled");
      loadLiveAndStats();
      loadToday();
      if (tab === "all") loadAll(page);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleApprovePreReg(id: string) {
    try {
      await visitorApi.approvePreRegistration(id);
      toast.success("Pre-registration approved");
      loadPreRegs();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  function onCheckInSuccess() { loadLiveAndStats(); loadToday(); }
  function onPreRegSuccess() { loadPreRegs(); }

  if (!canViewVisitors) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-muted-foreground">
        <ShieldOff className="h-16 w-16 opacity-30" />
        <div className="text-center">
          <p className="text-lg font-semibold">Access Restricted</p>
          <p className="text-sm mt-1">You don't have permission to view Visitor Management.</p>
          <p className="text-sm">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />Visitor Management
          </h1>
          <p className="text-muted-foreground">Track and manage school visitors in real time</p>
        </div>
        <div className="flex gap-2">
          {canManageVisitors && (
            <Button variant="outline" onClick={() => setShowPreReg(true)} className="gap-1">
              <CalendarClock className="h-4 w-4" />Pre-Register
            </Button>
          )}
          {canManageVisitors && (
            <Button onClick={() => setShowCheckIn(true)} className="gap-1 bg-green-600 hover:bg-green-700">
              <UserPlus className="h-4 w-4" />Check In Visitor
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Currently Inside</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.currentlyInside ?? liveVisitors.length}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
              {(stats?.currentlyInside ?? 0) > 0 && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today Total</p>
                  <p className="text-3xl font-bold">{stats?.todayTotal ?? todayVisitors.length}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-400">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-3xl font-bold">{stats?.completedToday ?? 0}</p>
                </div>
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-bold">
                    {stats?.averageVisitDuration ? `${stats.averageVisitDuration}m` : "—"}
                  </p>
                </div>
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="live" className="gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live Visitors
              {liveVisitors.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{liveVisitors.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />Today's Log
            </TabsTrigger>
            <TabsTrigger value="prereg" className="gap-1.5">
              <CalendarClock className="h-4 w-4" />Pre-Registered
              {preRegs.filter(p => p.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {preRegs.filter(p => p.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <Search className="h-4 w-4" />All Visits
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={loadLiveAndStats} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Live Tab */}
        <TabsContent value="live">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : liveVisitors.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-muted-foreground">
                <UserCheck className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-lg">No visitors currently inside</p>
                <p className="text-sm">All clear! Campus is visitor-free right now.</p>
                {canManageVisitors && (
                  <Button className="mt-4 gap-1 bg-green-600 hover:bg-green-700" onClick={() => setShowCheckIn(true)}>
                    <UserPlus className="h-4 w-4" />Check In Visitor
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Checked In</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead>Pass #</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveVisitors.map(v => (
                    <TableRow key={v.id} className="hover:bg-green-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                            {visitorDisplayName(v).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{visitorDisplayName(v)}</p>
                            {v.organization && <p className="text-xs text-muted-foreground">{v.organization}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{v.phone ?? "—"}</TableCell>
                      <TableCell><span className="capitalize text-sm">{v.purpose}</span></TableCell>
                      <TableCell className="text-sm">{v.personToMeet ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {new Date(v.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <LiveDuration checkInTime={v.checkInTime} />
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.visitNumber?.split("-").pop() ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewVisitId(v.id)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManageVisitors && (
                            <Button variant="ghost" size="icon" className="text-amber-600 hover:bg-amber-50" onClick={() => handleCheckOut(v.id)} title="Check out">
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteVisitors && (
                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleCancel(v.id)} title="Cancel">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Today Tab */}
        <TabsContent value="today">
          {todayVisitors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No visits recorded today</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayVisitors.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{visitorDisplayName(v)}</p>
                          <p className="text-xs text-muted-foreground">{v.phone ?? ""}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{v.purpose}</TableCell>
                      <TableCell className="text-sm">{v.personToMeet ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(v.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.visitDuration != null ? formatDuration(v.visitDuration) : (v.status === "checked_in" ? <LiveDuration checkInTime={v.checkInTime} /> : "—")}
                      </TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewVisitId(v.id)}><Eye className="h-4 w-4" /></Button>
                          {v.status === "checked_in" && (
                            <Button variant="ghost" size="icon" className="text-amber-600" onClick={() => handleCheckOut(v.id)}><LogOut className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Purpose breakdown mini-chart */}
          {stats && Object.keys(stats.purposeBreakdown ?? {}).length > 0 && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3">Today's Purpose Breakdown</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.purposeBreakdown).map(([k, count]) => (
                    <div key={k} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                      <span className="capitalize font-medium">{k}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pre-Registrations Tab */}
        <TabsContent value="prereg">
          {preRegs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No pre-registrations</p>
                <Button className="mt-4 gap-1" variant="outline" onClick={() => setShowPreReg(true)}>
                  <CalendarClock className="h-4 w-4" />Pre-Register a Visitor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preRegs.map(pr => {
                    const statusInfo = PRE_REG_STATUS[pr.status] ?? PRE_REG_STATUS.pending;
                    return (
                      <TableRow key={pr.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{pr.visitorName}</p>
                            {pr.organization && <p className="text-xs text-muted-foreground">{pr.organization}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{pr.phone ?? pr.visitorPhone}</TableCell>
                        <TableCell className="capitalize text-sm">{pr.purpose}</TableCell>
                        <TableCell className="text-sm">{pr.personToMeet}</TableCell>
                        <TableCell className="text-sm">
                          <div>
                            {pr.expectedDate
                              ? new Date(pr.expectedDate).toLocaleDateString("en-IN")
                              : pr.scheduledDate ? new Date(pr.scheduledDate).toLocaleDateString("en-IN") : "—"}
                            {pr.scheduledTime && <p className="text-xs text-muted-foreground">{pr.scheduledTime}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={statusInfo.className}>{statusInfo.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {pr.status === "pending" && canManageVisitors && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => handleApprovePreReg(pr.id)}>
                                <BadgeCheck className="h-3 w-3" />Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700 border border-green-200 hover:bg-green-50" onClick={() => setShowCheckIn(true)}>
                                Check In
                              </Button>
                            </div>
                          )}
                          {pr.status === "approved" && canManageVisitors && (
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => setShowCheckIn(true)}>
                              Check In Now
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* All Visits Tab */}
        <TabsContent value="all">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search visitor, phone, org..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                {filterStatus && <button type="button" className="text-sm px-2 py-1 text-muted-foreground hover:bg-accent w-full text-left" onClick={() => setFilterStatus("")}>Clear filter</button>}
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPurpose} onValueChange={setFilterPurpose}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Purposes" /></SelectTrigger>
              <SelectContent>
                {filterPurpose && <button type="button" className="text-sm px-2 py-1 text-muted-foreground hover:bg-accent w-full text-left" onClick={() => setFilterPurpose("")}>Clear filter</button>}
                {PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {allLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : allVisitors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No visits found matching your filters</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit #</TableHead>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVisitors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{v.visitNumber?.split("-").pop()}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{visitorDisplayName(v)}</p>
                            {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{v.purpose}</TableCell>
                        <TableCell className="text-sm">{v.personToMeet ?? "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(v.checkInTime).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(v.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {v.visitDuration != null ? formatDuration(v.visitDuration) : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewVisitId(v.id)}><Eye className="h-4 w-4" /></Button>
                            {v.status === "checked_in" && (
                              <Button variant="ghost" size="icon" className="text-amber-600" onClick={() => handleCheckOut(v.id)}><LogOut className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{total} total visits · Page {page} of {totalPages}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); loadAll(page - 1); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); loadAll(page + 1); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showCheckIn && <CheckInDialog onClose={() => setShowCheckIn(false)} onSuccess={onCheckInSuccess} />}
      {showPreReg && <PreRegisterDialog onClose={() => setShowPreReg(false)} onSuccess={onPreRegSuccess} />}
      {viewVisitId && <VisitDetailDialog visitId={viewVisitId} onClose={() => setViewVisitId(undefined)} onCheckOut={handleCheckOut} />}
    </div>
  );
}
