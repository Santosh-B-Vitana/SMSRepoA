/**
 * StudentLeaveRequests — staff/admin view of student leave requests.
 *
 * Features:
 * - Shows all or per-student leave requests
 * - Approve with optional remarks
 * - Deny with required reason
 * - "Call Parent" button shows guardian phone + WhatsApp link
 * - Attendance auto-marked on approval (handled by backend)
 */
import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Check, X, Phone, MessageSquare, CalendarDays, Loader2, AlertCircle,
  Clock, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import leaveManagementApi, { StudentLeaveItem } from "@/services/api/leaveManagementApi";

interface Props {
  /** If provided, shows only leaves for this student */
  studentId?: string;
  /** If true, shows compact mode (no separate card wrapper) */
  compact?: boolean;
}

function statusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case "approved": return { label: "Approved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    case "rejected": return { label: "Rejected", icon: <XCircle className="h-3.5 w-3.5" />, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
    default:          return { label: "Pending",  icon: <Clock className="h-3.5 w-3.5" />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function StudentLeaveRequests({ studentId, compact = false }: Props) {
  const [items, setItems]       = useState<StudentLeaveItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<StudentLeaveItem | null>(null);
  const [approveRemarks, setApproveRemarks] = useState("");

  // Deny dialog
  const [denyTarget, setDenyTarget] = useState<StudentLeaveItem | null>(null);
  const [denyReason, setDenyReason] = useState("");

  // Contact parent dialog
  const [contactTarget, setContactTarget] = useState<StudentLeaveItem | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveManagementApi.getStudentLeaves(
        1, 100,
        studentId,
        statusFilter === "all" ? undefined : statusFilter
      );
      setItems(res.items ?? []);
    } catch {
      toast.error("Failed to load student leave requests");
    } finally {
      setLoading(false);
    }
  }, [studentId, statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(approveTarget.id);
    try {
      await leaveManagementApi.approveStudentLeave(approveTarget.id, approveRemarks || undefined);
      toast.success(`Leave approved — attendance marked as excused for ${approveTarget.totalDays} day(s)`);
      setApproveTarget(null);
      setApproveRemarks("");
      fetchLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to approve leave");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async () => {
    if (!denyTarget) return;
    if (!denyReason.trim()) { toast.error("Please provide a reason for denying"); return; }
    setActionLoading(denyTarget.id);
    try {
      await leaveManagementApi.rejectStudentLeave(denyTarget.id, denyReason.trim());
      toast.success("Leave request denied");
      setDenyTarget(null);
      setDenyReason("");
      fetchLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to deny leave");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = items.filter(i => i.status?.toLowerCase() === "pending").length;
  const filtered = statusFilter === "all" ? items : items.filter(i => i.status?.toLowerCase() === statusFilter.toLowerCase());

  const content = (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0 text-[10px]">{pendingCount}</span>
            )}
          </button>
        ))}
        <button
          onClick={fetchLeaves}
          className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{statusFilter === "pending" ? "No pending leave requests" : "No leave requests found"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {!studentId && <TableHead className="font-semibold">Student</TableHead>}
                {!studentId && <TableHead className="font-semibold">Class</TableHead>}
                <TableHead className="font-semibold">Leave Type</TableHead>
                <TableHead className="font-semibold">From</TableHead>
                <TableHead className="font-semibold">To</TableHead>
                <TableHead className="text-center font-semibold">Days</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Applied</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const sc = statusConfig(item.status);
                const isPending = item.status?.toLowerCase() === "pending";
                const isProcessing = actionLoading === item.id;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    {!studentId && (
                      <TableCell className="font-medium text-sm">{item.studentName ?? item.applicantName ?? "—"}</TableCell>
                    )}
                    {!studentId && (
                      <TableCell className="text-sm text-muted-foreground">
                        {[item.className, item.section].filter(Boolean).join(" - ") || "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{item.leaveTypeName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(item.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(item.endDate)}</TableCell>
                    <TableCell className="text-center font-semibold text-sm">{item.totalDays}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px]">
                      <span className="block truncate" title={item.reason}>{item.reason || "—"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.applicationDate)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                        {sc.icon} {sc.label}
                      </span>
                      {!isPending && item.approverRemarks && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate" title={item.approverRemarks}>
                          {item.approverRemarks}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 gap-1 text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                              disabled={isProcessing}
                              onClick={() => { setApproveTarget(item); setApproveRemarks(""); }}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-xs">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 gap-1 text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                              disabled={isProcessing}
                              onClick={() => { setDenyTarget(item); setDenyReason(""); }}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-xs">Deny</span>
                            </Button>
                          </>
                        )}
                        {/* Contact parent — always available */}
                        {(item.guardianPhone || item.guardianName) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            onClick={() => setContactTarget(item)}
                            title={`Contact ${item.guardianName ?? "parent"}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <>
      {compact ? (
        content
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Student Leave Requests
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">{content}</CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Approve Leave
            </DialogTitle>
            <DialogDescription>
              Approve leave for <strong>{approveTarget?.studentName}</strong> from{" "}
              {approveTarget && formatDate(approveTarget.startDate)} to{" "}
              {approveTarget && formatDate(approveTarget.endDate)} ({approveTarget?.totalDays} day{(approveTarget?.totalDays ?? 0) > 1 ? "s" : ""}).
              <br />
              <span className="text-primary text-xs font-medium">Attendance will be automatically marked as excused.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Add a note to the parent (optional)…"
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={actionLoading === approveTarget?.id}
                onClick={handleApprove}
              >
                {actionLoading === approveTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={!!denyTarget} onOpenChange={(o) => { if (!o) setDenyTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" /> Deny Leave
            </DialogTitle>
            <DialogDescription>
              Deny leave for <strong>{denyTarget?.studentName}</strong>. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Denial <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Insufficient leave balance, insufficient notice…"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            {/* Contact parent option */}
            {denyTarget?.guardianPhone && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-300">
                <Phone className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-medium">{denyTarget.guardianName ?? "Guardian"}:</span>{" "}
                  <a
                    href={`tel:${denyTarget.guardianPhone}`}
                    className="underline underline-offset-2"
                  >
                    {denyTarget.guardianPhone}
                  </a>
                  {" "}
                  <a
                    href={`https://wa.me/91${denyTarget.guardianPhone?.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline underline-offset-2"
                  >
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDenyTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={actionLoading === denyTarget?.id}
                onClick={handleDeny}
              >
                {actionLoading === denyTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Deny"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Parent Dialog */}
      <Dialog open={!!contactTarget} onOpenChange={(o) => { if (!o) setContactTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" /> Contact Parent / Guardian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-lg border space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="font-semibold text-sm">{contactTarget?.studentName}</p>
                {contactTarget?.className && (
                  <p className="text-xs text-muted-foreground">
                    {[contactTarget.className, contactTarget.section].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">Guardian / Parent</p>
                <p className="font-semibold text-sm">{contactTarget?.guardianName ?? "—"}</p>
                {contactTarget?.guardianPhone && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <a
                      href={`tel:${contactTarget.guardianPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 text-primary rounded-md text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Phone className="h-4 w-4" /> Call {contactTarget.guardianPhone}
                    </a>
                    <a
                      href={`https://wa.me/91${contactTarget.guardianPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-300"
                    >
                      <MessageSquare className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
              {contactTarget && (
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  Leave: {formatDate(contactTarget.startDate)} – {formatDate(contactTarget.endDate)} ({contactTarget.totalDays} day{(contactTarget.totalDays ?? 0) > 1 ? "s" : ""})
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
