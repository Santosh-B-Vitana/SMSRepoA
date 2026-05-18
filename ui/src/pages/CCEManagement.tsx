import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BookOpen, GraduationCap, FileText, Settings, ClipboardList,
  Plus, Pencil, Trash2, Loader2, Wand2, Save, Info, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  examinationApi,
  CoScholasticArea,
  CreateCoScholasticAreaDto,
  UpdateCoScholasticAreaDto,
  CO_SCHOLASTIC_CATEGORY_LABELS,
  ClassCoScholasticGrid,
} from "@/services/api/examinationApi";
import { academicApi } from "@/services/api/academicApi";
import type { ClassResponse } from "@/services/api/academicApi";
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
      setClasses(r.classes.map((c: ClassResponse) => ({ id: c.id, name: c.name || `Grade ${c.standard}`, standard: c.standard })));
    }).catch(() => toast.error("Failed to load classes."));
  }, []);

  const fetchGrid = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setEdits({});
    try {
      const g = await examinationApi.getClassCoScholastic(classId, academicYear?.name, term);
      setGrid(g);
    } catch { toast.error("Failed to load class data."); }
    finally { setLoading(false); }
  }, [classId, term, academicYear?.name]);

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

// ── CCE tab (embedded inside Examinations page) ──────────────────────────────
export function CCETab() {
  return (
    <Tabs defaultValue="areas" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="areas">
          <Settings className="h-4 w-4 mr-1.5" /> Area Setup
        </TabsTrigger>
        <TabsTrigger value="entry">
          <ClipboardList className="h-4 w-4 mr-1.5" /> Class Grade Entry
        </TabsTrigger>
      </TabsList>

      <TabsContent value="areas" className="pt-4">
        <AreasTab />
      </TabsContent>

      <TabsContent value="entry" className="pt-4">
        <ClassEntryTab />
      </TabsContent>
    </Tabs>
  );
}
