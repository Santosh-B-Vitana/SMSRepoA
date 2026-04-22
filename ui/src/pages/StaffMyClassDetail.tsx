/**
 * StaffMyClassDetail — Class management hub for teachers
 *
 * Route: /staff-class/:assignmentId
 *
 * Tabs:
 *   • Students  — roster of students enrolled in this class/section
 *   • Assignments — CRUD class assignments + view/grade submissions
 *   • Marks      — create grade items (tests/exams) and enter per-student marks
 *   • Attendance — (class teachers only) date-based bulk attendance entry
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  ArrowLeft,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserX,
  Clock,
  Save,
  BadgeCheck,
  FileText,
  ChevronRight,
  Edit,
  RefreshCw,
  Award,
} from "lucide-react";

import { toast } from "sonner";

// Services
import { academicApi, type MyClassAssignment, type ClassSubjectResponse } from "@/services/api/academicApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { attendanceApi, type AttendanceRecordBasic, type MarkAttendanceDto } from "@/services/api/attendanceApi";
import assignmentApi, {
  type AssignmentResponse,
  type CreateAssignmentPayload,
  type GradeItemResponse,
  type CreateGradeItemPayload,
  type StudentGradeResponse,
  type CreateStudentGradePayload,
  type SubmissionResponse,
  type GradeCategoryResponse,
} from "@/services/api/assignmentApi";
import { useAuth } from "@/contexts/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceEntry {
  status: AttendanceStatus;
  remarks: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusColor(status: AttendanceStatus) {
  switch (status) {
    case "present": return "bg-green-500 text-white hover:bg-green-600";
    case "absent":  return "bg-red-500 text-white hover:bg-red-600";
    case "late":    return "bg-amber-500 text-white hover:bg-amber-600";
    case "excused": return "bg-blue-500 text-white hover:bg-blue-600";
  }
}

function statusIcon(status: AttendanceStatus) {
  switch (status) {
    case "present": return <UserCheck className="h-3.5 w-3.5" />;
    case "absent":  return <UserX className="h-3.5 w-3.5" />;
    case "late":    return <Clock className="h-3.5 w-3.5" />;
    case "excused": return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

function deriveGrade(obtained: number, max: number): string {
  if (max === 0) return "N/A";
  const pct = (obtained / max) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Students Tab
// ─────────────────────────────────────────────────────────────────────────────

function StudentsTab({ students, loading }: { students: StudentBasic[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner text="Loading students…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, admission no. or roll no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{filtered.length} students</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} text="No students found" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student, idx) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{student.admissionNumber}</TableCell>
                  <TableCell>{student.rollNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant={student.status === "active" ? "default" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Assignments Tab
// ─────────────────────────────────────────────────────────────────────────────

interface AssignmentsTabProps {
  assignment: MyClassAssignment;
  subjects: ClassSubjectResponse[];
  userId: string;
}

function AssignmentsTab({ assignment, subjects, userId }: AssignmentsTabProps) {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [form, setForm] = useState<CreateAssignmentPayload>({
    classId: assignment.classId,
    sectionId: assignment.sectionId,
    subjectId: "",
    title: "",
    description: "",
    assignedDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    maxMarks: 100,
    status: "active",
  });

  const loadAssignments = useCallback(() => {
    setLoading(true);
    assignmentApi
      .getAssignments(assignment.classId, undefined, 1, 100)
      .then((res) => setAssignments(res.assignments ?? []))
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoading(false));
  }, [assignment.classId]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const loadSubmissions = (a: AssignmentResponse) => {
    setSelectedAssignment(a);
    setSubmissionsLoading(true);
    assignmentApi
      .getSubmissions(a.id)
      .then((res) => setSubmissions(res.submissions ?? []))
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setSubmissionsLoading(false));
  };

  const handleCreate = async () => {
    if (!form.subjectId) return toast.error("Please select a subject");
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.dueDate) return toast.error("Due date is required");
    if (new Date(form.dueDate) <= new Date(form.assignedDate))
      return toast.error("Due date must be after the assigned date");

    setCreating(true);
    try {
      await assignmentApi.createAssignment(form);
      toast.success("Assignment created");
      setDialogOpen(false);
      setForm({ ...form, title: "", description: "", dueDate: "", subjectId: "" });
      loadAssignments();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create assignment";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const subjectName = (subjectId: string) =>
    subjects.find((s) => s.subjectId === subjectId)?.subjectName ?? subjectId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} for this class
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Assignment
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading assignments…" />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          text="No assignments yet"
          subText="Create your first assignment using the button above"
        />
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{a.title}</p>
                      <Badge
                        variant={
                          a.status === "active"
                            ? "default"
                            : a.status === "overdue"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs capitalize flex-shrink-0"
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {a.description}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Subject: {subjectName(a.subjectId)}</span>
                      <span>Max Marks: {a.maxMarks}</span>
                      <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => loadSubmissions(a)}
                  >
                    Submissions <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submissions drawer */}
      {selectedAssignment && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Submissions — {selectedAssignment.title}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <LoadingSpinner text="Loading submissions…" />
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs">{sub.studentId.slice(0, 8)}…</TableCell>
                      <TableCell>{new Date(sub.submissionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {sub.marksObtained != null
                          ? `${sub.marksObtained} / ${selectedAssignment.maxMarks}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">{sub.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.feedback ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm({ ...form, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Chapter 4 — Quadratic Equations"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Instructions and details for students…"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assigned Date *</Label>
                <Input
                  type="date"
                  value={form.assignedDate}
                  onChange={(e) => setForm({ ...form, assignedDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Marks</Label>
              <Input
                type="number"
                min={1}
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Marks Tab
// ─────────────────────────────────────────────────────────────────────────────

interface MarksTabProps {
  assignment: MyClassAssignment;
  students: StudentBasic[];
  subjects: ClassSubjectResponse[];
  categories: GradeCategoryResponse[];
  userId: string;
}

function MarksTab({ assignment, students, subjects, categories, userId }: MarksTabProps) {
  const [gradeItems, setGradeItems] = useState<GradeItemResponse[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GradeItemResponse | null>(null);
  const [marksMap, setMarksMap] = useState<Record<string, { id?: string; value: string; remarks: string }>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);

  const [itemForm, setItemForm] = useState<CreateGradeItemPayload>({
    classId: assignment.classId,
    sectionId: assignment.sectionId,
    subjectId: "",
    categoryId: "",
    name: "",
    maxMarks: 100,
    date: new Date().toISOString().split("T")[0],
    status: "active",
  });

  const loadGradeItems = useCallback(() => {
    setLoadingItems(true);
    assignmentApi
      .getGradeItems(assignment.classId)
      .then((res) => setGradeItems(res.items ?? []))
      .catch(() => toast.error("Failed to load grade items"))
      .finally(() => setLoadingItems(false));
  }, [assignment.classId]);

  useEffect(() => { loadGradeItems(); }, [loadGradeItems]);

  const selectGradeItem = (item: GradeItemResponse) => {
    setSelectedItem(item);
    setLoadingMarks(true);
    // Initialise marks map with empty values
    const init: Record<string, { id?: string; value: string; remarks: string }> = {};
    students.forEach((s) => {
      init[s.id] = { value: "", remarks: "" };
    });
    assignmentApi
      .getStudentGrades(item.id, undefined, 1, 500)
      .then((res) => {
        const grades = res.grades ?? [];
        grades.forEach((g) => {
          init[g.studentId] = {
            id: g.id,
            value: String(g.marksObtained),
            remarks: g.remarks ?? "",
          };
        });
        setMarksMap(init);
      })
      .catch(() => {
        setMarksMap(init);
        toast.error("Failed to load existing marks");
      })
      .finally(() => setLoadingMarks(false));
  };

  const handleSaveMarks = async () => {
    if (!selectedItem) return;
    const entries = Object.entries(marksMap).filter(([, v]) => v.value !== "");
    if (entries.length === 0) return toast.error("Enter marks for at least one student");

    setSavingMarks(true);
    let saved = 0;
    let failed = 0;

    for (const [studentId, entry] of entries) {
      const marks = parseFloat(entry.value);
      if (isNaN(marks) || marks < 0 || marks > selectedItem.maxMarks) {
        toast.error(`Invalid marks for student — must be 0–${selectedItem.maxMarks}`);
        failed++;
        continue;
      }

      try {
        if (entry.id) {
          await assignmentApi.updateStudentGrade(entry.id, {
            marksObtained: marks,
            grade: deriveGrade(marks, selectedItem.maxMarks),
            remarks: entry.remarks || undefined,
          });
        } else {
          const payload: CreateStudentGradePayload = {
            gradeItemId: selectedItem.id,
            studentId,
            marksObtained: marks,
            grade: deriveGrade(marks, selectedItem.maxMarks),
            remarks: entry.remarks || undefined,
            status: "published",
          };
          const created = await assignmentApi.createStudentGrade(payload);
          setMarksMap((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], id: created.id },
          }));
        }
        saved++;
      } catch {
        failed++;
      }
    }

    setSavingMarks(false);
    if (failed > 0) {
      toast.error(`${failed} record(s) failed to save`);
    }
    if (saved > 0) {
      toast.success(`${saved} mark(s) saved successfully`);
    }
  };

  const handleCreateItem = async () => {
    if (!itemForm.subjectId) return toast.error("Select a subject");
    if (!itemForm.categoryId) return toast.error("Select a category");
    if (!itemForm.name.trim()) return toast.error("Name is required");
    if (itemForm.maxMarks <= 0) return toast.error("Max marks must be greater than 0");

    setCreatingItem(true);
    try {
      await assignmentApi.createGradeItem(itemForm);
      toast.success("Grade item created");
      setCreateItemOpen(false);
      setItemForm({ ...itemForm, name: "", subjectId: "", categoryId: "" });
      loadGradeItems();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create grade item";
      toast.error(msg);
    } finally {
      setCreatingItem(false);
    }
  };

  const subjectName = (id: string) =>
    subjects.find((s) => s.subjectId === id)?.subjectName ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select a test or exam to enter marks
        </p>
        <Button size="sm" onClick={() => setCreateItemOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Grade Item
        </Button>
      </div>

      {loadingItems ? (
        <LoadingSpinner text="Loading grade items…" />
      ) : gradeItems.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          text="No grade items yet"
          subText="Create a grade item (e.g. Unit Test 1) to start entering marks"
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {gradeItems.map((item) => (
            <button
              key={item.id}
              onClick={() => selectGradeItem(item)}
              className={`text-left p-4 rounded-lg border transition-all ${
                selectedItem?.id === item.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subjectName(item.subjectId)} · Max: {item.maxMarks} ·{" "}
                {new Date(item.date).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Marks entry table */}
      {selectedItem && (
        <Card className="mt-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {selectedItem.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subjectName(selectedItem.subjectId)} · Max marks: {selectedItem.maxMarks} ·{" "}
                {new Date(selectedItem.date).toLocaleDateString()}
              </p>
            </div>
            <Button size="sm" onClick={handleSaveMarks} disabled={savingMarks || loadingMarks}>
              {savingMarks ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save Marks
            </Button>
          </CardHeader>
          <CardContent>
            {loadingMarks ? (
              <LoadingSpinner text="Loading marks…" />
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No students in this class
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-32">Marks (/{selectedItem.maxMarks})</TableHead>
                    <TableHead className="w-16">Grade</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, idx) => {
                    const entry = marksMap[s.id] ?? { value: "", remarks: "" };
                    const numVal = parseFloat(entry.value);
                    const derivedGrade =
                      entry.value !== "" && !isNaN(numVal)
                        ? deriveGrade(numVal, selectedItem.maxMarks)
                        : "—";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.rollNumber}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={selectedItem.maxMarks}
                            step={0.5}
                            className="h-8 w-24 text-sm"
                            placeholder="—"
                            value={entry.value}
                            onChange={(e) =>
                              setMarksMap((prev) => ({
                                ...prev,
                                [s.id]: { ...prev[s.id], value: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-bold ${
                              derivedGrade === "F"
                                ? "text-red-500"
                                : derivedGrade.startsWith("A")
                                ? "text-green-600"
                                : "text-amber-600"
                            }`}
                          >
                            {derivedGrade}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-sm"
                            placeholder="Optional remarks"
                            value={entry.remarks}
                            onChange={(e) =>
                              setMarksMap((prev) => ({
                                ...prev,
                                [s.id]: { ...prev[s.id], remarks: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Grade Item Dialog */}
      <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Grade Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Unit Test 1, Mid-Term Exam"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={itemForm.subjectId}
                onValueChange={(v) => setItemForm({ ...itemForm, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={itemForm.categoryId}
                onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600">
                  No grade categories found. Ask your admin to create categories first.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max Marks *</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemForm.maxMarks}
                  onChange={(e) => setItemForm({ ...itemForm, maxMarks: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={itemForm.date}
                  onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateItemOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem} disabled={creatingItem}>
              {creatingItem && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Attendance tab removed from My Classes detail page
// Attendance is now managed only in the dedicated "Attendance" menu item (StaffAttendanceTeacher.tsx)
// This eliminates duplication and provides better UX with focused attendance management interface

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  subText,
}: {
  icon: React.ReactNode;
  text: string;
  subText?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
        {subText && <p className="text-xs text-muted-foreground">{subText}</p>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffMyClassDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<MyClassAssignment | null>(null);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [subjects, setSubjects] = useState<ClassSubjectResponse[]>([]);
  const [categories, setCategories] = useState<GradeCategoryResponse[]>([]);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState("students");

  // Load teacher's assignments and find this one
  useEffect(() => {
    if (!assignmentId) return;
    academicApi
      .getMyClassAssignments()
      .then((data) => {
        const found = data.find((a) => a.assignmentId === assignmentId) ?? null;
        setAssignment(found);
      })
      .catch(() => toast.error("Failed to load class assignment"))
      .finally(() => setLoadingAssignment(false));
  }, [assignmentId]);

  // Once assignment is found, load students + subjects + grade categories in parallel
  useEffect(() => {
    if (!assignment) return;
    setLoadingStudents(true);

    const studentsPromise = studentApi
      .list({ classFilter: assignment.className, pageSize: 300 })
      .then((res) => {
        let list = res.students ?? [];
        if (assignment.sectionName) {
          list = list.filter(
            (s) =>
              s.section?.toLowerCase() === assignment.sectionName?.toLowerCase()
          );
        }
        setStudents(list);
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));

    const subjectsPromise = academicApi
      .getClassSubjects(assignment.classId)
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => {/* silently skip — subjects may not exist */});

    const categoriesPromise = assignmentApi
      .getGradeCategories()
      .then((res) => setCategories(res.categories ?? []))
      .catch(() => {/* silently skip — categories may not exist */});

    return () => { void studentsPromise; void subjectsPromise; void categoriesPromise; };
  }, [assignment]);

  // ── Loading state ──
  if (loadingAssignment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading class…</p>
        </div>
      </div>
    );
  }

  // ── Assignment not found ──
  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Class assignment not found or you do not have access.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/my-classes")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Classes
        </Button>
      </div>
    );
  }

  const classLabel = assignment.sectionName
    ? `${assignment.className} — ${assignment.sectionName}`
    : assignment.className;

  const tabs = [
    { id: "students",    label: "Students",    icon: <Users className="h-4 w-4" /> },
    { id: "assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
    { id: "marks",       label: "Marks",       icon: <GraduationCap className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/my-classes")}
          className="flex-shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          My Classes
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold">{classLabel}</h1>
            {assignment.isClassTeacher && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Class Teacher
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Academic Year: {assignment.academicYear} ·{" "}
            {loadingStudents ? "loading…" : `${students.length} students`}
          </p>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 data-[state=active]:bg-background"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="students">
          <StudentsTab students={students} loading={loadingStudents} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab
            assignment={assignment}
            subjects={subjects}
            userId={user?.id ?? ""}
          />
        </TabsContent>

        <TabsContent value="marks">
          <MarksTab
            assignment={assignment}
            students={students}
            subjects={subjects}
            categories={categories}
            userId={user?.id ?? ""}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
