import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bus, Users, Plus, Pencil, Trash2, MapPin, Phone, Loader2, Search, Route, X, ShieldOff } from "lucide-react";
import { transportApi, TransportRoute, TransportStudent, CreateRouteDto, AssignStudentDto, UpdateTransportStudentDto } from "@/services/api/transportApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Route Form Dialog ────────────────────────────────────────────────────────

function RouteFormDialog({ route, onClose, onSaved }: { route?: TransportRoute; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CreateRouteDto>({
    routeNumber: route?.routeNumber ?? "",
    routeName: route?.routeName ?? "",
    vehicleNumber: route?.vehicleNumber ?? "",
    driverName: route?.driverName ?? "",
    driverPhone: route?.driverPhone ?? "",
    startTime: route?.startTime ?? "07:00",
    endTime: route?.endTime ?? "08:30",
    capacity: route?.capacity ?? 40,
    monthlyFee: route?.monthlyFee ?? 0,
    status: route?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  function set(k: keyof CreateRouteDto, v: string | number) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.routeNumber.trim() || !form.routeName.trim()) { toast.error("Route number and name required"); return; }
    setSaving(true);
    try {
      if (route) {
        await transportApi.updateRoute(route.id, form);
        toast.success("Route updated");
      } else {
        await transportApi.createRoute(form);
        toast.success("Route created");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save route");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{route ? t('transport.routeForm.titleEdit') : t('transport.routeForm.titleAdd')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.routeNumber')} *</Label>
            <Input value={form.routeNumber} onChange={e => set("routeNumber", e.target.value)} placeholder="R-001" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.routeName')} *</Label>
            <Input value={form.routeName} onChange={e => set("routeName", e.target.value)} placeholder="Banjara Hills Route" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.vehicleNumber')}</Label>
            <Input value={form.vehicleNumber ?? ""} onChange={e => set("vehicleNumber", e.target.value)} placeholder="TS 09 AB 1234" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.driverName')}</Label>
            <Input value={form.driverName ?? ""} onChange={e => set("driverName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.driverPhone')}</Label>
            <Input value={form.driverPhone ?? ""} onChange={e => set("driverPhone", e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.capacity')}</Label>
            <Input type="number" value={form.capacity} onChange={e => set("capacity", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.monthlyFee')}</Label>
            <Input type="number" value={form.monthlyFee ?? 0} onChange={e => set("monthlyFee", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.routeForm.status')}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('transport.routeForm.status.active')}</SelectItem>
                <SelectItem value="inactive">{t('transport.routeForm.status.inactive')}</SelectItem>
                <SelectItem value="maintenance">{t('transport.routeForm.status.maintenance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="col-span-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('transport.routeForm.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {route ? t('transport.routeForm.update') : t('transport.routeForm.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Student Dialog ────────────────────────────────────────────────────

function AssignStudentDialog({ routes, onClose, onSaved }: { routes: TransportRoute[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [searchResults, setSearchResults] = useState<StudentBasic[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState<AssignStudentDto>({ studentId: "", routeId: "", pickupPoint: "", dropPoint: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentBasic | null>(null);
  const studentRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assigned student IDs once on mount
  useEffect(() => {
    setLoadingAssigned(true);
    transportApi.getAllTransportStudents().then(ts => {
      setAssignedStudentIds(new Set(ts.map(t => t.studentId)));
    }).catch(() => {
      toast.error("Failed to load current assignments");
    }).finally(() => setLoadingAssigned(false));
  }, []);

  // Debounced server-side search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!studentQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await studentApi.list({ search: studentQuery.trim(), status: "active", pageSize: 20 });
        setSearchResults(res.students ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [studentQuery]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (studentRef.current && !studentRef.current.contains(e.target as Node)) setStudentOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const filteredResults = searchResults.filter(s => !assignedStudentIds.has(s.id));

  function pickStudent(s: StudentBasic) {
    setSelectedStudent(s);
    setForm(p => ({ ...p, studentId: s.id }));
    setStudentQuery("");
    setStudentOpen(false);
    setSearchResults([]);
  }
  function clearStudent() {
    setSelectedStudent(null);
    setForm(p => ({ ...p, studentId: "" }));
    setStudentQuery("");
    setSearchResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.routeId) { toast.error("Select student and route"); return; }
    setSaving(true);
    try {
      await transportApi.assignStudentToRoute(form);
      toast.success("Student assigned to route");
      onSaved(); onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err instanceof Error ? err.message : "Failed to assign student");
      toast.error(msg);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('transport.assignDialog.title')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('transport.assignDialog.studentLabel')} *</Label>
            <div ref={studentRef} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 pr-8"
                placeholder={loadingAssigned ? t('transport.assignDialog.searchLoading') : t('transport.assignDialog.searchPlaceholder')}
                value={selectedStudent && !studentOpen
                  ? `${selectedStudent.name} — ${selectedStudent.class} ${selectedStudent.section} (${selectedStudent.admissionNumber})`
                  : studentQuery}
                onChange={e => {
                  setStudentQuery(e.target.value);
                  if (selectedStudent) clearStudent();
                  setStudentOpen(true);
                }}
                onFocus={() => setStudentOpen(true)}
                disabled={loadingAssigned}
              />
              {selectedStudent && (
                <button type="button" onClick={clearStudent}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              {studentOpen && studentQuery.trim().length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
                  {searching ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />{t('transport.assignDialog.searching')}
                    </div>
                  ) : filteredResults.length > 0 ? (
                    filteredResults.map(s => (
                      <button key={s.id} type="button"
                        onMouseDown={e => { e.preventDefault(); pickStudent(s); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{s.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{s.class} {s.section} · {s.admissionNumber}</span>
                      </button>
                    ))
                  ) : searchResults.length > 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">{t('transport.assignDialog.allAssigned')}</div>
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">No active students found for "{studentQuery}"</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('transport.assignDialog.routeLabel')} *</Label>
            <Select value={form.routeId} onValueChange={v => setForm(p => ({ ...p, routeId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('transport.assignDialog.selectRoute')} /></SelectTrigger>
              <SelectContent>
                {routes.filter(r => r.status === "active").map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.routeNumber} — {r.routeName} ({r.studentsAssigned}/{r.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('transport.assignDialog.pickupPoint')}</Label>
              <Input value={form.pickupPoint ?? ""} onChange={e => setForm(p => ({ ...p, pickupPoint: e.target.value }))} placeholder="Main Gate" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('transport.assignDialog.dropPoint')}</Label>
              <Input value={form.dropPoint ?? ""} onChange={e => setForm(p => ({ ...p, dropPoint: e.target.value }))} placeholder="Bus Stand" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('transport.assignDialog.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('transport.assignDialog.assign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Transport Student Dialog ───────────────────────────────────────────

function EditTransportStudentDialog({ assignment, routes, onClose, onSaved }: { assignment: TransportStudent; routes: TransportRoute[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<UpdateTransportStudentDto>({
    routeId: assignment.routeId,
    pickupPoint: assignment.pickupPoint ?? "",
    dropPoint: assignment.dropPoint ?? "",
    monthlyFee: assignment.monthlyFee ?? 0,
    status: assignment.status,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.routeId) { toast.error("Select a route"); return; }
    setSaving(true);
    try {
      await transportApi.updateTransportStudent(assignment.id, form);
      toast.success("Transport assignment updated");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Transport Assignment — {assignment.studentName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('transport.editDialog.routeLabel')} *</Label>
            <Select value={form.routeId} onValueChange={v => setForm(p => ({ ...p, routeId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('transport.editDialog.selectRoute')} /></SelectTrigger>
              <SelectContent>
                {routes.filter(r => r.status === "active" || r.id === assignment.routeId).map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.routeNumber} — {r.routeName} ({r.studentsAssigned}/{r.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('transport.editDialog.pickupPoint')}</Label>
              <Input value={form.pickupPoint ?? ""} onChange={e => setForm(p => ({ ...p, pickupPoint: e.target.value }))} placeholder="Main Gate" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('transport.editDialog.dropPoint')}</Label>
              <Input value={form.dropPoint ?? ""} onChange={e => setForm(p => ({ ...p, dropPoint: e.target.value }))} placeholder="Bus Stand" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('transport.editDialog.monthlyFee')}</Label>
              <Input type="number" value={form.monthlyFee ?? 0} onChange={e => setForm(p => ({ ...p, monthlyFee: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('transport.editDialog.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('transport.editDialog.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('transport.editDialog.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('transport.editDialog.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('transport.editDialog.update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TransportManager() {
  const { t } = useLanguage();
  const { hasUserPermission } = usePermissions();
  const canViewTransport   = hasUserPermission('Transport', 'View');
  const canManageRoutes    = hasUserPermission('Transport', 'Create');
  const canEditRoutes      = hasUserPermission('Transport', 'Edit');
  const canDeleteRoutes    = hasUserPermission('Transport', 'Delete');
  const accessDenied       = !canViewTransport;

  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [students, setStudents] = useState<TransportStudent[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editRoute, setEditRoute] = useState<TransportRoute | undefined>();
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editStudent, setEditStudent] = useState<TransportStudent | undefined>();
  const [tab, setTab] = useState("routes");

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const r = await transportApi.getRoutes(1, 200);
      setRoutes(r.routes ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load routes");
    } finally { setRoutesLoading(false); }
  }, []);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const s = await transportApi.getAllTransportStudents();
      setStudents(s ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load students");
    } finally { setStudentsLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  function handleTabChange(v: string) {
    setTab(v);
    if (v === "students" && students.length === 0) loadStudents();
  }

  async function handleDeleteRoute(id: string) {
    if (!confirm("Delete this route? Students assigned will be unlinked.")) return;
    try {
      await transportApi.deleteRoute(id);
      toast.success("Route deleted");
      loadRoutes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete route");
    }
  }

  async function handleRemoveStudent(id: string) {
    if (!confirm("Remove this student from the route?")) return;
    try {
      await transportApi.removeStudentFromRoute(id);
      toast.success("Student removed from route");
      loadStudents();
      loadRoutes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove student");
    }
  }

  const activeRoutes = routes.filter(r => r.status === "active").length;
  const totalStudents = routes.reduce((a, r) => a + r.studentsAssigned, 0);
  const totalCapacity = routes.reduce((a, r) => a + r.capacity, 0);

  const filteredRoutes = routes.filter(r =>
    r.routeName.toLowerCase().includes(search.toLowerCase()) ||
    r.routeNumber.toLowerCase().includes(search.toLowerCase()) ||
    (r.vehicleNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.routeName.toLowerCase().includes(search.toLowerCase()) ||
    (s.pickupPoint ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <ShieldOff className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold">{t('transport.accessRestricted')}</h2>
        <p className="text-muted-foreground max-w-sm">
          {t('transport.accessDeniedMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="h-6 w-6 text-amber-600" />{t('transport.title')}</h1>
          <p className="text-muted-foreground">{canManageRoutes ? t('transport.subtitle.manage') : t('transport.subtitle.view')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('transport.stats.totalRoutes')}</p>
          <p className="text-2xl font-bold">{routes.length}</p>
          <p className="text-xs text-green-600">{activeRoutes} active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('transport.stats.studentsUsingTransport')}</p>
          <p className="text-2xl font-bold">{totalStudents}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('transport.stats.totalCapacity')}</p>
          <p className="text-2xl font-bold">{totalCapacity}</p>
          <p className="text-xs text-muted-foreground">{totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0}% utilized</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('transport.stats.revenuePerMonth')}</p>
          <p className="text-2xl font-bold">₹{routes.reduce((a, r) => a + (r.monthlyFee ?? 0) * r.studentsAssigned, 0).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="routes" className="gap-1.5"><Route className="h-4 w-4" />{t('transport.tabs.busRoutes')}</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" />{t('transport.tabs.students')}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder={t('transport.search.placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "routes" && canManageRoutes && <Button onClick={() => setShowAddRoute(true)} className="gap-1"><Plus className="h-4 w-4" />{t('transport.actions.addRoute')}</Button>}
            {tab === "students" && canManageRoutes && <Button onClick={() => setShowAssign(true)} className="gap-1"><Plus className="h-4 w-4" />{t('transport.actions.assignStudent')}</Button>}
          </div>
        </div>

        {/* Routes Tab */}
        <TabsContent value="routes">
          {routesLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredRoutes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('transport.routes.emptyTitle')}</p>
              <p className="text-sm">{t('transport.routes.emptySubtitle')}</p>
              {canManageRoutes && <Button className="mt-4 gap-1" onClick={() => setShowAddRoute(true)}><Plus className="h-4 w-4" />{t('transport.actions.addRoute')}</Button>}
            </CardContent></Card>
          ) : (
            <div className="rounded-lg overflow-hidden border border-border dark:border-slate-700 bg-card dark:text-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-slate-800 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">{t('transport.routes.col.route')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.routes.col.vehicle')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.routes.col.driver')}</TableHead>
                    <TableHead className="text-center font-semibold text-foreground">{t('transport.routes.col.students')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">{t('transport.routes.col.feePerMonth')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.routes.col.status')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">{t('transport.routes.col.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="dark:[&>tr]:border-slate-600/70">
                  {filteredRoutes.map(r => (
                    <TableRow key={r.id} className="dark:border-slate-600/70 dark:hover:bg-slate-700/40">
                      <TableCell>
                        <div className="font-medium dark:text-white">{r.routeName}</div>
                        <div className="text-xs text-muted-foreground dark:text-slate-400">{r.routeNumber}</div>
                      </TableCell>
                      <TableCell className="dark:text-slate-200">{r.vehicleNumber || "—"}</TableCell>
                      <TableCell>
                        <div className="dark:text-slate-200">{r.driverName || "—"}</div>
                        {r.driverPhone && <div className="text-xs text-muted-foreground dark:text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" />{r.driverPhone}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium dark:text-slate-200">{r.studentsAssigned}</span>
                        <span className="text-muted-foreground dark:text-slate-400">/{r.capacity}</span>
                      </TableCell>
                      <TableCell className="text-right dark:text-slate-200">₹{(r.monthlyFee ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : r.status === "maintenance" ? "secondary" : "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEditRoutes && <Button variant="ghost" size="icon" onClick={() => setEditRoute(r)}><Pencil className="h-4 w-4" /></Button>}
                          {canDeleteRoutes && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRoute(r.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          {studentsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filteredStudents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              {search ? (
                <>
                  <p className="font-medium">No assigned student matches "{search}"</p>
                  <p className="text-sm mt-1">This student may not be assigned to a transport route yet.</p>
                  {canManageRoutes && <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />Assign Student to Route</Button>}
                </>
              ) : (
                <>
                  <p className="font-medium">{t('transport.students.emptyTitle')}</p>
                  <p className="text-sm">{t('transport.students.emptySubtitle')}</p>
                  {canManageRoutes && <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />{t('transport.actions.assignStudent')}</Button>}
                </>
              )}
            </CardContent></Card>
          ) : (
            <div className="rounded-lg overflow-hidden border border-border dark:border-slate-700 bg-card dark:text-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-slate-800 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.student')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.class')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.route')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.pickupPoint')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.dropPoint')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.fee')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('transport.students.col.status')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">{t('transport.students.col.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="dark:[&>tr]:border-slate-600/70">
                  {filteredStudents.map(s => (
                    <TableRow key={s.id} className="dark:border-slate-600/70 dark:hover:bg-slate-700/40">
                      <TableCell className="font-medium dark:text-white">{s.studentName}</TableCell>
                      <TableCell className="dark:text-slate-200">{s.studentClass} {s.studentSection}</TableCell>
                      <TableCell>
                        <div className="font-medium dark:text-slate-200">{s.routeName}</div>
                        <div className="text-xs text-muted-foreground dark:text-slate-400">{s.routeNumber}</div>
                      </TableCell>
                      <TableCell className="dark:text-slate-200"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-600 dark:text-green-400" />{s.pickupPoint || "—"}</div></TableCell>
                      <TableCell className="dark:text-slate-200"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-red-500 dark:text-red-400" />{s.dropPoint || "—"}</div></TableCell>
                      <TableCell className="dark:text-slate-200">₹{(s.monthlyFee ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEditRoutes && <Button variant="ghost" size="icon" onClick={() => setEditStudent(s)}><Pencil className="h-4 w-4" /></Button>}
                          {canDeleteRoutes && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveStudent(s.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {(showAddRoute || editRoute) && (
        <RouteFormDialog route={editRoute} onClose={() => { setShowAddRoute(false); setEditRoute(undefined); }} onSaved={() => { loadRoutes(); }} />
      )}
      {showAssign && <AssignStudentDialog routes={routes} onClose={() => setShowAssign(false)} onSaved={() => { loadStudents(); loadRoutes(); }} />}
      {editStudent && <EditTransportStudentDialog assignment={editStudent} routes={routes} onClose={() => setEditStudent(undefined)} onSaved={() => { loadStudents(); loadRoutes(); }} />}
    </div>
  );
}
