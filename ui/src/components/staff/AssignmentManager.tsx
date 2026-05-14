import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Calendar, FileText, Users, BookOpen, Search,
  ChevronRight, CheckCircle2, AlertCircle, Timer, X, Pencil,
  GraduationCap, MoreHorizontal, TrendingUp, ClipboardCheck,
  BarChart3, Clock, Tag, ClipboardList, CheckCheck, XCircle,
  Loader2, Save, ChevronDown, ChevronUp, Award, ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { assignmentApi, type AssignmentResponse, type AssignmentRosterEntry, type AssignmentRosterResponse } from "@/services/api/assignmentApi";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { usePermissions } from "@/contexts/PermissionsContext";
import { z } from "zod";

// ─── form schema ─────────────────────────────────────────────────────────────
const createSchema = z.object({
  classId:      z.string().uuid("Select a class"),
  subjectId:    z.string().uuid("Select a subject"),
  title:        z.string().min(3, "At least 3 characters").max(200),
  description:  z.string().max(2000).optional().or(z.literal("")),
  assignedDate: z.string().min(1, "Required"),
  dueDate:      z.string().min(1, "Required"),
  maxMarks:     z.coerce.number().min(0).max(1000).optional(),
  status:       z.enum(["active", "draft"]).default("active"),
}).refine(d => new Date(d.dueDate) >= new Date(d.assignedDate), {
  message: "Due date must be on or after assigned date",
  path: ["dueDate"],
});
type CreateForm = z.infer<typeof createSchema>;

