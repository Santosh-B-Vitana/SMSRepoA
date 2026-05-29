import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookMarked, Newspaper, CreditCard, Plus, Loader2, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as libraryP1Api from "@/services/api/libraryP1Api";
import { getBooks } from "@/services/api/libraryApi";
import type { Book } from "@/services/api/libraryApi";
import type {
  BookReservation, CreateBookReservationDto,
  Periodical, CreatePeriodicalDto,
  LibraryMember, CreateLibraryMemberDto, UpdateLibraryMemberDto,
} from "@/services/api/libraryP1Api";
import { staffApi } from "@/services/api/staffApi";
import type { StaffBasic } from "@/services/api/staffApi";
import apiClient from "@/services/api/apiClient";
import type { StudentBasic } from "@/services/api/studentApi";
import settingsApi from "@/services/api/settingsApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface SearchDropdownProps<T> {
  label: string;
  placeholder?: string;
  value: string;
  displayValue?: string;
  onSearch: (q: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string;
  onSelect: (item: T) => void;
  onClear: () => void;
  disabled?: boolean;
}

function SearchDropdown<T>({
  label, placeholder, value, displayValue, onSearch, getLabel, getSublabel, onSelect, onClear, disabled,
}: SearchDropdownProps<T>) {
  const [query, setQuery] = useState(displayValue ?? "");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedQ = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayValue !== undefined) setQuery(displayValue);
  }, [displayValue]);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2 || value) {
      setResults([]); setOpen(false); return;
    }
    setLoading(true);
    onSearch(debouncedQ)
      .then(r => { setResults(r); setOpen(r.length > 0); })
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Label>{label}</Label>
      <div className="relative flex items-center">
        <Search className="absolute left-2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 pr-8"
          placeholder={placeholder ?? `Search ${label.toLowerCase()}...`}
          value={query}
          onChange={e => { setQuery(e.target.value); if (value) onClear(); }}
          disabled={disabled}
        />
        {(query || value) && (
          <button type="button" className="absolute right-2 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); onClear(); }}>✕</button>
        )}
        {loading && <Loader2 className="absolute right-2 w-4 h-4 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {results.map((item, i) => (
            <button key={i} type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
              onMouseDown={e => { e.preventDefault(); setQuery(getLabel(item)); setOpen(false); onSelect(item); }}>
              <div className="font-medium">{getLabel(item)}</div>
              {getSublabel && <div className="text-xs text-muted-foreground">{getSublabel(item)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search helpers ───────────────────────────────────────────────────────────

async function searchStudents(q: string): Promise<StudentBasic[]> {
  const r = await apiClient.get<{ students: StudentBasic[] }>(`/students?search=${encodeURIComponent(q)}&pageSize=10`);
  return r.data.students ?? [];
}

async function searchStaff(q: string): Promise<StaffBasic[]> {
  const r = await staffApi.list({ search: q, pageSize: 10 } as any);
  return (r as any).staff ?? [];
}

async function searchAvailableBooks(q: string): Promise<Book[]> {
  const r = await getBooks({ search: q, pageSize: 20 });
  return r.books.filter(b => b.availableCopies > 0);
}

// Typed aliases so JSX never sees generic angle brackets (SWC limitation)
const BookDropdown = SearchDropdown as React.FC<SearchDropdownProps<Book>>;
const StudentDropdown = SearchDropdown as React.FC<SearchDropdownProps<StudentBasic>>;
const StaffDropdown = SearchDropdown as React.FC<SearchDropdownProps<StaffBasic>>;

// ─── Reservations Tab ────────────────────────────────────────────────────────

function ReservationsTab() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentBasic | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffBasic | null>(null);
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setReservations(await libraryP1Api.getReservations({ status: statusFilter }));
    } catch {
      toast({ title: "Error", description: "Failed to load reservations", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const cancel = async (id: string) => {
    try {
      setCancellingId(id);
      await libraryP1Api.cancelReservation(id);
      toast({ title: "Reservation cancelled", description: "The held copy has been released back to the shelf." });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data ?? e?.message ?? "Failed to cancel reservation";
      toast({ title: "Cancel failed", description: String(msg), variant: "destructive" });
    } finally { setCancellingId(null); }
  };

  const fulfill = async (id: string) => {
    try {
      setFulfillingId(id);
      await libraryP1Api.fulfillReservation(id);
      toast({ title: "Book issued successfully", description: "The reservation is fulfilled. Check Issued Books tab on the Books & Issues page." });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data ?? e?.message ?? "Failed to fulfill reservation";
      toast({ title: "Fulfill failed", description: String(msg), variant: "destructive" });
    } finally { setFulfillingId(null); }
  };

  const resetForm = () => {
    setSelectedBook(null); setSelectedStudent(null); setSelectedStaff(null);
    setExpiresAt(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setFormError(null);
  };

  const submit = async () => {
    setFormError(null);
    if (!selectedBook) { setFormError("Please select a book."); return; }
    if (!selectedStudent && !selectedStaff) { setFormError("Please select a student or staff member."); return; }
    const memberId = selectedStudent?.id ?? selectedStaff!.id;
    const memberType: 'student' | 'staff' = selectedStudent ? 'student' : 'staff';
    const dto: CreateBookReservationDto = { bookId: selectedBook.id, memberId, memberType };
    try {
      setSubmitting(true);
      await libraryP1Api.reserveBook(dto);
      toast({ title: "Book reserved successfully" });
      setOpen(false); resetForm(); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Reservation failed";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => s === "fulfilled" ? "default" : (s === "cancelled" || s === "expired") ? "secondary" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Reserve Book</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead><TableHead>Reserved By</TableHead>
              <TableHead>Reserved At</TableHead><TableHead>Expires</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No reservations</TableCell></TableRow>
            ) : reservations.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.bookTitle}</TableCell>
                <TableCell>{r.memberName || "—"}</TableCell>
                <TableCell>{new Date(r.reservedAt).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(r.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant={statusColor(r.status) as any}>{r.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" disabled={fulfillingId === r.id} onClick={() => fulfill(r.id)}>
                        {fulfillingId === r.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Fulfill
                      </Button>
                      <Button size="sm" variant="outline" disabled={cancellingId === r.id} onClick={() => cancel(r.id)}>
                        {cancellingId === r.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                        Cancel
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Reserve a Book</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <BookDropdown
              label="Book *"
              placeholder="Search by title, author or ISBN (books with no copies available can be reserved)..."
              value={selectedBook?.id ?? ""}
              displayValue={selectedBook ? `${selectedBook.title}${selectedBook.author ? ` — ${selectedBook.author}` : ""} (${selectedBook.availableCopies} available)` : undefined}
              onSearch={searchAvailableBooks}
              getLabel={b => b.title}
              getSublabel={b => `${b.author ?? ""} • ISBN: ${b.isbn ?? "—"} • ${b.availableCopies === 0 ? "All copies checked out — can reserve" : `${b.availableCopies} copies available`}`}
              onSelect={b => setSelectedBook(b)}
              onClear={() => setSelectedBook(null)}
            />
            <StudentDropdown
              label="Student (leave blank for staff)"
              placeholder="Search by student name or admission no..."
              value={selectedStudent?.id ?? ""}
              displayValue={selectedStudent ? `${selectedStudent.name} (${selectedStudent.admissionNumber})` : undefined}
              onSearch={searchStudents}
              getLabel={s => s.name}
              getSublabel={s => `${s.admissionNumber} • Class ${s.class}-${s.section}`}
              onSelect={s => { setSelectedStudent(s); setSelectedStaff(null); }}
              onClear={() => setSelectedStudent(null)}
              disabled={!!selectedStaff}
            />
            <StaffDropdown
              label="Staff (leave blank for student)"
              placeholder="Search by staff name or employee ID..."
              value={selectedStaff?.id ?? ""}
              displayValue={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName} (${selectedStaff.employeeId})` : undefined}
              onSearch={searchStaff}
              getLabel={s => `${s.firstName} ${s.lastName}`}
              getSublabel={s => `${s.employeeId} • ${s.designation}`}
              onSelect={s => { setSelectedStaff(s); setSelectedStudent(null); }}
              onClear={() => setSelectedStaff(null)}
              disabled={!!selectedStudent}
            />
            <div>
              <Label>Reservation Expires At *</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reserving...</> : "Reserve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ─── Periodicals Tab ─────────────────────────────────────────────────────────

function PeriodicalsTab() {
  const { toast } = useToast();
  const [periodicals, setPeriodicals] = useState<Periodical[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Periodical | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState<CreatePeriodicalDto>({ title: "", periodicalType: "journal" });

  useEffect(() => { load(); }, [typeFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setPeriodicals(await libraryP1Api.getPeriodicals(typeFilter !== "all" ? typeFilter : undefined));
    } catch {
      toast({ title: "Error", description: "Failed to load periodicals", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openNew = () => { setEditTarget(null); setForm({ title: "", periodicalType: "journal" }); setOpen(true); };
  const openEdit = (p: Periodical) => {
    setEditTarget(p);
    setForm({ title: p.title, periodicalType: p.periodicalType, issn: p.issn, publisher: p.publisher, frequency: p.frequency, currentIssue: p.currentIssue });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editTarget) {
        await libraryP1Api.updatePeriodical(editTarget.id, form);
        toast({ title: "Periodical updated" });
      } else {
        await libraryP1Api.createPeriodical(form);
        toast({ title: "Periodical created" });
      }
      setOpen(false); load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      await libraryP1Api.deletePeriodical(id);
      toast({ title: "Deleted" });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="journal">Journal</SelectItem>
            <SelectItem value="magazine">Magazine</SelectItem>
            <SelectItem value="newspaper">Newspaper</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Periodical</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>ISSN</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Current Issue</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodicals.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No periodicals</TableCell></TableRow>
            ) : periodicals.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell><Badge variant="outline">{p.periodicalType}</Badge></TableCell>
                <TableCell>{p.issn ?? "—"}</TableCell>
                <TableCell>{p.publisher ?? "—"}</TableCell>
                <TableCell>{p.frequency ?? "—"}</TableCell>
                <TableCell>{p.currentIssue ?? "—"}</TableCell>
                <TableCell className="space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit Periodical" : "Add Periodical"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.periodicalType} onValueChange={v => setForm(f => ({ ...f, periodicalType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="magazine">Magazine</SelectItem>
                    <SelectItem value="newspaper">Newspaper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ISSN</Label>
                <Input value={form.issn ?? ""} onChange={e => setForm(f => ({ ...f, issn: e.target.value }))} />
              </div>
              <div>
                <Label>Publisher</Label>
                <Input value={form.publisher ?? ""} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input value={form.frequency ?? ""} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="Weekly / Monthly" />
              </div>
            </div>
            <div>
              <Label>Current Issue</Label>
              <Input value={form.currentIssue ?? ""} onChange={e => setForm(f => ({ ...f, currentIssue: e.target.value }))} placeholder="Vol. 12 No. 3 — June 2025" />
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

// ─── Member Cards Tab ────────────────────────────────────────────────────────

// ─── Printable Card component ────────────────────────────────────────────────

interface SchoolCardInfo {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}

function PrintableCard({
  m, onClose, autoDownload, schoolInfo,
}: {
  m: LibraryMember; onClose: () => void; autoDownload?: boolean; schoolInfo?: SchoolCardInfo | null;
}) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handleDownload = React.useCallback(async () => {
    // Fetch logo as base64 so it embeds correctly in the popup (avoids cross-origin/CSP issues)
    let logoDataUrl: string | undefined;
    if (schoolInfo?.logoUrl) {
      try {
        const resp = await fetch(schoolInfo.logoUrl);
        const blob = await resp.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { /* fall back to text */ }
    }

    const printWin = window.open("", "_blank", "width=520,height=480");
    if (!printWin) { alert("Allow pop-ups to download / print the card."); return; }

    const schoolName = esc(schoolInfo?.name ?? "School Library");
    const memberName = esc(m.memberName);
    const logoHtml = logoDataUrl
      ? `<img class="school-logo" src="${logoDataUrl}" alt="Logo" />`
      : `<div class="school-logo-ph">\uD83D\uDCDA</div>`;

    printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Library Card \u2013 ${memberName}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 30px; font-family: Arial, Helvetica, sans-serif; background: #dde4ec; }
  .card {
    width: 340px;
    background: linear-gradient(135deg, #1a3a5c 0%, #2563eb 100%);
    color: #fff;
    border-radius: 14px;
    padding: 20px 22px 18px;
    box-shadow: 0 6px 24px rgba(0,0,0,.35);
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }
  .card::after {
    content: '';
    position: absolute;
    bottom: -50px; left: -25px;
    width: 130px; height: 130px;
    border-radius: 50%;
    background: rgba(255,255,255,.05);
  }
  .school-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; position: relative; z-index: 1; }
  .school-logo { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,.12); }
  .school-logo-ph { width: 40px; height: 40px; background: rgba(255,255,255,.18); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .school-name { font-size: 13px; font-weight: 700; line-height: 1.3; }
  .card-label { font-size: 9px; letter-spacing: 1.5px; opacity: .72; text-transform: uppercase; margin-top: 1px; }
  .chip { width: 34px; height: 26px; background: linear-gradient(135deg, #d4af37 0%, #f5e17a 50%, #d4af37 100%); border-radius: 4px; margin-bottom: 10px; position: relative; z-index: 1; }
  .card-no { font-size: 13px; letter-spacing: 3px; font-family: "Courier New", monospace; opacity: .95; margin-bottom: 10px; position: relative; z-index: 1; }
  .member-name { font-size: 19px; font-weight: 700; margin-bottom: 4px; letter-spacing: .4px; position: relative; z-index: 1; }
  .meta { font-size: 10px; opacity: .82; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; position: relative; z-index: 1; }
  .badge { background: rgba(255,255,255,.22); border-radius: 4px; padding: 2px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
  .validity { display: flex; justify-content: space-between; font-size: 10px; opacity: .88; border-top: 1px solid rgba(255,255,255,.2); padding-top: 9px; position: relative; z-index: 1; }
  .validity strong { display: block; font-size: 9px; letter-spacing: .5px; opacity: .7; text-transform: uppercase; margin-bottom: 2px; }
  @media print {
    body { background: #dde4ec; padding: 10px; }
  }
</style>
</head>
<body onload="window.focus(); setTimeout(function(){ window.print(); }, 350);">
<div class="card">
  <div class="school-header">
    ${logoHtml}
    <div>
      <div class="school-name">${schoolName}</div>
      <div class="card-label">Library Membership Card</div>
    </div>
  </div>
  <div class="chip"></div>
  <div class="card-no">${esc(m.cardNumber)}</div>
  <div class="member-name">${memberName}</div>
  <div class="meta">
    <span class="badge">${esc(m.memberType)}</span>
    <span>Max Books: ${m.maxBooksAllowed}</span>
  </div>
  <div class="validity">
    <div><strong>Valid From</strong>${new Date(m.validFrom).toLocaleDateString()}</div>
    <div style="text-align:right"><strong>Valid To</strong>${new Date(m.validTo).toLocaleDateString()}</div>
  </div>
</div>
</body></html>`);
    printWin.document.close();
  }, [m, schoolInfo]);

  React.useEffect(() => {
    if (autoDownload) handleDownload();
  }, [autoDownload, handleDownload]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Library Member Card</DialogTitle></DialogHeader>
        <div className="rounded-xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, #1a3a5c 0%, #2563eb 100%)" }}>
          <p className="text-[10px] tracking-widest opacity-70 uppercase">Library Member Card</p>
          <p className="text-base font-bold mb-3">{schoolInfo?.name ?? "School Library"}</p>
          <p className="font-mono text-xs tracking-widest opacity-90 mb-2">{m.cardNumber}</p>
          <p className="text-xl font-bold">{m.memberName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] bg-white/20 rounded px-2 py-0.5 uppercase tracking-wider">{m.memberType}</span>
            <span className="text-[10px] opacity-80">Max Books: {m.maxBooksAllowed}</span>
          </div>
          <div className="flex justify-between mt-3 text-[10px] opacity-80">
            <span>From: {new Date(m.validFrom).toLocaleDateString()}</span>
            <span>To: {new Date(m.validTo).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload}><CreditCard className="w-4 h-4 mr-2" />Download / Print</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberCardsTab() {
  const { toast } = useToast();
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [cardPreview, setCardPreview] = useState<LibraryMember | null>(null);
  const [cardPreviewAutoDownload, setCardPreviewAutoDownload] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolCardInfo | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<LibraryMember | null>(null);
  const [editForm, setEditForm] = useState<UpdateLibraryMemberDto>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<LibraryMember | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  // Individual form fields (no form object — avoids stale closure issues)
  const [memberType, setMemberType] = useState<"student" | "staff">("student");
  const [selectedStudent, setSelectedStudent] = useState<StudentBasic | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffBasic | null>(null);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const [maxBooks, setMaxBooks] = useState(3);

  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { settingsApi.getSchoolInfo().then(setSchoolInfo).catch(() => {}); }, []);

  const load = async () => {
    try {
      setLoading(true);
      setMembers(await libraryP1Api.getMembers(typeFilter !== "all" ? typeFilter : undefined));
    } catch {
      toast({ title: "Error", description: "Failed to load members", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setSelectedStudent(null); setSelectedStaff(null);
    setMemberType("student");
    setValidFrom(new Date().toISOString().slice(0, 10));
    setValidUntil(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
    setMaxBooks(3);
  };

  const submit = async () => {
    if (memberType === "student" && !selectedStudent) {
      toast({ title: "Please search and select a student", variant: "destructive" }); return;
    }
    if (memberType === "staff" && !selectedStaff) {
      toast({ title: "Please search and select a staff member", variant: "destructive" }); return;
    }
    const memberId = selectedStudent?.id ?? selectedStaff!.id;
    const dto: CreateLibraryMemberDto = {
      memberType,
      memberId,
      validFrom,
      validTo: validUntil,
      maxBooksAllowed: maxBooks,
      loanDays: 14,
    };
    try {
      const created = await libraryP1Api.createMember(dto);
      setOpen(false); resetForm(); load();
      setCardPreviewAutoDownload(false);
      setCardPreview(created);
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message ?? "Failed", variant: "destructive" });
    }
  };

  const openEdit = (m: LibraryMember) => {
    setEditTarget(m);
    setEditForm({
      validFrom: m.validFrom.slice(0, 10),
      validTo: m.validTo.slice(0, 10),
      maxBooksAllowed: m.maxBooksAllowed,
      loanDays: m.loanDays,
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    try {
      setEditSubmitting(true);
      const updated = await libraryP1Api.updateMember(editTarget.id, editForm);
      toast({ title: "Membership updated" });
      setEditTarget(null);
      setMembers(ms => ms.map(x => x.id === updated.id ? updated : x));
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message ?? "Failed", variant: "destructive" });
    } finally { setEditSubmitting(false); }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    try {
      setRevokeSubmitting(true);
      const updated = await libraryP1Api.revokeMember(revokeTarget.id);
      toast({ title: "Membership revoked" });
      setRevokeTarget(null);
      setMembers(ms => ms.map(x => x.id === updated.id ? updated : x));
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message ?? "Failed", variant: "destructive" });
    } finally { setRevokeSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Generate Card
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Card Number</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Valid From</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Max Books</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No members</TableCell></TableRow>
            ) : members.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.cardNumber}</TableCell>
                <TableCell>{m.memberName || "—"}</TableCell>
                <TableCell><Badge variant="outline">{m.memberType}</Badge></TableCell>
                <TableCell>{new Date(m.validFrom).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(m.validTo).toLocaleDateString()}</TableCell>
                <TableCell>{m.maxBooksAllowed}</TableCell>
                <TableCell>
                  <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setCardPreviewAutoDownload(false); setCardPreview(m); }}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => { setCardPreviewAutoDownload(true); setCardPreview(m); }}>Download</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}
                      disabled={m.status === "revoked"}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setRevokeTarget(m)}
                      disabled={m.status === "revoked"}>Revoke</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {cardPreview && <PrintableCard m={cardPreview} autoDownload={cardPreviewAutoDownload} schoolInfo={schoolInfo} onClose={() => { setCardPreview(null); setCardPreviewAutoDownload(false); }} />}

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Membership — {editTarget?.memberName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={editForm.validFrom ?? ""} onChange={e => setEditForm(f => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={editForm.validTo ?? ""} onChange={e => setEditForm(f => ({ ...f, validTo: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Max Books Allowed</Label>
              <Input type="number" min={1} max={20} value={editForm.maxBooksAllowed ?? 3}
                onChange={e => setEditForm(f => ({ ...f, maxBooksAllowed: +e.target.value }))} />
            </div>
            <div>
              <Label>Loan Days</Label>
              <Input type="number" min={1} max={60} value={editForm.loanDays ?? 14}
                onChange={e => setEditForm(f => ({ ...f, loanDays: +e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={editSubmitting}>
                {editSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={v => { if (!v) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Revoke Membership</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to revoke the library membership for{" "}
              <span className="font-semibold text-foreground">{revokeTarget?.memberName || revokeTarget?.cardNumber}</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={revoke} disabled={revokeSubmitting}>
                {revokeSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Revoking...</> : "Revoke Membership"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate Library Member Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member Type *</Label>
              <Select value={memberType} onValueChange={v => { setMemberType(v as "student" | "staff"); setSelectedStudent(null); setSelectedStaff(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {memberType === "student" ? (
              <StudentDropdown
                label="Student *"
                placeholder="Search by name or admission number..."
                value={selectedStudent?.id ?? ""}
                displayValue={selectedStudent ? `${selectedStudent.name} (${selectedStudent.admissionNumber})` : undefined}
                onSearch={searchStudents}
                getLabel={s => s.name}
                getSublabel={s => `${s.admissionNumber} • Class ${s.class}-${s.section}`}
                onSelect={s => setSelectedStudent(s)}
                onClear={() => setSelectedStudent(null)}
              />
            ) : (
              <StaffDropdown
                label="Staff *"
                placeholder="Search by name or employee ID..."
                value={selectedStaff?.id ?? ""}
                displayValue={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName} (${selectedStaff.employeeId})` : undefined}
                onSearch={searchStaff}
                getLabel={s => `${s.firstName} ${s.lastName}`}
                getSublabel={s => `${s.employeeId} • ${s.designation}`}
                onSelect={s => setSelectedStaff(s)}
                onClear={() => setSelectedStaff(null)}
              />
            )}

            {(selectedStudent || selectedStaff) && (
              <div className="border rounded-lg p-3 bg-muted/30 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {selectedStudent?.name ?? `${selectedStaff?.firstName} ${selectedStaff?.lastName}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent
                      ? `${selectedStudent.admissionNumber} • Class ${selectedStudent.class}-${selectedStudent.section}`
                      : `${selectedStaff?.employeeId} • ${selectedStaff?.designation}`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Max Books Allowed</Label>
              <Input type="number" min={1} max={10} value={maxBooks} onChange={e => setMaxBooks(+e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={submit}><CreditCard className="w-4 h-4 mr-2" />Generate Card</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LibraryEnhanced() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground uppercase tracking-wide">
          <BookMarked className="w-4 h-4" />
          Reservations · Periodicals · Member Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reservations">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="reservations"><BookMarked className="w-4 h-4 mr-1" />Reservations</TabsTrigger>
            <TabsTrigger value="periodicals"><Newspaper className="w-4 h-4 mr-1" />Periodicals</TabsTrigger>
            <TabsTrigger value="members"><CreditCard className="w-4 h-4 mr-1" />Member Cards</TabsTrigger>
          </TabsList>
          <TabsContent value="reservations" className="mt-4"><ReservationsTab /></TabsContent>
          <TabsContent value="periodicals" className="mt-4"><PeriodicalsTab /></TabsContent>
          <TabsContent value="members" className="mt-4"><MemberCardsTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
