import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Book, BookOpen, AlertCircle, Plus, Search, RefreshCw, X,
  BookMarked, Loader2, CheckCircle2, Clock, Pencil, Trash2,
  ChevronLeft, ChevronRight, RotateCcw, Info, IndianRupee, BookCheck, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import libraryApi, { Book as LibBook, BookIssue, LibraryStats, CreateBookDto, CreateIssueDto } from "@/services/api/libraryApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";

const CATEGORIES = ["Fiction","Non-Fiction","Science","Mathematics","History","Computer Science","Literature","Reference","Geography","Language","Arts & Crafts","Textbook","General"];
const DUE_DAYS_DEFAULT = 14;
const PAGE_SIZE = 15;

const bookStatusConfig: Record<string, { label: string; color: string }> = {
  available:   { label: "Available",   color: "bg-green-100 text-green-700 border-green-200" },
  low:         { label: "Low Stock",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  unavailable: { label: "Unavailable", color: "bg-red-100 text-red-700 border-red-200" },
};
const issueStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  issued:   { label: "Issued",   color: "bg-blue-100 text-blue-700 border-blue-200",    icon: <BookMarked className="h-3 w-3" /> },
  overdue:  { label: "Overdue",  color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertCircle className="h-3 w-3" /> },
  returned: { label: "Returned", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
};

function StatCard({ icon, label, value, sub, color = "text-foreground" }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-muted">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </CardContent></Card>
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

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t text-sm">
      <span className="text-muted-foreground">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,total)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page-1)} disabled={page<=1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="px-2 font-medium">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page+1)} disabled={page>=totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

const BLANK_BOOK: CreateBookDto = { title: "", author: "", isbn: "", publisher: "", publishedYear: undefined, category: "General", location: "", description: "", totalCopies: 1 };

function BookFormDialog({ open, onClose, initial, onSave, saving }: { open: boolean; onClose: () => void; initial?: Partial<CreateBookDto>; onSave: (dto: CreateBookDto) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState<CreateBookDto>({ ...BLANK_BOOK, ...initial });
  useEffect(() => { setForm({ ...BLANK_BOOK, ...initial }); }, [open]);
  const set = (k: keyof CreateBookDto, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const valid = !!form.title.trim() && form.totalCopies >= 1;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.title ? "Edit Book" : "Add New Book"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2"><Label>Title <span className="text-destructive">*</span></Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Introduction to Physics" /></div>
          <div><Label>Author</Label><Input value={form.author ?? ""} onChange={e => set("author", e.target.value)} /></div>
          <div><Label>ISBN</Label><Input value={form.isbn ?? ""} onChange={e => set("isbn", e.target.value)} className="font-mono text-sm" /></div>
          <div><Label>Publisher</Label><Input value={form.publisher ?? ""} onChange={e => set("publisher", e.target.value)} /></div>
          <div><Label>Published Year</Label><Input type="number" min={1800} max={new Date().getFullYear()} value={form.publishedYear ?? ""} onChange={e => set("publishedYear", e.target.value ? Number(e.target.value) : undefined)} /></div>
          <div><Label>Category</Label><Select value={form.category ?? "General"} onValueChange={v => set("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Location / Shelf</Label><Input value={form.location ?? ""} onChange={e => set("location", e.target.value)} placeholder="e.g. Shelf A-3" /></div>
          <div><Label>Total Copies <span className="text-destructive">*</span></Label><Input type="number" min={1} value={form.totalCopies} onChange={e => set("totalCopies", Math.max(1, Number(e.target.value)))} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid || saving} className="min-w-24">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial?.title ? "Save Changes" : "Add Book")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueBookDialog({ open, onClose, books, students, onIssue, saving }: { open: boolean; onClose: () => void; books: LibBook[]; students: StudentBasic[]; onIssue: (dto: CreateIssueDto) => Promise<void>; saving: boolean }) {
  const defaultDue = () => { const d = new Date(); d.setDate(d.getDate() + DUE_DAYS_DEFAULT); return d.toISOString().split("T")[0]; };
  const [form, setForm] = useState({ bookId: "", studentId: "", issueDate: new Date().toISOString().split("T")[0], dueDate: defaultDue() });
  const [bookSearch, setBookSearch] = useState("");
  const [stuSearch, setStuSearch] = useState("");
  useEffect(() => { if (!open) { setForm({ bookId: "", studentId: "", issueDate: new Date().toISOString().split("T")[0], dueDate: defaultDue() }); setBookSearch(""); setStuSearch(""); } }, [open]);
  const filteredBooks = useMemo(() => books.filter(b => b.availableCopies > 0 && (!bookSearch || b.title.toLowerCase().includes(bookSearch.toLowerCase()) || (b.author ?? "").toLowerCase().includes(bookSearch.toLowerCase()) || (b.isbn ?? "").includes(bookSearch))), [books, bookSearch]);
  const filteredStudents = useMemo(() => students.filter(s => !stuSearch || s.name.toLowerCase().includes(stuSearch.toLowerCase()) || s.admissionNumber.includes(stuSearch) || s.class.includes(stuSearch)), [students, stuSearch]);
  const valid = !!form.bookId && !!form.studentId && !!form.dueDate;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Select Book <span className="text-destructive">*</span></Label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-9 h-8 text-sm" placeholder="Search title, author, ISBN…" value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></div>
            <div className="border rounded-lg max-h-36 overflow-y-auto">
              {filteredBooks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No available books</p> : filteredBooks.map(b => (
                <button key={b.id} onClick={() => setForm(f => ({ ...f, bookId: b.id }))} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${form.bookId === b.id ? "bg-primary/10 font-medium" : ""}`}>
                  <span>{b.title}{b.author ? ` — ${b.author}` : ""}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{b.availableCopies} left</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Select Student <span className="text-destructive">*</span></Label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-9 h-8 text-sm" placeholder="Search name, admission no…" value={stuSearch} onChange={e => setStuSearch(e.target.value)} /></div>
            <div className="border rounded-lg max-h-36 overflow-y-auto">
              {filteredStudents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No students match</p> : filteredStudents.slice(0,50).map(s => (
                <button key={s.id} onClick={() => setForm(f => ({ ...f, studentId: s.id }))} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${form.studentId === s.id ? "bg-primary/10 font-medium" : ""}`}>
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">Class {s.class}{s.section ? `-${s.section}` : ""} · {s.admissionNumber}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} /></div>
            <div><Label>Due Date <span className="text-destructive">*</span></Label><Input type="date" value={form.dueDate} min={form.issueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => onIssue(form)} disabled={!valid || saving} className="min-w-24">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Book"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({ issue, onClose, onReturn, saving }: { issue: BookIssue | null; onClose: () => void; onReturn: (id: string) => Promise<void>; saving: boolean }) {
  if (!issue) return null;
  const isOverdue = issue.daysOverdue > 0;
  return (
    <Dialog open={!!issue} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Return Book</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium text-base mb-2"><BookCheck className="h-5 w-5 text-primary" />{issue.bookTitle}</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-muted-foreground">
              <span>Student</span>   <span className="text-foreground font-medium">{issue.studentName}</span>
              <span>Class</span>     <span className="text-foreground">{issue.studentClass}{issue.studentSection ? `-${issue.studentSection}` : ""}</span>
              <span>Issued On</span> <span className="text-foreground">{new Date(issue.issueDate).toLocaleDateString("en-IN")}</span>
              <span>Due Date</span>  <span className={isOverdue ? "text-destructive font-medium" : "text-foreground"}>{new Date(issue.dueDate).toLocaleDateString("en-IN")}</span>
              {isOverdue && <><span className="text-destructive">Days Overdue</span><span className="text-destructive font-bold">{issue.daysOverdue} days</span></>}
            </div>
          </div>
          {issue.fine > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 mb-1"><IndianRupee className="h-4 w-4 text-amber-600" /><span className="font-semibold text-amber-800 dark:text-amber-200">Late Return Fine</span></div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">₹2/day × {issue.daysOverdue} days</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">₹{issue.fine.toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => onReturn(issue.id)} disabled={saving} className="min-w-28">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Return"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverduePanel({ onReturnClick, onFinePaid }: { onReturnClick: (i: BookIssue) => void; onFinePaid: (i: BookIssue) => void }) {
  const [items, setItems] = useState<BookIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"overdue"|"fines">("overdue");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await libraryApi.getIssues({ page, pageSize: PAGE_SIZE, status: subTab === "overdue" ? "overdue" : undefined });
      const filtered = subTab === "fines" ? r.issues.filter(i => i.fine > 0) : r.issues;
      setItems(filtered); setTotal(subTab === "fines" ? filtered.length : r.total);
    } catch { toast.error("Failed to load data"); } finally { setLoading(false); }
  }, [page, subTab]);
  useEffect(() => { setPage(1); }, [subTab]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={subTab === "overdue" ? "default" : "outline"} size="sm" onClick={() => setSubTab("overdue")}><Clock className="h-3.5 w-3.5 mr-1.5" />Overdue Books</Button>
        <Button variant={subTab === "fines" ? "default" : "outline"} size="sm" onClick={() => setSubTab("fines")}><IndianRupee className="h-3.5 w-3.5 mr-1.5" />Fine Tracker</Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={load}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>
      <Card><CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={subTab === "overdue" ? <CheckCircle2 className="h-10 w-10 text-green-400" /> : <DollarSign className="h-10 w-10 text-muted-foreground/30" />} title={subTab === "overdue" ? "No overdue books!" : "No outstanding fines"} description={subTab === "overdue" ? "All books returned on time" : "All fines cleared"} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Book</TableHead><TableHead>Student</TableHead><TableHead>Due Date</TableHead><TableHead>Days Late</TableHead><TableHead>Fine</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(issue => (
                  <TableRow key={issue.id} className="bg-red-50/20 dark:bg-red-950/10">
                    <TableCell><p className="font-medium text-sm">{issue.bookTitle}</p></TableCell>
                    <TableCell><p className="text-sm">{issue.studentName}</p><p className="text-xs text-muted-foreground">{issue.studentClass ? `Class ${issue.studentClass}` : ""}{issue.studentSection ? `-${issue.studentSection}` : ""}</p></TableCell>
                    <TableCell className="text-destructive font-medium text-sm">{new Date(issue.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</TableCell>
                    <TableCell><span className="font-bold text-destructive">{issue.daysOverdue}</span><span className="text-xs text-muted-foreground ml-1">days</span></TableCell>
                    <TableCell><span className="font-semibold text-amber-600">₹{issue.fine.toFixed(0)}</span><span className="text-xs text-muted-foreground ml-1">(₹2/day)</span></TableCell>
                    <TableCell>{issue.finePaid ? <span className="text-[11px] text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Paid</span> : <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>}</TableCell>
                    <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                      {issue.status !== "returned" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onReturnClick(issue)}><RotateCcw className="h-3 w-3 mr-1" />Return</Button>}
                      {issue.fine > 0 && !issue.finePaid && <Button variant="outline" size="sm" className="h-7 text-xs text-green-600 border-green-200" onClick={() => onFinePaid(issue)}><CheckCircle2 className="h-3 w-3 mr-1" />Mark Paid</Button>}
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4"><Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} /></div>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}

export function EnhancedLibraryManager() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [books, setBooks] = useState<LibBook[]>([]);
  const [bookTotal, setBookTotal] = useState(0);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [issueTotal, setIssueTotal] = useState(0);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookCategory, setBookCategory] = useState("all");
  const [bookStatus, setBookStatus] = useState("all");
  const [bookPage, setBookPage] = useState(1);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatus, setIssueStatus] = useState("all");
  const [issuePage, setIssuePage] = useState(1);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editBook, setEditBook] = useState<LibBook | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LibBook | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnIssue, setReturnIssue] = useState<BookIssue | null>(null);
  const [tab, setTab] = useState("catalog");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await libraryApi.getLibraryStats()); } catch { /* ignore */ } finally { setStatsLoading(false); }
  }, []);

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const r = await libraryApi.getBooks({ page: bookPage, pageSize: PAGE_SIZE, search: bookSearch || undefined, category: bookCategory, status: bookStatus });
      setBooks(r.books); setBookTotal(r.total);
    } catch { toast.error("Failed to load books"); } finally { setBooksLoading(false); }
  }, [bookPage, bookSearch, bookCategory, bookStatus]);

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    try {
      const r = await libraryApi.getIssues({ page: issuePage, pageSize: PAGE_SIZE, status: issueStatus });
      setIssues(r.issues); setIssueTotal(r.total);
    } catch { toast.error("Failed to load issues"); } finally { setIssuesLoading(false); }
  }, [issuePage, issueStatus]);

  const loadStudents = useCallback(async () => {
    try { const r = await studentApi.list({ pageSize: 1000, status: "active" }); setStudents(r.students ?? []); } catch { /* ignore */ }
  }, []);

  useEffect(() => { const t = setTimeout(() => { setBookPage(1); loadBooks(); }, 350); return () => clearTimeout(t); }, [bookSearch]);
  useEffect(() => { setBookPage(1); loadBooks(); }, [bookCategory, bookStatus]);
  useEffect(() => { loadBooks(); }, [bookPage]);
  useEffect(() => { setIssuePage(1); loadIssues(); }, [issueStatus]);
  useEffect(() => { loadIssues(); }, [issuePage]);
  useEffect(() => { loadStats(); loadBooks(); loadIssues(); loadStudents(); }, []);

  const filteredIssues = useMemo(() => {
    if (!issueSearch) return issues;
    const s = issueSearch.toLowerCase();
    return issues.filter(i => i.bookTitle.toLowerCase().includes(s) || i.studentName.toLowerCase().includes(s) || (i.studentAdmissionNumber ?? "").includes(issueSearch));
  }, [issues, issueSearch]);

  const categories = useMemo(() => Array.from(new Set(books.map(b => b.category).filter(Boolean) as string[])).sort(), [books]);

  const handleAddBook = async (dto: CreateBookDto) => {
    setSaving(true);
    try { await libraryApi.createBook(dto); toast.success("Book added to library"); setAddBookOpen(false); loadBooks(); loadStats(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to add book"); } finally { setSaving(false); }
  };
  const handleEditBook = async (dto: CreateBookDto) => {
    if (!editBook) return; setSaving(true);
    try { await libraryApi.updateBook(editBook.id, dto); toast.success("Book updated"); setEditBook(null); loadBooks(); loadStats(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to update book"); } finally { setSaving(false); }
  };
  const handleDeleteBook = async () => {
    if (!deleteConfirm) return; setSaving(true);
    try { await libraryApi.deleteBook(deleteConfirm.id); toast.success("Book removed"); setDeleteConfirm(null); loadBooks(); loadStats(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Cannot delete — book has active issues"); } finally { setSaving(false); }
  };
  const handleIssueBook = async (dto: CreateIssueDto) => {
    setSaving(true);
    try { await libraryApi.issueBook(dto); toast.success("Book issued successfully"); setIssueOpen(false); loadBooks(); loadIssues(); loadStats(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to issue book"); } finally { setSaving(false); }
  };
  const handleReturn = async (issueId: string) => {
    setSaving(true);
    try { const u = await libraryApi.returnBook(issueId); toast.success(`Book returned${u.fine > 0 ? ` • Fine: ₹${u.fine}` : ""}`); setReturnIssue(null); loadBooks(); loadIssues(); loadStats(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to process return"); } finally { setSaving(false); }
  };
  const handleMarkFinePaid = async (issue: BookIssue) => {
    try { await libraryApi.markFinePaid(issue.id); toast.success("Fine marked as paid"); loadIssues(); }
    catch { toast.error("Failed to update fine"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Library</h2>
          <p className="text-sm text-muted-foreground">Manage books, issues, returns and fines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadBooks(); loadIssues(); }}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={() => setAddBookOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Book</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-20" />) : <>
          <StatCard icon={<Book className="h-5 w-5 text-primary" />} label="Total Titles" value={stats?.totalTitles ?? 0} sub={`${stats?.totalCopies ?? 0} copies total`} />
          <StatCard icon={<BookOpen className="h-5 w-5 text-green-600" />} label="Available" value={stats?.availableCopies ?? 0} sub="copies on shelf" color="text-green-600" />
          <StatCard icon={<BookMarked className="h-5 w-5 text-blue-600" />} label="Issued" value={stats?.issuedCopies ?? 0} sub={stats?.totalIssuedToday ? `+${stats.totalIssuedToday} today` : undefined} color="text-blue-600" />
          <StatCard icon={<AlertCircle className="h-5 w-5 text-destructive" />} label="Overdue" value={stats?.overdueCount ?? 0} sub={stats?.totalFinesPending ? `₹${stats.totalFinesPending} pending fines` : "No pending fines"} color={(stats?.overdueCount ?? 0) > 0 ? "text-destructive" : "text-foreground"} />
        </>}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9 w-full sm:w-auto">
          <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm"><Book className="h-3.5 w-3.5" />Book Catalog</TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5 text-xs sm:text-sm"><BookMarked className="h-3.5 w-3.5" />Issued Books</TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5 text-xs sm:text-sm"><AlertCircle className="h-3.5 w-3.5" />Overdue / Fines</TabsTrigger>
        </TabsList>

        {/* Catalog */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-9 h-9" placeholder="Search title, author, ISBN…" value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></div>
            <Select value={bookCategory} onValueChange={v => { setBookCategory(v); setBookPage(1); }}><SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select value={bookStatus} onValueChange={v => { setBookStatus(v); setBookPage(1); }}><SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="low">Low Stock</SelectItem><SelectItem value="unavailable">Unavailable</SelectItem></SelectContent></Select>
            {(bookSearch || bookCategory !== "all" || bookStatus !== "all") && <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => { setBookSearch(""); setBookCategory("all"); setBookStatus("all"); }}><X className="h-4 w-4" /></Button>}
          </div>
          <Card><CardContent className="p-0">
            {booksLoading ? (<div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10" />)}</div>) :
             books.length === 0 ? (<EmptyState icon={<Book className="h-10 w-10 text-muted-foreground/30" />} title="No books found" description="Add your first book to start building the catalog" action={<Button size="sm" onClick={() => setAddBookOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Book</Button>} />) :
            (<div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Title / Author</TableHead><TableHead>ISBN</TableHead><TableHead>Category</TableHead><TableHead>Location</TableHead><TableHead className="text-center">Avail / Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {books.map(book => {
                    const sc = bookStatusConfig[book.status] ?? bookStatusConfig.available;
                    return (
                      <TableRow key={book.id}>
                        <TableCell><div><p className="font-medium text-sm">{book.title}</p>{book.author && <p className="text-xs text-muted-foreground">{book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ""}</p>}</div></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{book.isbn ?? "—"}</TableCell>
                        <TableCell className="text-sm">{book.category}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{book.location ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold tabular-nums ${book.availableCopies === 0 ? "text-destructive" : book.availableCopies <= book.totalCopies/3 ? "text-amber-600" : "text-green-600"}`}>{book.availableCopies}</span>
                          <span className="text-muted-foreground text-xs"> / {book.totalCopies}</span>
                        </TableCell>
                        <TableCell><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span></TableCell>
                        <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => setEditBook(book)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remove" onClick={() => setDeleteConfirm(book)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          {book.availableCopies > 0 && <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={() => setIssueOpen(true)}>Issue</Button>}
                        </div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-4"><Pagination page={bookPage} total={bookTotal} pageSize={PAGE_SIZE} onChange={setBookPage} /></div>
            </div>)}
          </CardContent></Card>
        </TabsContent>

        {/* Issued */}
        <TabsContent value="issues" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-9 h-9" placeholder="Search book or student…" value={issueSearch} onChange={e => setIssueSearch(e.target.value)} /></div>
              <Select value={issueStatus} onValueChange={v => { setIssueStatus(v); setIssuePage(1); }}><SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="returned">Returned</SelectItem></SelectContent></Select>
            </div>
            <Button size="sm" className="h-9" onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Issue Book</Button>
          </div>
          <Card><CardContent className="p-0">
            {issuesLoading ? (<div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10" />)}</div>) :
             filteredIssues.length === 0 ? (<EmptyState icon={<BookMarked className="h-10 w-10 text-muted-foreground/30" />} title="No issues found" description="No book issues match your current filters" />) :
            (<div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Book</TableHead><TableHead>Student</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Returned</TableHead><TableHead>Status</TableHead><TableHead>Fine</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredIssues.map(issue => {
                    const sc = issueStatusConfig[issue.status] ?? issueStatusConfig.issued;
                    const isOverdue = issue.status === "overdue";
                    return (
                      <TableRow key={issue.id} className={isOverdue ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
                        <TableCell><p className="font-medium text-sm">{issue.bookTitle}</p>{issue.bookIsbn && <p className="text-xs text-muted-foreground font-mono">{issue.bookIsbn}</p>}</TableCell>
                        <TableCell><p className="text-sm">{issue.studentName}</p><p className="text-xs text-muted-foreground">{issue.studentClass && `Class ${issue.studentClass}`}{issue.studentSection ? `-${issue.studentSection}` : ""}{issue.studentAdmissionNumber ? ` · ${issue.studentAdmissionNumber}` : ""}</p></TableCell>
                        <TableCell className="text-sm">{new Date(issue.issueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</TableCell>
                        <TableCell className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}>{new Date(issue.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}{isOverdue && <span className="ml-1 text-xs">({issue.daysOverdue}d)</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{issue.returnDate ? new Date(issue.returnDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</TableCell>
                        <TableCell><span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${sc.color}`}>{sc.icon}{sc.label}</span></TableCell>
                        <TableCell>{issue.fine > 0 ? <div><span className={`font-semibold text-sm ${issue.finePaid ? "text-muted-foreground line-through" : "text-amber-600"}`}>₹{issue.fine.toFixed(0)}</span>{issue.finePaid && <span className="ml-1 text-[10px] text-green-600">Paid</span>}</div> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                        <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                          {issue.status !== "returned" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReturnIssue(issue)}><RotateCcw className="h-3 w-3 mr-1" />Return</Button>}
                          {issue.fine > 0 && !issue.finePaid && issue.status === "returned" && <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600 border-amber-200" onClick={() => handleMarkFinePaid(issue)}><CheckCircle2 className="h-3 w-3 mr-1" />Fine Paid</Button>}
                        </div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-4"><Pagination page={issuePage} total={issueTotal} pageSize={PAGE_SIZE} onChange={setIssuePage} /></div>
            </div>)}
          </CardContent></Card>
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue" className="mt-4">
          <OverduePanel onReturnClick={setReturnIssue} onFinePaid={handleMarkFinePaid} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <BookFormDialog open={addBookOpen} onClose={() => setAddBookOpen(false)} onSave={handleAddBook} saving={saving} />
      <BookFormDialog open={!!editBook} onClose={() => setEditBook(null)} initial={editBook ? { title: editBook.title, author: editBook.author, isbn: editBook.isbn, publisher: editBook.publisher, publishedYear: editBook.publishedYear, category: editBook.category, location: editBook.location, description: editBook.description, totalCopies: editBook.totalCopies } : undefined} onSave={handleEditBook} saving={saving} />
      <IssueBookDialog open={issueOpen} onClose={() => setIssueOpen(false)} books={books} students={students} onIssue={handleIssueBook} saving={saving} />
      <ReturnDialog issue={returnIssue} onClose={() => setReturnIssue(null)} onReturn={handleReturn} saving={saving} />

      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Book</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Remove <span className="font-semibold text-foreground">{deleteConfirm?.title}</span> from the catalog? This cannot be undone.</p>
            {deleteConfirm && deleteConfirm.availableCopies < deleteConfirm.totalCopies && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-sm border border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />{deleteConfirm.totalCopies - deleteConfirm.availableCopies} copies are currently issued.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={saving}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBook} disabled={saving} className="min-w-24">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnhancedLibraryManager;
