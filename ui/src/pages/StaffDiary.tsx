/**
 * StaffDiary — Staff-facing diary management page
 * Layout: My Classes tile grid → drill into a class → write/view diary entries
 * Industry pattern: Google Classroom / ClassDojo diary approach
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Plus, Users, ChevronRight, ChevronLeft, Search, Filter,
  Calendar, Eye, EyeOff, Edit2, Trash2, Send, GraduationCap,
  AlertTriangle, CheckCircle2, RefreshCw, X, Save,
  Clock, Star, MessageCircle, FileText, Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import {
  diaryApi, type DiaryEntry, type CreateDiaryDto, type DiaryCategory,
  CATEGORY_CONFIG, PRIORITY_CONFIG, type DiaryPriority,
} from "@/services/api/diaryApi";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Write Diary Dialog ───────────────────────────────────────────────────────

interface WriteDiaryDialogProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  students: StudentBasic[];
  editEntry?: DiaryEntry | null;
  onSaved: (entry: DiaryEntry) => void;
}

const CATEGORIES: DiaryCategory[] = [
  'note', 'homework', 'guideline', 'observation', 'achievement', 'concern', 'feedback', 'behavior'
];

function WriteDiaryDialog({
  open, onClose, classId, className, sectionId, sectionName, students, editEntry, onSaved,
}: WriteDiaryDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<DiaryCategory>("note");
  const [diaryType, setDiaryType] = useState<"class" | "individual">("class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [diaryDate, setDiaryDate] = useState(todayISO());
  const [priority, setPriority] = useState<DiaryPriority>("normal");
  const [isVisibleToParent, setIsVisibleToParent] = useState(true);
  const [notifyParent, setNotifyParent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title);
      setContent(editEntry.content);
      setCategory(editEntry.category as DiaryCategory);
      setDiaryType(editEntry.diaryType as "class" | "individual");
      setSelectedStudentIds(editEntry.studentId ? [editEntry.studentId] : []);
      setStudentSearch("");
      setDiaryDate(editEntry.diaryDate);
      setPriority(editEntry.priority as DiaryPriority);
      setIsVisibleToParent(editEntry.isVisibleToParent);
      setNotifyParent(editEntry.notifyParent);
    } else {
      setTitle(""); setContent(""); setCategory("note");
      setDiaryType("class"); setSelectedStudentIds([]); setStudentSearch("");
      setDiaryDate(todayISO()); setPriority("normal");
      setIsVisibleToParent(true); setNotifyParent(true);
    }
  }, [editEntry, open]);

  const catCfg = CATEGORY_CONFIG[category];

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!content.trim()) { toast.error("Content is required"); return; }
    if (diaryType === "individual" && selectedStudentIds.length === 0) { toast.error("Please select at least one student"); return; }
    setSaving(true);
    try {
      let saved: DiaryEntry;
      if (editEntry) {
        saved = await diaryApi.update(editEntry.id, { title, content, category, isVisibleToParent, notifyParent, priority });
        toast.success("Entry updated");
        onSaved(saved);
      } else if (diaryType === "individual" && selectedStudentIds.length > 1) {
        // Multiple students: create one entry per student — always carry classId/sectionId
        const entries = await Promise.all(
          selectedStudentIds.map(sid =>
            diaryApi.create({
              title, content, category, diaryType: "individual",
              classId, sectionId,
              studentId: sid, diaryDate, isVisibleToParent, notifyParent, priority,
            })
          )
        );
        toast.success(`Diary entry saved for ${entries.length} students`);
        onSaved(entries[0]);
      } else {
        const dto: CreateDiaryDto = {
          title, content, category, diaryType,
          // Always store classId/sectionId so the entry shows up when viewing the class diary
          classId,
          sectionId,
          studentId: diaryType === "individual" ? selectedStudentIds[0] : undefined,
          diaryDate, isVisibleToParent, notifyParent, priority,
        };
        saved = await diaryApi.create(dto);
        toast.success("Diary entry saved");
        onSaved(saved);
      }
      onClose();
    } catch {
      toast.error("Failed to save diary entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{catCfg.emoji}</span>
            {editEntry ? "Edit Diary Entry" : "New Diary Entry"}
            <Badge variant="outline" className="text-xs font-normal ml-1">
              {className}{sectionName ? ` · ${sectionName}` : ""}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
              <Input type="date" value={diaryDate} max={todayISO()}
                onChange={e => setDiaryDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as DiaryCategory)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <span>{CATEGORY_CONFIG[c].emoji}</span>
                        {CATEGORY_CONFIG[c].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scope row */}
          {!editEntry && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Scope</Label>
                <Select value={diaryType} onValueChange={v => { setDiaryType(v as "class" | "individual"); setSelectedStudentIds([]); setStudentSearch(""); }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">
                      <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Whole Class</span>
                    </SelectItem>
                    <SelectItem value="individual">
                      <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" />Choose Students</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {diaryType === "individual" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Students *
                      {selectedStudentIds.length > 0 && (
                        <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {selectedStudentIds.length} selected
                        </span>
                      )}
                    </Label>
                    {selectedStudentIds.length > 0 && (
                      <button onClick={() => setSelectedStudentIds([])} className="text-xs text-muted-foreground hover:text-foreground underline">
                        Clear all
                      </button>
                    )}
                  </div>
                  {/* Search */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search students…"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  {/* Student list */}
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="h-44">
                      {students.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                          No students in this class
                        </div>
                      ) : (() => {
                        const q = studentSearch.trim().toLowerCase();
                        const filtered = q
                          ? students.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q))
                          : students;
                        if (filtered.length === 0) return (
                          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No matches</div>
                        );
                        return (
                          <div>
                            {q.length === 0 && (
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 border-b"
                                onClick={() => setSelectedStudentIds(
                                  selectedStudentIds.length === students.length ? [] : students.map(s => s.id)
                                )}
                              >
                                <Checkbox
                                  checked={selectedStudentIds.length === students.length && students.length > 0}
                                  className="h-3.5 w-3.5"
                                />
                                {selectedStudentIds.length === students.length ? "Deselect all" : `Select all (${students.length})`}
                              </button>
                            )}
                            {filtered.map(s => {
                              const checked = selectedStudentIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${checked ? "bg-primary/5" : ""}`}
                                  onClick={() => setSelectedStudentIds(
                                    checked ? selectedStudentIds.filter(id => id !== s.id) : [...selectedStudentIds, s.id]
                                  )}
                                >
                                  <Checkbox checked={checked} className="h-3.5 w-3.5 shrink-0" />
                                  <Avatar className="h-6 w-6 shrink-0">
                                    {s.photoUrl && <img src={s.photoUrl} alt="" />}
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(s.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm flex-1 truncate">{s.name}</span>
                                  {s.rollNumber && <span className="text-xs text-muted-foreground shrink-0">#{s.rollNumber}</span>}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Title *</Label>
            <Input
              placeholder={`e.g. ${category === 'homework' ? 'Math homework for Chapter 5' : category === 'achievement' ? 'Excellent participation today' : 'Today\'s class note'}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              className="text-sm"
            />
          </div>

          {/* Content */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Content *</Label>
            <Textarea
              placeholder="Write your diary entry here…"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              className="text-sm resize-none"
            />
          </div>

          {/* Priority + Visibility row */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as DiaryPriority)}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_CONFIG) as DiaryPriority[]).map(p => (
                    <SelectItem key={p} value={p} className="text-xs">
                      <span className={`flex items-center gap-1.5 ${PRIORITY_CONFIG[p].color}`}>
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                        {PRIORITY_CONFIG[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={isVisibleToParent} onCheckedChange={setIsVisibleToParent} id="vis" />
                <Label htmlFor="vis" className="text-xs cursor-pointer">
                  {isVisibleToParent ? <span className="flex items-center gap-1"><Eye className="h-3 w-3" />Visible to parent</span> : <span className="flex items-center gap-1 text-muted-foreground"><EyeOff className="h-3 w-3" />Hidden from parent</span>}
                </Label>
              </div>
              {isVisibleToParent && (
                <div className="flex items-center gap-2">
                  <Switch checked={notifyParent} onCheckedChange={setNotifyParent} id="notif" />
                  <Label htmlFor="notif" className="text-xs cursor-pointer">
                    <span className="flex items-center gap-1"><Bell className="h-3 w-3" />Notify</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />{editEntry ? "Update" : "Publish"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diary Entry Card ─────────────────────────────────────────────────────────

function DiaryEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: DiaryEntry;
  onEdit: (e: DiaryEntry) => void;
  onDelete: (id: string) => void;
}) {
  const cat = CATEGORY_CONFIG[entry.category as DiaryCategory] ?? CATEGORY_CONFIG.note;
  const pri = PRIORITY_CONFIG[entry.priority as DiaryPriority] ?? PRIORITY_CONFIG.normal;
  const [expanded, setExpanded] = useState(false);
  const needsExpand = entry.content.length > 180;

  return (
    <Card className={`border ${cat.border} hover:shadow-sm transition-all`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${cat.bg}`}>
            {cat.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground leading-tight">{entry.title}</span>
                {entry.priority !== "normal" && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${pri.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                    {pri.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rose-600" onClick={() => onDelete(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {/* Category */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color} border ${cat.border}`}>
                {cat.emoji} {cat.label}
              </span>

              {/* Sent to */}
              {entry.diaryType === "individual" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  <GraduationCap className="h-3 w-3" />
                  {entry.studentName
                    ? `To: ${entry.studentName}`
                    : "Individual Student"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  <Users className="h-3 w-3" />
                  {entry.className
                    ? `${entry.className}${entry.sectionName ? ` · ${entry.sectionName}` : ""} (Whole Class)`
                    : "Whole Class"}
                </span>
              )}

              {/* Parent visibility */}
              {entry.isVisibleToParent ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                  <Eye className="h-3 w-3" />Shared with parents
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  <EyeOff className="h-3 w-3" />Not shared
                </span>
              )}

              {/* Posted time */}
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
                {entry.createdAt ? formatDateTime(entry.createdAt) : formatDate(entry.diaryDate)}
              </span>
            </div>

            {/* Content */}
            <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded && needsExpand ? "line-clamp-3" : ""}`}>
              {entry.content}
            </p>
            {needsExpand && (
              <button className="text-xs text-primary mt-1 hover:underline" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Class Tile ───────────────────────────────────────────────────────────────

function ClassTile({
  assignment,
  entryCount,
  onClick,
}: {
  assignment: MyClassAssignment;
  entryCount: number;
  onClick: () => void;
}) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600",
  ];
  const idx = assignment.classId.charCodeAt(0) % colors.length;

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group border-0 overflow-hidden"
      onClick={onClick}
    >
      <div className={`h-2 bg-gradient-to-r ${colors[idx]}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center shrink-0`}>
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </Badge>
        </div>
        <h3 className="font-semibold text-foreground leading-tight mb-0.5">
          {assignment.className}
        </h3>
        {assignment.sectionName && (
          <p className="text-xs text-muted-foreground mb-2">Section {assignment.sectionName}</p>
        )}
        {assignment.subjectName && (
          <p className="text-[11px] text-muted-foreground/70">{assignment.subjectName}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {assignment.studentCount ?? 0} students
          </div>
          {assignment.isClassTeacher && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200">
              Class Teacher
            </Badge>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDiary() {
  const { user } = useAuth();

  // View states
  const [view, setView] = useState<"classes" | "diary">("classes");
  const [selectedClass, setSelectedClass] = useState<MyClassAssignment | null>(null);

  // Data
  const [classes, setClasses] = useState<MyClassAssignment[]>([]);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(todayISO());

  // Dialog
  const [writeOpen, setWriteOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load classes ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await academicApi.getMyClassAssignments();
        setClasses(data);

        // Load per-class counts (best-effort)
        const counts: Record<string, number> = {};
        await Promise.allSettled(
          data.map(async (c) => {
            try {
              const res = await diaryApi.getByClass(c.classId, { sectionId: c.sectionId });
              counts[c.classId] = Array.isArray(res) ? res.length : 0;
            } catch { counts[c.classId] = 0; }
          })
        );
        setEntryCounts(counts);
      } catch {
        toast.error("Failed to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load entries when a class is selected ────────────────────────────────
  const loadEntries = useCallback(async (cls: MyClassAssignment) => {
    setEntriesLoading(true);
    try {
      const [entriesData, studentsData] = await Promise.all([
        diaryApi.getByClass(cls.classId, { sectionId: cls.sectionId, fromDate, toDate }),
        studentApi.list({ classFilter: cls.className, sectionFilter: cls.sectionName, page: 1, pageSize: 500 }),
      ]);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setStudents((studentsData as { students?: StudentBasic[] }).students ?? []);
    } catch {
      toast.error("Failed to load diary entries");
    } finally {
      setEntriesLoading(false);
    }
  }, [fromDate, toDate]);

  const openClass = useCallback((cls: MyClassAssignment) => {
    setSelectedClass(cls);
    setView("diary");
    loadEntries(cls);
  }, [loadEntries]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await diaryApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ── Filtered entries ──────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => entries.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) &&
        !e.content.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (typeFilter !== "all" && e.diaryType !== typeFilter) return false;
    return true;
  }), [entries, search, categoryFilter, typeFilter]);

  // ── Render: My Classes ────────────────────────────────────────────────────
  if (view === "classes") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <AnimatedWrapper variant="fadeInUp" delay={0.0}>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Student Diary</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Write notes, share homework, observations and guidelines with parents
            </p>
          </div>
        </AnimatedWrapper>

        {/* Stats bar */}
        {!loading && classes.length > 0 && (
          <AnimatedWrapper variant="fadeInUp" delay={0.05}>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "My Classes", value: classes.length, icon: BookOpen, color: "text-violet-600 bg-violet-50 border-violet-200" },
                { label: "Total Entries", value: Object.values(entryCounts).reduce((a, b) => a + b, 0), icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{value}</span>
                  <span className="text-xs opacity-70">{label}</span>
                </div>
              ))}
            </div>
          </AnimatedWrapper>
        )}

        {/* Class grid */}
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse border-0">
                  <div className="h-2 bg-muted rounded-t-xl" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-10 w-10 bg-muted rounded-xl" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">No classes assigned</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  You don't have any class assignments yet. Contact admin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classes.map(cls => (
                <ClassTile
                  key={cls.assignmentId}
                  assignment={cls}
                  entryCount={entryCounts[cls.classId] ?? 0}
                  onClick={() => openClass(cls)}
                />
              ))}
            </div>
          )}
        </AnimatedWrapper>
      </div>
    );
  }

  // ── Render: Diary View ────────────────────────────────────────────────────
  const cls = selectedClass!;
  const classLabel = `${cls.className}${cls.sectionName ? ` · ${cls.sectionName}` : ""}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <AnimatedWrapper variant="fadeInUp" delay={0.0}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setView("classes")}>
              <ChevronLeft className="h-4 w-4" />My Classes
            </Button>
            <div>
              <h1 className="text-xl font-bold gradient-text">{classLabel}</h1>
              <p className="text-xs text-muted-foreground">
                {cls.subjectName ? `${cls.subjectName} · ` : ""}Diary &amp; Notes
              </p>
            </div>
          </div>
          <Button onClick={() => { setEditEntry(null); setWriteOpen(true); }} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-4 w-4" />New Entry
          </Button>
        </div>
      </AnimatedWrapper>

      {/* Filters */}
      <AnimatedWrapper variant="fadeInUp" delay={0.05}>
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="class">Class-wide</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs w-36" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={toDate} min={fromDate} max={todayISO()} onChange={e => setToDate(e.target.value)} className="h-8 text-xs w-36" />
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs px-2" onClick={() => selectedClass && loadEntries(selectedClass)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {filteredEntries.length} / {entries.length} entries
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedWrapper>

      {/* Entry list */}
      <AnimatedWrapper variant="fadeInUp" delay={0.1}>
        {entriesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">
                {entries.length === 0 ? "No diary entries yet" : "No entries match your filters"}
              </p>
              {entries.length === 0 && (
                <Button className="mt-4 gap-1.5" onClick={() => { setEditEntry(null); setWriteOpen(true); }}>
                  <Plus className="h-4 w-4" />Write First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <DiaryEntryCard
                key={entry.id}
                entry={entry}
                onEdit={e => { setEditEntry(e); setWriteOpen(true); }}
                onDelete={id => setDeleteConfirm(id)}
              />
            ))}
          </div>
        )}
      </AnimatedWrapper>

      {/* Write/Edit Dialog */}
      <WriteDiaryDialog
        open={writeOpen}
        onClose={() => { setWriteOpen(false); setEditEntry(null); }}
        classId={cls.classId}
        className={cls.className}
        sectionId={cls.sectionId}
        sectionName={cls.sectionName}
        students={students}
        editEntry={editEntry}
        onSaved={saved => {
          if (editEntry) {
            setEntries(prev => prev.map(e => e.id === saved.id ? saved : e));
          } else {
            setEntries(prev => [saved, ...prev]);
            setEntryCounts(prev => ({ ...prev, [cls.classId]: (prev[cls.classId] ?? 0) + 1 }));
          }
        }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />Delete Entry
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the diary entry. Parents will no longer see it.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
