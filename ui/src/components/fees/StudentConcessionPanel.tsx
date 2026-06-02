import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, XCircle, Tag, Plus, AlertTriangle,
  Loader2, RotateCcw, BadgePercent, IndianRupee, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConcessionType, getConcessionTypes,
  FeeConcessionRecord, getStudentConcessions, createFeeConcession,
  approveConcession, rejectConcession, revokeFeeConcession,
} from "@/services/api/feeApi";
import { usePermissions } from "@/contexts/PermissionsContext";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function statusBadge(status: string) {
  switch (status) {
    case "Approved":  return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
    case "Pending":   return <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1"><Clock className="h-3 w-3" />Pending Approval</Badge>;
    case "Rejected":  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
    case "Revoked":   return <Badge variant="outline" className="gap-1 text-slate-500"><RotateCcw className="h-3 w-3" />Revoked</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  academicYear: string;
  /** Total fee (TotalAmount from FeeRecord) — used to compute auto amounts */
  totalFee?: number;
  /** Called after any create/approve/revoke so parent can refresh */
  onChanged?: () => void;
}

export function StudentConcessionPanel({
  open, onClose, studentId, studentName, academicYear, totalFee = 0, onChanged,
}: Props) {
  const { hasUserPermission } = usePermissions();
  const canApprove = hasUserPermission("Fees", "Edit");
  const canCreate  = hasUserPermission("Fees", "Create");

  const [concessions, setConcessions] = useState<FeeConcessionRecord[]>([]);
  const [types, setTypes] = useState<ConcessionType[]>([]);
  const [loading, setLoading] = useState(true);

  // Grant form
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [selType, setSelType] = useState<ConcessionType | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<FeeConcessionRecord | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject/revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{ record: FeeConcessionRecord; action: "reject" | "revoke" } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, ctypes] = await Promise.all([
        getStudentConcessions(studentId, academicYear),
        getConcessionTypes(),
      ]);
      setConcessions(recs);
      setTypes(ctypes.filter(t => t.isActive));
    } catch {
      toast.error("Failed to load concessions");
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Auto-compute amount when type changes
  useEffect(() => {
    if (!selType || !totalFee) return;
    const auto = selType.discountType === "Percentage"
      ? Math.round((totalFee * selType.discountValue) / 100)
      : selType.discountValue;
    const capped = selType.maxDiscountAmount ? Math.min(auto, selType.maxDiscountAmount) : auto;
    setGrantAmount(String(capped));
  }, [selType, totalFee]);

  // ── Grant concession ──
  const handleGrant = async () => {
    if (!selType) { toast.error("Select a concession type"); return; }
    const amt = parseFloat(grantAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!grantReason.trim()) { toast.error("Reason is required"); return; }
    setGranting(true);
    try {
      await createFeeConcession({ studentId, concessionTypeId: selType.id, academicYear, reason: grantReason.trim(), appliedAmount: amt });
      toast.success(
        selType.requiresApproval
          ? `Concession request submitted — pending approval`
          : `${fmt(amt)} concession applied successfully`
      );
      setShowGrantForm(false);
      setSelType(null); setGrantAmount(""); setGrantReason("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to grant concession");
    } finally {
      setGranting(false);
    }
  };

  // ── Approve ──
  const handleApprove = async () => {
    if (!approveTarget) return;
    const amt = parseFloat(approveAmount);
    if (!amt || amt <= 0) { toast.error("Enter approved amount"); return; }
    setApproving(true);
    try {
      await approveConcession(approveTarget.id, amt, approveRemarks || undefined);
      toast.success(`Concession approved: ${fmt(amt)}`);
      setApproveTarget(null); setApproveAmount(""); setApproveRemarks("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  // ── Reject / Revoke ──
  const handleRevokeOrReject = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) { toast.error("Reason is required"); return; }
    setRevoking(true);
    try {
      if (revokeTarget.action === "revoke") {
        await revokeFeeConcession(revokeTarget.record.id, revokeReason.trim());
        toast.success("Concession revoked — balance updated");
      } else {
        await rejectConcession(revokeTarget.record.id, revokeReason.trim());
        toast.success("Concession request rejected");
      }
      setRevokeTarget(null); setRevokeReason("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Operation failed");
    } finally {
      setRevoking(false);
    }
  };

  const active    = concessions.filter(c => c.status === "Approved");
  const pending   = concessions.filter(c => c.status === "Pending");
  const history   = concessions.filter(c => c.status === "Rejected" || c.status === "Revoked");

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-3 border-b bg-slate-50">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BadgePercent className="h-4 w-4 text-primary" />
              Concessions — {studentName}
            </SheetTitle>
            <SheetDescription className="text-xs">{academicYear} · {fmt(totalFee)} total fee</SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-5 py-4 space-y-5">

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* ── Active ── */}
                <section className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Applied Concessions
                  </p>
                  {active.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">None</p>
                  ) : active.map(c => (
                    <div key={c.id} className="border border-green-200 bg-green-50 rounded-lg px-3 py-2.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm text-green-800">{c.concessionTypeName}</span>
                          <span className="ml-2 text-sm font-bold text-green-700">{fmt(c.approvedAmount)}</span>
                        </div>
                        {statusBadge(c.status)}
                      </div>
                      <p className="text-xs text-green-700">{c.reason}</p>
                      <p className="text-xs text-slate-400">#{c.concessionNumber} · {new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                      {canApprove && (
                        <Button
                          variant="outline" size="sm"
                          className="text-xs h-6 px-2 mt-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => { setRevokeTarget({ record: c, action: "revoke" }); setRevokeReason(""); }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </section>

                {/* ── Pending ── */}
                {pending.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Pending Approval
                    </p>
                    {pending.map(c => (
                      <div key={c.id} className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-sm text-amber-800">{c.concessionTypeName}</span>
                            <span className="ml-2 text-sm font-bold text-amber-700">{fmt(c.appliedAmount)} requested</span>
                          </div>
                          {statusBadge(c.status)}
                        </div>
                        <p className="text-xs text-amber-700">{c.reason}</p>
                        <p className="text-xs text-slate-400">#{c.concessionNumber} · {new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                        {canApprove && (
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => { setApproveTarget(c); setApproveAmount(String(c.appliedAmount)); setApproveRemarks(""); }}
                            >
                              <CheckCircle2 className="h-3 w-3" />Approve
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => { setRevokeTarget({ record: c, action: "reject" }); setRevokeReason(""); }}
                            >
                              <XCircle className="h-3 w-3" />Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* ── Grant form ── */}
                {canCreate && (
                  <section className="space-y-2">
                    <Separator />
                    {!showGrantForm ? (
                      <Button variant="outline" size="sm" className="w-full gap-1.5 mt-1"
                        onClick={() => setShowGrantForm(true)}>
                        <Plus className="h-3.5 w-3.5" />Grant New Concession
                      </Button>
                    ) : (
                      <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />Grant Concession
                        </p>

                        <div className="space-y-1">
                          <Label className="text-xs">Concession Type *</Label>
                          <Select value={selType?.id ?? ""} onValueChange={id => setSelType(types.find(t => t.id === id) ?? null)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select type…" />
                            </SelectTrigger>
                            <SelectContent>
                              {types.map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.name}
                                  <span className="ml-1 text-muted-foreground">
                                    ({t.discountType === "Percentage" ? `${t.discountValue}%` : fmt(t.discountValue)})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selType && (
                          <div className="bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5 text-xs text-blue-700 flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                              {selType.discountType === "Percentage"
                                ? `${selType.discountValue}% of ${fmt(totalFee)} = ${fmt(Math.round((totalFee * selType.discountValue) / 100))}`
                                : `Fixed: ${fmt(selType.discountValue)}`}
                              {selType.maxDiscountAmount ? ` · Max: ${fmt(selType.maxDiscountAmount)}` : ""}
                              {selType.requiresApproval ? " · Requires approval" : " · Auto-approved"}
                            </span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs">Amount (₹) *</Label>
                          <Input
                            type="number" min={0} className="h-8 text-xs"
                            value={grantAmount} onChange={e => setGrantAmount(e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Reason *</Label>
                          <Textarea
                            className="text-xs min-h-[60px] resize-none"
                            value={grantReason} onChange={e => setGrantReason(e.target.value)}
                            placeholder="Merit scholarship, sibling discount, etc."
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 text-xs gap-1" onClick={handleGrant} disabled={granting}>
                            {granting ? <Loader2 className="h-3 w-3 animate-spin" /> : <IndianRupee className="h-3 w-3" />}
                            {selType?.requiresApproval ? "Submit for Approval" : "Apply Concession"}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs"
                            onClick={() => { setShowGrantForm(false); setSelType(null); setGrantAmount(""); setGrantReason(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* ── History ── */}
                {history.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</p>
                    {history.map(c => (
                      <div key={c.id} className="border border-slate-100 rounded-lg px-3 py-2 space-y-0.5 opacity-60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">{c.concessionTypeName} — {fmt(c.appliedAmount)}</span>
                          {statusBadge(c.status)}
                        </div>
                        {c.approverRemarks && <p className="text-xs text-slate-400">{c.approverRemarks}</p>}
                        <p className="text-xs text-slate-400">#{c.concessionNumber} · {new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                    ))}
                  </section>
                )}

                {concessions.length === 0 && !showGrantForm && (
                  <div className="text-center py-8 space-y-2">
                    <BadgePercent className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400">No concessions for this student</p>
                    {canCreate && <p className="text-xs text-slate-400">Click "Grant New Concession" to apply one</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Approve dialog ── */}
      <Dialog open={!!approveTarget} onOpenChange={v => { if (!v) { setApproveTarget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Concession</DialogTitle>
            <DialogDescription>
              {approveTarget?.concessionTypeName} for {studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-amber-50 border border-amber-100 rounded px-3 py-2 text-xs text-amber-700">
              Requested: <strong>{approveTarget ? fmt(approveTarget.appliedAmount) : ""}</strong> · {approveTarget?.reason}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Approved Amount (₹) *</Label>
              <Input type="number" className="h-8 text-sm" value={approveAmount}
                onChange={e => setApproveAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Approver Remarks (optional)</Label>
              <Input className="h-8 text-sm" value={approveRemarks}
                onChange={e => setApproveRemarks(e.target.value)} placeholder="e.g. Verified documents" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={handleApprove} disabled={approving}>
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve {approveAmount ? fmt(parseFloat(approveAmount) || 0) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject / Revoke dialog ── */}
      <Dialog open={!!revokeTarget} onOpenChange={v => { if (!v) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {revokeTarget?.action === "revoke" ? "Revoke Concession" : "Reject Concession"}
            </DialogTitle>
            <DialogDescription>
              {revokeTarget?.record.concessionTypeName} — {revokeTarget?.record.appliedAmount
                ? fmt(revokeTarget.record.appliedAmount) : ""} for {studentName}
              {revokeTarget?.action === "revoke" && (
                <span className="block mt-1 text-red-600 text-xs">
                  Revoking will reverse the discount on the student's balance.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-xs">Reason *</Label>
            <Textarea className="text-xs min-h-[60px] resize-none" value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="Enter reason…" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeOrReject} disabled={revoking}>
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              {revokeTarget?.action === "revoke" ? "Revoke" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
