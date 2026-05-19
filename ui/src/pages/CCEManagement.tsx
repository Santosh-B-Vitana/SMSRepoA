import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, GraduationCap, FileText, Settings, ClipboardList,
  Plus, Pencil, Trash2, Loader2, Wand2, Save, Info, ChevronDown, ChevronRight,
  Printer, RefreshCw, CheckCircle2, XCircle, Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  examinationApi,
  CoScholasticArea,
  CreateCoScholasticAreaDto,
  UpdateCoScholasticAreaDto,
  CO_SCHOLASTIC_CATEGORY_LABELS,
  ClassCoScholasticGrid,
  getCceExamSetups,
  getCceClassReport,
  type CceExamSetupOption,
  type CceClassReportDto,
  type CceStudentReport,
  getCbseGradeColor,
  CBSE_GRADE_SCALE,
} from "@/services/api/examinationApi";
import { academicApi } from "@/services/api/academicApi";
import type { ClassResponse, SectionResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

// ── CBSE grade scale A-E helper ──────────────────────────────────────────────
const CCE_GRADES = ["A", "B", "C", "D", "E"];
const CATEGORY_COLORS: Record<string, string> = {
  co_scholastic_activities: "bg-blue-50 text-blue-800 border-blue-200",
  attitudes_values: "bg-green-50 text-green-800 border-green-200",
  life_skills: "bg-purple-50 text-purple-800 border-purple-200",
  discipline: "bg-orange-50 text-orange-800 border-orange-200",
};

// ── Areas management tab ─────────────────────────────────────────────────────
function AreasTab() {
  const [areas, setAreas] = useState<CoScholasticArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CoScholasticArea | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoScholasticArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateCoScholasticAreaDto>({
    name: "", code: "", gradeScale: "A-E", category: "co_scholastic_activities",
  });
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    co_scholastic_activities: true, attitudes_values: true, life_skills: true, discipline: true,
  });

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    try { setAreas(await examinationApi.getCoScholasticAreas()); }
    catch { toast.error("Failed to load co-scholastic areas."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await examinationApi.seedCoScholasticAreas();
      toast.success(r.message);
      fetchAreas();
    } catch { toast.error("Seed failed."); }
    finally { setSeeding(false); }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", code: "", gradeScale: "A-E", category: "co_scholastic_activities" });
    setModalOpen(true);
  };

  const openEdit = (a: CoScholasticArea) => {
    setEditTarget(a);
    setForm({ name: a.name, code: a.code, gradeScale: a.gradeScale, category: a.category,
              description: a.description, applicableFromGrade: a.applicableFromGrade,
              applicableToGrade: a.applicableToGrade, displayOrder: a.displayOrder });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await examinationApi.updateCoScholasticArea(editTarget.id, form as UpdateCoScholasticAreaDto);
        toast.success("Area updated.");
      } else {
        await examinationApi.createCoScholasticArea(form);
        toast.success("Area created.");
      }
      setModalOpen(false);
      fetchAreas();
    } catch { toast.error("Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await examinationApi.deleteCoScholasticArea(deleteTarget.id);
      toast.success("Area deleted.");
      setDeleteTarget(null);
      fetchAreas();
    } catch { toast.error("Delete failed."); }
  };

  const byCategory = areas.reduce<Record<string, CoScholasticArea[]>>((acc, a) => {
    const cat = a.category || "co_scholastic_activities";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Define the areas evaluated on the CCE report card. Follows CBSE Part A–C structure.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Seed CBSE Defaults
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Area
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No co-scholastic areas configured yet.</p>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
              Seed CBSE Defaults
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(CO_SCHOLASTIC_CATEGORY_LABELS).map(([cat, label]) => {
            const items = byCategory[cat] || [];
            const colorClass = CATEGORY_COLORS[cat] || "";
            const open = openCategories[cat] !== false;
            return (
              <Card key={cat} className={`border ${colorClass.includes("blue") ? "border-blue-200" : colorClass.includes("green") ? "border-green-200" : colorClass.includes("purple") ? "border-purple-200" : "border-orange-200"}`}>
                <CardHeader
                  className="py-3 px-4 cursor-pointer select-none flex flex-row items-center justify-between"
                  onClick={() => setOpenCategories(p => ({ ...p, [cat]: !open }))}
                >
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className={`font-semibold text-sm px-2 py-0.5 rounded-full border ${colorClass}`}>{label}</span>
                    <Badge variant="secondary" className="ml-1">{items.length}</Badge>
                  </div>
                </CardHeader>
                {open && (
                  <CardContent className="px-4 pb-3 pt-0">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No areas in this category.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Grade Scale</TableHead>
                            <TableHead>Applicable Grades</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(a => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.name}</TableCell>
                              <TableCell><Badge variant="outline">{a.code}</Badge></TableCell>
                              <TableCell className="text-xs">{a.gradeScale}</TableCell>
                              <TableCell className="text-xs">
                                {a.applicableFromGrade && a.applicableToGrade
                                  ? `Grade ${a.applicableFromGrade}–${a.applicableToGrade}`
                                  : "All"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={a.isActive ? "default" : "secondary"}>
                                  {a.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(a)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Co-Scholastic Area" : "Add Co-Scholastic Area"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Work Education" />
              </div>
              <div className="space-y-1">
                <Label>Code</Label>
                <Input value={form.code || ""} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. WE" />
              </div>
              <div className="space-y-1">
                <Label>Grade Scale</Label>
                <Select value={form.gradeScale || "A-E"} onValueChange={v => setForm(p => ({ ...p, gradeScale: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A-E">A–E (5 levels)</SelectItem>
                    <SelectItem value="A1-E2">A1–E2 (CBSE 9-pt)</SelectItem>
                    <SelectItem value="O-F">Outstanding–Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Category</Label>
                <Select value={form.category || "co_scholastic_activities"} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CO_SCHOLASTIC_CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>From Grade</Label>
                <Input type="number" min={1} max={12} value={form.applicableFromGrade || ""} onChange={e => setForm(p => ({ ...p, applicableFromGrade: e.target.value ? +e.target.value : undefined }))} placeholder="1" />
              </div>
              <div className="space-y-1">
                <Label>To Grade</Label>
                <Input type="number" min={1} max={12} value={form.applicableToGrade || ""} onChange={e => setForm(p => ({ ...p, applicableToGrade: e.target.value ? +e.target.value : undefined }))} placeholder="12" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Input value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {editTarget ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Area</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <strong>{deleteTarget?.name}</strong>? This will soft-delete the area and hide it from future entries. Historical data is preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Class-level bulk entry tab ────────────────────────────────────────────────
function ClassEntryTab() {
  const { academicYear } = useAcademicYear();
  const [classes, setClasses] = useState<{ id: string; name: string; standard: string }[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [term, setTerm] = useState<number>(1);
  const [grid, setGrid] = useState<ClassCoScholasticGrid | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // local edits: studentId → areaId → grade
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    academicApi.listClasses(1, 200).then(r => {
      const seen = new Set<string>();
      setClasses(
        r.classes
          .filter((c: ClassResponse) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
          .map((c: ClassResponse) => ({ id: c.id, name: c.name || c.standard || `Class ${c.standard}`, standard: c.standard }))
      );
    }).catch(() => toast.error("Failed to load classes."));
  }, []);

  const fetchGrid = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setEdits({});
    try {
      const g = await examinationApi.getClassCoScholastic(classId, academicYear || undefined, term);
      setGrid(g);
    } catch { toast.error("Failed to load class data."); }
    finally { setLoading(false); }
  }, [classId, term, academicYear]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const handleGradeChange = (studentId: string, areaId: string, grade: string) => {
    setEdits(p => ({ ...p, [studentId]: { ...(p[studentId] || {}), [areaId]: grade } }));
  };

  const currentGrade = (studentId: string, areaId: string) => {
    if (edits[studentId]?.[areaId] !== undefined) return edits[studentId][areaId];
    return grid?.students.find(s => s.studentId === studentId)?.grades[areaId]?.grade || "";
  };

  const handleSaveAll = async () => {
    if (!grid) return;
    const entries = Object.entries(edits).flatMap(([studentId, areaMap]) =>
      Object.entries(areaMap).map(([areaId, grade]) => ({
        studentId,
        coScholasticAreaId: areaId,
        academicYear: grid.academicYear,
        term: grid.term,
        grade,
      }))
    );
    if (entries.length === 0) { toast.info("No changes to save."); return; }
    setSaving(true);
    try {
      await examinationApi.saveCoScholasticAssessments(entries);
      toast.success(`Saved ${entries.length} assessments.`);
      setEdits({});
      fetchGrid();
    } catch { toast.error("Save failed."); }
    finally { setSaving(false); }
  };

  const gradesByCat = grid
    ? Object.entries(CO_SCHOLASTIC_CATEGORY_LABELS).map(([cat, label]) => ({
        cat, label,
        areas: grid.areas.filter(a => (a.category || "co_scholastic_activities") === cat),
      })).filter(g => g.areas.length > 0)
    : [];

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Term</Label>
          <Select value={term.toString()} onValueChange={v => setTerm(+v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {grid && (
          <div className="ml-auto flex items-center gap-2">
            {hasEdits && (
              <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-50">
                {Object.values(edits).reduce((n, m) => n + Object.keys(m).length, 0)} unsaved changes
              </Badge>
            )}
            <Button onClick={handleSaveAll} disabled={saving || !hasEdits}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save All
            </Button>
          </div>
        )}
      </div>

      {!classId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-3" />
            Select a class to start entering co-scholastic grades.
          </CardContent>
        </Card>
      )}

      {classId && loading && (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {grid && !loading && (
        <>
          {grid.students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-3" />
                <p className="font-medium">No students enrolled in this class.</p>
                <p className="text-sm mt-1">Enroll students in the Academic Setup before entering co-scholastic grades.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                <span className="font-medium">Grade scale: A (Outstanding) → B (Good) → C (Satisfactory) → D (Needs Improvement) → E (Unsatisfactory)</span>
              </div>

          {/* Grouped tables */}
          {gradesByCat.map(({ cat, label, areas }) => (
            <Card key={cat} className="overflow-hidden">
              <CardHeader className={`py-2 px-4 ${CATEGORY_COLORS[cat] || ""}`}>
                <CardTitle className="text-sm font-semibold">{label}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 sticky left-0 bg-white">#</TableHead>
                      <TableHead className="w-48 sticky left-8 bg-white">Student</TableHead>
                      {areas.map(a => (
                        <TableHead key={a.id} className="min-w-[110px] text-center text-xs">{a.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grid.students.map((s, idx) => (
                      <TableRow key={s.studentId} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                        <TableCell className="sticky left-0 bg-inherit text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="sticky left-8 bg-inherit font-medium text-sm">{s.name}</TableCell>
                        {areas.map(a => {
                          const g = currentGrade(s.studentId, a.id);
                          const isDirty = edits[s.studentId]?.[a.id] !== undefined;
                          return (
                            <TableCell key={a.id} className="text-center p-1">
                              <Select value={g} onValueChange={v => handleGradeChange(s.studentId, a.id, v)}>
                                <SelectTrigger className={`h-8 text-xs w-20 mx-auto ${isDirty ? "border-amber-400 bg-amber-50" : ""}`}>
                                  <SelectValue placeholder="–" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CCE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── CCE Report Cards tab ─────────────────────────────────────────────────────

const CCE_ASSESSMENTS = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"] as const;
type AssessmentKey = (typeof CCE_ASSESSMENTS)[number];

const GRADE_BADGE: Record<string, string> = {
  A1: "bg-green-100 text-green-800", A2: "bg-green-100 text-green-800",
  B1: "bg-blue-100 text-blue-800",   B2: "bg-blue-100 text-blue-800",
  C1: "bg-yellow-100 text-yellow-800", C2: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E1: "bg-red-100 text-red-800", E2: "bg-red-100 text-red-800",
};

// ── Print-quality CBSE CCE report card ───────────────────────────────────────
function CCEReportCardPreview({
  student,
  report,
  schoolName = "School Name",
}: {
  student: CceStudentReport;
  report: CceClassReportDto;
  schoolName?: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>CCE Report Card – ${student.studentName}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; }
        h1 { text-align: center; font-size: 16px; margin: 0 0 4px; }
        h2 { text-align: center; font-size: 13px; margin: 0 0 2px; }
        .subtitle { text-align: center; font-size: 11px; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 4px 6px; }
        th { background: #e0e0e0; font-weight: bold; text-align: center; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .section-title { font-weight: bold; background: #d0d8e8; padding: 4px 6px; margin-top: 10px; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .footer-row { display: flex; justify-content: space-between; margin-top: 30px; }
        @media print { body { margin: 10mm; } }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const mappedKeys = Object.keys(report.examMappings) as AssessmentKey[];

  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="outline" onClick={handlePrint} className="self-end">
        <Printer className="h-4 w-4 mr-1.5" /> Print Report Card
      </Button>

      <div ref={printRef} className="text-xs">
        {/* Header */}
        <div className="text-center mb-4 border-b pb-3">
          <div className="text-lg font-bold uppercase tracking-wide">{schoolName}</div>
          <div className="text-sm font-semibold mt-1">CBSE Continuous &amp; Comprehensive Evaluation (CCE)</div>
          <div className="text-sm">Report Card – Academic Year: {report.academicYear}</div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-2 mb-4 border rounded p-3 bg-slate-50 text-xs">
          <div><span className="font-semibold">Student Name: </span>{student.studentName}</div>
          <div><span className="font-semibold">Class: </span>{report.className}{report.sectionName ? ` – ${report.sectionName}` : ""}</div>
          <div><span className="font-semibold">Admission No.: </span>{student.admissionNumber ?? "–"}</div>
          <div><span className="font-semibold">Roll No.: </span>{student.rollNumber ?? "–"}</div>
        </div>

        {/* Part A: Scholastic */}
        <div className="mb-4">
          <div className="font-bold text-sm mb-1 bg-blue-100 px-2 py-1 rounded">
            PART A: Scholastic Assessment
          </div>
          <p className="text-xs text-muted-foreground mb-2 italic">
            T1 (50) = FA1(10) + FA2(10) + SA1(30) &nbsp;|&nbsp; T2 (50) = FA3(10) + FA4(10) + SA2(30) &nbsp;|&nbsp; Annual = T1 + T2 (100)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-2 py-1 text-left">Subject</th>
                  {mappedKeys.map(k => <th key={k} className="border px-2 py-1">{k}</th>)}
                  <th className="border px-2 py-1">T1 (/50)</th>
                  <th className="border px-2 py-1">T2 (/50)</th>
                  <th className="border px-2 py-1">Annual (%)</th>
                  <th className="border px-2 py-1">Grade</th>
                  <th className="border px-2 py-1">GP</th>
                </tr>
              </thead>
              <tbody>
                {student.subjects.map(subj => (
                  <tr key={subj.subjectId} className="even:bg-slate-50">
                    <td className="border px-2 py-1 font-medium">{subj.subjectName}</td>
                    {mappedKeys.map(k => {
                      const a = subj.assessments[k];
                      return (
                        <td key={k} className="border px-2 py-1 text-center">
                          {a ? (a.isAbsent ? <span className="text-red-600">AB</span> : `${a.marks}/${a.maxMarks}`) : "–"}
                        </td>
                      );
                    })}
                    <td className="border px-2 py-1 text-center">{subj.term1WeightedScore}</td>
                    <td className="border px-2 py-1 text-center">{subj.term2WeightedScore}</td>
                    <td className="border px-2 py-1 text-center font-medium">{subj.annualPercentage}%</td>
                    <td className={`border px-2 py-1 text-center font-bold ${GRADE_BADGE[subj.grade] ?? ""}`}>{subj.grade}</td>
                    <td className="border px-2 py-1 text-center">{subj.gradePoint > 0 ? subj.gradePoint : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div className="flex gap-4 mt-2 text-sm font-semibold">
            <span>CGPA: <span className="text-blue-700">{student.cgpa}</span></span>
            <span>Overall Grade: <span className={`px-2 py-0.5 rounded text-xs font-bold ${GRADE_BADGE[student.overallGrade] ?? ""}`}>{student.overallGrade}</span></span>
            <span>Result: <span className={student.result === "Pass" ? "text-green-600" : "text-red-600"}>{student.result}</span></span>
          </div>
        </div>

        {/* Part B: Co-Scholastic */}
        {student.coScholastic.length > 0 && (
          <div className="mb-4">
            <div className="font-bold text-sm mb-1 bg-green-100 px-2 py-1 rounded">
              PART B: Co-Scholastic Assessment (Grade Scale: A–E)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-2 py-1 text-left">Area</th>
                    <th className="border px-2 py-1">Category</th>
                    <th className="border px-2 py-1">Term 1 Grade</th>
                    <th className="border px-2 py-1">Term 2 Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {student.coScholastic.map(cs => (
                    <tr key={cs.areaId} className="even:bg-slate-50">
                      <td className="border px-2 py-1 font-medium">{cs.areaName}</td>
                      <td className="border px-2 py-1 text-muted-foreground capitalize">
                        {cs.category?.replace(/_/g, " ") ?? "–"}
                      </td>
                      <td className="border px-2 py-1 text-center font-bold">{cs.term1Grade ?? "–"}</td>
                      <td className="border px-2 py-1 text-center font-bold">{cs.term2Grade ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CBSE grade scale reference */}
        <div className="mb-4">
          <div className="font-bold text-sm mb-1 bg-slate-100 px-2 py-1 rounded">Grade Scale Reference</div>
          <div className="flex flex-wrap gap-2 text-xs mt-1">
            {CBSE_GRADE_SCALE.map(g => (
              <span key={g.grade} className={`px-2 py-0.5 rounded border font-medium ${g.color}`}>
                {g.grade} ({g.label}) {g.gradePoint > 0 ? `GP:${g.gradePoint}` : "FAIL"}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-8 pt-4 border-t text-xs">
          <div className="text-center"><div className="border-t border-black w-32 mt-8 mb-1" /><div>Class Teacher's Signature</div></div>
          <div className="text-center"><div className="border-t border-black w-32 mt-8 mb-1" /><div>Principal's Signature</div></div>
          <div className="text-center"><div className="border-t border-black w-32 mt-8 mb-1" /><div>Parent's Signature</div></div>
        </div>
      </div>
    </div>
  );
}

// ── Main Report Cards tab ─────────────────────────────────────────────────────
function CCEReportCardsTab() {
  const { academicYear } = useAcademicYear();

  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [sectionId, setSectionId] = useState<string>("");

  const [examSetups, setExamSetups] = useState<CceExamSetupOption[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<AssessmentKey, string>>>({});

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CceClassReportDto | null>(null);
  const [previewStudent, setPreviewStudent] = useState<CceStudentReport | null>(null);

  // Load classes on mount — de-duplicate by id (API returns one entry per section)
  useEffect(() => {
    academicApi.listClasses(1, 200).then(r => {
      const seen = new Set<string>();
      setClasses(
        (r.classes ?? []).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
      );
    }).catch(() => {});
  }, []);

  // Load sections when class changes
  useEffect(() => {
    setSectionId("");
    setSections([]);
    setExamSetups([]);
    setMapping({});
    setReport(null);
    if (!classId) return;
    academicApi.listSections(classId, 1, 50).then(r => setSections(r.sections ?? [])).catch(() => {});
  }, [classId]);

  // Load exam setups when class or year changes
  useEffect(() => {
    setMapping({});
    setReport(null);
    if (!classId) return;
    getCceExamSetups(classId, academicYear || undefined, sectionId || undefined)
      .then(data => {
        setExamSetups(data);
        // Auto-detect mapping by exam name containing FA1, FA2, SA1, FA3, FA4, SA2
        const autoMap: Partial<Record<AssessmentKey, string>> = {};
        for (const key of CCE_ASSESSMENTS) {
          const match = data.find(e => e.name.toUpperCase().includes(key));
          if (match) autoMap[key] = match.id;
        }
        setMapping(autoMap);
      })
      .catch(() => toast.error("Failed to load exam setups for this class."));
  }, [classId, sectionId, academicYear]);

  const handleGenerate = async () => {
    if (!classId) { toast.error("Please select a class."); return; }
    setLoading(true);
    setReport(null);
    try {
      const data = await getCceClassReport({
        classId,
        academicYear: academicYear || undefined,
        sectionId: sectionId || undefined,
        fa1ExamId: mapping.FA1,
        fa2ExamId: mapping.FA2,
        sa1ExamId: mapping.SA1,
        fa3ExamId: mapping.FA3,
        fa4ExamId: mapping.FA4,
        sa2ExamId: mapping.SA2,
      });
      setReport(data);
      if (data.students.length === 0) toast.info("No students found for this class.");
    } catch {
      toast.error("Failed to generate report cards.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate CCE Report Cards</CardTitle>
          <CardDescription>
            Select the class, map FA1/FA2/SA1/FA3/FA4/SA2 to your existing exam setups, then click Generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Class / Section row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select class…" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name || c.standard}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {sections.length > 0 && (
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <Label>Section (optional)</Label>
                <Select value={sectionId || "__all__"} onValueChange={v => setSectionId(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All sections</SelectItem>
                    {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <Label>Academic Year</Label>
              <Input value={academicYear || "–"} readOnly className="w-[160px] bg-muted" />
            </div>
          </div>

          {/* Exam mapping */}
          {classId && examSetups.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-2">Map Exam Setups to CCE Assessments</p>
                <p className="text-xs text-muted-foreground mb-3">
                  CBSE CCE formula: T1 = FA1(10%) + FA2(10%) + SA1(30%) &nbsp;|&nbsp; T2 = FA3(10%) + FA4(10%) + SA2(30%)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CCE_ASSESSMENTS.map(key => (
                    <div key={key} className="flex flex-col gap-1">
                      <Label className="text-xs font-semibold">{key}</Label>
                      <Select
                        value={mapping[key] ?? "__none__"}
                        onValueChange={v => setMapping(prev => ({ ...prev, [key]: v === "__none__" ? undefined : v }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Not mapped" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not mapped</SelectItem>
                          {examSetups.map(e => (
                            <SelectItem key={e.id} value={e.id} className="text-xs">
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {classId && examSetups.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No exam setups found for this class and year. Create exam setups in the Exam Setup section first.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={loading || !classId} className="min-w-[140px]">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {loading ? "Generating…" : "Generate Report Cards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Students", value: report.students.length, icon: GraduationCap, color: "text-blue-600" },
            { label: "Pass", value: report.passCount, icon: CheckCircle2, color: "text-green-600" },
            { label: "Fail", value: report.failCount, icon: XCircle, color: "text-red-600" },
            { label: "Avg CGPA", value: report.avgCgpa.toFixed(2), icon: Award, color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="text-center py-3">
              <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Student list */}
      {report && report.students.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {report.className}{report.sectionName ? ` – ${report.sectionName}` : ""} — {report.academicYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Adm. No.</TableHead>
                  {report.students[0]?.subjects.map(s => (
                    <TableHead key={s.subjectId} className="text-center text-xs">{s.subjectName}</TableHead>
                  ))}
                  <TableHead className="text-center">CGPA</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="text-center">Report Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.students.map((s, idx) => (
                  <TableRow key={s.studentId} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{s.studentName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.admissionNumber ?? "–"}</TableCell>
                    {s.subjects.map(subj => (
                      <TableCell key={subj.subjectId} className="text-center">
                        <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${GRADE_BADGE[subj.grade] ?? "bg-muted"}`}>
                          {subj.grade}
                        </span>
                        <div className="text-xs text-muted-foreground">{subj.annualPercentage}%</div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-blue-700">{s.cgpa}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${GRADE_BADGE[s.overallGrade] ?? ""}`}>
                        {s.overallGrade}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-bold ${s.result === "Pass" ? "text-green-600" : "text-red-600"}`}>
                        {s.result}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreviewStudent(s)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report card preview dialog */}
      {previewStudent && report && (
        <Dialog open onOpenChange={() => setPreviewStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CCE Report Card — {previewStudent.studentName}</DialogTitle>
            </DialogHeader>
            <CCEReportCardPreview
              student={previewStudent}
              report={report}
              schoolName="Your School Name"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewStudent(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── CCE tab (embedded inside Examinations page) ──────────────────────────────
export function CCETab() {
  return (
    <Tabs defaultValue="areas" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="areas">
          <Settings className="h-4 w-4 mr-1.5" /> Area Setup
        </TabsTrigger>
        <TabsTrigger value="entry">
          <ClipboardList className="h-4 w-4 mr-1.5" /> Class Grade Entry
        </TabsTrigger>
        <TabsTrigger value="reportcards">
          <FileText className="h-4 w-4 mr-1.5" /> CCE Report Cards
        </TabsTrigger>
      </TabsList>

      <TabsContent value="areas" className="pt-4">
        <AreasTab />
      </TabsContent>

      <TabsContent value="entry" className="pt-4">
        <ClassEntryTab />
      </TabsContent>

      <TabsContent value="reportcards" className="pt-4">
        <CCEReportCardsTab />
      </TabsContent>
    </Tabs>
  );
}