// ─── colour palette (cycles per class name) ───────────────────────────────────
const PALETTE = [
  { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500",    activePill: "bg-blue-600 text-white",    inactivePill: "border-blue-200 text-blue-700",   secBg: "bg-blue-100/60"   },
  { bg: "bg-emerald-50", border: "border-emerald-200",  text: "text-emerald-700", dot: "bg-emerald-500", activePill: "bg-emerald-600 text-white",  inactivePill: "border-emerald-200 text-emerald-700", secBg: "bg-emerald-100/60"},
  { bg: "bg-violet-50",  border: "border-violet-200",   text: "text-violet-700",  dot: "bg-violet-500",  activePill: "bg-violet-600 text-white",   inactivePill: "border-violet-200 text-violet-700",  secBg: "bg-violet-100/60" },
  { bg: "bg-orange-50",  border: "border-orange-200",   text: "text-orange-700",  dot: "bg-orange-500",  activePill: "bg-orange-500 text-white",   inactivePill: "border-orange-200 text-orange-700",  secBg: "bg-orange-100/60" },
  { bg: "bg-rose-50",    border: "border-rose-200",     text: "text-rose-700",    dot: "bg-rose-500",    activePill: "bg-rose-600 text-white",     inactivePill: "border-rose-200 text-rose-700",      secBg: "bg-rose-100/60"   },
  { bg: "bg-cyan-50",    border: "border-cyan-200",     text: "text-cyan-700",    dot: "bg-cyan-500",    activePill: "bg-cyan-600 text-white",     inactivePill: "border-cyan-200 text-cyan-700",      secBg: "bg-cyan-100/60"   },
  { bg: "bg-amber-50",   border: "border-amber-200",    text: "text-amber-700",   dot: "bg-amber-500",   activePill: "bg-amber-500 text-white",    inactivePill: "border-amber-200 text-amber-700",    secBg: "bg-amber-100/60"  },
  { bg: "bg-indigo-50",  border: "border-indigo-200",   text: "text-indigo-700",  dot: "bg-indigo-500",  activePill: "bg-indigo-600 text-white",   inactivePill: "border-indigo-200 text-indigo-700",  secBg: "bg-indigo-100/60" },
];
const pal = (i: number) => PALETTE[i % PALETTE.length];

// ─── helpers ──────────────────────────────────────────────────────────────────
function dueUrgency(dueDate: string): "overdue" | "soon" | "upcoming" | "fine" {
  if (!dueDate) return "fine";
  const diff = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  if (diff <= 7) return "upcoming";
  return "fine";
}
function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function daysLeft(dueDate: string): string {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff} days left`;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-green-100 text-green-700 border-green-200",
    draft:     "bg-gray-100 text-gray-600 border-gray-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    overdue:   "bg-red-100 text-red-700 border-red-200",
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, colorCls }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; sub?: string; colorCls: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${colorCls}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${colorCls.replace("text-", "bg-").replace("-700", "-100").replace("-600", "-100")}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AssignmentCard (clickable) ───────────────────────────────────────────────
function AssignmentCard({
  a, color, onClick, onGrade, sectionLabel,
}: {
  a: AssignmentResponse;
  color: ReturnType<typeof pal>;
  onClick: () => void;
  onGrade: (a: AssignmentResponse) => void;
  sectionLabel?: string;
}) {
  const urgency = dueUrgency(a.dueDate);
  const submittedPct = a.submissionCount > 0
    ? Math.min(100, Math.round((a.submissionCount / Math.max(a.submissionCount, 1)) * 100))
    : 0;
  const gradedPct = a.submissionCount > 0
    ? Math.min(100, Math.round((a.gradedCount / a.submissionCount) * 100))
    : 0;

  const urgencyColor =
    urgency === "overdue" ? "text-red-600" :
    urgency === "soon"    ? "text-amber-600" :
    urgency === "upcoming"? "text-blue-600"  : "text-muted-foreground";
  const UrgencyIcon = urgency === "overdue" ? AlertCircle : urgency === "soon" ? Timer : Calendar;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border ${color.border} ${color.bg} p-4 flex flex-col gap-3 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer`}
    >
      {/* title + status */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{a.title}</p>
        <StatusBadge status={a.status} />
      </div>

      {/* subject + section chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${color.text} bg-white/70 border ${color.border}`}>
          <GraduationCap className="h-3 w-3" />
          {a.subjectName}
        </span>
        {sectionLabel && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground bg-white/70 border border-gray-200`}>
            {sectionLabel}
          </span>
        )}
      </div>

      {/* due date */}
      <div className={`flex items-center gap-1.5 text-xs font-medium ${urgencyColor}`}>
        <UrgencyIcon className="h-3.5 w-3.5" />
        <span>Due {fmt(a.dueDate)}</span>
        {urgency !== "fine" && <span className="ml-0.5 opacity-80">· {daysLeft(a.dueDate)}</span>}
      </div>

      {/* submission progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" />
            {a.submissionCount} submitted
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {a.gradedCount} graded
          </span>
        </div>
        {a.submissionCount > 0 ? (
          <Progress value={gradedPct} className="h-1.5" />
        ) : (
          <div className="h-1.5 rounded-full bg-muted" />
        )}
      </div>

      {/* footer */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-current/10">
        <span className="text-[11px] text-muted-foreground font-medium flex-1">Max: {a.maxMarks ?? "—"} marks</span>
        <button
          onClick={e => { e.stopPropagation(); onGrade(a); }}
          className={`flex items-center gap-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-current/20 ${color.text} hover:${color.bg} transition-colors`}
        >
          <Award className="h-3 w-3 mr-0.5" />Grade
        </button>
        <span className={`flex items-center gap-0.5 text-[11px] font-medium ${color.text}`}>
          Details <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

// ─── Assignment Detail Sheet ──────────────────────────────────────────────────
function AssignmentDetailSheet({
  a, open, onClose, classLabel, onGrade,
}: {
  a: AssignmentResponse | null;
  open: boolean;
  onClose: () => void;
  classLabel: string;
  onGrade: (a: AssignmentResponse) => void;
}) {
  if (!a) return null;
  const urgency = dueUrgency(a.dueDate);
  const submittedPct   = a.submissionCount > 0 ? Math.min(100, Math.round((a.submissionCount / a.submissionCount) * 100)) : 0;
  const gradedPct      = a.submissionCount > 0 ? Math.min(100, Math.round((a.gradedCount / a.submissionCount) * 100)) : 0;
  const unsubmittedPct = 100 - submittedPct;

  const urgencyColor =
    urgency === "overdue" ? "text-red-600 bg-red-50 border-red-200" :
    urgency === "soon"    ? "text-amber-600 bg-amber-50 border-amber-200" :
    urgency === "upcoming"? "text-blue-600 bg-blue-50 border-blue-200" : "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 pr-8">
            <SheetTitle className="text-lg leading-snug">{a.title}</SheetTitle>
            <StatusBadge status={a.status} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              {a.subjectName}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {classLabel}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">

          {/* Date info */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium ${urgencyColor}`}>
            <Clock className="h-4 w-4 shrink-0" />
            <span>Due {fmt(a.dueDate)}</span>
            {a.dueDate && <span className="ml-auto text-xs opacity-80">{daysLeft(a.dueDate)}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Assigned</p>
              <p className="text-sm font-semibold mt-0.5">{fmt(a.assignedDate)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Max Marks</p>
              <p className="text-sm font-semibold mt-0.5">{a.maxMarks ?? "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Submission stats */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Submission Overview
            </h3>

            {a.submissionCount === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 text-center">
                No submissions yet
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stat chips */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Submitted</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">{a.submissionCount}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">Graded</p>
                    <p className="text-xl font-bold text-green-700 mt-0.5">{a.gradedCount}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Pending</p>
                    <p className="text-xl font-bold text-amber-700 mt-0.5">{a.submissionCount - a.gradedCount}</p>
                  </div>
                </div>

                {/* Grading progress */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Grading progress</span>
                    <span className="font-medium">{gradedPct}%</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${gradedPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {a.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Description &amp; Instructions
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.description}</p>
              </div>
            </>
          )}

          {/* Assigned by */}
          {a.assignedByName && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Assigned by <span className="font-medium text-foreground">{a.assignedByName}</span></span>
              </div>
            </>
          )}

          <Separator />
          {/* Grade students CTA */}
          <Button
            className="w-full"
            onClick={() => { onClose(); onGrade(a); }}
          >
            <Award className="h-4 w-4 mr-2" />
            Grade Students
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Submission status badge ──────────────────────────────────────────────────
function SubmissionStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200"><XCircle className="h-3 w-3" />Not submitted</span>;
  const map: Record<string, string> = {
    submitted:     "bg-blue-100 text-blue-700 border-blue-200",
    graded:        "bg-emerald-100 text-emerald-700 border-emerald-200",
    not_submitted: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const icons: Record<string, React.ReactNode> = {
    submitted:     <ClipboardCheck className="h-3 w-3" />,
    graded:        <CheckCheck className="h-3 w-3" />,
    not_submitted: <XCircle className="h-3 w-3" />,
  };
  const labels: Record<string, string> = {
    submitted: "Submitted", graded: "Graded", not_submitted: "Not submitted",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {icons[status]} {labels[status] ?? status}
    </span>
  );
}

// ─── Single roster row ────────────────────────────────────────────────────────
interface RosterRowState {
  submitted: boolean;
  marks: string;
  feedback: string;
  dirty: boolean;
  saving: boolean;
}

function RosterRow({
  entry,
  maxMarks,
  assignmentId,
  onSaved,
}: {
  entry: AssignmentRosterEntry;
  maxMarks: number;
  assignmentId: string;
  onSaved: (updated: AssignmentRosterEntry) => void;
}) {
  const [state, setState] = useState<RosterRowState>({
    submitted: entry.hasSubmitted,
    marks:     entry.marksObtained != null ? String(entry.marksObtained) : "",
    feedback:  entry.feedback ?? "",
    dirty:     false,
    saving:    false,
  });
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<RosterRowState>) =>
    setState(prev => ({ ...prev, ...patch, dirty: true }));

  const save = useCallback(async () => {
    setState(prev => ({ ...prev, saving: true }));
    try {
      const marksNum = state.marks !== "" ? parseFloat(state.marks) : undefined;
      if (marksNum !== undefined && (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks)) {
        toast.error(`Marks must be between 0 and ${maxMarks}`);
        setState(prev => ({ ...prev, saving: false }));
        return;
      }
      const updated = await assignmentApi.staffMark(assignmentId, {
        studentId:     entry.studentId,
        submitted:     state.submitted,
        marksObtained: marksNum,
        feedback:      state.feedback || undefined,
      });
      setState(prev => ({ ...prev, dirty: false, saving: false }));
      onSaved(updated);
      toast.success(`Saved for ${entry.studentName}`);
    } catch {
      toast.error("Failed to save");
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [assignmentId, entry.studentId, entry.studentName, maxMarks, state.marks, state.feedback, state.submitted, onSaved]);

  return (
    <div className={`rounded-xl border transition-all ${state.dirty ? "border-amber-300 bg-amber-50/40" : "border-border bg-card"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Roll + name */}
        <div className="w-12 text-xs font-mono text-muted-foreground shrink-0">
          {entry.rollNumber ?? "—"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.studentName}</p>
          <SubmissionStatusBadge status={entry.hasSubmitted ? (state.submitted ? entry.submissionStatus : "not_submitted") : (state.submitted ? "submitted" : undefined)} />
        </div>

        {/* Submitted toggle */}
        <button
          onClick={() => update({ submitted: !state.submitted })}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            state.submitted
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
          }`}
        >
          {state.submitted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {state.submitted ? "Submitted" : "Not submitted"}
        </button>

        {/* Quick marks input */}
        {state.submitted && (
          <div className="relative shrink-0 w-24">
            <Input
              type="number"
              min={0}
              max={maxMarks}
              step="0.5"
              placeholder="Marks"
              value={state.marks}
              onChange={e => update({ marks: e.target.value })}
              className="h-8 text-xs pr-8 text-right"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
              /{maxMarks}
            </span>
          </div>
        )}

        {/* Expand feedback */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Save */}
        {state.dirty && (
          <Button size="sm" className="shrink-0 h-8 text-xs" onClick={save} disabled={state.saving}>
            {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1">Save</span>
          </Button>
        )}
      </div>

      {/* Expanded feedback */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-border/50">
          <label className="text-xs font-medium text-muted-foreground">Feedback / Remarks</label>
          <Textarea
            placeholder="Optional feedback for this student…"
            value={state.feedback}
            onChange={e => update({ feedback: e.target.value })}
            className="mt-1.5 text-sm resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

// ─── Grading Sheet ────────────────────────────────────────────────────────────
function AssignmentGradingSheet({
  assignment,
  open,
  onClose,
}: {
  assignment: AssignmentResponse | null;
  open: boolean;
  onClose: () => void;
}) {
  const [roster, setRoster] = useState<AssignmentRosterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "submitted" | "graded" | "not_submitted">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    setLoading(true);
    setRoster(null);
    assignmentApi.getAssignmentRoster(assignment.id)
      .then(r => { if (!cancelled) setRoster(r); })
      .catch((err: any) => {
        const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Failed to load roster";
        toast.error(`Roster error: ${msg}`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, assignment]);

  const handleSaved = useCallback((updated: AssignmentRosterEntry) => {
    setRoster(prev => {
      if (!prev) return prev;
      const students = prev.students.map(s => s.studentId === updated.studentId ? updated : s);
      const submitted = students.filter(s => s.hasSubmitted).length;
      const graded    = students.filter(s => s.submissionStatus === "graded").length;
      return {
        ...prev,
        students,
        assignment: { ...prev.assignment, submissionCount: submitted, gradedCount: graded },
      };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!roster) return [];
    return roster.students.filter(s => {
      if (filter === "submitted" && s.submissionStatus !== "submitted") return false;
      if (filter === "graded"    && s.submissionStatus !== "graded")    return false;
      if (filter === "not_submitted" && s.hasSubmitted) return false;
      if (search && !s.studentName.toLowerCase().includes(search.toLowerCase()) &&
          !(s.rollNumber ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [roster, filter, search]);

  if (!assignment) return null;

  const stats = roster ? {
    total:        roster.students.length,
    submitted:    roster.students.filter(s => s.hasSubmitted).length,
    graded:       roster.students.filter(s => s.submissionStatus === "graded").length,
    notSubmitted: roster.students.filter(s => !s.hasSubmitted).length,
  } : null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle className="text-lg leading-snug">{assignment.title}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> {assignment.subjectName}
                {assignment.sectionName && <> · {assignment.className} – {assignment.sectionName}</>}
                {!assignment.sectionName && <> · {assignment.className}</>}
                <span className="text-muted-foreground">· Max: {assignment.maxMarks} marks</span>
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">{assignment.status}</Badge>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold">Submitted</p>
                <p className="text-xl font-bold text-blue-700">{stats.submitted}<span className="text-xs font-normal text-blue-500">/{stats.total}</span></p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Graded</p>
                <p className="text-xl font-bold text-emerald-700">{stats.graded}<span className="text-xs font-normal text-emerald-500">/{stats.total}</span></p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wide text-rose-600 font-semibold">Not submitted</p>
                <p className="text-xl font-bold text-rose-700">{stats.notSubmitted}<span className="text-xs font-normal text-rose-500">/{stats.total}</span></p>
              </div>
            </div>
          )}
        </SheetHeader>

        {loading ? (
          <div className="space-y-3 mt-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !roster ? null : (
          <div className="space-y-4 mt-2">
            {/* Filter + search bar */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all","submitted","graded","not_submitted"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filter === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "All" : f === "not_submitted" ? "Not submitted" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === f ? "bg-white/20" : "bg-gray-100"}`}>
                    {f === "all" ? roster.students.length
                      : f === "not_submitted" ? roster.students.filter(s => !s.hasSubmitted).length
                      : roster.students.filter(s => s.submissionStatus === f).length}
                  </span>
                </button>
              ))}
              <div className="flex-1 min-w-0" />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search student…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-44"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Roster list */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No students match</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(entry => (
                  <RosterRow
                    key={entry.studentId}
                    entry={entry}
                    maxMarks={assignment.maxMarks}
                    assignmentId={assignment.id}
                    onSaved={handleSaved}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function AssignmentManager() {
  const { hasUserPermission, permissionsLoaded } = usePermissions();
  const canCreateAssignment = hasUserPermission('Assignments', 'Create');
  const canViewAssignments = hasUserPermission('Assignments', 'View');
  const accessDenied = permissionsLoaded && !canViewAssignments && !canCreateAssignment;
  const [assignments,      setAssignments]      = useState<AssignmentResponse[]>([]);
  const [classAssignments, setClassAssignments] = useState<MyClassAssignment[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [activeClassName,  setActiveClassName]  = useState<string>("all"); // "all" or a class name
  const [activeSectionId,  setActiveSectionId]  = useState<string>("all"); // "all" or a classId (which maps to a section)
  const [search,           setSearch]           = useState("");
  const [statusFilter,     setStatusFilter]     = useState<string>("all");
  const [showCreate,       setShowCreate]       = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentResponse | null>(null);
  const [gradingAssignment,  setGradingAssignment]  = useState<AssignmentResponse | null>(null);

  // ── class/section metadata ─────────────────────────────────────────────────
  // uniqueSections: one entry per classId (= one class+section combo)
  const uniqueSections = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ key: string; classId: string; className: string; sectionId?: string; sectionName?: string; studentCount: number }> = [];
    for (const a of classAssignments) {
      if (!seen.has(a.classId)) {
        seen.add(a.classId);
        result.push({
          key:          a.classId,
          classId:      a.classId,
          className:    a.className ?? "Unknown",
          sectionId:    a.sectionId ?? undefined,
          sectionName:  a.sectionName ?? undefined,
          studentCount: a.studentCount ?? 0,
        });
      }
    }
    return result;
  }, [classAssignments]);

  // classesByName: group sections under each class name, assign a stable colour index
  const classesByName = useMemo(() => {
    const m = new Map<string, { className: string; colorIdx: number; sections: typeof uniqueSections }>();
    uniqueSections.forEach(s => {
      if (!m.has(s.className)) m.set(s.className, { className: s.className, colorIdx: m.size, sections: [] });
      m.get(s.className)!.sections.push(s);
    });
    return [...m.values()];
  }, [uniqueSections]);

  // helper: get color for a className
  const colorForClass = (className: string) => {
    const entry = classesByName.find(c => c.className === className);
    return pal(entry?.colorIdx ?? 0);
  };
  const colorForClassId = (classId: string) => {
    const sec = uniqueSections.find(s => s.classId === classId);
    return colorForClass(sec?.className ?? "");
  };
  // label for detail sheet
  const labelForAssignment = (a: AssignmentResponse) => {
    const sec = uniqueSections.find(s => s.classId === a.classId);
    if (!sec) return a.classId;
    return sec.sectionName ? `${sec.className} – ${sec.sectionName}` : sec.className;
  };

  // ── load ───────────────────────────────────────────────────────────────────
  const loadAssignments = async () => {
    const res = await assignmentApi.getAssignments(undefined, undefined, undefined, 1, 200);
    setAssignments(res.assignments ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      assignmentApi.getAssignments(undefined, undefined, undefined, 1, 200),
      academicApi.getMyClassAssignments().catch(() => [] as MyClassAssignment[]),
    ])
      .then(([assignRes, caList]) => {
        if (cancelled) return;
        setAssignments(assignRes.assignments ?? []);
        setClassAssignments(caList);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // reset section when class changes
  const handleSetActiveClass = (cn: string) => {
    setActiveClassName(cn);
    setActiveSectionId("all");
  };

  // ── filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => assignments.filter(a => {
    if (activeClassName !== "all") {
      const sec = uniqueSections.find(s => s.classId === a.classId);
      if (!sec || sec.className !== activeClassName) return false;
      if (activeSectionId !== "all" && a.classId !== activeSectionId) return false;
    }
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.subjectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [assignments, activeClassName, activeSectionId, uniqueSections, statusFilter, search]);

  // grouped by className then classId (for "all classes" view)
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, AssignmentResponse[]>>();
    for (const a of filtered) {
      const sec = uniqueSections.find(s => s.classId === a.classId);
      const cn  = sec?.className ?? a.classId;
      if (!m.has(cn)) m.set(cn, new Map());
      const inner = m.get(cn)!;
      if (!inner.has(a.classId)) inner.set(a.classId, []);
      inner.get(a.classId)!.push(a);
    }
    return m;
  }, [filtered, uniqueSections]);

  // ── stats ──────────────────────────────────────────────────────────────────
  const overdue      = assignments.filter(a => a.status === "overdue" || dueUrgency(a.dueDate) === "overdue").length;
  const dueThisWeek  = assignments.filter(a => { const u = dueUrgency(a.dueDate); return u === "soon" || u === "upcoming"; }).length;
  const active       = assignments.filter(a => a.status === "active" || a.status === "pending").length;
  const totalStudents = useMemo(() => {
    const seen = new Set<string>();
    let sum = 0;
    for (const s of uniqueSections) { if (!seen.has(s.classId)) { seen.add(s.classId); sum += s.studentCount; } }
    return sum;
  }, [uniqueSections]);

  // ── create form ────────────────────────────────────────────────────────────
  const { register, handleSubmit, control, watch: wf, reset: resetForm, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { assignedDate: new Date().toISOString().split("T")[0], status: "active" } });

  const watchedClassId = wf("classId");
  const subjectsForForm = useMemo(() => {
    if (!watchedClassId) return [];
    return classAssignments
      .filter(a => a.classId === watchedClassId && a.subjectId && a.subjectName)
      .map(a => ({ id: a.subjectId!, name: a.subjectName! }))
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
  }, [classAssignments, watchedClassId]);

  const onSubmit = async (data: CreateForm) => {
    try {
      await assignmentApi.createAssignment({
        classId: data.classId, subjectId: data.subjectId,
        title: data.title, description: data.description ?? "",
        assignedDate: data.assignedDate, dueDate: data.dueDate,
        maxMarks: data.maxMarks ?? 100, status: data.status,
      });
      toast.success("Assignment created successfully");
      setShowCreate(false);
      resetForm();
      await loadAssignments();
    } catch {
      toast.error("Failed to create assignment");
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="rounded-full bg-destructive/10 p-5">
          <ShieldOff className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground max-w-sm">
            You don't have permission to view or create assignments. Contact your administrator to get the Subject Teacher role.
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Ask your admin to assign you a Subject Teacher or Class Teacher role.")}>
          How to get access?
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Assignments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All assignments across your classes at a glance</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0" disabled={!canCreateAssignment} title={!canCreateAssignment ? 'No permission to create assignments' : undefined}>
          <Plus className="h-4 w-4 mr-1.5" />New Assignment
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FileText className="h-5 w-5" />}   value={assignments.length}   label="Total Created"    sub={`across ${classesByName.length} class${classesByName.length !== 1 ? "es" : ""}`}  colorCls="text-blue-600"   />
          <StatCard icon={<Timer className="h-5 w-5" />}      value={dueThisWeek}          label="Due This Week"    sub={overdue > 0 ? `${overdue} overdue` : "On track"}                                    colorCls={overdue > 0 ? "text-red-600" : "text-amber-600"} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} value={active}               label="Active"           sub="Awaiting submission"                                                                 colorCls="text-green-600"  />
          <StatCard icon={<Users className="h-5 w-5" />}      value={totalStudents || "—"} label="Students Reached" sub="Across assigned classes"                                                            colorCls="text-violet-600" />
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All pill */}
        <button
          onClick={() => handleSetActiveClass("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            activeClassName === "all" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Classes
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeClassName === "all" ? "bg-white/20" : "bg-gray-100"}`}>
            {assignments.length}
          </span>
        </button>

        {/* One pill per class NAME */}
        {classesByName.map(({ className, colorIdx }) => {
          const c = pal(colorIdx);
          const cnt = assignments.filter(a => uniqueSections.find(s => s.classId === a.classId)?.className === className).length;
          const isActive = activeClassName === className;
          return (
            <button
              key={className}
              onClick={() => handleSetActiveClass(isActive ? "all" : className)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isActive ? c.activePill : `${c.inactivePill} hover:${c.bg}`}`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${c.dot}`} />
              {className}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/25" : c.bg}`}>{cnt}</span>
            </button>
          );
        })}

        <div className="flex-1 min-w-2" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search title or subject…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-52"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section sub-tabs (shown when a class is selected and it has multiple sections) */}
      {activeClassName !== "all" && (() => {
        const entry = classesByName.find(c => c.className === activeClassName);
        if (!entry || entry.sections.length <= 1) return null;
        const c = pal(entry.colorIdx);
        return (
          <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl ${c.bg} border ${c.border}`}>
            <span className={`text-xs font-semibold ${c.text} mr-1`}>Section:</span>
            <button
              onClick={() => setActiveSectionId("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${activeSectionId === "all" ? c.activePill : `${c.inactivePill} hover:bg-white/50`}`}
            >
              All sections
            </button>
            {entry.sections.map(sec => (
              <button
                key={sec.key}
                onClick={() => setActiveSectionId(activeSectionId === sec.classId ? "all" : sec.classId)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${activeSectionId === sec.classId ? c.activePill : `${c.inactivePill} hover:bg-white/50`}`}
              >
                {sec.sectionName ?? "Default"}
                {sec.studentCount > 0 && <span className="ml-1 opacity-70">· {sec.studentCount}</span>}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-9 w-48 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(j => <Skeleton key={j} className="h-52 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-base font-medium">No assignments found</p>
          <p className="text-sm mt-1">
            {assignments.length === 0 ? "Create your first assignment to get started." : "Try adjusting your filters or search."}
          </p>
          {assignments.length === 0 && (
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)} disabled={!canCreateAssignment} title={!canCreateAssignment ? 'No permission to create assignments' : undefined}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Create First Assignment
            </Button>
          )}
        </div>
      ) : activeClassName === "all" ? (
        /* ── ALL: grouped by class name, sections within ── */
        <div className="space-y-10">
          {classesByName
            .filter(({ className }) => grouped.has(className))
            .map(({ className, colorIdx, sections }) => {
              const c = pal(colorIdx);
              const classMap = grouped.get(className)!;
              const totalForClass = [...classMap.values()].reduce((s, arr) => s + arr.length, 0);
              const totalStudentsInClass = sections.reduce((s, sec) => s + sec.studentCount, 0);

              return (
                <section key={className}>
                  {/* ── Class header ── */}
                  <div className={`flex items-center justify-between mb-4 px-4 py-3 rounded-xl ${c.bg} border ${c.border}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                      <span className={`font-bold text-base ${c.text}`}>{className}</span>
                      {totalStudentsInClass > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />{totalStudentsInClass} students
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{totalForClass} assignment{totalForClass !== 1 ? "s" : ""}</span>
                  </div>

                  {/* ── Sections within this class ── */}
                  <div className="space-y-5">
                    {sections
                      .filter(sec => classMap.has(sec.classId))
                      .map(sec => {
                        const list = classMap.get(sec.classId) ?? [];
                        const showSectionHeader = sections.length > 1; // only if class has multiple sections

                        return (
                          <div key={sec.key}>
                            {/* Section sub-header (only when there are multiple sections) */}
                            {showSectionHeader && (
                              <div className={`flex items-center justify-between mb-2.5 px-3 py-1.5 rounded-lg ${c.secBg} border ${c.border} border-opacity-50`}>
                                <span className={`text-xs font-semibold ${c.text}`}>
                                  Section {sec.sectionName ?? "Default"}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  {sec.studentCount > 0 && <><Users className="h-2.5 w-2.5" /> {sec.studentCount} &nbsp;·&nbsp;</>}
                                  {list.length} assignment{list.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {list.slice(0, 8).map(a => (
                                <AssignmentCard key={a.id} a={a} color={c} sectionLabel={sec.sectionName ? `${className} · ${sec.sectionName}` : className} onClick={() => setSelectedAssignment(a)} onGrade={a => setGradingAssignment(a)} />
                              ))}
                              {list.length > 8 && (
                                <button
                                  onClick={() => { handleSetActiveClass(className); setActiveSectionId(sec.classId); }}
                                  className={`rounded-xl border-2 border-dashed ${c.border} ${c.bg} flex flex-col items-center justify-center gap-2 p-6 hover:opacity-80 transition-opacity min-h-[8rem]`}
                                >
                                  <MoreHorizontal className={`h-6 w-6 ${c.text} opacity-50`} />
                                  <span className={`text-sm font-semibold ${c.text}`}>+{list.length - 8} more</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              );
            })}
        </div>
      ) : (
        /* ── Single class view (sections already filtered via activeSectionId) ── */
        (() => {
          const entry = classesByName.find(c => c.className === activeClassName);
          const c = pal(entry?.colorIdx ?? 0);
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(a => {
                const sec2 = uniqueSections.find(s => s.classId === a.classId);
                const secLabel = sec2 ? (sec2.sectionName ? `${sec2.className} · ${sec2.sectionName}` : sec2.className) : (a.className || undefined);
                return (
                  <AssignmentCard key={a.id} a={a} color={c} sectionLabel={secLabel} onClick={() => setSelectedAssignment(a)} onGrade={a => setGradingAssignment(a)} />
                );
              })}
            </div>
          );
        })()
      )}

      {/* ── Assignment Detail Sheet ── */}
      <AssignmentDetailSheet
        a={selectedAssignment}
        open={selectedAssignment !== null}
        onClose={() => setSelectedAssignment(null)}
        classLabel={selectedAssignment ? labelForAssignment(selectedAssignment) : ""}
        onGrade={a => setGradingAssignment(a)}
      />

      {/* ── Assignment Grading Sheet ── */}
      <AssignmentGradingSheet
        assignment={gradingAssignment}
        open={gradingAssignment !== null}
        onClose={() => { setGradingAssignment(null); loadAssignments(); }}
      />

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              New Assignment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
                <Input {...register("title")} placeholder="e.g. Chapter 5 Homework" className="mt-1" />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Class <span className="text-destructive">*</span></label>
                <Controller name="classId" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classesByName.map(({ className, colorIdx, sections }) => (
                        sections.length === 1 ? (
                          <SelectItem key={sections[0].classId} value={sections[0].classId}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${pal(colorIdx).dot}`} />
                              {className}
                            </span>
                          </SelectItem>
                        ) : (
                          sections.map(sec => (
                            <SelectItem key={sec.classId} value={sec.classId}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${pal(colorIdx).dot}`} />
                                {className}{sec.sectionName ? ` – ${sec.sectionName}` : ""}
                              </span>
                            </SelectItem>
                          ))
                        )
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Subject <span className="text-destructive">*</span></label>
                <Controller name="subjectId" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!watchedClassId || subjectsForForm.length === 0}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={!watchedClassId ? "Select class first" : subjectsForForm.length === 0 ? "No subjects" : "Select subject"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForForm.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.subjectId && <p className="text-xs text-destructive mt-1">{errors.subjectId.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Assigned Date <span className="text-destructive">*</span></label>
                <Input type="date" {...register("assignedDate")} className="mt-1" />
                {errors.assignedDate && <p className="text-xs text-destructive mt-1">{errors.assignedDate.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Due Date <span className="text-destructive">*</span></label>
                <Input type="date" {...register("dueDate")} className="mt-1" />
                {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Max Marks</label>
                <Input type="number" min={0} max={1000} {...register("maxMarks")} placeholder="100" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Visibility</label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Publish now (visible to students)</SelectItem>
                      <SelectItem value="draft">Save as draft</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description &amp; Instructions</label>
              <Textarea {...register("description")} placeholder="Describe the assignment and any instructions…" rows={4} className="mt-1" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create Assignment"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
