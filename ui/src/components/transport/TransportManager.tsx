import { useState, useEffect, useCallback } from "react";
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
import { Bus, Users, Plus, Pencil, Trash2, MapPin, Phone, Loader2, Search, Route } from "lucide-react";
import { transportApi, TransportRoute, TransportStudent, CreateRouteDto, AssignStudentDto } from "@/services/api/transportApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";

// ─── Route Form Dialog ────────────────────────────────────────────────────────

function RouteFormDialog({ route, onClose, onSaved }: { route?: TransportRoute; onClose: () => void; onSaved: () => void }) {
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
        <DialogHeader><DialogTitle>{route ? "Edit Route" : "Add Bus Route"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Route Number *</Label>
            <Input value={form.routeNumber} onChange={e => set("routeNumber", e.target.value)} placeholder="R-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Route Name *</Label>
            <Input value={form.routeName} onChange={e => set("routeName", e.target.value)} placeholder="Banjara Hills Route" />
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle Number</Label>
            <Input value={form.vehicleNumber ?? ""} onChange={e => set("vehicleNumber", e.target.value)} placeholder="TS 09 AB 1234" />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Name</Label>
            <Input value={form.driverName ?? ""} onChange={e => set("driverName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Phone</Label>
            <Input value={form.driverPhone ?? ""} onChange={e => set("driverPhone", e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input type="number" value={form.capacity} onChange={e => set("capacity", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Fee (₹)</Label>
            <Input type="number" value={form.monthlyFee ?? 0} onChange={e => set("monthlyFee", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="col-span-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {route ? "Update" : "Create Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Student Dialog ────────────────────────────────────────────────────

function AssignStudentDialog({ routes, onClose, onSaved }: { routes: TransportRoute[]; onClose: () => void; onSaved: () => void }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [form, setForm] = useState<AssignStudentDto>({ studentId: "", routeId: "", pickupPoint: "", dropPoint: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
  }, []);

  const filtered = students.filter(s =>
    s.status === "Active" && (s.name?.toLowerCase().includes(search.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.routeId) { toast.error("Select student and route"); return; }
    setSaving(true);
    try {
      await transportApi.assignStudentToRoute(form);
      toast.success("Student assigned to route");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign student");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Student to Route</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Search Student</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or admission number..." />
          </div>
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={form.studentId} onValueChange={v => setForm(p => ({ ...p, studentId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {filtered.slice(0, 50).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.class} {s.section} ({s.admissionNumber})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Route *</Label>
            <Select value={form.routeId} onValueChange={v => setForm(p => ({ ...p, routeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
              <SelectContent>
                {routes.filter(r => r.status === "active").map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.routeNumber} — {r.routeName} ({r.studentsAssigned}/{r.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pickup Point</Label>
              <Input value={form.pickupPoint ?? ""} onChange={e => setForm(p => ({ ...p, pickupPoint: e.target.value }))} placeholder="Main Gate" />
            </div>
            <div className="space-y-1.5">
              <Label>Drop Point</Label>
              <Input value={form.dropPoint ?? ""} onChange={e => setForm(p => ({ ...p, dropPoint: e.target.value }))} placeholder="Bus Stand" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Assign Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TransportManager() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [students, setStudents] = useState<TransportStudent[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editRoute, setEditRoute] = useState<TransportRoute | undefined>();
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="h-6 w-6 text-amber-600" />Transport Management</h1>
          <p className="text-muted-foreground">Manage bus routes and student transport assignments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Routes</p>
          <p className="text-2xl font-bold">{routes.length}</p>
          <p className="text-xs text-green-600">{activeRoutes} active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Students Using Transport</p>
          <p className="text-2xl font-bold">{totalStudents}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Capacity</p>
          <p className="text-2xl font-bold">{totalCapacity}</p>
          <p className="text-xs text-muted-foreground">{totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0}% utilized</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Revenue/Month</p>
          <p className="text-2xl font-bold">₹{routes.reduce((a, r) => a + (r.monthlyFee ?? 0) * r.studentsAssigned, 0).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="routes" className="gap-1.5"><Route className="h-4 w-4" />Bus Routes</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" />Students</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "routes" && <Button onClick={() => setShowAddRoute(true)} className="gap-1"><Plus className="h-4 w-4" />Add Route</Button>}
            {tab === "students" && <Button onClick={() => setShowAssign(true)} className="gap-1"><Plus className="h-4 w-4" />Assign Student</Button>}
          </div>
        </div>

        {/* Routes Tab */}
        <TabsContent value="routes">
          {routesLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredRoutes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No routes found</p>
              <p className="text-sm">Create your first bus route to get started</p>
              <Button className="mt-4 gap-1" onClick={() => setShowAddRoute(true)}><Plus className="h-4 w-4" />Add Route</Button>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-right">Fee/Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.routeName}</div>
                        <div className="text-xs text-muted-foreground">{r.routeNumber}</div>
                      </TableCell>
                      <TableCell>{r.vehicleNumber || "—"}</TableCell>
                      <TableCell>
                        <div>{r.driverName || "—"}</div>
                        {r.driverPhone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{r.driverPhone}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{r.studentsAssigned}</span>
                        <span className="text-muted-foreground">/{r.capacity}</span>
                      </TableCell>
                      <TableCell className="text-right">₹{(r.monthlyFee ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : r.status === "maintenance" ? "secondary" : "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditRoute(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRoute(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
              <p className="font-medium">No students assigned yet</p>
              <p className="text-sm">Assign students to bus routes</p>
              <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />Assign Student</Button>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Pickup Point</TableHead>
                    <TableHead>Drop Point</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.studentName}</TableCell>
                      <TableCell>{s.studentClass} {s.studentSection}</TableCell>
                      <TableCell>
                        <div className="font-medium">{s.routeName}</div>
                        <div className="text-xs text-muted-foreground">{s.routeNumber}</div>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-600" />{s.pickupPoint || "—"}</div></TableCell>
                      <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-red-500" />{s.dropPoint || "—"}</div></TableCell>
                      <TableCell>₹{(s.monthlyFee ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveStudent(s.id)}><Trash2 className="h-4 w-4" /></Button>
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
    </div>
  );
}
