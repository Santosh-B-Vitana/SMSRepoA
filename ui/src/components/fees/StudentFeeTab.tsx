/**
 * StudentFeeTab — Admin / Accountant fee collection for a student profile.
 *
 * Layout:
 *  • 4-tile summary strip (Total | Collected | Discount | Balance)
 *  • Card per fee record — name, year, amounts, status, "View & Pay" button
 *  • "View & Pay" dialog:
 *      1. Fee breakdown table — checkboxes per head, subtotal / balance
 *      2. Discounts & Offers — early payment, full payment, custom
 *      3. Sibling Fees panel — pending balance for each sibling
 *      4. Payment form — amount, method, ref, date, processed-by, remarks
 *  • Payment History tab — chronological receipt list
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, CreditCard, CheckCircle2, Clock,
  AlertTriangle, ReceiptText, IndianRupee,
  Tag, Users, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFeeRecords, getFeeStructureById, createPayment,
  FeeRecord, FeeStructure,
} from "@/services/api/feeApi";

// ─── Fee head definitions ─────────────────────────────────────────────────────

const FEE_HEADS: Array<{ key: keyof FeeStructure; label: string }> = [
  { key: "tuitionFee",    label: "Tuition Fee" },
  { key: "admissionFee",  label: "Admission Fee" },
  { key: "examFee",       label: "Exam / Assessment Fee" },
  { key: "libraryFee",    label: "Library Fee" },
  { key: "labFee",        label: "Lab Fee" },
  { key: "sportsFee",     label: "Sports Fee" },
  { key: "transportFee",  label: "Transport Fee" },
  { key: "hostelFee",     label: "Hostel Fee" },
  { key: "uniformFee",    label: "Uniform Fee" },
  { key: "booksFee",      label: "Books Fee" },
  { key: "developmentFee", label: "Development Fee" },
  { key: "miscellaneous", label: "Miscellaneous" },
];

// ─── Sibling shape (compatible with StudentBasic) ─────────────────────────────

interface SiblingBasic {
  id: string;
  name: string;
  class: string;
  admissionNumber?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inr = (n: number | undefined | null) =>
  `₹${(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
  }) : "—";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "paid")
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent text-[10px]">Paid</Badge>;
  if (s === "overdue")
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-transparent text-[10px]">Overdue</Badge>;
  if (s === "partial")
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent text-[10px]">Partial</Badge>;
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}

// ─── Discount options ─────────────────────────────────────────────────────────

const EARLY_PCT = 2;  // 2% early payment
const FULL_PCT  = 3;  // 3% full payment

// ─── Main Component ───────────────────────────────────────────────────────────

export function StudentFeeTab({
  studentId,
  studentName,
  studentClass,
  siblings = [],
}: {
  studentId: string;
  studentName?: string;
  studentClass?: string;
  siblings?: SiblingBasic[];
}) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  // ── Main records ──────────────────────────────────────────────────────────
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ── View & Pay dialog state ───────────────────────────────────────────────
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [activeRecord, setActiveRecord]     = useState<FeeRecord | null>(null);
  const [structure, setStructure]           = useState<FeeStructure | null>(null);
  const [structLoading, setStructLoading]   = useState(false);
  const [headEnabled, setHeadEnabled]       = useState<Record<string, boolean>>({});
  const [siblingFees, setSiblingFees]       = useState<Record<string, { total: number; pending: number }>>({});
  const [sibFeeLoading, setSibFeeLoading]   = useState(false);

  // discount option: none | early | full | custom
  const [discOption, setDiscOption]   = useState<"none" | "early" | "full" | "custom">("none");
  const [customDisc, setCustomDisc]   = useState("");

  // payment form
  const [saving, setSaving]           = useState(false);
  const [amount, setAmount]           = useState("");
  const [method, setMethod]           = useState("cash");
  const [reference, setReference]     = useState("");
  const [payDate, setPayDate]         = useState(today);
  const [processedBy, setProcessedBy] = useState("");
  const [remarks, setRemarks]         = useState("");

  // ── Load records ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getFeeRecords(1, 100, studentId);
      const rows = (res as any).feeRecords ?? (res as any).items ?? [];
      setRecords(Array.isArray(rows) ? rows : []);
    } catch {
      toast.error("Failed to load fee records");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // ── Summary totals ────────────────────────────────────────────────────────
  const totalFee      = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalPaid     = records.reduce((s, r) => s + r.paidAmount, 0);
  const totalBalance  = records.reduce((s, r) => s + r.pendingAmount, 0);
  const totalDiscount = records.reduce((s, r) => s + (r.discountAmount ?? 0), 0);

  // ── Payment history flat list ─────────────────────────────────────────────
  const allPayments = useMemo(() =>
    records
      .flatMap(r => (r.payments ?? []).map(p => ({
        ...p, structureName: r.feeStructureName ?? r.academicYear,
      })))
      .sort((a, b) =>
        new Date(b.date ?? b.createdAt).getTime() -
        new Date(a.date ?? a.createdAt).getTime()),
    [records],
  );

  // ── Open View & Pay dialog ────────────────────────────────────────────────
  const openDialog = async (record: FeeRecord) => {
    setActiveRecord(record);
    setStructure(null);
    setHeadEnabled({});
    setDiscOption("none");
    setCustomDisc("");
    setAmount(String(record.pendingAmount));
    setMethod("cash");
    setReference("");
    setPayDate(today);
    setProcessedBy("");
    setRemarks("");
    setSaving(false);
    setSiblingFees({});
    setDialogOpen(true);

    // Fetch fee structure for breakdown
    if (record.feeStructureId) {
      setStructLoading(true);
      try {
        const struct = await getFeeStructureById(record.feeStructureId);
        setStructure(struct);
        // Initialise: enable all non-zero heads
        const init: Record<string, boolean> = {};
        FEE_HEADS.forEach(({ key }) => {
          const v = struct[key] as number | undefined;
          if (v && v > 0) init[key as string] = true;
        });
        setHeadEnabled(init);
      } catch { /* ignore — show simple totals */ }
      finally { setStructLoading(false); }
    }

    // Fetch sibling fee snapshots
    if (siblings.length > 0) {
      setSibFeeLoading(true);
      const snap: Record<string, { total: number; pending: number }> = {};
      await Promise.all(siblings.map(async sib => {
        try {
          const sibRes = await getFeeRecords(1, 20, sib.id);
          const sibRows: FeeRecord[] = (sibRes as any).feeRecords ?? (sibRes as any).items ?? [];
          snap[sib.id] = {
            total:   sibRows.reduce((s, r) => s + r.totalAmount, 0),
            pending: sibRows.reduce((s, r) => s + r.pendingAmount, 0),
          };
        } catch { /* skip */ }
      }));
      setSiblingFees(snap);
      setSibFeeLoading(false);
    }
  };

  // ── Fee head amounts (structure amounts + per-student overrides) ──────────
  const headAmounts = useMemo(() => {
    if (!structure) return {} as Record<string, number>;
    const overrides: Record<string, number> = {};
    if (activeRecord?.feeHeadOverrides) {
      try { Object.assign(overrides, JSON.parse(activeRecord.feeHeadOverrides)); } catch { /* skip */ }
    }
    const out: Record<string, number> = {};
    FEE_HEADS.forEach(({ key }) => {
      const base = (structure[key] as number | undefined) ?? 0;
      out[key as string] = overrides[key as string] ?? base;
    });
    return out;
  }, [structure, activeRecord]);

  // Non-zero fee heads from the loaded structure
  const activeHeads = structure
    ? FEE_HEADS.filter(({ key }) => (headAmounts[key as string] ?? 0) > 0)
    : [];

  // ── Selected-head subtotal ────────────────────────────────────────────────
  const headSubtotal = useMemo(
    () => Object.entries(headEnabled)
      .filter(([, on]) => on)
      .reduce((s, [k]) => s + (headAmounts[k] ?? 0), 0),
    [headEnabled, headAmounts],
  );

  // ── Discount ──────────────────────────────────────────────────────────────
  const pendingAmt = activeRecord?.pendingAmount ?? 0;

  const discountAmount = useMemo(() => {
    if (discOption === "early")  return Math.round(pendingAmt * EARLY_PCT / 100);
    if (discOption === "full")   return Math.round(pendingAmt * FULL_PCT  / 100);
    if (discOption === "custom") return Math.max(0, parseFloat(customDisc) || 0);
    return 0;
  }, [discOption, customDisc, pendingAmt]);

  // Auto-update amount field when head selection or discount changes
  const suggestedAmt = Math.max(0,
    (activeHeads.length > 0 ? headSubtotal : pendingAmt) - discountAmount
  );
  useEffect(() => {
    if (!dialogOpen) return;
    setAmount(String(suggestedAmt > 0 ? suggestedAmt : pendingAmt));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedAmt]);

  // ── Submit payment ────────────────────────────────────────────────────────
  const handleCollect = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > pendingAmt + 0.01) {
      toast.error(`Amount exceeds pending balance (${inr(pendingAmt)})`);
      return;
    }
    if (!activeRecord) return;

    const discLabel =
      discOption === "early"  ? `Early payment discount ${EARLY_PCT}%` :
      discOption === "full"   ? `Full payment discount ${FULL_PCT}%`   :
      discOption === "custom" ? `Manual discount ${inr(discountAmount)}` : "";

    setSaving(true);
    try {
      await createPayment({
        studentId:    activeRecord.studentId,
        feeRecordId:  activeRecord.id,
        amount: amt,
        method,
        date: payDate,
        gatewayRef:   ["upi", "neft", "rtgs"].includes(method) ? reference || undefined : undefined,
        chequeNumber: method === "cheque" ? reference || undefined : undefined,
        processedBy:  processedBy || undefined,
        remarks: [remarks, discLabel].filter(Boolean).join(" | ") || undefined,
        notifyParent: true,
      });
      toast.success(`${inr(amt)} recorded successfully`);
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading fee records…</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-[11px] text-muted-foreground mb-0.5">Total Fee</p>
          <p className="text-base font-bold">{inr(totalFee)}</p>
        </div>
        <div className="rounded-lg border bg-green-50 p-3">
          <p className="text-[11px] text-muted-foreground mb-0.5">Collected</p>
          <p className="text-base font-bold text-green-700">{inr(totalPaid)}</p>
        </div>
        {totalDiscount > 0 ? (
          <div className="rounded-lg border bg-purple-50 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Discount Applied</p>
            <p className="text-base font-bold text-purple-700">{inr(totalDiscount)}</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Pending Records</p>
            <p className="text-base font-bold">{records.filter(r => r.pendingAmount > 0).length}</p>
          </div>
        )}
        <div className={`rounded-lg border p-3 ${totalBalance > 0 ? "bg-red-50" : "bg-green-50"}`}>
          <p className="text-[11px] text-muted-foreground mb-0.5">Balance Due</p>
          <p className={`text-base font-bold ${totalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
            {inr(totalBalance)}
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="records">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="records" className="text-xs h-7 px-4">
            Fee Records
            {records.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium">
                {records.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7 px-4">
            Payment History
            {allPayments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium">
                {allPayments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Fee Records ── */}
        <TabsContent value="records" className="mt-3 space-y-2">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-2 border-2 border-dashed rounded-xl">
              <IndianRupee className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No fee records yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Fee records are created when a fee structure is assigned to this student's class.
              </p>
            </div>
          ) : (
            records.map(r => {
              const isPaid    = r.pendingAmount === 0;
              const isOverdue = r.status?.toLowerCase() === "overdue";
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    isPaid    ? "bg-muted/20 border-muted/50" :
                    isOverdue ? "border-red-200 bg-red-50/40" :
                                "bg-white hover:bg-muted/20 transition-colors"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: name, year, amounts */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.feeStructureName ?? "Fee Record"}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                        {r.academicYear} · Class {r.class}
                        {r.dueDate && ` · Due: ${fmt(r.dueDate)}`}
                      </p>

                      {/* Amount row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-muted-foreground">
                        <span>Total: <span className="font-medium text-foreground">{inr(r.totalAmount)}</span></span>
                        {r.paidAmount > 0 && (
                          <span>Paid: <span className="font-medium text-green-700">{inr(r.paidAmount)}</span></span>
                        )}
                        {(r.discountAmount ?? 0) > 0 && (
                          <span>Discount: <span className="font-medium text-purple-700">{inr(r.discountAmount)}</span></span>
                        )}
                        {!isPaid && (
                          <span>
                            Balance:{" "}
                            <span className={`font-bold ${isOverdue ? "text-red-700" : "text-foreground"}`}>
                              {inr(r.pendingAmount)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: action */}
                    <div className="shrink-0 pt-0.5">
                      {isPaid ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Paid
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={isOverdue ? "default" : "outline"}
                          className={`gap-1.5 text-xs ${isOverdue ? "bg-red-600 hover:bg-red-700 border-red-600" : ""}`}
                          onClick={() => openDialog(r)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          View &amp; Pay
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ── Payment History ── */}
        <TabsContent value="history" className="mt-3">
          {allPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
              <ReceiptText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    {["Date", "Fee / Structure", "Method", "Amount", "Receipt #", "By"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allPayments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmt(p.date)}</td>
                      <td className="px-3 py-2.5 font-medium">{(p as any).structureName ?? "—"}</td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">{p.method}</td>
                      <td className="px-3 py-2.5 font-semibold text-green-700">{inr(p.amount)}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{p.receiptNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.processedBy ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ══════════════ View & Pay Dialog ══════════════ */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v && !saving) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{activeRecord?.feeStructureName ?? "Fee Record"}</span>
              {activeRecord && <StatusBadge status={activeRecord.status} />}
            </DialogTitle>
            <p className="text-[12px] text-muted-foreground">
              {activeRecord?.academicYear} · Class {activeRecord?.class}
              {activeRecord?.dueDate && ` · Due: ${fmt(activeRecord.dueDate)}`}
            </p>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">

            {/* ── 1. Fee Breakdown ── */}
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Fee Breakdown
              </p>

              {structLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 pl-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading breakdown…
                </div>
              ) : activeHeads.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Fee Head</th>
                        <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground">Amount</th>
                        <th className="w-14 px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Include</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeHeads.map(({ key, label }) => {
                        const amt     = headAmounts[key as string] ?? 0;
                        const enabled = headEnabled[key as string] ?? false;
                        return (
                          <tr key={key} className={enabled ? "" : "opacity-40"}>
                            <td className="px-3 py-2.5">
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <Checkbox
                                  checked={enabled}
                                  onCheckedChange={v =>
                                    setHeadEnabled(prev => ({ ...prev, [key as string]: !!v }))
                                  }
                                  disabled={pendingAmt === 0}
                                />
                                <span className="text-sm">{label}</span>
                              </label>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium">{inr(amt)}</td>
                            <td className="px-3 py-2.5 text-center">
                              {enabled && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20 text-sm font-semibold">
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wide">
                          Subtotal (selected)
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{inr(headSubtotal)}</td>
                        <td />
                      </tr>
                      {(activeRecord?.paidAmount ?? 0) > 0 && (
                        <tr className="text-green-700 text-xs">
                          <td className="px-3 py-1.5 text-muted-foreground">Already Paid</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">−{inr(activeRecord?.paidAmount)}</td>
                          <td />
                        </tr>
                      )}
                      <tr className="border-t font-bold text-sm">
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wide">
                          Balance Due
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${pendingAmt > 0 ? "text-red-700" : "text-green-700"}`}>
                          {inr(pendingAmt)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                /* No structure linked — simple totals */
                <div className="rounded-lg border divide-y text-sm">
                  <div className="flex justify-between px-3 py-2.5">
                    <span className="text-muted-foreground">Total Fee</span>
                    <span className="font-medium">{inr(activeRecord?.totalAmount)}</span>
                  </div>
                  {(activeRecord?.paidAmount ?? 0) > 0 && (
                    <div className="flex justify-between px-3 py-2.5 text-green-700">
                      <span>Paid</span>
                      <span className="font-medium">−{inr(activeRecord?.paidAmount)}</span>
                    </div>
                  )}
                  {(activeRecord?.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between px-3 py-2.5 text-purple-700">
                      <span>Discount</span>
                      <span className="font-medium">−{inr(activeRecord?.discountAmount)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between px-3 py-2.5 font-bold ${pendingAmt > 0 ? "text-red-700" : "text-green-700"}`}>
                    <span>Balance Due</span>
                    <span>{inr(pendingAmt)}</span>
                  </div>
                </div>
              )}
            </section>

            {/* ── 2. Discounts & Offers ── */}
            {pendingAmt > 0 && (
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Discounts &amp; Offers
                </p>
                <div className="rounded-lg border p-3 space-y-2.5">
                  {(
                    [
                      { val: "none"   as const, label: "No discount" },
                      {
                        val: "early"  as const,
                        label: `Early Payment — ${EARLY_PCT}% off`,
                        savings: Math.round(pendingAmt * EARLY_PCT / 100),
                      },
                      {
                        val: "full"   as const,
                        label: `Full Payment now — ${FULL_PCT}% off`,
                        savings: Math.round(pendingAmt * FULL_PCT / 100),
                      },
                      { val: "custom" as const, label: "Enter custom discount" },
                    ] as const
                  ).map(opt => (
                    <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="disc-opt"
                        checked={discOption === opt.val}
                        onChange={() => setDiscOption(opt.val)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{opt.label}</span>
                      {"savings" in opt && opt.savings > 0 && discOption === opt.val && (
                        <span className="text-[11px] text-green-700 font-semibold">
                          saves {inr(opt.savings)}
                        </span>
                      )}
                    </label>
                  ))}

                  {discOption === "custom" && (
                    <div className="ml-6 mt-1">
                      <div className="relative w-40">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">₹</span>
                        <Input
                          type="number"
                          min={0}
                          max={pendingAmt}
                          className="pl-7 h-8 text-sm"
                          value={customDisc}
                          onChange={e => setCustomDisc(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between pt-2 border-t text-xs font-semibold text-purple-700">
                      <span>Discount to apply</span>
                      <span>−{inr(discountAmount)}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── 3. Sibling Fees ── */}
            {siblings.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Sibling Fees
                </p>
                <div className="space-y-1.5">
                  {siblings.map(sib => {
                    const snap = siblingFees[sib.id];
                    return (
                      <div
                        key={sib.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium">{sib.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">Class {sib.class}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {sibFeeLoading && !snap ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : snap ? (
                            snap.pending > 0
                              ? <span className="text-[11px] text-red-700 font-semibold">{inr(snap.pending)} pending</span>
                              : <span className="text-[11px] text-green-700 font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Cleared
                                </span>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] gap-0.5"
                            onClick={() => { setDialogOpen(false); navigate(`/students/${sib.id}`); }}
                          >
                            Go <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <Separator />

            {/* ── 4. Payment Details ── */}
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Payment Details
              </p>
              <div className="space-y-3">

                {/* Amount */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Amount to Collect <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">₹</span>
                      <Input
                        type="number"
                        min={1}
                        max={pendingAmt}
                        className="pl-7 h-9"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {discountAmount > 0 && (
                      <span className="text-xs text-purple-700 font-medium whitespace-nowrap shrink-0">
                        −{inr(discountAmount)} disc
                      </span>
                    )}
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Payment Method <span className="text-destructive">*</span></Label>
                  <Select value={method} onValueChange={v => { setMethod(v); setReference(""); }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="neft">NEFT / RTGS</SelectItem>
                      <SelectItem value="card">Card (Swipe)</SelectItem>
                      <SelectItem value="dd">Demand Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference — non-cash / non-card */}
                {method !== "cash" && method !== "card" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      {method === "cheque" ? "Cheque Number" :
                       method === "upi"    ? "UPI Ref / UTR" :
                                             "Transaction Reference"}
                    </Label>
                    <Input
                      className="h-9 text-sm"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      placeholder={method === "cheque" ? "CHQ-123456" : "Reference no."}
                    />
                  </div>
                )}

                {/* Date + Processed By */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs"
                      value={payDate}
                      max={today}
                      onChange={e => setPayDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Processed By</Label>
                    <Input
                      className="h-9 text-xs"
                      value={processedBy}
                      onChange={e => setProcessedBy(e.target.value)}
                      placeholder="Staff name"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Remarks</Label>
                  <Input
                    className="h-9 text-sm"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="e.g. Q1 instalment, late fee waiver…"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 gap-2 pt-3 border-t mt-1">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCollect}
              disabled={saving || !(parseFloat(amount) > 0)}
              className="flex-1 gap-1.5"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording…</>
                : <><CreditCard className="h-4 w-4" /> Collect {inr(parseFloat(amount) || 0)}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
