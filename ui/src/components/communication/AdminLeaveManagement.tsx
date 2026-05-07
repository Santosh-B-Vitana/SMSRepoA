import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Clock, Loader2, CalendarDays, Mail,
  Briefcase, Search, FileText, ChevronDown, ChevronUp, Check, X,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import leaveManagementApi, { LeaveRequest } from "../../services/api/leaveManagementApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-pink-500",
];

function avatarColor(seed?: string | null) {
  if (!seed) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Derive a readable display name from an email address */
function nameFromEmail(email?: string | null): string | null {
  if (!email) return null;
  return email
    .split("@")[0]
    .replace(/[._\-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    Pending: {
      label: "Pending",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="h-3 w-3" />,
    },
    Approved: {
      label: "Approved",
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    Rejected: {
      label: "Rejected",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
    Cancelled: {
      label: "Cancelled",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <X className="h-3 w-3" />,
    },
  };
  const c = map[status] ?? map.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionDialogState {
  open: boolean;
  leave: LeaveRequest | null;
  isRejecting: boolean;
  remarks: string;
}

interface Props {
  /** When provided, show only leaves for this staff member (per-staff mode) */
  staffEmail?: string;
  /** Display name for the staff member in per-staff mode */
  staffName?: string;
  /** Staff member's designation for the header in per-staff mode */
  staffDesignation?: string;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AdminLeaveManagement({
  staffEmail,
  staffName,
  staffDesignation,
}: Props) {
  const isPerStaff = Boolean(staffEmail);

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    leave: null,
    isRejecting: false,
    remarks: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        const response = await leaveManagementApi.getLeaveRequests(
          1,
          200,
          undefined,
          undefined,
          staffEmail || undefined
        );
        setLeaves(response.items);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load leave requests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [staffEmail, toast]);

  const filtered = useMemo(() => {
    let list = leaves;
    if (statusFilter)
      list = list.filter(
        (l) => l.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    if (!isPerStaff && search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.applicantName?.toLowerCase().includes(s) ||
          l.applicantEmail?.toLowerCase().includes(s) ||
          l.applicantDesignation?.toLowerCase().includes(s) ||
          l.leaveTypeName?.toLowerCase().includes(s) ||
          l.leaveNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [leaves, statusFilter, search, isPerStaff]);

  const stats = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((l) => l.status?.toLowerCase() === "pending").length,
      approved: leaves.filter((l) => l.status?.toLowerCase() === "approved").length,
      rejected: leaves.filter((l) => l.status?.toLowerCase() === "rejected").length,
    }),
    [leaves]
  );

  const openAction = (leave: LeaveRequest, isRejecting: boolean) =>
    setActionDialog({ open: true, leave, isRejecting, remarks: "" });

  const closeAction = () =>
    setActionDialog({ open: false, leave: null, isRejecting: false, remarks: "" });

  const submitAction = async () => {
    if (!actionDialog.leave) return;
    if (actionDialog.isRejecting && !actionDialog.remarks.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    try {
      setProcessing(true);
      const updated = actionDialog.isRejecting
        ? await leaveManagementApi.rejectLeave(
            actionDialog.leave.id,
            actionDialog.remarks
          )
        : await leaveManagementApi.approveLeave(
            actionDialog.leave.id,
            actionDialog.remarks || undefined
          );
      setLeaves((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l))
      );
      toast({
        title: actionDialog.isRejecting ? "Rejected" : "Approved",
        description: `Leave request has been ${actionDialog.isRejecting ? "rejected" : "approved"}.`,
      });
      closeAction();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast({
        title: "Error",
        description: msg || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Filter pills ──────────────────────────────────────────────────────────
  const FILTERS = [
    { label: "All", value: "", count: stats.total },
    { label: "Pending", value: "Pending", count: stats.pending },
    { label: "Approved", value: "Approved", count: stats.approved },
    { label: "Rejected", value: "Rejected", count: stats.rejected },
  ];

  // Resolve display values for the action dialog
  const dialogLeave = actionDialog.leave;
  const dialogName =
    dialogLeave?.applicantName ||
    nameFromEmail(dialogLeave?.applicantEmail) ||
    staffName ||
    "Staff Member";
  const dialogInitials = getInitials(dialogName);

  return (
    <div className="space-y-4">
      {/* ── Per-staff identity header ────────────────────────────────── */}
      {isPerStaff && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${avatarColor(staffEmail)}`}
          >
            {getInitials(staffName)}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">
              {staffName || nameFromEmail(staffEmail) || "Staff Member"}
            </p>
            {staffDesignation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {staffDesignation}
              </p>
            )}
            {staffEmail && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {staffEmail}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "Total",
            value: stats.total,
            cls: "text-foreground",
            border: "border-l-slate-400",
          },
          {
            label: "Pending",
            value: stats.pending,
            cls: "text-amber-600",
            border: "border-l-amber-400",
          },
          {
            label: "Approved",
            value: stats.approved,
            cls: "text-green-600",
            border: "border-l-green-400",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            cls: "text-red-600",
            border: "border-l-red-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-card rounded-xl border border-l-4 ${s.border} px-3 py-2.5`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter pills + search (search only in global mode) ────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1 text-[10px] ${
                    statusFilter === f.value
                      ? "bg-primary-foreground/20"
                      : "bg-muted"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar is only shown in global admin mode */}
        {!isPerStaff && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, email, leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* ── Leave cards ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mb-3 opacity-20" />
          <p className="font-medium text-sm">
            {isPerStaff
              ? "No leave requests for this staff member"
              : "No leave requests found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((leave) => {
            // Resolve the best available name for this leave card
            const name =
              leave.applicantName ||
              nameFromEmail(leave.applicantEmail) ||
              (isPerStaff ? staffName : null) ||
              "Unknown Staff";
            const initials = getInitials(name);
            const isExpanded = expandedId === leave.id;
            const isPending = leave.status?.toLowerCase() === "pending";

            return (
              <div
                key={leave.id}
                className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
                  isPending ? "border-amber-200" : ""
                }`}
              >
                <div className="flex items-start gap-3 p-3.5">
                  {/* Avatar – only show in global mode; in per-staff mode the header already has it */}
                  {!isPerStaff && (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${avatarColor(leave.applicantId)}`}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* In global mode show who this is */}
                        {!isPerStaff && (
                          <>
                            <p className="font-semibold text-sm leading-tight">
                              {name}
                            </p>
                            {leave.applicantDesignation && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Briefcase className="h-3 w-3 flex-shrink-0" />
                                {leave.applicantDesignation}
                              </p>
                            )}
                            {leave.applicantEmail && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                {leave.applicantEmail}
                              </p>
                            )}
                          </>
                        )}

                        {/* Leave type, dates, duration */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            <FileText className="h-3 w-3" />
                            {leave.leaveTypeName || "Leave"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(leave.startDate)} –{" "}
                            {fmtDate(leave.endDate)}
                          </span>
                          <span className="text-xs font-semibold">
                            {leave.totalDays} day
                            {leave.totalDays !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground opacity-60 mt-0.5">
                          #{leave.leaveNumber}
                        </p>
                      </div>

                      <StatusPill status={leave.status} />
                    </div>
                  </div>
                </div>

                {/* Reason preview */}
                {leave.reason && (
                  <div className="px-3.5 pb-2.5">
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      "{leave.reason}"
                    </p>
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2.5 border-t bg-muted/30 space-y-2.5">
                    {leave.reason && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Full reason
                        </p>
                        <p className="text-sm mt-0.5">{leave.reason}</p>
                      </div>
                    )}
                    {leave.approverRemarks && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Approver remarks
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {leave.approverRemarks}
                        </p>
                      </div>
                    )}
                    {leave.approvedDate && (
                      <p className="text-xs text-muted-foreground">
                        Processed on {fmtDate(leave.approvedDate)}
                      </p>
                    )}
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center justify-between px-3.5 py-2 border-t bg-muted/10">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : leave.id)
                    }
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {isExpanded ? "Hide details" : "Details"}
                  </button>

                  {isPending && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => openAction(leave, true)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => openAction(leave, false)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Action confirmation dialog ────────────────────────────────── */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${
                actionDialog.isRejecting ? "text-red-600" : "text-green-700"
              }`}
            >
              {actionDialog.isRejecting ? (
                <>
                  <XCircle className="h-5 w-5" />
                  Reject Leave Request
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Approve Leave Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.isRejecting
                ? "Provide a reason — the staff member will be notified."
                : "Confirm approval. You may add an optional remark."}
            </DialogDescription>
          </DialogHeader>

          {dialogLeave && (
            <div className="space-y-3 pt-1">
              {/* Staff identity card */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${avatarColor(dialogLeave.applicantId)}`}
                >
                  {dialogInitials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{dialogName}</p>
                  {(dialogLeave.applicantDesignation || staffDesignation) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {dialogLeave.applicantDesignation || staffDesignation}
                    </p>
                  )}
                  {(dialogLeave.applicantEmail || staffEmail) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {dialogLeave.applicantEmail || staffEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Leave summary */}
              <div className="rounded-lg border text-sm divide-y">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Leave type</span>
                  <span className="font-medium">
                    {dialogLeave.leaveTypeName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {dialogLeave.totalDays} day
                    {dialogLeave.totalDays !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Dates</span>
                  <span className="font-medium">
                    {fmtDate(dialogLeave.startDate)} –{" "}
                    {fmtDate(dialogLeave.endDate)}
                  </span>
                </div>
                {dialogLeave.reason && (
                  <div className="px-3 py-2">
                    <span className="text-muted-foreground block mb-0.5">
                      Reason
                    </span>
                    <p className="italic text-xs">{dialogLeave.reason}</p>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <Label className="text-sm font-medium">
                  {actionDialog.isRejecting
                    ? "Rejection reason *"
                    : "Remarks (optional)"}
                </Label>
                <textarea
                  placeholder={
                    actionDialog.isRejecting
                      ? "Enter reason for rejection..."
                      : "Optional remarks for this approval..."
                  }
                  value={actionDialog.remarks}
                  onChange={(e) =>
                    setActionDialog((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="mt-1.5 w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={closeAction}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitAction}
                  disabled={processing}
                  className={`flex-1 ${
                    actionDialog.isRejecting
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {processing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {actionDialog.isRejecting ? "Reject" : "Approve"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
