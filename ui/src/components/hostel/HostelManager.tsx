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
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Pencil, Trash2, BedDouble, Loader2, Search, DoorOpen, X, ShieldOff } from "lucide-react";
import { hostelApiClient, HostelRoom, HostelStudent, CreateRoomDto, AssignStudentDto, UpdateHostelStudentDto } from "@/services/api/hostelApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Room Form Dialog ─────────────────────────────────────────────────────────

function RoomFormDialog({ room, onClose, onSaved }: { room?: HostelRoom; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CreateRoomDto>({
    roomNumber: room?.roomNumber ?? "",
    roomType: room?.roomType ?? "boys",
    capacity: room?.capacity ?? 4,
    occupied: room?.occupied ?? 0,
    rentPerBed: room?.rentPerBed ?? 5000,
    floor: room?.floor ?? "Ground",
    status: room?.status ?? "available",
    facilities: room?.facilities ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: keyof CreateRoomDto, v: string | number) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roomNumber.trim()) { toast.error("Room number is required"); return; }
    setSaving(true);
    try {
      if (room) {
        await hostelApiClient.updateRoom(room.id, form);
        toast.success("Room updated");
      } else {
        await hostelApiClient.createRoom(form);
        toast.success("Room created");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save room");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{room ? t('hostel.roomForm.titleEdit') : t('hostel.roomForm.titleAdd')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.roomNumber')} *</Label>
            <Input value={form.roomNumber} onChange={e => set("roomNumber", e.target.value)} placeholder="101" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.roomType')}</Label>
            <Select value={form.roomType} onValueChange={v => set("roomType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boys">{t('hostel.roomForm.roomType.boys')}</SelectItem>
                <SelectItem value="girls">{t('hostel.roomForm.roomType.girls')}</SelectItem>
                <SelectItem value="co-ed">{t('hostel.roomForm.roomType.coed')}</SelectItem>
                <SelectItem value="staff">{t('hostel.roomForm.roomType.staff')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.capacity')}</Label>
            <Input type="number" value={form.capacity} onChange={e => set("capacity", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.floor')}</Label>
            <Input value={form.floor ?? ""} onChange={e => set("floor", e.target.value)} placeholder="Ground" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.rentPerBed')}</Label>
            <Input type="number" value={form.rentPerBed} onChange={e => set("rentPerBed", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.roomForm.status')}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t('hostel.roomForm.status.available')}</SelectItem>
                <SelectItem value="full">{t('hostel.roomForm.status.full')}</SelectItem>
                <SelectItem value="maintenance">{t('hostel.roomForm.status.maintenance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t('hostel.roomForm.facilities')}</Label>
            <Input value={form.facilities ?? ""} onChange={e => set("facilities", e.target.value)} placeholder="AC, Wi-Fi, Attached Bathroom" />
          </div>
          <DialogFooter className="col-span-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('hostel.roomForm.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {room ? t('hostel.roomForm.update') : t('hostel.roomForm.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Student Dialog ────────────────────────────────────────────────────

function AssignStudentDialog({ rooms, onClose, onSaved }: { rooms: HostelRoom[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [searchResults, setSearchResults] = useState<StudentBasic[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState<AssignStudentDto>({ studentId: "", roomId: "", checkInDate: new Date().toISOString().split("T")[0], monthlyFee: 5000, status: "active" });
  const [saving, setSaving] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentBasic | null>(null);
  const studentRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assigned student IDs once on mount
  useEffect(() => {
    setLoadingAssigned(true);
    hostelApiClient.getAllHostelStudents().then(hs => {
      setAssignedStudentIds(new Set(hs.map(h => h.studentId)));
    }).catch(() => {
      toast.error("Failed to load current hostel assignments");
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
  const availableRooms = rooms.filter(r => r.status === "available" && r.occupied < r.capacity);

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
    if (!form.studentId || !form.roomId) { toast.error("Select student and room"); return; }
    setSaving(true);
    try {
      await hostelApiClient.assignStudentToRoom(form);
      toast.success("Student assigned to hostel room");
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
        <DialogHeader><DialogTitle>{t('hostel.assignDialog.title')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('hostel.assignDialog.student')} *</Label>
            <div ref={studentRef} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 pr-8"
                placeholder={loadingAssigned ? t('hostel.assignDialog.loading') : t('hostel.assignDialog.searchPlaceholder')}
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
                      <Loader2 className="h-4 w-4 animate-spin" />{t('hostel.assignDialog.searching')}
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
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">{t('hostel.assignDialog.allAssigned')}</div>
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">No active students found for "{studentQuery}"</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('hostel.assignDialog.room')} *</Label>
            <Select value={form.roomId} onValueChange={v => setForm(p => ({ ...p, roomId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('hostel.assignDialog.selectRoom')} /></SelectTrigger>
              <SelectContent>
                {availableRooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} — {r.roomType} ({r.occupied}/{r.capacity}) Floor: {r.floor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('hostel.assignDialog.checkInDate')}</Label>
              <Input type="date" value={form.checkInDate} onChange={e => setForm(p => ({ ...p, checkInDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('hostel.assignDialog.monthlyFee')}</Label>
              <Input type="number" value={form.monthlyFee} onChange={e => setForm(p => ({ ...p, monthlyFee: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('hostel.assignDialog.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('hostel.assignDialog.assign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Hostel Student Dialog ───────────────────────────────────────────────

function EditHostelStudentDialog({ assignment, rooms, onClose, onSaved }: { assignment: HostelStudent; rooms: HostelRoom[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<UpdateHostelStudentDto>({
    roomId: assignment.roomId,
    checkInDate: assignment.checkInDate.split("T")[0],
    checkOutDate: assignment.checkOutDate ? assignment.checkOutDate.split("T")[0] : "",
    monthlyFee: assignment.monthlyFee,
    status: assignment.status,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roomId) { toast.error("Select a room"); return; }
    setSaving(true);
    try {
      await hostelApiClient.updateHostelStudent(assignment.id, {
        ...form,
        checkOutDate: form.checkOutDate || undefined,
      });
      toast.success("Hostel assignment updated");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment");
    } finally { setSaving(false); }
  }

  const availableRooms = rooms.filter(r => r.id === assignment.roomId || (r.status === "available" && r.occupied < r.capacity));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Hostel Assignment — {assignment.studentName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('hostel.editDialog.room')} *</Label>
            <Select value={form.roomId} onValueChange={v => setForm(p => ({ ...p, roomId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('hostel.editDialog.selectRoom')} /></SelectTrigger>
              <SelectContent>
                {availableRooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} — {r.roomType} ({r.occupied}/{r.capacity}) Floor: {r.floor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('hostel.editDialog.checkInDate')}</Label>
              <Input type="date" value={form.checkInDate} onChange={e => setForm(p => ({ ...p, checkInDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('hostel.editDialog.checkOutDate')}</Label>
              <Input type="date" value={form.checkOutDate ?? ""} onChange={e => setForm(p => ({ ...p, checkOutDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('hostel.editDialog.monthlyFee')}</Label>
              <Input type="number" value={form.monthlyFee} onChange={e => setForm(p => ({ ...p, monthlyFee: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('hostel.editDialog.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('hostel.editDialog.active')}</SelectItem>
                  <SelectItem value="inactive">{t('hostel.editDialog.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('hostel.editDialog.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('hostel.editDialog.updateAssignment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Room Students Dialog ────────────────────────────────────────────────

function RoomStudentsDialog({ room, onClose }: { room: HostelRoom; onClose: () => void }) {
  const { t } = useLanguage();
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hostelApiClient.getStudentsByRoom(room.id)
      .then(s => setStudents(s))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, [room.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Room {room.roomNumber} — Students ({room.occupied}/{room.capacity})</DialogTitle></DialogHeader>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : students.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('hostel.roomStudents.noStudents')}</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('hostel.roomStudents.col.student')}</TableHead><TableHead>{t('hostel.roomStudents.col.class')}</TableHead><TableHead>{t('hostel.roomStudents.col.gender')}</TableHead><TableHead>{t('hostel.roomStudents.col.checkIn')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.studentName}</TableCell>
                  <TableCell>{s.studentClass} {s.studentSection}</TableCell>
                  <TableCell>{s.gender}</TableCell>
                  <TableCell>{new Date(s.checkInDate).toLocaleDateString("en-IN")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HostelManager() {
  const { t } = useLanguage();
  const { hasUserPermission } = usePermissions();
  const canViewHostel    = hasUserPermission('Hostel', 'View');
  const canManageRooms   = hasUserPermission('Hostel', 'Create');
  const canEditRooms     = hasUserPermission('Hostel', 'Edit');
  const canDeleteRooms   = hasUserPermission('Hostel', 'Delete');
  const accessDenied     = !canViewHostel;

  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editRoom, setEditRoom] = useState<HostelRoom | undefined>();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [viewRoom, setViewRoom] = useState<HostelRoom | undefined>();
  const [editStudent, setEditStudent] = useState<HostelStudent | undefined>();
  const [tab, setTab] = useState("rooms");

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const r = await hostelApiClient.getRooms(1, 200);
      setRooms(r.rooms ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load rooms");
    } finally { setRoomsLoading(false); }
  }, []);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const s = await hostelApiClient.getAllHostelStudents();
      setStudents(s ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load students");
    } finally { setStudentsLoading(false); }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  function handleTabChange(v: string) {
    setTab(v);
    if (v === "students" && students.length === 0) loadStudents();
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm(t('hostel.confirm.deleteRoom'))) return;
    try {
      await hostelApiClient.deleteRoom(id);
      toast.success("Room deleted");
      loadRooms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room");
    }
  }

  async function handleRemoveStudent(id: string) {
    if (!confirm(t('hostel.confirm.checkoutStudent'))) return;
    try {
      await hostelApiClient.removeStudentFromRoom(id);
      toast.success("Student checked out");
      loadStudents(); loadRooms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove student");
    }
  }

  const totalBeds = rooms.reduce((a, r) => a + r.capacity, 0);
  const totalOccupied = rooms.reduce((a, r) => a + r.occupied, 0);
  const availableRooms = rooms.filter(r => r.status === "available" && r.occupied < r.capacity).length;

  const filteredRooms = rooms.filter(r =>
    r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.roomType.toLowerCase().includes(search.toLowerCase()) ||
    (r.floor ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.studentClass.toLowerCase().includes(search.toLowerCase())
  );

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <ShieldOff className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold">{t('hostel.accessRestricted')}</h2>
        <p className="text-muted-foreground max-w-sm">
          You don't have permission to view Hostel Management. Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-purple-600" />{t('hostel.title')}</h1>
          <p className="text-muted-foreground">{canManageRooms ? t('hostel.subtitle.manage') : t('hostel.subtitle.view')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('hostel.stats.totalRooms')}</p>
          <p className="text-2xl font-bold">{rooms.length}</p>
          <p className="text-xs text-green-600">{availableRooms} {t('hostel.stats.withVacancy')}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('hostel.stats.totalBeds')}</p>
          <p className="text-2xl font-bold">{totalBeds}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('hostel.stats.occupancy')}</p>
          <p className="text-2xl font-bold">{totalOccupied}</p>
          <p className="text-xs text-muted-foreground">{totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0}% occupied</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{t('hostel.stats.revenuePerMonth')}</p>
          <p className="text-2xl font-bold">₹{rooms.reduce((a, r) => a + r.rentPerBed * r.occupied, 0).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="rooms" className="gap-1.5"><DoorOpen className="h-4 w-4" />{t('hostel.tabs.rooms')}</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" />{t('hostel.tabs.students')}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder={t('hostel.search.placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "rooms" && canManageRooms && <Button onClick={() => setShowAddRoom(true)} className="gap-1"><Plus className="h-4 w-4" />{t('hostel.actions.addRoom')}</Button>}
            {tab === "students" && canManageRooms && <Button onClick={() => setShowAssign(true)} className="gap-1"><Plus className="h-4 w-4" />{t('hostel.actions.assignStudent')}</Button>}
          </div>
        </div>

        {/* Rooms Tab */}
        <TabsContent value="rooms">
          {roomsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredRooms.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('hostel.rooms.emptyTitle')}</p>
              <p className="text-sm">{t('hostel.rooms.emptySubtitle')}</p>
              {canManageRooms && <Button className="mt-4 gap-1" onClick={() => setShowAddRoom(true)}><Plus className="h-4 w-4" />{t('hostel.actions.addRoom')}</Button>}
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map(r => {
                const pct = r.capacity > 0 ? Math.round((r.occupied / r.capacity) * 100) : 0;
                return (
                  <Card key={r.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">Room {r.roomNumber}</h3>
                          <p className="text-xs text-muted-foreground">Floor: {r.floor ?? "—"}</p>
                        </div>
                        <Badge variant={r.status === "available" ? "default" : r.status === "full" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{r.roomType}</Badge>
                        <span className="text-sm text-muted-foreground">₹{r.rentPerBed}/bed</span>
                      </div>
                      {r.facilities && <p className="text-xs text-muted-foreground truncate">{r.facilities}</p>}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{t('hostel.rooms.card.occupancy')}</span>
                          <span className="font-medium">{r.occupied}/{r.capacity}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setViewRoom(r)}><Users className="h-3 w-3" />{t('hostel.rooms.card.studentsButton')}</Button>
                        {canEditRooms && <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditRoom(r)}><Pencil className="h-3 w-3" /></Button>}
                        {canDeleteRooms && <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRoom(r.id)}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                  <p className="text-sm mt-1">This student may not be assigned to a hostel room yet.</p>
                  {canManageRooms && <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />{t('hostel.actions.assignStudent')}</Button>}
                </>
              ) : (
                <>
                  <p className="font-medium">{t('hostel.students.emptyTitle')}</p>
                  <p className="text-sm">{t('hostel.students.emptySubtitle')}</p>
                  {canManageRooms && <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />{t('hostel.actions.assignStudent')}</Button>}
                </>
              )}
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('hostel.students.col.student')}</TableHead>
                    <TableHead>{t('hostel.students.col.class')}</TableHead>
                    <TableHead>{t('hostel.students.col.gender')}</TableHead>
                    <TableHead>{t('hostel.students.col.room')}</TableHead>
                    <TableHead>{t('hostel.students.col.floor')}</TableHead>
                    <TableHead>{t('hostel.students.col.checkIn')}</TableHead>
                    <TableHead className="text-right">{t('hostel.students.col.fee')}</TableHead>
                    <TableHead>{t('hostel.students.col.status')}</TableHead>
                    <TableHead className="text-right">{t('hostel.students.col.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.studentName}</TableCell>
                      <TableCell>{s.studentClass} {s.studentSection}</TableCell>
                      <TableCell>{s.gender}</TableCell>
                      <TableCell>
                        <div className="font-medium">{s.roomNumber}</div>
                        <div className="text-xs text-muted-foreground">{s.roomType}</div>
                      </TableCell>
                      <TableCell>{s.floor ?? "—"}</TableCell>
                      <TableCell>{new Date(s.checkInDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">₹{s.monthlyFee.toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEditRooms && <Button variant="ghost" size="icon" onClick={() => setEditStudent(s)}><Pencil className="h-4 w-4" /></Button>}
                          {canDeleteRooms && <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50 gap-1" onClick={() => handleRemoveStudent(s.id)}><DoorOpen className="h-4 w-4" />{t('hostel.students.checkout')}</Button>}
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
      {(showAddRoom || editRoom) && (
        <RoomFormDialog room={editRoom} onClose={() => { setShowAddRoom(false); setEditRoom(undefined); }} onSaved={loadRooms} />
      )}
      {showAssign && <AssignStudentDialog rooms={rooms} onClose={() => setShowAssign(false)} onSaved={() => { loadStudents(); loadRooms(); }} />}
      {viewRoom && <RoomStudentsDialog room={viewRoom} onClose={() => setViewRoom(undefined)} />}
      {editStudent && <EditHostelStudentDialog assignment={editStudent} rooms={rooms} onClose={() => setEditStudent(undefined)} onSaved={() => { loadStudents(); loadRooms(); }} />}
    </div>
  );
}
