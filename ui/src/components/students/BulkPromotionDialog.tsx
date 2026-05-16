/**
 * BulkPromotionDialog — end-of-year student promotion wizard.
 *
 * Steps:
 *  loading    — fetches all active students
 *  review     — grouped by class / section; each student can be toggled Promote ↑ or Detain ↺
 *  confirm    — summary table before submitting
 *  processing — API calls in progress with live progress bar
 *  done       — result summary
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, ArrowUpCircle, Anchor, CheckCircle2,
  AlertTriangle, Loader2, Users, GraduationCap, Info,
} from "lucide-react";
import { toast } from "sonner";
import { studentApi, type StudentBasic, type BulkOperationResult } from "@/services/api/studentApi";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getNextClass(cls: string): string | null {
  const n = parseInt(cls, 10);
  if (isNaN(n) || n >= 12) return null;
  return String(n + 1);
}

// ─── types ───────────────────────────────────────────────────────────────────

type Decision = "promote" | "detain";

interface StudentRow extends StudentBasic {
  decision: Decision;
}

interface ClassGroup {
  key: string;
  cls: string;
  section: string;
  nextClass: string | null;
  students: StudentRow[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface BulkPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful promotion run so the parent can refresh its data. */
  onComplete?: () => void;
}

export function BulkPromotionDialog({ open, onOpenChange, onComplete }: BulkPromotionDialogProps) {
  type Step = "loading" | "review" | "confirm" | "processing" | "done";

  const [step, setStep]             = useState<Step>("loading");
  const [students, setStudents]     = useState<StudentRow[]>([]);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [expandedGroups, setExpanded] = useState<Set<string>>(new Set());
  const [progress, setProgress]     = useState(0);
  const [doneResult, setDoneResult] = useState<{
    promoted: number; detained: number; class12Count: number; errors: string[];
  } | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    setStep("loading");
    setLoadError(null);
    try {
      const res = await studentApi.list({ status: "active", pageSize: 1000 } as Record<string, unknown>);
      const rows: StudentRow[] = (res.students ?? []).map((s) => ({
        ...s,
        decision: "promote" as Decision,
      }));
      setStudents(rows);
      // Auto-expand all groups
      setExpanded(new Set(rows.map((s) => `${s.class}|${s.section ?? ""}`)));
      setStep("review");
    } catch {
      setLoadError("Failed to load students. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStudents([]);
      setDoneResult(null);
      setProgress(0);
      setExpanded(new Set());
      loadStudents();
    }
  }, [open, loadStudents]);

  // ── derived data ───────────────────────────────────────────────────────────
  const groups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, StudentRow[]>();
    students.forEach((s) => {
      const key = `${s.class}|${s.section ?? ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    const list: ClassGroup[] = [];
    map.forEach((rows, key) => {
      const [cls, section] = key.split("|");
      list.push({
        key, cls, section,
        nextClass: getNextClass(cls),
        students: rows.sort((a, b) =>
          (a.rollNumber ?? "").localeCompare(b.rollNumber ?? "", undefined, { numeric: true })
        ),
      });
    });
    return list.sort((a, b) => {
      const na = parseInt(a.cls, 10) || 0;
      const nb = parseInt(b.cls, 10) || 0;
      return na !== nb ? na - nb : a.section.localeCompare(b.section);
    });
  }, [students]);

  const totalPromote = students.filter((s) => s.decision === "promote" && getNextClass(s.class) !== null).length;
  const totalDetain  = students.filter((s) => s.decision === "detain").length;
  const totalClass12 = students.filter((s) => getNextClass(s.class) === null).length;

  // ── decision helpers ───────────────────────────────────────────────────────
  const setStudentDecision = (id: string, d: Decision) =>
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, decision: d } : s)));

  const setGroupDecision = (key: string, d: Decision) =>
    setStudents((prev) => prev.map((s) => (`${s.class}|${s.section ?? ""}` === key ? { ...s, decision: d } : s)));

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── submit ─────────────────────────────────────────────────────────────────
  async function handleConfirm() {
    setStep("processing");
    setProgress(0);

    // Build map of promoted students grouped by their target class/section
    const promoteMap = new Map<string, StudentRow[]>();
    students.forEach((s) => {
      if (s.decision !== "promote") return;
      const nextCls = getNextClass(s.class);
      if (!nextCls) return; // Class 12 — skip
      const key = `${nextCls}|${s.section ?? ""}`;
      if (!promoteMap.has(key)) promoteMap.set(key, []);
      promoteMap.get(key)!.push(s);
    });

    let promoted = 0;
    const errors: string[] = [];
    const total = promoteMap.size;
    let done = 0;

    for (const [key, groupStudents] of promoteMap) {
      const [newClass, newSection] = key.split("|");
      try {
        const result: BulkOperationResult = await studentApi.bulkPromote({
          studentIds: groupStudents.map((s) => s.id),
          newClass,
          newSection: newSection ?? "",  // backend requires a string (empty = no section change)
        });
        promoted += result.successCount ?? groupStudents.length;
        if (result.errors?.length) errors.push(...result.errors);
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          `Failed to promote students to Class ${newClass}`;
        errors.push(msg);
      } finally {
        done++;
        setProgress(total > 0 ? Math.round((done / total) * 100) : 100);
      }
    }

    setDoneResult({ promoted, detained: totalDetain, class12Count: totalClass12, errors });
    setStep("done");

    if (errors.length === 0) {
      toast.success(`Promotion complete! ${promoted} students promoted.`);
      onComplete?.();
    } else {
      toast.warning("Promotion completed with some errors.");
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            Bulk Student Promotion
          </DialogTitle>
          <DialogDescription>
            Promote eligible students to the next class. Mark failed students as{" "}
            <strong>Detain</strong> — they remain in the current class for the next academic year.
          </DialogDescription>
        </DialogHeader>

        {/* ── loading ── */}
        {step === "loading" && !loadError && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading student roster...</p>
          </div>
        )}

        {step === "loading" && loadError && (
          <div className="flex flex-col items-center gap-4 py-14">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-destructive text-sm text-center">{loadError}</p>
            <Button variant="outline" onClick={loadStudents}>Retry</Button>
          </div>
        )}

        {/* ── review ── */}
        {step === "review" && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-5 px-6 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{students.length} students</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">{totalPromote} to promote</span>
              </div>
              {totalDetain > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Anchor className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700">{totalDetain} detained</span>
                </div>
              )}
              {totalClass12 > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-700">{totalClass12} Class 12 (passout)</span>
                </div>
              )}
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    setStudents((p) => p.map((s) => ({ ...s, decision: "promote" as Decision })))
                  }
                >
                  Reset All → Promote
                </Button>
              </div>
            </div>

            {/* Class 12 notice */}
            {totalClass12 > 0 && (
              <div className="flex items-start gap-2 mx-6 mt-3 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/30 p-3 text-sm text-purple-800 dark:text-purple-300 shrink-0">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{totalClass12}</strong> Class 12 student
                  {totalClass12 !== 1 ? "s" : ""} cannot be bulk-promoted. Process their passout via
                  the Student Profile → <em>Passed Out</em> option.
                </span>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                {groups.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    No active students found.
                  </div>
                )}

                {groups.map((group) => {
                  const expanded = expandedGroups.has(group.key);
                  const gPromote = group.students.filter(
                    (s) => s.decision === "promote" && group.nextClass !== null
                  ).length;
                  const gDetain = group.students.filter((s) => s.decision === "detain").length;
                  const isPassout = group.nextClass === null;

                  return (
                    <div key={group.key} className="border rounded-lg overflow-hidden">
                      {/* Group header */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 select-none"
                        onClick={() => toggleGroup(group.key)}
                      >
                        {expanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

                        <span className="font-semibold text-sm">
                          Class {group.cls}{group.section ? ` — Section ${group.section}` : ""}
                        </span>

                        {isPassout ? (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                            Class 12 — Passout Required
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            → Class {group.nextClass}{group.section ? ` (${group.section})` : ""}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-3">
                          <span className="text-xs text-green-700 font-medium">{gPromote} promote</span>
                          {gDetain > 0 && (
                            <span className="text-xs text-amber-700 font-medium">{gDetain} detained</span>
                          )}
                          <span className="text-xs text-muted-foreground">({group.students.length})</span>

                          {!isPassout && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                onClick={(e) => { e.stopPropagation(); setGroupDecision(group.key, "detain"); }}
                              >
                                Detain All
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                                onClick={(e) => { e.stopPropagation(); setGroupDecision(group.key, "promote"); }}
                              >
                                Promote All
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Student rows */}
                      {expanded && (
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="text-xs py-2 pl-4">Name</TableHead>
                                <TableHead className="text-xs py-2">Roll No</TableHead>
                                <TableHead className="text-xs py-2">Adm. No</TableHead>
                                <TableHead className="text-xs py-2 text-center w-56">Decision</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.students.map((s) => (
                                <TableRow
                                  key={s.id}
                                  className={s.decision === "detain" ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}
                                >
                                  <TableCell className="py-2 text-sm font-medium pl-4">{s.name}</TableCell>
                                  <TableCell className="py-2 text-sm text-muted-foreground">
                                    {s.rollNumber ?? "—"}
                                  </TableCell>
                                  <TableCell className="py-2 text-sm text-muted-foreground">
                                    {s.admissionNumber}
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    {isPassout ? (
                                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                        Passout
                                      </Badge>
                                    ) : (
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          variant={s.decision === "promote" ? "default" : "outline"}
                                          className="h-7 text-xs gap-1"
                                          onClick={() => setStudentDecision(s.id, "promote")}
                                        >
                                          <ArrowUpCircle className="h-3 w-3" />
                                          Promote
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={s.decision === "detain" ? "secondary" : "outline"}
                                          className={`h-7 text-xs gap-1 ${
                                            s.decision === "detain"
                                              ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                              : ""
                                          }`}
                                          onClick={() => setStudentDecision(s.id, "detain")}
                                        >
                                          <Anchor className="h-3 w-3" />
                                          Detain
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between px-6 py-4 border-t shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={students.length === 0 || totalPromote === 0}
              >
                Review Summary →
              </Button>
            </div>
          </>
        )}

        {/* ── confirm ── */}
        {step === "confirm" && (
          <div className="flex flex-col gap-4 px-6 py-5 overflow-auto">
            <div className="grid grid-cols-3 gap-4 shrink-0">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{totalPromote}</p>
                <p className="text-xs text-muted-foreground mt-1">Students Promoting</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{totalDetain}</p>
                <p className="text-xs text-muted-foreground mt-1">Students Detained</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-muted-foreground">{students.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Students</p>
              </div>
            </div>

            <div className="h-64 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Promoting to</TableHead>
                    <TableHead className="text-center">Promoting</TableHead>
                    <TableHead className="text-center">Detained</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => {
                    const gPromote = g.students.filter((s) => s.decision === "promote" && g.nextClass !== null).length;
                    const gDetain  = g.students.filter((s) => s.decision === "detain").length;
                    return (
                      <TableRow key={g.key}>
                        <TableCell className="font-medium">Class {g.cls}</TableCell>
                        <TableCell>{g.section || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {g.nextClass
                            ? `Class ${g.nextClass}${g.section ? ` (${g.section})` : ""}`
                            : <Badge variant="secondary" className="text-xs">Passout</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{gPromote}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {gDetain > 0
                            ? <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">{gDetain}</Badge>
                            : <span className="text-muted-foreground text-sm">—</span>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalDetain > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300 shrink-0">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{totalDetain}</strong> detained student{totalDetain !== 1 ? "s" : ""} will remain in their current class — no record changes will be made.
                </span>
              </div>
            )}

            {totalClass12 > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/30 p-3 text-sm text-purple-800 dark:text-purple-300 shrink-0">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{totalClass12}</strong> Class 12 student{totalClass12 !== 1 ? "s" : ""} excluded — process their passout individually.
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between shrink-0">
              <Button variant="outline" onClick={() => setStep("review")}>← Back</Button>
              <Button onClick={handleConfirm} disabled={totalPromote === 0}>
                Confirm &amp; Promote {totalPromote} Student{totalPromote !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* ── processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-6 py-16 px-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full max-w-sm space-y-2">
              <p className="text-center text-sm font-medium">Processing promotions...</p>
              <Progress value={progress} className="h-2.5" />
              <p className="text-center text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* ── done ── */}
        {step === "done" && doneResult && (
          <div className="space-y-4 px-6 py-5">
            <div className={`flex items-start gap-3 rounded-lg border p-4 ${
              doneResult.errors.length === 0
                ? "border-green-300 bg-green-50 dark:bg-green-950/30"
                : "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
            }`}>
              {doneResult.errors.length === 0
                ? <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              }
              <div className="space-y-1">
                <p className="font-bold text-base">
                  {doneResult.errors.length === 0
                    ? "Promotion Completed Successfully!"
                    : "Promotion Completed with Some Errors"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-green-700 dark:text-green-400">{doneResult.promoted}</span> student{doneResult.promoted !== 1 ? "s" : ""} promoted to the next class.
                  {doneResult.detained > 0 && (
                    <> <span className="font-semibold text-amber-700 dark:text-amber-400">{doneResult.detained}</span> detained (no changes).</>
                  )}
                  {doneResult.class12Count > 0 && (
                    <> <span className="font-semibold text-purple-700 dark:text-purple-400">{doneResult.class12Count}</span> Class 12 excluded.</>
                  )}
                </p>
              </div>
            </div>

            {doneResult.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-destructive">Errors ({doneResult.errors.length})</p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 max-h-40 overflow-y-auto space-y-1">
                  {doneResult.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                  {doneResult.errors.length > 20 && (
                    <p className="text-xs text-muted-foreground">…and {doneResult.errors.length - 20} more</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => onOpenChange(false)} className="min-w-24">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

