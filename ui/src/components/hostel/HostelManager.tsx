import { useState, useEffect, useCallback } from "react";
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
import { Building2, Users, Plus, Pencil, Trash2, BedDouble, Loader2, Search, DoorOpen } from "lucide-react";
import { hostelApiClient, HostelRoom, HostelStudent, CreateRoomDto, AssignStudentDto } from "@/services/api/hostelApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";

// ─── Room Form Dialog ─────────────────────────────────────────────────────────

function RoomFormDialog({ room, onClose, onSaved }: { room?: HostelRoom; onClose: () => void; onSaved: () => void }) {
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
        <DialogHeader><DialogTitle>{room ? "Edit Room" : "Add Hostel Room"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Room Number *</Label>
            <Input value={form.roomNumber} onChange={e => set("roomNumber", e.target.value)} placeholder="101" />
          </div>
          <div className="space-y-1.5">
            <Label>Room Type</Label>
            <Select value={form.roomType} onValueChange={v => set("roomType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boys">Boys</SelectItem>
                <SelectItem value="girls">Girls</SelectItem>
                <SelectItem value="co-ed">Co-ed</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input type="number" value={form.capacity} onChange={e => set("capacity", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Floor</Label>
            <Input value={form.floor ?? ""} onChange={e => set("floor", e.target.value)} placeholder="Ground" />
          </div>
          <div className="space-y-1.5">
            <Label>Rent per Bed (₹/month)</Label>
            <Input type="number" value={form.rentPerBed} onChange={e => set("rentPerBed", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Facilities</Label>
            <Input value={form.facilities ?? ""} onChange={e => set("facilities", e.target.value)} placeholder="AC, Wi-Fi, Attached Bathroom" />
          </div>
          <DialogFooter className="col-span-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {room ? "Update" : "Create Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Student Dialog ────────────────────────────────────────────────────

function AssignStudentDialog({ rooms, onClose, onSaved }: { rooms: HostelRoom[]; onClose: () => void; onSaved: () => void }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [form, setForm] = useState<AssignStudentDto>({ studentId: "", roomId: "", checkInDate: new Date().toISOString().split("T")[0], monthlyFee: 5000, status: "active" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
  }, []);

  const filtered = students.filter(s =>
    s.status === "Active" && (s.name?.toLowerCase().includes(search.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(search.toLowerCase()))
  );

  const availableRooms = rooms.filter(r => r.status === "available" && r.occupied < r.capacity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.roomId) { toast.error("Select student and room"); return; }
    setSaving(true);
    try {
      await hostelApiClient.assignStudentToRoom(form);
      toast.success("Student assigned to hostel room");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign student");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Student to Hostel</DialogTitle></DialogHeader>
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
            <Label>Room *</Label>
            <Select value={form.roomId} onValueChange={v => setForm(p => ({ ...p, roomId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {availableRooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} — {r.roomType} ({r.occupied}/{r.capacity}) Floor: {r.floor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in Date</Label>
              <Input type="date" value={form.checkInDate} onChange={e => setForm(p => ({ ...p, checkInDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Fee (₹)</Label>
              <Input type="number" value={form.monthlyFee} onChange={e => setForm(p => ({ ...p, monthlyFee: parseFloat(e.target.value) || 0 }))} />
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

// ─── View Room Students Dialog ────────────────────────────────────────────────

function RoomStudentsDialog({ room, onClose }: { room: HostelRoom; onClose: () => void }) {
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
          <p className="text-center text-muted-foreground py-8">No students in this room</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Gender</TableHead><TableHead>Check-in</TableHead>
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
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editRoom, setEditRoom] = useState<HostelRoom | undefined>();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [viewRoom, setViewRoom] = useState<HostelRoom | undefined>();
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
    if (!confirm("Delete this room?")) return;
    try {
      await hostelApiClient.deleteRoom(id);
      toast.success("Room deleted");
      loadRooms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room");
    }
  }

  async function handleRemoveStudent(id: string) {
    if (!confirm("Check out this student from hostel?")) return;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-purple-600" />Hostel Management</h1>
          <p className="text-muted-foreground">Manage hostel rooms and student accommodation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Rooms</p>
          <p className="text-2xl font-bold">{rooms.length}</p>
          <p className="text-xs text-green-600">{availableRooms} with vacancy</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Beds</p>
          <p className="text-2xl font-bold">{totalBeds}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Occupancy</p>
          <p className="text-2xl font-bold">{totalOccupied}</p>
          <p className="text-xs text-muted-foreground">{totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0}% occupied</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Revenue/Month</p>
          <p className="text-2xl font-bold">₹{rooms.reduce((a, r) => a + r.rentPerBed * r.occupied, 0).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="rooms" className="gap-1.5"><DoorOpen className="h-4 w-4" />Rooms</TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" />Students</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "rooms" && <Button onClick={() => setShowAddRoom(true)} className="gap-1"><Plus className="h-4 w-4" />Add Room</Button>}
            {tab === "students" && <Button onClick={() => setShowAssign(true)} className="gap-1"><Plus className="h-4 w-4" />Assign Student</Button>}
          </div>
        </div>

        {/* Rooms Tab */}
        <TabsContent value="rooms">
          {roomsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredRooms.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No rooms found</p>
              <p className="text-sm">Add your first hostel room</p>
              <Button className="mt-4 gap-1" onClick={() => setShowAddRoom(true)}><Plus className="h-4 w-4" />Add Room</Button>
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
                          <span>Occupancy</span>
                          <span className="font-medium">{r.occupied}/{r.capacity}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setViewRoom(r)}><Users className="h-3 w-3" />Students</Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditRoom(r)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRoom(r.id)}><Trash2 className="h-3 w-3" /></Button>
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
              <p className="font-medium">No hostel students</p>
              <p className="text-sm">Assign students to hostel rooms</p>
              <Button className="mt-4 gap-1" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />Assign Student</Button>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
      {(showAddRoom || editRoom) && (
        <RoomFormDialog room={editRoom} onClose={() => { setShowAddRoom(false); setEditRoom(undefined); }} onSaved={loadRooms} />
      )}
      {showAssign && <AssignStudentDialog rooms={rooms} onClose={() => setShowAssign(false)} onSaved={() => { loadStudents(); loadRooms(); }} />}
      {viewRoom && <RoomStudentsDialog room={viewRoom} onClose={() => setViewRoom(undefined)} />}
    </div>
  );
}
