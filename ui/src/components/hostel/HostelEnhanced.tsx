import { useState, useEffect, useRef } from "react";
import { formatDate, formatDateTime } from "@/utils/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, UtensilsCrossed, Eye, DoorOpen, Plus, CheckCircle, LogOut, Loader2, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as hostelP1Api from "@/services/api/hostelP1Api";
import { feeApi } from "@/services/api/feeApi";
import type {
  HostelBlock, CreateHostelBlockDto,
  HostelMessBilling, CreateMessBillingDto,
  HostelVisitorLog, CreateVisitorLogDto,
  HostelLeave, CreateHostelLeaveDto, ApproveHostelLeaveDto,
  HostelStudentDetail,
} from "@/services/api/hostelP1Api";

// ─── Student Search Dropdown (hostel-enrolled students only) ─────────────────

interface StudentSearchProps {
  hostelStudents: HostelStudentDetail[];
  value: string;       // hostelStudentId
  onSelect: (hs: HostelStudentDetail) => void;
  placeholder?: string;
}

function StudentSearch({ hostelStudents, value, onSelect, placeholder = "Search student..." }: StudentSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = hostelStudents.find(s => s.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? hostelStudents.filter(s =>
        s.studentName.toLowerCase().includes(query.toLowerCase()) ||
        s.roomNumber.toLowerCase().includes(query.toLowerCase()) ||
        s.studentClass.toLowerCase().includes(query.toLowerCase())
      )
    : hostelStudents;

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border rounded-md px-3 py-2 gap-2 bg-background">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {selected && !open ? (
          <span className="flex-1 text-sm">{selected.studentName} — Room {selected.roomNumber}</span>
        ) : (
          <input
            className="flex-1 text-sm outline-none bg-transparent"
            placeholder={selected ? `${selected.studentName} — Room ${selected.roomNumber}` : placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        )}
        {value && (
          <button type="button" onClick={() => { onSelect({ id: "", studentId: "", studentName: "", studentClass: "", studentSection: "", gender: "", roomId: "", roomNumber: "", roomType: "", checkInDate: "", monthlyFee: 0, status: "", createdAt: "" }); setQuery(""); }}>
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No hostel students found</div>
          ) : filtered.map(s => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
              onClick={() => { onSelect(s); setQuery(""); setOpen(false); }}
            >
              <span className="font-medium">{s.studentName}</span>
              <span className="text-muted-foreground text-xs">Room {s.roomNumber} · {s.studentClass}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hostel Blocks Tab ───────────────────────────────────────────────────────

function BlocksTab() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HostelBlock | null>(null);
  const [form, setForm] = useState<CreateHostelBlockDto>({ name: "", gender: "mixed" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      setBlocks(await hostelP1Api.getBlocks());
    } catch {
      toast({ title: "Error", description: "Failed to load blocks", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openNew = () => {
    setEditTarget(null);
    setForm({ name: "", description: "", wardenName: "", wardenContact: "", gender: "mixed" });
    setOpen(true);
  };

  const openEdit = (b: HostelBlock) => {
    setEditTarget(b);
    setForm({ name: b.name, description: b.description ?? "", wardenName: b.wardenName ?? "", wardenContact: b.wardenContact ?? "", gender: b.gender });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Block name is required", variant: "destructive" }); return; }
    try {
      if (editTarget) {
        await hostelP1Api.updateBlock(editTarget.id, form);
        toast({ title: "Block updated" });
      } else {
        await hostelP1Api.createBlock(form);
        toast({ title: "Block created" });
      }
      setOpen(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      await hostelP1Api.deleteBlock(id);
      toast({ title: "Block deleted" });
      load();
    } catch {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Hostel Blocks</h3>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Block</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Warden</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Occupied</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No blocks found</TableCell></TableRow>
            ) : blocks.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.wardenName ?? "—"}</TableCell>
                <TableCell className="capitalize">{b.gender}</TableCell>
                <TableCell>{b.totalRooms}</TableCell>
                <TableCell>{b.totalCapacity}</TableCell>
                <TableCell>{b.totalOccupied}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(b.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Block" : "Add Block"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Block Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Boys Block A" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warden Name</Label>
                <Input value={form.wardenName ?? ""} onChange={e => setForm(f => ({ ...f, wardenName: e.target.value }))} />
              </div>
              <div>
                <Label>Warden Contact</Label>
                <Input value={form.wardenContact ?? ""} onChange={e => setForm(f => ({ ...f, wardenContact: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender ?? "mixed"} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys">Boys</SelectItem>
                  <SelectItem value="girls">Girls</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mess Billing Tab ────────────────────────────────────────────────────────

function MessBillingTab() {
  const { toast } = useToast();
  const [bills, setBills] = useState<HostelMessBilling[]>([]);
  const [hostelStudents, setHostelStudents] = useState<HostelStudentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const [form, setForm] = useState<CreateMessBillingDto>({
    hostelStudentId: "", month: defaultMonth, amount: 0,
  });
  const [selectedStudent, setSelectedStudent] = useState<HostelStudentDetail | null>(null);

  useEffect(() => {
    hostelP1Api.getHostelStudents().then(setHostelStudents).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filterMonth]);

  const load = async () => {
    try {
      setLoading(true);
      setBills(await hostelP1Api.getMessBillings({ month: filterMonth || undefined }));
    } catch {
      toast({ title: "Error", description: "Failed to load mess billings", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const markPaid = async (id: string) => {
    try {
      const result = await hostelP1Api.markMessBillingPaid(id);
      toast({ title: "Marked as paid", description: "Opening receipt…" });
      load();
      if (result.paymentTransactionId) {
        try {
          const html = await feeApi.generateReceipt(result.paymentTransactionId);
          const win = window.open("", "_blank", "width=860,height=700");
          if (win) {
            win.document.write(html);
            win.document.close();
            win.addEventListener("load", () => { win.focus(); win.print(); });
          }
        } catch {
          toast({ title: "Receipt could not be generated", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const submit = async () => {
    if (!form.hostelStudentId) { toast({ title: "Please select a student", variant: "destructive" }); return; }
    if (!form.amount || form.amount <= 0) { toast({ title: "Amount must be > 0", variant: "destructive" }); return; }
    try {
      await hostelP1Api.createMessBilling(form);
      toast({ title: "Mess billing created" });
      setOpen(false);
      setSelectedStudent(null);
      setForm({ hostelStudentId: "", month: defaultMonth, amount: 0 });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create billing";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-3 items-center">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Bill</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records</TableCell></TableRow>
            ) : bills.map(b => (
              <TableRow key={b.id}>
                <TableCell>{b.studentName}</TableCell>
                <TableCell>{b.month}</TableCell>
                <TableCell>₹{Number(b.amount).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={b.isPaid ? "default" : "destructive"}>{b.isPaid ? "Paid" : "Pending"}</Badge>
                </TableCell>
                <TableCell>
                  {!b.isPaid && (
                    <Button size="sm" onClick={() => markPaid(b.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Mark Paid
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Mess Billing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student (Hostel) *</Label>
              <StudentSearch
                hostelStudents={hostelStudents}
                value={form.hostelStudentId}
                onSelect={hs => { setSelectedStudent(hs || null); setForm(f => ({ ...f, hostelStudentId: hs?.id ?? "" })); }}
                placeholder="Search by name or room..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month *</Label>
                <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
              </div>
              <div>
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Visitor Log Tab ─────────────────────────────────────────────────────────

function VisitorLogTab() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<HostelVisitorLog[]>([]);
  const [hostelStudents, setHostelStudents] = useState<HostelStudentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateVisitorLogDto>({
    hostelStudentId: "", visitorName: "", relationship: "",
  });

  useEffect(() => {
    hostelP1Api.getHostelStudents().then(setHostelStudents).catch(() => {});
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setLogs(await hostelP1Api.getVisitorLogs());
    } catch {
      toast({ title: "Error", description: "Failed to load visitor logs", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const checkOut = async (id: string) => {
    try {
      await hostelP1Api.checkOutVisitor(id);
      toast({ title: "Visitor checked out" });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const submit = async () => {
    if (!form.hostelStudentId) { toast({ title: "Please select a student", variant: "destructive" }); return; }
    if (!form.visitorName.trim()) { toast({ title: "Visitor name is required", variant: "destructive" }); return; }
    try {
      await hostelP1Api.createVisitorLog(form);
      toast({ title: "Visitor logged" });
      setOpen(false);
      setForm({ hostelStudentId: "", visitorName: "", relationship: "" });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log visitor";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Visitor Log</h3>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Log Visitor</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Visitor</TableHead>
              <TableHead>Relation</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No visitor logs</TableCell></TableRow>
            ) : logs.map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.studentName}</TableCell>
                <TableCell>{l.visitorName}</TableCell>
                <TableCell>{l.relationship ?? "—"}</TableCell>
                <TableCell>{l.purpose ?? "—"}</TableCell>
                <TableCell>{formatDateTime(l.checkInTime)}</TableCell>
                <TableCell>{l.checkOutTime ? formatDateTime(l.checkOutTime) : <Badge variant="secondary">Still in</Badge>}</TableCell>
                <TableCell>
                  {l.status === "checked_in" && (
                    <Button size="sm" variant="outline" onClick={() => checkOut(l.id)}>
                      <LogOut className="w-4 h-4 mr-1" /> Check Out
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Visitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student (Hostel) *</Label>
              <StudentSearch
                hostelStudents={hostelStudents}
                value={form.hostelStudentId}
                onSelect={hs => setForm(f => ({ ...f, hostelStudentId: hs?.id ?? "" }))}
                placeholder="Search by name or room..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Visitor Name *</Label>
                <Input value={form.visitorName} onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))} />
              </div>
              <div>
                <Label>Relation</Label>
                <Input value={form.relationship ?? ""} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Parent / Guardian" />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={form.visitorContact ?? ""} onChange={e => setForm(f => ({ ...f, visitorContact: e.target.value }))} />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={form.purpose ?? ""} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Log</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Hostel Leave Tab ────────────────────────────────────────────────────────

function HostelLeaveTab() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<HostelLeave[]>([]);
  const [hostelStudents, setHostelStudents] = useState<HostelStudentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState<HostelLeave | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [approveForm, setApproveForm] = useState<ApproveHostelLeaveDto>({ status: "approved", remarks: "" });
  const [form, setForm] = useState<CreateHostelLeaveDto>({
    hostelStudentId: "", fromDate: "", toDate: "", reason: "",
  });

  useEffect(() => {
    hostelP1Api.getHostelStudents().then(setHostelStudents).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setLeaves(await hostelP1Api.getHostelLeaves({ status: statusFilter !== "all" ? statusFilter : undefined }));
    } catch {
      toast({ title: "Error", description: "Failed to load leaves", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!form.hostelStudentId) { toast({ title: "Please select a student", variant: "destructive" }); return; }
    if (!form.fromDate || !form.toDate) { toast({ title: "Dates are required", variant: "destructive" }); return; }
    if (!form.reason.trim()) { toast({ title: "Reason is required", variant: "destructive" }); return; }
    try {
      await hostelP1Api.createHostelLeave(form);
      toast({ title: "Leave applied" });
      setOpen(false);
      setForm({ hostelStudentId: "", fromDate: "", toDate: "", reason: "" });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to apply leave";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const openApprove = (l: HostelLeave) => {
    setSelected(l);
    setApproveForm({ status: "approved", remarks: "" });
    setApproveOpen(true);
  };

  const submitApprove = async () => {
    if (!selected) return;
    try {
      await hostelP1Api.approveHostelLeave(selected.id, approveForm);
      toast({ title: `Leave ${approveForm.status}` });
      setApproveOpen(false);
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Apply Leave</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No leave records</TableCell></TableRow>
            ) : leaves.map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.studentName}</TableCell>
                <TableCell>{formatDate(l.fromDate)}</TableCell>
                <TableCell>{formatDate(l.toDate)}</TableCell>
                <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                <TableCell>{statusBadge(l.status)}</TableCell>
                <TableCell>
                  {l.status === "pending" && (
                    <Button size="sm" onClick={() => openApprove(l)}>Review</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Apply Leave Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply Hostel Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student (Hostel) *</Label>
              <StudentSearch
                hostelStudents={hostelStudents}
                value={form.hostelStudentId}
                onSelect={hs => setForm(f => ({ ...f, hostelStudentId: hs?.id ?? "" }))}
                placeholder="Search by name or room..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From *</Label>
                <Input type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div>
                <Label>To *</Label>
                <Input type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Reason *</Label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div>
              <Label>Contact During Leave</Label>
              <Input value={form.contactDuringLeave ?? ""} onChange={e => setForm(f => ({ ...f, contactDuringLeave: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Leave Request</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Student: <strong>{selected.studentName}</strong> | {formatDate(selected.fromDate)} — {formatDate(selected.toDate)}
              </p>
              <p className="text-sm">Reason: {selected.reason}</p>
              <div>
                <Label>Decision</Label>
                <Select value={approveForm.status} onValueChange={v => setApproveForm(f => ({ ...f, status: v as "approved" | "rejected" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remarks</Label>
                <Input value={approveForm.remarks ?? ""} onChange={e => setApproveForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
                <Button onClick={submitApprove}>Submit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HostelEnhanced() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Hostel Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="blocks">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="blocks"><Building2 className="w-4 h-4 mr-1" />Blocks</TabsTrigger>
            <TabsTrigger value="mess"><UtensilsCrossed className="w-4 h-4 mr-1" />Mess Billing</TabsTrigger>
            <TabsTrigger value="visitors"><Eye className="w-4 h-4 mr-1" />Visitor Log</TabsTrigger>
            <TabsTrigger value="leave"><DoorOpen className="w-4 h-4 mr-1" />Hostel Leave</TabsTrigger>
          </TabsList>
          <TabsContent value="blocks" className="mt-4"><BlocksTab /></TabsContent>
          <TabsContent value="mess" className="mt-4"><MessBillingTab /></TabsContent>
          <TabsContent value="visitors" className="mt-4"><VisitorLogTab /></TabsContent>
          <TabsContent value="leave" className="mt-4"><HostelLeaveTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
