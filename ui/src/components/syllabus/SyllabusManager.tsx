import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  BookOpen, Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, Pencil, Trash2,
  Loader2, CalendarDays, ClipboardCheck, ThumbsUp, ThumbsDown,
  BarChart2, GraduationCap, Send, RefreshCw,
} from "lucide-react";
import {
  syllabusApi,
  SyllabusUnit, SyllabusTopic, LessonPlan,
  CreateSyllabusUnitDto, CreateTopicDto, CreateLessonPlanDto,
  TeacherSubjectAssignment, SectionTeacherInfo,
} from "@/services/api/syllabusApi";
import { academicApi, ClassBasic, ClassSubjectResponse, SectionBasic } from "@/services/api/academicApi";
import { useAuth } from "@/contexts/AuthContext";

const CURR_YR = new Date().getFullYear();
const CURRENT_YEAR = `${CURR_YR}-${CURR_YR + 1}`;
const YEAR_OPTIONS = [CURRENT_YEAR, `${CURR_YR - 1}-${CURR_YR}`];

// ─── Role helpers ─────────────────────────────────────────────────────────────

function isTeacherRole(designation?: string, role?: string): boolean {
  if (role === "super_admin" || role === "admin") return false;
  const des = (designation ?? "").toLowerCase();
  // Principals and vice principals see their own curriculum (like teachers), not the full admin view
  return !["admin", "hr manager"].includes(des);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:      { label: "Draft",       cls: "bg-muted text-muted-foreground" },
    submitted:  { label: "Submitted",   cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved:   { label: "Approved",    cls: "bg-green-100 text-green-800 border-green-200" },
    rejected:   { label: "Rejected",    cls: "bg-red-100 text-red-800 border-red-200" },
    pending:    { label: "Pending",     cls: "bg-muted text-muted-foreground" },
    in_progress:{ label: "In Progress", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    completed:  { label: "Completed",   cls: "bg-green-100 text-green-800 border-green-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>;
}

// ─── Unit Form Dialog ─────────────────────────────────────────────────────────

function UnitFormDialog({
  unit, classId, subjectId, academicYear, onClose, onSaved,
}: {
  unit?: SyllabusUnit; classId: string; subjectId: string; academicYear: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateSyllabusUnitDto>({
    classId, subjectId, academicYear,
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
      if (unit) { await syllabusApi.updateUnit(unit.id, form); toast.success("Unit updated"); }
      else { await syllabusApi.createUnit(form); toast.success("Unit created"); }
      onSaved(); onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save unit"); }
    finally { setSaving(false); }
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
              <Label>Planned Start</Label>
              <Input type="date" value={form.plannedStartDate ?? ""} onChange={e => set("plannedStartDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Planned End</Label>
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
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to add topic"); }
    finally { setSaving(false); }
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
              <Label>Duration (min)</Label>
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
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
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
  plan, classId, subjectId, sectionId, isTeacher, onClose, onSaved,
}: {
  plan?: LessonPlan; classId: string; subjectId: string; sectionId?: string;
  isTeacher: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateLessonPlanDto>({
    classId, subjectId,
    sectionId: plan?.sectionId ?? sectionId,
    date: plan?.date ? plan.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    periodNumber: plan?.periodNumber ?? 1,
    title: plan?.title ?? "",
    learningObjectives: plan?.learningObjectives ?? "",
    teachingMethods: plan?.teachingMethods ?? "",
    resources: plan?.resources ?? "",
    homework: plan?.homework ?? "",
    notes: plan?.notes ?? "",
  });
  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [saving, setSaving] = useState(false);
  function set(k: keyof CreateLessonPlanDto, v: string | number) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Plan title is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, date: form.date ? form.date + "T00:00:00" : new Date().toISOString() };
      let saved: LessonPlan;
      if (plan) {
        saved = await syllabusApi.updateLessonPlan(plan.id, payload);
        toast.success("Lesson plan updated");
      } else {
        saved = await syllabusApi.createLessonPlan(payload);
        toast.success("Lesson plan created");
      }
      if (isTeacher && submitForApproval && saved.status === "draft") {
        await syllabusApi.submitLessonPlan(saved.id);
        toast.success("Submitted for approval");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      const data = (err as any)?.response?.data;
      const msg = data?.message ?? data?.errors?.[0] ?? (err instanceof Error ? err.message : "Failed");
      toast.error(msg);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Lesson Plan" : "Add Lesson Plan"}</DialogTitle>
        </DialogHeader>
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
            <Input value={form.resources ?? ""} onChange={e => set("resources", e.target.value)} placeholder="Textbook p.45…" />
          </div>
          <div className="space-y-1.5">
            <Label>Homework</Label>
            <Input value={form.homework ?? ""} onChange={e => set("homework", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Internal notes…" />
          </div>
          {isTeacher && !plan && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={submitForApproval}
                onChange={e => setSubmitForApproval(e.target.checked)}
                className="rounded"
              />
              Submit for approval immediately after saving
            </label>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {plan ? "Update" : (isTeacher && submitForApproval ? "Save & Submit" : "Save as Draft")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approval Dialog ──────────────────────────────────────────────────────────

function ApprovalDialog({ plan, onClose, onDone }: { plan: LessonPlan; onClose: () => void; onDone: () => void }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handle(action: "approve" | "reject") {
    if (action === "reject" && !rejectionReason.trim()) { toast.error("Please enter a rejection reason"); return; }
    setSaving(true);
    try {
      await syllabusApi.approveLessonPlan(plan.id, action, rejectionReason || undefined);
      toast.success(action === "approve" ? "Lesson plan approved" : "Lesson plan rejected");
      onDone(); onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Review Lesson Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
            <p className="font-semibold">{plan.title}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Teacher: <span className="text-foreground">{plan.staffName ?? "—"}</span></span>
              <span>Date: <span className="text-foreground">{new Date(plan.date).toLocaleDateString("en-IN")}</span></span>
              <span>Class: <span className="text-foreground">{plan.className ?? "—"}</span></span>
              <span>Subject: <span className="text-foreground">{plan.subjectName ?? "—"}</span></span>
            </div>
            {plan.learningObjectives && (
              <div className="text-sm"><span className="font-medium">Objectives: </span>
                <span className="text-muted-foreground">{plan.learningObjectives}</span></div>
            )}
            {plan.teachingMethods && (
              <div className="text-sm"><span className="font-medium">Methods: </span>
                <span className="text-muted-foreground">{plan.teachingMethods}</span></div>
            )}
            {plan.homework && (
              <div className="text-sm"><span className="font-medium">Homework: </span>
                <span className="text-muted-foreground">{plan.homework}</span></div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Rejection Reason (required when rejecting)</Label>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} placeholder="Specify what needs revision…" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={saving} onClick={() => handle("reject")} className="gap-1">
              <ThumbsDown className="h-4 w-4" />Reject
            </Button>
            <Button type="button" disabled={saving} onClick={() => handle("approve")} className="gap-1 bg-green-600 hover:bg-green-700">
              <ThumbsUp className="h-4 w-4" />Approve
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unit Row ─────────────────────────────────────────────────────────────────

function UnitRow({
  unit, canManageUnits, onEdit, onDelete, onAddTopic, onMarkComplete,
}: {
  unit: SyllabusUnit; canManageUnits: boolean;
  onEdit: (u: SyllabusUnit) => void; onDelete: (id: string) => void;
  onAddTopic: (unitId: string) => void; onMarkComplete: (topic: SyllabusTopic) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalTopics     = unit.topics.length;
  const completedTopics = unit.topics.filter(t => t.status === "completed").length;
  const inProgress      = unit.topics.filter(t => t.status === "in_progress").length;
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
                {!isComplete && inProgress > 0 && <Badge variant="secondary" className="text-xs">In Progress</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {totalTopics === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No topics yet</span>
                ) : (
                  <>
                    <Progress value={pct} className="h-1.5 w-40" />
                    <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                    <span className="text-xs text-muted-foreground">{completedTopics}/{totalTopics} done</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
              {canManageUnits && (
                <>
                  <Button variant="ghost" size="icon" title="Add topic" onClick={() => onAddTopic(unit.id)}><Plus className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Edit unit" onClick={() => onEdit(unit)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Delete unit" className="text-destructive" onClick={() => onDelete(unit.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {unit.topics.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
              No topics yet.
              {canManageUnits && <button className="ml-2 text-primary underline underline-offset-2" onClick={() => onAddTopic(unit.id)}>Add topic</button>}
            </div>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {unit.topics.map(topic => (
                <div key={topic.id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                  {topic.status === "completed"
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${topic.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{topic.title}</p>
                    {topic.status === "completed" && topic.completedDate && (
                      <p className="text-xs text-muted-foreground">
                        Completed {new Date(topic.completedDate).toLocaleDateString("en-IN")}
                        {topic.completedByStaffName && ` by ${topic.completedByStaffName}`}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{topic.durationMinutes ?? 0}min</span>
                  {topic.status !== "completed" && (
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

// ─── Coverage Tab ─────────────────────────────────────────────────────────────

function CoverageTab({ classId, subjectId, academicYear }: { classId: string; subjectId: string; academicYear: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || !subjectId) return;
    setLoading(true);
    syllabusApi.getCoverage(classId, subjectId, academicYear)
      .then(r => setReport(r))
      .catch(() => toast.error("Failed to load coverage"))
      .finally(() => setLoading(false));
  }, [classId, subjectId, academicYear]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!report) return null;

  const overallPct = report.totalTopics === 0 ? 0 : Math.round((report.completedTopics / report.totalTopics) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Units",    value: report.totalUnits },
          { label: "Completed",      value: report.completedUnits },
          { label: "Total Topics",   value: report.totalTopics },
          { label: "Topics Done",    value: report.completedTopics },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold tracking-tight">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Coverage</span>
            <span className="font-semibold">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {report.completedTopics} of {report.totalTopics} topics completed
            {report.inProgressUnits > 0 && ` · ${report.inProgressUnits} in progress`}
          </p>
        </CardContent>
      </Card>
      {report.units?.map((u: any) => {
        const pct = u.totalTopics === 0 ? 0 : Math.round((u.completedTopics / u.totalTopics) * 100);
        return (
          <div key={u.id} className="flex items-center gap-4 rounded-lg border border-border p-3 bg-card">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{u.unitNumber}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">{pct}% ({u.completedTopics}/{u.totalTopics})</span>
              </div>
            </div>
            <StatusBadge status={u.status} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Lesson Plans Tab ─────────────────────────────────────────────────────────

function LessonPlansTab({
  classId, subjectId, sectionId, isTeacher, canManagePlans, staffId,
}: {
  classId: string; subjectId: string; sectionId?: string; isTeacher: boolean; canManagePlans: boolean; staffId?: string;
}) {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editPlan, setEditPlan] = useState<LessonPlan | undefined>();
  const [approvePlan, setApprovePlan] = useState<LessonPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await syllabusApi.getLessonPlans(
        classId,
        subjectId,
        // Admin/principal: no staffId filter (see all teachers' plans).
        // Teacher: also no staffId filter — we fetch all for this class+subject
        // so admin-created reference plans are visible. Ownership is checked in the UI.
        undefined,
        statusFilter === "all" ? undefined : statusFilter,
        undefined,
        undefined,
        1,
        50,
        // Section filter ensures Teacher A (5-A) never sees Teacher B's (5-B) plans
        sectionId,
      );
      setPlans(r.plans ?? []);
    } catch { toast.error("Failed to load lesson plans"); }
    finally { setLoading(false); }
  }, [classId, subjectId, sectionId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // A plan "belongs" to this teacher when staffId matches their LinkedEntityId.
  // Admin-created plans have staffId = null (school reference plans).
  function isOwnPlan(p: LessonPlan) { return isTeacher && staffId != null && p.staffId === staffId; }
  function isReferencePlan(p: LessonPlan) { return isTeacher && !p.staffId; }

  useEffect(() => { load(); }, [load]);

  async function handleSubmitPlan(id: string) {
    try { await syllabusApi.submitLessonPlan(id); toast.success("Submitted for approval"); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lesson plan?")) return;
    try { await syllabusApi.deleteLessonPlan(id); load(); }
    catch { toast.error("Failed to delete"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Filter:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
          {canManagePlans && (
            <Button size="sm" onClick={() => setShowAddPlan(true)} className="gap-1"><Plus className="h-4 w-4" />Add Lesson Plan</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No lesson plans found</p>
            {canManagePlans && <Button className="mt-4 gap-1" size="sm" onClick={() => setShowAddPlan(true)}><Plus className="h-4 w-4" />Create First Plan</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                {!isTeacher && <TableHead>Teacher</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(p => (
                <TableRow key={p.id} className={isReferencePlan(p) ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{p.title}</span>
                      {isReferencePlan(p) && (
                        <Badge variant="outline" className="text-xs shrink-0 bg-blue-50 text-blue-700 border-blue-200">School Plan</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(p.date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-sm">{p.periodNumber ?? "—"}</TableCell>
                  {!isTeacher && <TableCell className="text-sm">{p.staffName ?? "—"}</TableCell>}
                  <TableCell>
                    <StatusBadge status={p.status} />
                    {p.status === "rejected" && p.rejectionReason && (
                      <p className="text-xs text-destructive mt-0.5 max-w-[180px] truncate" title={p.rejectionReason}>{p.rejectionReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Own plan: edit if draft or rejected */}
                      {isOwnPlan(p) && (p.status === "draft" || p.status === "rejected") && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditPlan(p)}><Pencil className="h-3 w-3" />{p.status === "rejected" ? "Revise" : "Edit"}</Button>
                      )}
                      {/* Own plan: submit if draft */}
                      {isOwnPlan(p) && p.status === "draft" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-blue-600" onClick={() => handleSubmitPlan(p.id)}><Send className="h-3 w-3" />Submit</Button>
                      )}
                      {/* Admin view: review submitted plans */}
                      {!isTeacher && p.status === "submitted" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-700" onClick={() => setApprovePlan(p)}><ClipboardCheck className="h-3 w-3" />Review</Button>
                      )}
                      {/* Delete: admin can delete any; teacher can only delete own draft */}
                      {(!isTeacher || (isOwnPlan(p) && p.status === "draft")) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive p-0" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showAddPlan && (
        <LessonPlanFormDialog classId={classId} subjectId={subjectId} sectionId={sectionId} isTeacher={isTeacher}
          onClose={() => setShowAddPlan(false)} onSaved={load} />
      )}
      {editPlan && (
        <LessonPlanFormDialog plan={editPlan} classId={classId} subjectId={subjectId} sectionId={sectionId} isTeacher={isTeacher}
          onClose={() => setEditPlan(undefined)} onSaved={load} />
      )}
      {approvePlan && (
        <ApprovalDialog plan={approvePlan} onClose={() => setApprovePlan(null)} onDone={load} />
      )}
    </div>
  );
}

// ─── Admin: Approval Queue ────────────────────────────────────────────────────

function ApprovalQueueTab() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvePlan, setApprovePlan] = useState<LessonPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await syllabusApi.getLessonPlans(undefined, undefined, undefined, "submitted"); setPlans(r.plans ?? []); }
    catch { toast.error("Failed to load approval queue"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} plan(s) awaiting review</p>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No plans awaiting review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Title</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="text-sm">{p.staffName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.className ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.subjectName ?? "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(p.date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setApprovePlan(p)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {approvePlan && <ApprovalDialog plan={approvePlan} onClose={() => setApprovePlan(null)} onDone={load} />}
    </div>
  );
}

// ─── Teacher View ─────────────────────────────────────────────────────────────

function TeacherView() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TeacherSubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tab, setTab] = useState("units");
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [markCompleteTopic, setMarkCompleteTopic] = useState<SyllabusTopic | null>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  useEffect(() => {
    syllabusApi.getMyAssignments()
      .then(raw => {
        // Group by className+subjectId: if same teacher handles multiple sections of the same subject,
        // merge them into a single entry so they don't manage duplicate lesson plan sets.
        type Key = string;
        const groups = new Map<Key, TeacherSubjectAssignment[]>();
        for (const a of raw) {
          const key = `${a.classId}::${a.subjectId}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(a);
        }
        const merged: TeacherSubjectAssignment[] = [];
        for (const group of groups.values()) {
          if (group.length === 1) {
            merged.push(group[0]);
          } else {
            // Multiple sections — merge: no sectionId filter, show combined label
            const sectionNames = group.map(g => g.sectionName).filter(Boolean);
            merged.push({
              ...group[0],
              sectionId: undefined,         // null = no section filter (sees all sections)
              sectionName: sectionNames.join(" & "),
            });
          }
        }
        setAssignments(merged);
        if (merged.length > 0) setSelectedIdx(0);
      })
      .catch(() => toast.error("Failed to load your subject assignments"))
      .finally(() => setLoading(false));
  }, []);

  const selected = selectedIdx !== null ? assignments[selectedIdx] : null;

  const loadUnits = useCallback(async () => {
    if (!selected) return;
    setUnitsLoading(true);
    try { const r = await syllabusApi.getUnits(selected.classId, selected.subjectId, selectedYear); setUnits(Array.isArray(r) ? r : []); }
    catch { toast.error("Failed to load syllabus"); }
    finally { setUnitsLoading(false); }
  }, [selected, selectedYear]);

  useEffect(() => { if (selected && tab === "units") loadUnits(); }, [selected, selectedYear, tab, loadUnits]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No subject assignments found</p>
          <p className="text-sm mt-1">Contact your administrator to set up your teaching assignments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[260px]">
              <Label>My Subject Assignment</Label>
              <Select value={selectedIdx !== null ? String(selectedIdx) : ""} onValueChange={v => { setSelectedIdx(Number(v)); setTab("units"); }}>
                <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>
                  {assignments.map((a, i) => {
                    const sectionLabel = a.sectionName
                      ? a.sectionName.includes("&")
                        ? `Sections ${a.sectionName}` // "Sections A & B"
                        : `Section ${a.sectionName}`  // "Section A"
                      : null;
                    return (
                      <SelectItem key={i} value={String(i)}>
                        {a.className}{sectionLabel ? ` (${sectionLabel})` : ""} — {a.subjectName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="units" className="gap-1.5"><BookOpen className="h-4 w-4" />Syllabus</TabsTrigger>
            <TabsTrigger value="lessonplans" className="gap-1.5"><CalendarDays className="h-4 w-4" />My Lesson Plans</TabsTrigger>
            <TabsTrigger value="coverage" className="gap-1.5"><BarChart2 className="h-4 w-4" />Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="mt-4">
            {unitsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : units.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No syllabus units set up yet</p>
                  <p className="text-sm mt-1">Your administrator will configure the syllabus structure.</p>
                </CardContent>
              </Card>
            ) : (
              <div>{units.map(u => (
                <UnitRow key={u.id} unit={u} canManageUnits={false}
                  onEdit={() => {}} onDelete={() => {}}
                  onAddTopic={() => {}} onMarkComplete={setMarkCompleteTopic}
                />
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="lessonplans" className="mt-4">
            <LessonPlansTab
              classId={selected.classId}
              subjectId={selected.subjectId}
              sectionId={selected.sectionId}
              isTeacher={true}
              canManagePlans={true}
              staffId={user?.linkedEntityId}
            />
          </TabsContent>

          <TabsContent value="coverage" className="mt-4">
            <CoverageTab classId={selected.classId} subjectId={selected.subjectId} academicYear={selectedYear} />
          </TabsContent>
        </Tabs>
      )}

      {markCompleteTopic && (
        <MarkCompleteDialog topic={markCompleteTopic} onClose={() => setMarkCompleteTopic(null)} onSaved={() => { setMarkCompleteTopic(null); loadUnits(); }} />
      )}
    </div>
  );
}

// ─── Admin/Principal View ─────────────────────────────────────────────────────

function AdminView() {
  const [classes, setClasses] = useState<ClassBasic[]>([]);
  const [subjects, setSubjects] = useState<ClassSubjectResponse[]>([]);
  const [sections, setSections] = useState<SectionBasic[]>([]);
  const [sectionTeachers, setSectionTeachers] = useState<SectionTeacherInfo[]>([]);
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("all");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [tab, setTab] = useState("units");
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editUnit, setEditUnit] = useState<SyllabusUnit | undefined>();
  const [addTopicUnitId, setAddTopicUnitId] = useState<string | null>(null);
  const [markCompleteTopic, setMarkCompleteTopic] = useState<SyllabusTopic | null>(null);

  useEffect(() => { academicApi.listClasses(1, 200).then(r => setClasses(r.classes ?? [])).catch(() => {}); }, []);

  // When class changes: reset subject + section, reload sections
  useEffect(() => {
    setSelectedSubjectId(""); setSubjects([]);
    setSelectedSectionId("all"); setSections([]); setSectionTeachers([]);
    if (!selectedClassId) return;
    academicApi.getClassSubjects(selectedClassId).then(subs => setSubjects(subs)).catch(() => {});
    academicApi.listSections(selectedClassId, 1, 50).then(r => setSections(r.sections ?? [])).catch(() => {});
  }, [selectedClassId]);

  // When class + subject both selected: load per-section teacher coverage
  useEffect(() => {
    setSectionTeachers([]);
    if (!selectedClassId || !selectedSubjectId) return;
    syllabusApi.getSectionTeachers(selectedClassId, selectedSubjectId)
      .then(t => setSectionTeachers(t))
      .catch(() => {});
  }, [selectedClassId, selectedSubjectId]);

  const loadUnits = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setUnitsLoading(true);
    try { const r = await syllabusApi.getUnits(selectedClassId, selectedSubjectId, selectedYear); setUnits(Array.isArray(r) ? r : []); }
    catch { toast.error("Failed to load syllabus"); }
    finally { setUnitsLoading(false); }
  }, [selectedClassId, selectedSubjectId, selectedYear]);

  useEffect(() => { if (selectedClassId && selectedSubjectId && tab === "units") loadUnits(); }, [selectedClassId, selectedSubjectId, selectedYear, tab, loadUnits]);

  async function handleDeleteUnit(id: string) {
    if (!confirm("Delete this unit and all its topics?")) return;
    try { await syllabusApi.deleteUnit(id); loadUnits(); }
    catch { toast.error("Failed to delete unit"); }
  }

  // Derive a human-readable section teacher note for the UI
  const allSameTeacher =
    sectionTeachers.length > 1 &&
    sectionTeachers.every(t => t.staffId === sectionTeachers[0].staffId);

  const sectionIdForPlans = selectedSectionId === "all" ? undefined : selectedSectionId;
  const notConfigured = !selectedClassId || !selectedSubjectId;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Class */}
            <div className="space-y-1.5 min-w-[160px]">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={v => { setSelectedClassId(v); setTab("units"); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {/* listClasses returns one record per section with the same classId — deduplicate */}
                  {[...new Map(classes.map(c => [c.id, c])).values()].map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section — shown once a class is picked */}
            {selectedClassId && (
              <div className="space-y-1.5 min-w-[160px]">
                <Label>Section</Label>
                <Select value={selectedSectionId} onValueChange={v => setSelectedSectionId(v)}>
                  <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(s => {
                      const teacherInfo = sectionTeachers.find(t => t.sectionId === s.id);
                      const label = teacherInfo?.staffName
                        ? `Section ${s.name} — ${teacherInfo.staffName}`
                        : `Section ${s.name}`;
                      return <SelectItem key={s.id} value={s.id}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1.5 min-w-[180px]">
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger><SelectValue placeholder={selectedClassId ? "Select subject" : "Select class first"} /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5 min-w-[140px]">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Teacher coverage info banner — shown when class+subject are selected */}
          {selectedClassId && selectedSubjectId && sectionTeachers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {allSameTeacher ? (
                <div className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-md px-2.5 py-1.5">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    All sections ({sectionTeachers.map(t => t.sectionName).join(" & ")}) handled by{" "}
                    <strong>{sectionTeachers[0].staffName ?? "the same teacher"}</strong> — lesson plans are shared across sections.
                  </span>
                </div>
              ) : (
                sectionTeachers.map(t => (
                  <div key={t.sectionId ?? "none"} className="flex items-center gap-1 text-xs bg-muted border rounded-md px-2.5 py-1.5">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      Section {t.sectionName ?? "—"}:{" "}
                      <strong>{t.staffName ?? "Unassigned"}</strong>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {notConfigured ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a class and subject to view the syllabus</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="units" className="gap-1.5"><BookOpen className="h-4 w-4" />Units & Topics</TabsTrigger>
              <TabsTrigger value="lessonplans" className="gap-1.5"><CalendarDays className="h-4 w-4" />Lesson Plans</TabsTrigger>
              <TabsTrigger value="approval" className="gap-1.5"><ClipboardCheck className="h-4 w-4" />Approval Queue</TabsTrigger>
              <TabsTrigger value="coverage" className="gap-1.5"><BarChart2 className="h-4 w-4" />Coverage</TabsTrigger>
            </TabsList>
            {tab === "units" && (
              <Button onClick={() => setShowAddUnit(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Unit</Button>
            )}
          </div>

          <TabsContent value="units" className="mt-4">
            {unitsLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : units.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No units added yet</p>
                  <Button className="mt-4 gap-1" onClick={() => setShowAddUnit(true)}><Plus className="h-4 w-4" />Add First Unit</Button>
                </CardContent>
              </Card>
            ) : (
              <div>{units.map(u => (
                <UnitRow key={u.id} unit={u} canManageUnits={true}
                  onEdit={setEditUnit} onDelete={handleDeleteUnit}
                  onAddTopic={setAddTopicUnitId} onMarkComplete={setMarkCompleteTopic}
                />
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="lessonplans" className="mt-4">
            <LessonPlansTab classId={selectedClassId} subjectId={selectedSubjectId} sectionId={sectionIdForPlans} isTeacher={false} canManagePlans={true} />
          </TabsContent>

          <TabsContent value="approval" className="mt-4">
            <ApprovalQueueTab />
          </TabsContent>

          <TabsContent value="coverage" className="mt-4">
            <CoverageTab classId={selectedClassId} subjectId={selectedSubjectId} academicYear={selectedYear} />
          </TabsContent>
        </Tabs>
      )}

      {showAddUnit && <UnitFormDialog classId={selectedClassId} subjectId={selectedSubjectId} academicYear={selectedYear} onClose={() => setShowAddUnit(false)} onSaved={loadUnits} />}
      {editUnit && <UnitFormDialog unit={editUnit} classId={selectedClassId} subjectId={selectedSubjectId} academicYear={selectedYear} onClose={() => setEditUnit(undefined)} onSaved={loadUnits} />}
      {addTopicUnitId && <TopicFormDialog unitId={addTopicUnitId} onClose={() => setAddTopicUnitId(null)} onSaved={loadUnits} />}
      {markCompleteTopic && <MarkCompleteDialog topic={markCompleteTopic} onClose={() => setMarkCompleteTopic(null)} onSaved={() => { setMarkCompleteTopic(null); loadUnits(); }} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SyllabusManager() {
  const { user } = useAuth();
  const isTeacher = isTeacherRole(user?.designation, user?.role);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {isTeacher ? "My Curriculum" : "Curriculum Planner"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isTeacher
              ? "View your assigned units, mark topics complete, and manage lesson plans"
              : "Plan curriculum, manage units & topics, review lesson plans, and track coverage"
            }
          </p>
        </div>
        {isTeacher && (
          <Badge variant="outline" className="gap-1 text-sm px-3 py-1">
            <GraduationCap className="h-4 w-4" />
            {user?.designation ?? "Teacher"}
          </Badge>
        )}
      </div>
      {isTeacher ? <TeacherView /> : <AdminView />}
    </div>
  );
}
