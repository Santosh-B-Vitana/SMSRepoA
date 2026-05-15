/**
 * StaffDeactivateDialog
 * ─────────────────────
 * Shown before deactivating a staff member.
 *
 * For each class/section/subject assignment the departing staff holds the
 * admin can choose:
 *   • Remove  — unlinks the assignment immediately (fill the vacancy later)
 *   • Reassign — picks a replacement: backend creates a new TeacherAssignment
 *                for the replacement staff (updates their "My Classes" too)
 *
 * On confirm: calls POST /api/staff/{id}/deactivate with all actions.
 * The backend uses the AcademicsService so role-management hooks fire correctly.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BookOpen, UserX, Loader2, GraduationCap, RefreshCw } from "lucide-react";
import { staffApi, type StaffBasic, type DeactivateStaffAssignmentAction } from "@/services/api/staffApi";
import { academicApi, type TeacherAssignmentResponse } from "@/services/api/academicApi";
import { toast } from "sonner";

// ─── Local types ─────────────────────────────────────────────────────────────

interface AssignmentRow {
  assignment: TeacherAssignmentResponse;
  /** "remove" = unlink only, "reassign" = assign to newStaffId */
  action: "remove" | "reassign";
  newStaffId: string;
  newStaffName: string; // for display only
}

interface Props {
  /** The staff member to deactivate. Pass null to close. */
  staff: StaffBasic | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function getStaffName(s: StaffBasic): string {
  return (s.name || `${(s as any).firstName ?? ""} ${(s as any).lastName ?? ""}`.trim()) || s.email;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffDeactivateDialog({ staff, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [allActiveStaff, setAllActiveStaff] = useState<StaffBasic[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  const open = staff !== null;
  const staffName = staff ? getStaffName(staff) : "";

  // ── Load data when dialog opens ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!staff) return;
    setLoadingData(true);
    try {
      const [assignRes, staffRes] = await Promise.all([
        academicApi.getTeacherAssignments({ staffId: staff.id, pageSize: 100 }),
        staffApi.list({ pageSize: 1000 }),
      ]);
      setRows(
        (assignRes.assignments ?? []).map((a) => ({
          assignment: a,
          action: "remove",
          newStaffId: "",
          newStaffName: "",
        }))
      );
      // Exclude the staff being deactivated; include only active ones
      setAllActiveStaff(
        (staffRes.staff ?? []).filter(
          (s) => s.id !== staff.id && s.status === "active"
        )
      );
    } catch {
      toast.error("Error loading data", {
        description: "Could not fetch class assignments. Please close and try again.",
      });
    } finally {
      setLoadingData(false);
    }
  }, [staff, toast]);

  useEffect(() => {
    if (open) {
      setRows([]);
      setAllActiveStaff([]);
      setOpenDropdownIdx(null);
      loadData();
    }
  }, [open, loadData]);

  // ── Row helpers ───────────────────────────────────────────────────────────
  const setRemove = (idx: number) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, action: "remove", newStaffId: "", newStaffName: "" } : r))
    );

  const setReassign = (idx: number, staffId: string, staffName: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, action: "reassign", newStaffId: staffId, newStaffName: staffName } : r))
    );

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!staff) return;

    // Validate every "reassign" row has a replacement picked
    const missingRow = rows.find((r) => r.action === "reassign" && !r.newStaffId);
    if (missingRow) {
      const a = missingRow.assignment;
      toast.error("Select a replacement", {
        description: `Choose a replacement teacher for: ${[a.className, a.sectionName, a.subjectName].filter(Boolean).join(" › ")}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const actions: DeactivateStaffAssignmentAction[] = rows.map((r) => ({
        assignmentId: r.assignment.id,
        action: r.action,
        newStaffId: r.action === "reassign" ? r.newStaffId : undefined,
      }));

      await staffApi.deactivate(staff.id, actions);

      const removed = rows.filter((r) => r.action === "remove").length;
      const reassigned = rows.filter((r) => r.action === "reassign").length;
      const parts: string[] = [];
      if (removed > 0) parts.push(`${removed} assignment(s) removed`);
      if (reassigned > 0) parts.push(`${reassigned} assignment(s) reassigned`);

      toast.success("Staff Deactivated", {
        description: `${staffName} has been deactivated. Login access revoked.${parts.length ? " " + parts.join(", ") + "." : ""}`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      // Extract backend error message
      let msg = "Failed to deactivate staff member.";
      if (err && typeof err === "object") {
        const axiosErr = err as any;
        msg =
          axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.Message ||
          axiosErr?.message ||
          msg;
      }
      toast.error("Deactivation failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Deactivate Staff Member
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Review and handle all class assignments before confirming deactivation of{" "}
            <strong>{staffName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <ul className="text-xs text-orange-700 space-y-0.5 list-disc list-inside">
              <li>Login access will be revoked immediately.</li>
              <li>Active sessions are blocked on next API request.</li>
              {rows.length > 0 && (
                <li>
                  <strong>{rows.length}</strong> class assignment(s) must be handled below.
                </li>
              )}
            </ul>
          </div>

          {/* Assignments */}
          {loadingData ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading class assignments…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No active class assignments</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                This staff member can be deactivated right away.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Class Assignments ({rows.length})
              </p>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {rows.map((row, idx) => {
                  const a = row.assignment;
                  const label = [a.className, a.sectionName].filter(Boolean).join(" › ");
                  return (
                    <div key={a.id} className="bg-background">
                      {/* Assignment info row */}
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-dashed border-border/50">
                        <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold">{label || a.className}</span>
                            {a.subjectName && (
                              <span className="text-xs text-muted-foreground">· {a.subjectName}</span>
                            )}
                            {a.isClassTeacher && (
                              <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                Class Teacher
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70">{a.academicYear}</p>
                        </div>
                        {/* Current action status badge */}
                        {row.action === "remove" ? (
                          <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                            Will be removed
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 max-w-[140px] truncate" title={`Reassign to: ${row.newStaffName}`}>
                            → {row.newStaffName}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-stretch gap-0 bg-muted/30">
                        {/* Remove option */}
                        <button
                          type="button"
                          onClick={() => { setRemove(idx); setOpenDropdownIdx(null); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-r border-border ${
                            row.action === "remove"
                              ? "bg-red-600 text-white"
                              : "text-muted-foreground hover:bg-muted hover:text-red-600"
                          }`}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Remove (assign later)
                        </button>

                        {/* Reassign option — dropdown trigger */}
                        <div className="flex-1 relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                            className={`w-full h-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                              row.action === "reassign"
                                ? "bg-blue-600 text-white"
                                : "text-muted-foreground hover:bg-muted hover:text-blue-600"
                            }`}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {row.action === "reassign" && row.newStaffName
                              ? `Reassigned: ${row.newStaffName}`
                              : "Reassign to…"}
                          </button>

                          {/* Staff picker dropdown */}
                          {openDropdownIdx === idx && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-white border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
                              {allActiveStaff.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                  No active staff available
                                </div>
                              ) : (
                                allActiveStaff.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setReassign(idx, s.id, getStaffName(s));
                                      setOpenDropdownIdx(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                                      row.newStaffId === s.id ? "bg-blue-50 text-blue-700 font-medium" : "text-foreground"
                                    }`}
                                  >
                                    <span className="font-medium">{getStaffName(s)}</span>
                                    {s.designation && (
                                      <span className="text-muted-foreground"> · {s.designation}</span>
                                    )}
                                    {s.department && (
                                      <span className="text-muted-foreground/60"> ({s.department})</span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/70">
                "Remove" untethers the class assignment immediately. "Reassign" transfers
                it to a replacement teacher who will see it under <em>My Classes</em>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loadingData || submitting}
            className="gap-2 min-w-[160px]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deactivating…
              </>
            ) : (
              <>
                <UserX className="h-4 w-4" />
                Confirm Deactivation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
