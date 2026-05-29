import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, Pencil, Trash2, Loader2, CalendarDays, AlertCircle } from "lucide-react";
import {
  syllabusApi,
  SyllabusUnit,
  SyllabusTopic,
  LessonPlan,
  CreateSyllabusUnitDto,
  CreateTopicDto,
  CreateLessonPlanDto,
  MarkTopicCompleteDto,
} from "@/services/api/syllabusApi";
import { academicApi, ClassBasic, ClassSubjectResponse } from "@/services/api/academicApi";
import { usePermissions } from "@/contexts/PermissionsContext";

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const YEAR_OPTIONS = [CURRENT_YEAR, `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`];

// ─── Unit Form Dialog ─────────────────────────────────────────────────────────

function UnitFormDialog({
  unit, classId, subjectId, academicYear, onClose, onSaved,
}: {
  unit?: SyllabusUnit;
  classId: string;
  subjectId: string;
  academicYear: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateSyllabusUnitDto>({
    classId,
    subjectId,
    academicYear,
    unitNumber: unit?.unitNumber ?? 1,
    title: unit?.title ?? "",
    description: unit?.description ?? "",
    plannedHours: unit?.plannedHours ?? 10,
    plannedStartDate: unit?.plannedStartDate ?? "",
    plannedEndDate: unit?.plannedEndDate ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: keyof CreateSyllabusUnitDto, v: string | number) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Unit title is required"); return; }
    setSaving(true);
    try {
      if (unit) {
        await syllabusApi.updateUnit(unit.id, form);
        toast.success("Unit updated");
      } else {
        await syllabusApi.createUnit(form);
        toast.success("Unit created");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save unit");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{unit ? "Edit Unit" : "Add Syllabus Unit"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Unit Number</Label>
              <Input type="number" min={1} value={form.unitNumber} onChange={e => set("unitNumber", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Planned Hours</Label>
              <Input type="number" min={1} value={form.plannedHours ?? 10} onChange={e => set("plannedHours", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Unit Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g., Number System" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Planned Start Date</Label>
              <Input type="date" value={form.plannedStartDate ?? ""} onChange={e => set("plannedStartDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Planned End Date</Label>
              <Input type="date" value={form.plannedEndDate ?? ""} onChange={e => set("plannedEndDate", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{unit ? "Update" : "Add Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Topic Form Dialog ────────────────────────────────────────────────────────

function TopicFormDialog({ unitId, onClose, onSaved }: { unitId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateTopicDto>({ unitId, topicNumber: 1, title: "", description: "", durationMinutes: 40 });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Topic title is required"); return; }
    setSaving(true);
    try {
      await syllabusApi.createTopic(form);
      toast.success("Topic added");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add topic");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Topic</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Natural Numbers" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Topic Number</Label>
              <Input type="number" min={1} value={form.topicNumber} onChange={e => setForm(p => ({ ...p, topicNumber: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} value={form.durationMinutes ?? 40} onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Add Topic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Complete Dialog ─────────────────────────────────────────────────────

function MarkCompleteDialog({ topic, onClose, onSaved }: { topic: SyllabusTopic; onClose: () => void; onSaved: () => void }) {
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await syllabusApi.markTopicComplete(topic.id, { completedDate, remarks });
      toast.success("Topic marked as completed");
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Mark Topic Complete</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium">{topic.title}</p>
          <div className="space-y-1.5">
            <Label>Completion Date</Label>
            <Input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Optional remarks…" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Mark Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lesson Plan Form Dialog ──────────────────────────────────────────────────

function LessonPlanFormDialog({
  plan, classId, subjectId, onClose, onSaved,
}: {
  plan?: LessonPlan;
  classId: string;
  subjectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateLessonPlanDto>({
    classId,
    subjectId,
    date: plan?.date ? plan.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    periodNumber: plan?.periodNumber ?? 1,
    title: plan?.title ?? "",
    learningObjectives: plan?.learningObjectives ?? "",
    teachingMethods: plan?.teachingMethods ?? "",
    resources: plan?.resources ?? "",
    homework: plan?.homework ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: keyof CreateLessonPlanDto, v: string | number) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Plan title is required"); return; }
    setSaving(true);
    try {
      // Ensure date is sent as full ISO string so ASP.NET Core DateTime binding never fails
      const payload = { ...form, date: form.date ? form.date + 'T00:00:00' : new Date().toISOString() };
      if (plan) {
        await syllabusApi.updateLessonPlan(plan.id, payload);
        toast.success("Lesson plan updated");
      } else {
        await syllabusApi.createLessonPlan(payload);
        toast.success("Lesson plan created");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      const data = (err as any)?.response?.data;
      const msg = data?.message ?? data?.errors?.[0] ?? (err instanceof Error ? err.message : "Failed to save lesson plan");
      toast.error(msg);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan ? "Edit Lesson Plan" : "Add Lesson Plan"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan Title *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g., Introduction to Algebra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period Number</Label>
              <Input type="number" min={1} value={form.periodNumber ?? 1} onChange={e => set("periodNumber", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Learning Objectives</Label>
            <Textarea value={form.learningObjectives ?? ""} onChange={e => set("learningObjectives", e.target.value)} rows={3} placeholder="Students will be able to…" />
          </div>
          <div className="space-y-1.5">
            <Label>Teaching Methods</Label>
            <Input value={form.teachingMethods ?? ""} onChange={e => set("teachingMethods", e.target.value)} placeholder="Lecture, group discussion…" />
          </div>
          <div className="space-y-1.5">
            <Label>Resources</Label>
            <Input value={form.resources ?? ""} onChange={e => set("resources", e.target.value)} placeholder="Textbook p.45, whiteboard…" />
          </div>
          <div className="space-y-1.5">
            <Label>Homework</Label>
            <Input value={form.homework ?? ""} onChange={e => set("homework", e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{plan ? "Update" : "Add Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unit Row ─────────────────────────────────────────────────────────────────

function UnitRow({
  unit, canEdit, onEdit, onDelete, onAddTopic, onMarkComplete, onReload,
}: {
  unit: SyllabusUnit;
  canEdit: boolean;
  onEdit: (u: SyllabusUnit) => void;
  onDelete: (id: string) => void;
  onAddTopic: (unitId: string) => void;
  onMarkComplete: (topic: SyllabusTopic) => void;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Compute completion from the loaded topics list (always accurate, even if
  // the backend counter columns are stale from a prior session).
  const totalTopics = unit.topics.length;
  const completedTopics = unit.topics.filter(t => t.status === 'completed').length;
  const inProgressTopics = unit.topics.filter(t => t.status === 'in_progress').length;
  const pct = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);
  const isComplete = totalTopics > 0 && completedTopics === totalTopics;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg mb-3 overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 bg-card">
            {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Unit {unit.unitNumber}</span>
                <span className="font-semibold truncate">{unit.title}</span>
                <Badge variant="outline" className="text-xs">{unit.plannedHours ?? 0} hrs</Badge>
                {isComplete && <Badge className="text-xs bg-green-600">Complete</Badge>}
                {!isComplete && inProgressTopics > 0 && <Badge variant="secondary" className="text-xs">In Progress</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {totalTopics === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No topics added yet</span>
                ) : (
                  <>
                    <Progress value={pct} className="h-1.5 w-40" />
                    <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                    <span className="text-xs text-muted-foreground">{completedTopics}/{totalTopics} topics done</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => onAddTopic(unit.id)}><Plus className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(unit)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(unit.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {unit.topics.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
              No topics yet.{canEdit && <button className="ml-2 text-primary underline underline-offset-2" onClick={() => onAddTopic(unit.id)}>Add topic</button>}
            </div>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {unit.topics.map(topic => (
                <div key={topic.id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                  {topic.status === 'completed'
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${topic.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{topic.title}</p>
                    {topic.status === 'completed' && topic.completedDate && (
                      <p className="text-xs text-muted-foreground">Completed {new Date(topic.completedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{topic.durationMinutes ?? 0}min</span>
                  {canEdit && topic.status !== 'completed' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onMarkComplete(topic)}>
                      <CheckCircle2 className="h-3 w-3" />Mark Done
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SyllabusManager() {
  const { hasUserPermission } = usePermissions();
  const canEdit = hasUserPermission('Academics', 'Edit') || hasUserPermission('Academics', 'Create');

  const [classes, setClasses] = useState<ClassBasic[]>([]);
  const [subjects, setSubjects] = useState<ClassSubjectResponse[]>([]);
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [tab, setTab] = useState("units");

  const [unitsLoading, setUnitsLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editUnit, setEditUnit] = useState<SyllabusUnit | undefined>();
  const [addTopicUnitId, setAddTopicUnitId] = useState<string | null>(null);
  const [markCompleteTopic, setMarkCompleteTopic] = useState<SyllabusTopic | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editPlan, setEditPlan] = useState<LessonPlan | undefined>();

  // Load classes on mount
  useEffect(() => {
    academicApi.listClasses(1, 200).then(r => setClasses(r.classes ?? [])).catch(() => {});
  }, []);

  // When class changes, load subjects for that class
  useEffect(() => {
    setSelectedSubjectId("");
    setSubjects([]);
    if (!selectedClassId) return;
    academicApi.getClassSubjects(selectedClassId)
      .then(subs => setSubjects(subs))
      .catch(() => {});
  }, [selectedClassId]);

  const loadUnits = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setUnitsLoading(true);
    try {
      const r = await syllabusApi.getUnits(selectedClassId, selectedSubjectId, selectedYear);
      setUnits(Array.isArray(r) ? r : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally { setUnitsLoading(false); }
  }, [selectedClassId, selectedSubjectId, selectedYear]);

  const loadLessonPlans = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setPlansLoading(true);
    try {
      const r = await syllabusApi.getLessonPlans(selectedClassId, selectedSubjectId);
      setLessonPlans(r.plans ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load lesson plans");
    } finally { setPlansLoading(false); }
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      if (tab === "units") loadUnits();
      else if (tab === "lessonplans") loadLessonPlans();
    }
  }, [selectedClassId, selectedSubjectId, selectedYear, tab]);

  function handleTabChange(v: string) {
    setTab(v);
    if (v === "lessonplans" && lessonPlans.length === 0 && selectedClassId && selectedSubjectId) {
      loadLessonPlans();
    }
  }

  async function handleDeleteUnit(id: string) {
    if (!confirm("Delete this unit and all its topics?")) return;
    try {
      await syllabusApi.deleteUnit(id);
      loadUnits();
    } catch { toast.error("Failed to delete unit"); }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("Delete this lesson plan?")) return;
    try {
      await syllabusApi.deleteLessonPlan(id);
      loadLessonPlans();
    } catch { toast.error("Failed to delete lesson plan"); }
  }

  const notConfigured = !selectedClassId || !selectedSubjectId;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Syllabus & Lesson Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage syllabus units, topics, and daily lesson plans</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[160px]">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.section ? `${c.name} ${c.section}` : c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger><SelectValue placeholder={selectedClassId ? "Select subject" : "Select class first"} /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {notConfigured ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a class and subject to view the syllabus</p>
        </CardContent></Card>
      ) : (
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="units">Units & Topics</TabsTrigger>
              <TabsTrigger value="lessonplans" className="gap-1.5"><CalendarDays className="h-4 w-4" />Lesson Plans</TabsTrigger>
            </TabsList>
            <div>
              {tab === "units" && canEdit && <Button onClick={() => setShowAddUnit(true)} className="gap-1"><Plus className="h-4 w-4" />Add Unit</Button>}
              {tab === "lessonplans" && canEdit && <Button onClick={() => setShowAddPlan(true)} className="gap-1"><Plus className="h-4 w-4" />Add Lesson Plan</Button>}
            </div>
          </div>

          {/* Units Tab */}
          <TabsContent value="units" className="mt-4">
            {unitsLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : units.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No units added yet</p>
                {canEdit && <Button className="mt-4 gap-1" onClick={() => setShowAddUnit(true)}><Plus className="h-4 w-4" />Add First Unit</Button>}
              </CardContent></Card>
            ) : (
              <div>
                {units.map(u => (
                  <UnitRow
                    key={u.id}
                    unit={u}
                    canEdit={canEdit}
                    onEdit={setEditUnit}
                    onDelete={handleDeleteUnit}
                    onAddTopic={setAddTopicUnitId}
                    onMarkComplete={setMarkCompleteTopic}
                    onReload={loadUnits}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lesson Plans Tab */}
          <TabsContent value="lessonplans" className="mt-4">
            {!selectedClassId || !selectedSubjectId ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a class and subject first</p>
                <p className="text-sm mt-2">Please select a class and subject from the filters above to view and manage lesson plans.</p>
              </CardContent></Card>
            ) : plansLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : lessonPlans.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No lesson plans yet</p>
                {canEdit && <Button className="mt-4 gap-1" onClick={() => setShowAddPlan(true)}><Plus className="h-4 w-4" />Add Lesson Plan</Button>}
              </CardContent></Card>
            ) : (
              <div className="rounded-lg overflow-hidden border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Learning Objectives</TableHead>
                      <TableHead>Methods</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonPlans.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.date).toLocaleDateString()}</TableCell>
                        <TableCell>{p.periodNumber ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.teachingMethods || '—'}</TableCell>
                        <TableCell><Badge variant={p.status === 'completed' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditPlan(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePlan(p.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      {(showAddUnit || editUnit) && (
        <UnitFormDialog
          unit={editUnit}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          academicYear={selectedYear}
          onClose={() => { setShowAddUnit(false); setEditUnit(undefined); }}
          onSaved={loadUnits}
        />
      )}
      {addTopicUnitId && (
        <TopicFormDialog unitId={addTopicUnitId} onClose={() => setAddTopicUnitId(null)} onSaved={loadUnits} />
      )}
      {markCompleteTopic && (
        <MarkCompleteDialog topic={markCompleteTopic} onClose={() => setMarkCompleteTopic(null)} onSaved={loadUnits} />
      )}
      {(showAddPlan || editPlan) && (
        <LessonPlanFormDialog
          plan={editPlan}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          onClose={() => { setShowAddPlan(false); setEditPlan(undefined); }}
          onSaved={loadLessonPlans}
        />
      )}
    </div>
  );
}
