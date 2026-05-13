import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award, BarChart3, BookOpen, ClipboardList, Plus,
  Trash2, Filter, RefreshCw, CheckCircle2, AlertCircle, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffExamMarksTab } from "./StaffExamMarksTab";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  gradesApi,
  type GradeItemResponse,
  type StudentGradeResponse,
  type GradeCategoryResponse,
  type CCEAssessmentResponse,
  type BulkGradeEntry,
} from "@/services/api/gradesApi";
import { academicApi } from "@/services/api/academicApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";

// --- GRADE BADGE ---

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-purple-100 text-purple-800 border-purple-300",
  "A":  "bg-green-100  text-green-800  border-green-300",
  "B+": "bg-blue-100   text-blue-800   border-blue-300",
  "B":  "bg-cyan-100   text-cyan-800   border-cyan-300",
  "C":  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "D":  "bg-orange-100 text-orange-800 border-orange-300",
  "F":  "bg-red-100    text-red-800    border-red-300",
  "E":  "bg-pink-100   text-pink-800   border-pink-300",
};

function GradeBadge({ grade }: { grade?: string | null }) {
  if (!grade) return <span className="text-muted-foreground text-xs">-</span>;
  const cls = GRADE_COLORS[grade] ?? "bg-gray-100 text-gray-800 border-gray-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${cls}`}>
      {grade}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    published: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    inactive: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

// --- STATS BAR ---

function StatsBar() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["grades", "stats"],
    queryFn: () => gradesApi.getStats(),
    staleTime: 30_000,
  });

  const cards = [
    { label: "Grade Items",    value: stats?.totalGradeItems,   icon: BookOpen,    color: "text-blue-600" },
    { label: "Total Grades",   value: stats?.totalStudentGrades, icon: ClipboardList, color: "text-green-600" },
    { label: "Average Score",  value: stats ? `${stats.averageMarks}` : undefined, icon: Award,   color: "text-purple-600" },
    { label: "Pass Rate",      value: stats ? `${stats.passRate}%` : undefined,    icon: BarChart3, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Icon className={`h-7 w-7 ${color}`} />
              <div>
                {isLoading
                  ? <Skeleton className="h-7 w-16 mb-1" />
                  : <p className="text-2xl font-bold">{value ?? "-"}</p>}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- GRADE ITEMS TAB ---

function GradeItemsTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const qc = useQueryClient();
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", maxMarks: "100", classId: "", subjectId: "",
    categoryId: "", date: new Date().toISOString().slice(0, 10),
    status: "active", description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch classes based on role
  const { data: classData } = useQuery({
    queryKey: ["grade-classes", isAdmin],
    queryFn: () => isAdmin
      ? academicApi.listClasses(1, 200).then(r => r.classes.map(c => ({ id: c.id, name: c.name || `${c.standard} ${c.section}` })))
      : academicApi.getMyClassAssignments().then(assignments => {
          const seen = new Set<string>();
          const result: { id: string; name: string }[] = [];
          assignments.forEach(a => {
            if (!seen.has(a.classId)) {
              seen.add(a.classId);
              result.push({ id: a.classId, name: a.sectionName ? `${a.className} ${a.sectionName}` : a.className });
            }
          });
          return result;
        }),
    staleTime: 60_000,
  });

  // Fetch subjects
  const { data: subjectData } = useQuery({
    queryKey: ["grade-subjects"],
    queryFn: () => academicApi.listSubjects(1, 200).then(r => r.subjects.map(s => ({ id: s.id, name: s.name }))),
    staleTime: 60_000,
  });

  const availableClasses = classData ?? [];
  const availableSubjects = subjectData ?? [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grades", "items", filterClassId, filterSubjectId],
    queryFn: () => gradesApi.getGradeItems(filterClassId || undefined, filterSubjectId || undefined),
    staleTime: 20_000,
  });

  const { data: cats } = useQuery({
    queryKey: ["grades", "categories"],
    queryFn: () => gradesApi.getCategories(),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: gradesApi.createGradeItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades"] }); setShowCreate(false); toast.success("Grade item created"); },
    onError: (e: unknown) => { const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"; setFormError(msg); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gradesApi.deleteGradeItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades"] }); toast.success("Grade item deleted"); },
    onError: () => toast.error("Cannot delete item with student grades"),
  });

  const handleCreate = () => {
    setFormError(null);
    if (!form.name.trim() || !form.classId || !form.subjectId || !form.categoryId) {
      setFormError("Name, Class, Subject, and Category are required."); return;
    }
    const maxMarks = Number(form.maxMarks);
    if (isNaN(maxMarks) || maxMarks < 1 || maxMarks > 1000) { setFormError("Max marks must be 1-1000."); return; }
    createMut.mutate({ name: form.name.trim(), classId: form.classId, subjectId: form.subjectId, categoryId: form.categoryId, maxMarks, date: new Date(form.date).toISOString(), status: form.status, description: form.description || undefined });
  };

  const items: GradeItemResponse[] = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterClassId} onValueChange={v => setFilterClassId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All classes</SelectItem>
              {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubjectId} onValueChange={v => setFilterSubjectId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All subjects</SelectItem>
              {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => { setFilterClassId(""); setFilterSubjectId(""); }}>
            <Filter className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => { setFormError(null); setShowCreate(true); }}><Plus className="h-4 w-4 mr-1" /> New Item</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Class</TableHead>
                <TableHead>Subject</TableHead><TableHead>Max Marks</TableHead><TableHead>Date</TableHead>
                <TableHead>Status</TableHead><TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : items.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No grade items found.</TableCell></TableRow>
                : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.categoryName ?? item.categoryId.slice(0, 8)}</TableCell>
                    <TableCell>{item.className ?? item.classId.slice(0, 8)}</TableCell>
                    <TableCell>{item.subjectName ?? item.subjectId.slice(0, 8)}</TableCell>
                    <TableCell>{item.maxMarks}</TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(item.id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Grade Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"><AlertCircle className="h-4 w-4 flex-shrink-0" />{formError}</div>}
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Unit Test 1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class *</Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{(cats?.categories ?? []).map((c: GradeCategoryResponse) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Marks *</Label><Input type="number" min={1} max={1000} value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} /></div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- STUDENT GRADES TAB ---

function StudentGradesTab() {
  const qc = useQueryClient();
  const [filterItemId, setFilterItemId] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkItemId, setBulkItemId] = useState("");
  const [studentMarks, setStudentMarks] = useState<Record<string, string>>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  // All grade items for the filter dropdown
  const { data: allItemsData } = useQuery({
    queryKey: ["grades", "items-all"],
    queryFn: () => gradesApi.getGradeItems(undefined, undefined),
    staleTime: 30_000,
  });
  const allItems: GradeItemResponse[] = allItemsData?.items ?? [];
  const selectedGradeItem = allItems.find(i => i.id === bulkItemId);

  // Load all students when bulk dialog is open and a grade item is selected
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["grade-bulk-students"],
    queryFn: () => studentApi.list({ pageSize: 500 }),
    enabled: showBulk,
    staleTime: 60_000,
  });
  const allStudents: StudentBasic[] = (studentsData as { students?: StudentBasic[] })?.students ?? [];

  // Filter students by the selected grade item's class name
  const classStudents = selectedGradeItem
    ? allStudents.filter(s => {
        const cn = (selectedGradeItem.className ?? "").toLowerCase();
        const sc = (s.class ?? "").toLowerCase();
        return cn === sc || cn.includes(sc) || sc.includes(cn) ||
          cn.replace(/class\s*/i, "").trim() === sc ||
          sc === cn.replace(/class\s*/i, "").trim();
      })
    : [];

  // Main grades list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grades", "student-grades", filterItemId],
    queryFn: () => gradesApi.getStudentGrades(filterItemId || undefined, undefined),
    staleTime: 20_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gradesApi.deleteStudentGrade(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades"] }); toast.success("Grade deleted"); },
  });

  const bulkMut = useMutation({
    mutationFn: gradesApi.bulkCreateStudentGrades,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["grades"] }); setBulkResult(res); },
    onError: (e: unknown) => { setBulkError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Bulk create failed"); },
  });

  const handleBulkSubmit = useCallback(() => {
    setBulkError(null); setBulkResult(null);
    if (!bulkItemId) { setBulkError("Select a grade item."); return; }
    const grades: BulkGradeEntry[] = Object.entries(studentMarks)
      .filter(([, marks]) => marks.trim() !== "")
      .map(([studentId, marks]) => ({ studentId, marksObtained: Number(marks) }));
    if (!grades.length) { setBulkError("Enter marks for at least one student."); return; }
    bulkMut.mutate({ gradeItemId: bulkItemId, grades });
  }, [bulkItemId, studentMarks, bulkMut]);

  const grades: StudentGradeResponse[] = data?.studentGrades ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterItemId} onValueChange={v => setFilterItemId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All grade items" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All grade items</SelectItem>
              {allItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name} — {item.className ?? ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setFilterItemId("")}><Filter className="h-4 w-4 mr-1" /> Clear</Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => { setBulkError(null); setBulkResult(null); setBulkItemId(""); setStudentMarks({}); setShowBulk(true); }}><Plus className="h-4 w-4 mr-1" /> Enter Grades</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead><TableHead>Roll No</TableHead><TableHead>Grade Item</TableHead>
                <TableHead>Marks</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead>
                <TableHead>Status</TableHead><TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : grades.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No grades recorded yet. Use Enter Grades to record student marks.</TableCell></TableRow>
                : grades.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.studentName ?? g.studentId.slice(0, 8)}</TableCell>
                    <TableCell>{g.rollNumber ?? "-"}</TableCell>
                    <TableCell>{g.gradeItemName ?? g.gradeItemId.slice(0, 8)}</TableCell>
                    <TableCell>{g.marksObtained}{g.maxMarks ? <span className="text-muted-foreground text-xs"> / {g.maxMarks}</span> : ""}</TableCell>
                    <TableCell><GradeBadge grade={g.grade} /></TableCell>
                    <TableCell className="max-w-xs truncate">{g.remarks ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={g.status} /></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(g.id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showBulk} onOpenChange={open => { setShowBulk(open); if (!open) { setBulkItemId(""); setStudentMarks({}); setBulkResult(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Enter Student Grades</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {bulkError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"><AlertCircle className="h-4 w-4 flex-shrink-0" />{bulkError}</div>}
            {bulkResult && <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded"><CheckCircle2 className="h-4 w-4 flex-shrink-0" />Saved: {bulkResult.created} grades{bulkResult.skipped > 0 ? ` | Skipped (duplicate): ${bulkResult.skipped}` : ""}{bulkResult.errors.length > 0 && <span className="text-orange-600 ml-2">({bulkResult.errors.length} errors)</span>}</div>}
            <div>
              <Label>Grade Item *</Label>
              <Select value={bulkItemId} onValueChange={v => { setBulkItemId(v); setStudentMarks({}); setBulkResult(null); }}>
                <SelectTrigger><SelectValue placeholder="Select a grade item..." /></SelectTrigger>
                <SelectContent>
                  {allItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} — {item.className ?? ""}{item.subjectName ? ` (${item.subjectName})` : ""} [{item.maxMarks} marks]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedGradeItem && (
              <div className="rounded-md border">
                <div className="p-3 border-b bg-muted/50">
                  <p className="text-sm font-medium">{selectedGradeItem.name} — Max: {selectedGradeItem.maxMarks} marks</p>
                  <p className="text-xs text-muted-foreground">{selectedGradeItem.className ?? ""}{selectedGradeItem.subjectName ? ` · ${selectedGradeItem.subjectName}` : ""}</p>
                </div>
                {studentsLoading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : classStudents.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No students matched for this class. All {allStudents.length} students are shown below.
                    {allStudents.slice(0, 20).map(s => (
                      <div key={s.id} className="flex items-center gap-2 mt-2">
                        <span className="flex-1 text-left text-foreground">{s.name} <span className="text-muted-foreground text-xs">(Class {s.class} {s.section})</span></span>
                        <Input type="number" min={0} max={selectedGradeItem.maxMarks} placeholder="—" value={studentMarks[s.id] ?? ""}
                          onChange={e => setStudentMarks(prev => ({ ...prev, [s.id]: e.target.value }))} className="h-8 w-28" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Roll No</TableHead>
                          <TableHead className="w-36">Marks (/{selectedGradeItem.maxMarks})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.rollNumber ?? "-"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={selectedGradeItem.maxMarks}
                                placeholder="—"
                                value={studentMarks[student.id] ?? ""}
                                onChange={e => setStudentMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                                className="h-8 w-28"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulk(false)}>Close</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkMut.isPending || !selectedGradeItem}>{bulkMut.isPending ? "Saving..." : "Save Grades"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- CATEGORIES TAB ---

function CategoriesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", weightage: "0", status: "active", description: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grades", "categories"],
    queryFn: () => gradesApi.getCategories(),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: gradesApi.createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades", "categories"] }); setShowCreate(false); toast.success("Category created"); },
    onError: (e: unknown) => { setFormError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gradesApi.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades", "categories"] }); toast.success("Category deleted"); },
    onError: () => toast.error("Cannot delete - has grade items"),
  });

  const handleCreate = () => {
    setFormError(null);
    const w = Number(form.weightage);
    if (!form.name.trim() || form.name.trim().length < 2) { setFormError("Name must be at least 2 characters."); return; }
    if (isNaN(w) || w < 0 || w > 100) { setFormError("Weightage must be 0-100."); return; }
    createMut.mutate({ name: form.name.trim(), code: form.code || undefined, weightage: w, description: form.description || undefined, status: form.status });
  };

  const cats: GradeCategoryResponse[] = data?.categories ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        <Button size="sm" onClick={() => { setFormError(null); setShowCreate(true); }}><Plus className="h-4 w-4 mr-1" /> New Category</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Weightage</TableHead>
                <TableHead>Status</TableHead><TableHead>Description</TableHead><TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : cats.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No categories yet.</TableCell></TableRow>
                : cats.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.code ?? "-"}</TableCell>
                    <TableCell>{c.weightage}%</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="max-w-xs truncate">{c.description ?? "-"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(c.id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"><AlertCircle className="h-4 w-4 flex-shrink-0" />{formError}</div>}
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. UT" /></div>
              <div><Label>Weightage (%)</Label><Input type="number" min={0} max={100} value={form.weightage} onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- CCE ASSESSMENTS TAB ---

function CCETab() {
  const qc = useQueryClient();
  const [filterYear, setFilterYear] = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ studentId: "", classId: "", academicYear: "", term: "T1", skillArea: "", grade: "A", remarks: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grades", "cce", filterYear],
    queryFn: () => gradesApi.getCCEAssessments(undefined, filterYear || undefined),
    staleTime: 20_000,
  });

  const createMut = useMutation({
    mutationFn: gradesApi.createCCEAssessment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades", "cce"] }); setShowCreate(false); toast.success("CCE assessment created"); },
    onError: (e: unknown) => { setFormError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gradesApi.deleteCCEAssessment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grades", "cce"] }); toast.success("CCE assessment deleted"); },
  });

  // Fetch all students for the create form
  const { data: studentsData } = useQuery({
    queryKey: ["cce-students"],
    queryFn: () => studentApi.list({ pageSize: 500 }),
    staleTime: 60_000,
  });
  const allStudents: StudentBasic[] = (studentsData as { students?: StudentBasic[] })?.students ?? [];

  // Fetch classes for the create form
  const { data: classData } = useQuery({
    queryKey: ["cce-classes"],
    queryFn: () => academicApi.listClasses(1, 200).then(r => r.classes.map(c => ({ id: c.id, name: c.name || `${c.standard} ${c.section}` }))),
    staleTime: 60_000,
  });
  const availableClasses = classData ?? [];

  const handleCreate = () => {
    setFormError(null);
    if (!form.studentId || !form.classId || !form.academicYear || !form.skillArea.trim()) {
      setFormError("Student, Class, Academic Year, and Skill Area are required."); return;
    }
    createMut.mutate({ studentId: form.studentId, classId: form.classId, academicYear: form.academicYear, term: form.term, skillArea: form.skillArea.trim(), grade: form.grade, remarks: form.remarks || undefined });
  };

  const allAssessments: CCEAssessmentResponse[] = data?.assessments ?? [];
  const assessments = filterStudentId
    ? allAssessments.filter(a => (a.studentName ?? "").toLowerCase().includes(filterStudentId.toLowerCase()))
    : allAssessments;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Input placeholder="Search student name" value={filterStudentId} onChange={e => setFilterStudentId(e.target.value)} className="w-44" />
          <Input placeholder="Academic Year (e.g. 2025-26)" value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-48" />
          <Button size="sm" variant="outline" onClick={() => { setFilterStudentId(""); setFilterYear(""); }}><Filter className="h-4 w-4 mr-1" /> Clear</Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => { setFormError(null); setShowCreate(true); }}><Plus className="h-4 w-4 mr-1" /> New Assessment</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead><TableHead>Year</TableHead><TableHead>Term</TableHead>
                <TableHead>Skill Area</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead><TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : assessments.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No CCE assessments found.</TableCell></TableRow>
                : assessments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.studentName ?? a.studentId.slice(0, 8)}</TableCell>
                    <TableCell>{a.academicYear}</TableCell>
                    <TableCell><Badge variant="outline">{a.term}</Badge></TableCell>
                    <TableCell>{a.skillArea}</TableCell>
                    <TableCell><GradeBadge grade={a.grade} /></TableCell>
                    <TableCell className="max-w-xs truncate">{a.remarks ?? "-"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(a.id)} disabled={deleteMut.isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New CCE Assessment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"><AlertCircle className="h-4 w-4 flex-shrink-0" />{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student *</Label>
                <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {allStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-muted-foreground text-xs">(Cl {s.class}{s.section})</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class *</Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Academic Year *</Label><Input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025-26" /></div>
              <div>
                <Label>Term *</Label>
                <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["T1","T2","T3","1","2","3"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Skill Area *</Label><Input value={form.skillArea} onChange={e => setForm(f => ({ ...f, skillArea: e.target.value }))} placeholder="e.g. Communication, Creativity" /></div>
            <div>
              <Label>CCE Grade *</Label>
              <Select value={form.grade} onValueChange={v => setForm(f => ({ ...f, grade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["A+","A","B+","B","C","D","E"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Remarks</Label><Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} maxLength={1000} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- STUDENT GRADES HISTORY TAB (grouped by class) ---

function ClassGradeSection({
  className,
  grades,
  itemMap,
}: {
  className: string;
  grades: StudentGradeResponse[];
  itemMap: Map<string, { className: string; subjectName: string }>;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            {className}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {grades.length} grade{grades.length !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Test / Assessment</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map(g => {
                const info = itemMap.get(g.gradeItemId);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.studentName ?? "-"}</TableCell>
                    <TableCell>{g.rollNumber ?? "-"}</TableCell>
                    <TableCell>{g.gradeItemName ?? "-"}</TableCell>
                    <TableCell>{info?.subjectName ?? "-"}</TableCell>
                    <TableCell>
                      {g.marksObtained}
                      {g.maxMarks ? (
                        <span className="text-muted-foreground text-xs"> / {g.maxMarks}</span>
                      ) : null}
                    </TableCell>
                    <TableCell><GradeBadge grade={g.grade} /></TableCell>
                    <TableCell><StatusBadge status={g.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

function StudentGradesHistoryTab() {
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["grades", "items-for-history"],
    queryFn: () => gradesApi.getGradeItems(undefined, undefined, 1, 200),
    staleTime: 60_000,
  });

  const { data: gradesData, isLoading: gradesLoading, refetch } = useQuery({
    queryKey: ["grades", "student-grades-history"],
    queryFn: () => gradesApi.getStudentGrades(undefined, undefined, 1, 500),
    staleTime: 20_000,
  });

  const itemMap = useMemo(() => {
    const map = new Map<string, { className: string; subjectName: string }>();
    (itemsData?.items ?? []).forEach(item => {
      map.set(item.id, {
        className: item.className ?? "Unknown Class",
        subjectName: item.subjectName ?? "",
      });
    });
    return map;
  }, [itemsData]);

  const gradesByClass = useMemo(() => {
    const grouped = new Map<string, StudentGradeResponse[]>();
    (gradesData?.studentGrades ?? []).forEach(g => {
      const info = itemMap.get(g.gradeItemId);
      const cn = info?.className ?? "Unassigned";
      if (!grouped.has(cn)) grouped.set(cn, []);
      grouped.get(cn)!.push(g);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [gradesData, itemMap]);

  const isLoading = itemsLoading || gradesLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const totalGrades = gradesData?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {totalGrades} grade{totalGrades !== 1 ? "s" : ""} recorded across {gradesByClass.length} class{gradesByClass.length !== 1 ? "es" : ""}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {gradesByClass.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No student grades recorded yet. Use the Exam Marks tab to record student marks.
          </CardContent>
        </Card>
      ) : (
        gradesByClass.map(([cn, grades]) => (
          <ClassGradeSection key={cn} className={cn} grades={grades} itemMap={itemMap} />
        ))
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---

export function GradeManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grade Management</h1>
        <p className="text-muted-foreground mt-1">
          Enter exam marks and view student grade history by class
        </p>
      </div>
      <StatsBar />
      <Tabs defaultValue="exam-marks">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="exam-marks">Exam Marks</TabsTrigger>
          <TabsTrigger value="student-grades">Student Grades</TabsTrigger>
        </TabsList>
        <TabsContent value="exam-marks" className="mt-4"><StaffExamMarksTab /></TabsContent>
        <TabsContent value="student-grades" className="mt-4"><StudentGradesHistoryTab /></TabsContent>
        {/* CCE tab is hidden but content is preserved */}
      </Tabs>
    </div>
  );
}
