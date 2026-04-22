
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  IndianRupee, Users, AlertTriangle, TrendingUp, Receipt, Search,
  Plus, Download, RefreshCw, CheckCircle2, Clock, XCircle,
  Printer, Tag, BarChart3, Loader2, Calendar, Building2,
  QrCode, ChevronDown, ChevronUp, Send, Pencil, Trash2,
  FileText, CalendarDays, CreditCard, Banknote, Filter, Link2, PackagePlus
} from "lucide-react";
import { toast } from "sonner";
import { feeApi, FeeRecord, FeeStructure, CreateFeeStructureDto, AgingBucket, FeeAuditLogEntry, InvoiceBreakdown, getSchoolAging, getAuditTrail, getInvoice, bulkAssignStructure, addExtraCharges, editPayment, linkStructure } from "@/services/api/feeApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import apiClient from "@/services/api/apiClient";

// ─── India‑specific constants ─────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash",     label: "Cash",                    icon: "💵" },
  { value: "cheque",   label: "Cheque",                  icon: "📄" },
  { value: "dd",       label: "Demand Draft (DD)",       icon: "🏦" },
  { value: "cashfree", label: "Online Gateway (Cashfree)", icon: "🔗" },
];

const FEE_HEADS = [
  { key: "tuitionFee",      label: "Tuition Fee",         category: "Academic" },
  { key: "examFee",         label: "Examination Fee",     category: "Academic" },
  { key: "libraryFee",      label: "Library Fee",         category: "Academic" },
  { key: "labFee",          label: "Science / Computer Lab Fee", category: "Academic" },
  { key: "developmentFee",  label: "Development Fund",    category: "Development" },
  { key: "sportsFee",       label: "Sports / Activity Fee", category: "Development" },
  { key: "admissionFee",    label: "Admission / Registration Fee (One-time)", category: "Other" },
  { key: "transportFee",    label: "Transport Fee",       category: "Other" },
  { key: "hostelFee",       label: "Hostel Fee",          category: "Other" },
  { key: "uniformFee",      label: "Uniform Fee",         category: "Other" },
  { key: "booksFee",        label: "Books / Stationery",  category: "Other" },
  { key: "miscellaneous",   label: "Miscellaneous",       category: "Other" },
];

const INSTALLMENT_PLANS = [
  { value: "1",  label: "Annual (Full Year at Once)" },
  { value: "2",  label: "Half-Yearly (April + October)" },
  { value: "4",  label: "Quarterly (April, July, October, January)" },
  { value: "3",  label: "Term-wise (3 Terms)" },
  { value: "12", label: "Monthly (12 Installments)" },
];

const CONCESSION_TYPES = [
  { value: "merit",        label: "Merit Scholarship",       color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "rte",          label: "RTE 25% (Right to Education)", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "ews",          label: "EWS / BPL",               color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "sc_st",        label: "SC / ST Category",        color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "obc",          label: "OBC",                     color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "sibling",      label: "Sibling Discount",        color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "staff_ward",   label: "Staff Ward",              color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "sports",       label: "Sports Achievement",      color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "management",   label: "Management Quota",        color: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "special",      label: "Special Need / Disability", color: "bg-red-100 text-red-800 border-red-200" },
];

function inr(n: number | undefined | null) { 
  if (n === undefined || n === null || isNaN(n)) return "₹0";
  return `₹${Math.floor(n).toLocaleString("en-IN")}`; 
}
function daysOverdue(dueDate: string | undefined) {
  if (!dueDate) return 0;
  const due = new Date(dueDate); const today = new Date();
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

// ─── Status config ────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "text-green-700 bg-green-50 border-green-200" },
  partial: { label: "Partial", color: "text-blue-700 bg-blue-50 border-blue-200" },
  pending: { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200" },
  overdue: { label: "Overdue", color: "text-red-700 bg-red-50 border-red-200" },
};

// ─── Collect Payment Dialog (Industry Grade) ────────────
function CollectPaymentDialog({
  open, onClose, record, onSuccess, structures,
}: {
  open: boolean;
  onClose: () => void;
  record: FeeRecord | null;
  onSuccess: () => void;
  structures: FeeStructure[];
}) {
  const today = new Date().toISOString().split("T")[0];

  // ── Payment form fields ──
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [cfTxnId, setCfTxnId] = useState("");          // Cashfree transaction ID
  const [cfCheckoutUrl, setCfCheckoutUrl] = useState(""); // URL from gateway
  const [payDate, setPayDate] = useState(today);
  const [processedBy, setProcessedBy] = useState("");
  const [narration, setNarration] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Gateway multi-step flow ──
  // "form" → fill form; "request" → show payment details to parent; "confirm" → enter UTR/approval
  const [gwStep, setGwStep] = useState<"form" | "request" | "confirm">("form");
  const [gwElapsed, setGwElapsed] = useState(0); // seconds elapsed in "request" step

  // ── Editable fee breakdown ──
  const [headOverrides, setHeadOverrides] = useState<Record<string, number>>({});
  const [editingHead, setEditingHead] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [applyingAdjustments, setApplyingAdjustments] = useState(false);

  // ── Concession panel ──
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [concessionType, setConcessionType] = useState("merit");
  const [concessionMode, setConcessionMode] = useState<"fixed" | "percent">("fixed");
  const [concessionValue, setConcessionValue] = useState("");
  const [applyingConcession, setApplyingConcession] = useState(false);

  // ── Payment reversal ──
  const [voidTarget, setVoidTarget] = useState<{ id: string; amount: number; receiptNumber?: string } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  // ── Edit payment ──
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editFields, setEditFields] = useState<{
    amount: string; method: string; date: string;
    chequeNumber: string; bankName: string; gatewayRef: string; remarks: string; editReason: string;
  }>({ amount: "", method: "", date: "", chequeNumber: "", bankName: "", gatewayRef: "", remarks: "", editReason: "" });
  const [editing, setEditing] = useState(false);

  // ── Extra charges ──
  const [extraChargesOpen, setExtraChargesOpen] = useState(false);
  const [extraItems, setExtraItems] = useState<Array<{ label: string; amount: number }>>([]);
  const [newExtraLabel, setNewExtraLabel] = useState("");
  const [newExtraAmt, setNewExtraAmt] = useState("");
  const [newExtraPreset, setNewExtraPreset] = useState("hostel");
  const [addingCharges, setAddingCharges] = useState(false);
  const [linkedStructureName, setLinkedStructureName] = useState<string | null>(null);

  const EXTRA_CHARGE_PRESETS = [
    { value: "hostel",    label: "Hostel Fee" },
    { value: "libfine",   label: "Library Fine / Damage" },
    { value: "transport", label: "Transport Extra" },
    { value: "examfine",  label: "Exam Late Fee" },
    { value: "uniform",   label: "Uniform / Material" },
    { value: "sports",    label: "Sports / Event Fee" },
    { value: "misc",      label: "Miscellaneous" },
    { value: "custom",    label: "Custom…" },
  ];
  const totalExtraCharges = extraItems.reduce((s, e) => s + e.amount, 0);

  // ── Live record (fetched fresh on open so payments are included) ──
  const [liveRecord, setLiveRecord] = useState<FeeRecord | null>(record);
  const [fetchingRecord, setFetchingRecord] = useState(false);

  // ── Reset on open ──
  useEffect(() => {
    if (open && record) {
      setLiveRecord(record); // set immediately so dialog shows data while fetching
      setAmount(String(record.pendingAmount ?? ""));
      setMethod("cash"); setChequeNo(""); setChequeDate(""); setBankName("");
      setCfTxnId(""); setCfCheckoutUrl(""); setProcessedBy(""); setNarration(""); setPayDate(today);
      setConcessionOpen(false); setConcessionValue(""); setVoidTarget(null); setVoidReason("");
      setHeadOverrides({}); setEditingHead(null); setGwStep("form"); setGwElapsed(0);
      setEditTarget(null); setExtraItems([]); setExtraChargesOpen(false); setLinkedStructureName(null);
      // Fetch fresh record so payments array is populated (list endpoint omits payments for perf)
      setFetchingRecord(true);
      feeApi.getFeeRecordById(record.id)
        .then(fresh => setLiveRecord(fresh))
        .catch(() => {}) // keep the stale record if fetch fails
        .finally(() => setFetchingRecord(false));
      // Auto-link structure if record has no structure
      if (!record.feeStructureId && record.id) {
        linkStructure(record.id)
          .then(res => setLinkedStructureName(res.structureName))
          .catch(() => {}); // silent — will just show "no structure linked"
      }
    }
  }, [open, record?.id]);

  // ── Gateway request timer ──
  useEffect(() => {
    if (gwStep !== "request") return;
    const interval = setInterval(() => setGwElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [gwStep]);

  if (!record) return null;

  // Use liveRecord for payment history (fetched fresh); fall back to prop
  const activeRecord = liveRecord ?? record;

  // ── Derived values ──
  const structure = structures.find(s => s.id === activeRecord.feeStructureId);
  const feeHeads = FEE_HEADS.filter(h => structure && (structure as any)[h.key] > 0);
  const discountRatio = activeRecord.discountAmount && activeRecord.totalAmount ? activeRecord.discountAmount / activeRecord.totalAmount : 0;
  const outstanding = activeRecord.pendingAmount ?? 0;

  // Compute adjustment delta from headOverrides
  const adjustmentDelta = Object.entries(headOverrides).reduce((acc, [key, overrideNet]) => {
    const gross = structure ? (structure as any)[key] as number : 0;
    const originalNet = gross - Math.round(gross * discountRatio);
    return acc + (originalNet - overrideNet); // positive = reduction
  }, 0);
  // Extra charges increase effective outstanding temporarily (they'll be saved to fee record before payment)
  const adjustedOutstanding = Math.max(0, outstanding - adjustmentDelta + totalExtraCharges);

  const amt = parseFloat(amount) || 0;
  const afterPayment = Math.max(0, adjustedOutstanding - amt);
  const collectedPct = activeRecord.totalAmount
    ? Math.min(100, Math.round((activeRecord.paidAmount / (activeRecord.totalAmount + (activeRecord.lateFeeAmount ?? 0))) * 100))
    : 0;
  const maxMoreConcession = Math.max(0, (activeRecord.totalAmount ?? 0) * 0.75 - (activeRecord.discountAmount ?? 0));
  const concessionCalcAmt = concessionMode === "percent"
    ? Math.round(((activeRecord.totalAmount ?? 0) * (parseFloat(concessionValue) || 0)) / 100)
    : (parseFloat(concessionValue) || 0);
  const payments: any[] = (activeRecord as any).payments ?? [];
  const isDigital = method === "cashfree";
  const hasAdjustments = Object.keys(headOverrides).length > 0;

  // ── Validate form ──
  const validate = (): boolean => {
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return false; }
    if (amt > adjustedOutstanding + 0.01) { toast.error(`Amount ${inr(amt)} exceeds outstanding ${inr(adjustedOutstanding)}`); return false; }
    if ((method === "cheque" || method === "dd") && !chequeNo.trim()) { toast.error("Cheque/DD number is mandatory"); return false; }
    return true;
  };

  // ── Print receipt helper ──
  const printReceipt = async (paymentId: string) => {
    try {
      const html = await feeApi.generateReceipt(paymentId);
      const win = window.open("", "_blank", "width=860,height=700");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.addEventListener("load", () => { win.focus(); win.print(); });
      }
    } catch {
      toast.warning("Payment saved. Receipt could not be generated — check payments module.");
    }
  };

  // ── Collect (cash / cheque / dd) ──
  const handleCollect = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // If there are extra charges, save them to the fee record first
      if (extraItems.length > 0) {
        await addExtraCharges(record.id, extraItems, "Admin added at collection", processedBy || "Staff");
      }

      const remarks = [
        chequeNo ? `Cheque/DD: ${chequeNo}` : "",
        bankName ? `Bank: ${bankName}` : "",
        cfTxnId ? `CF Txn: ${cfTxnId}` : "",
        extraItems.length > 0 ? `Extra: ${extraItems.map(e => `${e.label} ₹${e.amount}`).join(", ")}` : "",
        narration,
      ].filter(Boolean).join(" | ");

      const result = await feeApi.createPayment({
        studentId: record.studentId,
        feeRecordId: record.id,
        amount: amt,
        method,
        date: payDate,
        receiptNumber: `RCP-${Date.now()}`,
        chequeNumber: chequeNo || undefined,
        chequeDate: chequeDate || undefined,
        bankName: bankName || undefined,
        gatewayRef: cfTxnId || undefined,
        remarks: remarks || undefined,
        processedBy: processedBy || "Staff",
        academicYear: record.academicYear,
      });
      toast.success(`${inr(amt)} collected successfully. Opening receipt…`);
      onSuccess();
      onClose();
      await printReceipt(result.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.title ?? "Payment failed — please retry";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  // ── Cashfree: initiate gateway order ──
  const handleInitiateCashfree = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await feeApi.initiatePayment(record.id, { amount: amt, gateway: "cashfree", currency: "INR" });
      if (res.checkoutUrl) {
        setCfCheckoutUrl(res.checkoutUrl);
        window.open(res.checkoutUrl, "_blank", "width=900,height=700");
      }
      setGwStep("request");
    } catch {
      // Gateway may not be configured yet — still allow manual confirmation
      setGwStep("request");
    } finally { setSaving(false); }
  };

  // ── Cashfree: confirm transaction ID entered by cashier ──
  const handleConfirmCashfree = async () => {
    if (!cfTxnId.trim()) { toast.error("Enter the Cashfree transaction ID to confirm payment"); return; }
    await handleCollect();
  };

  // ── Apply concession ──
  const handleApplyConcession = async () => {
    if (!concessionValue || concessionCalcAmt <= 0) { toast.error("Enter a concession value"); return; }
    if (concessionCalcAmt > maxMoreConcession) {
      toast.error(`Exceeds 75% cap. Max additional: ${inr(maxMoreConcession)}`); return;
    }
    setApplyingConcession(true);
    try {
      await apiClient.post("/FeeConcession/applications", {
        studentId: record.studentId,
        feeRecordId: record.id,
        concessionType,
        discountType: concessionMode === "percent" ? "percentage" : "fixed",
        discountValue: parseFloat(concessionValue),
        appliedAmount: concessionCalcAmt,
        approvedAmount: concessionCalcAmt,
        status: "Approved",
        academicYear: record.academicYear,
        reason: `Applied at collection by ${processedBy || "Staff"}`,
      });
      toast.success(`Concession of ${inr(concessionCalcAmt)} applied`);
      onSuccess();
      setConcessionOpen(false); setConcessionValue("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to apply concession");
    } finally { setApplyingConcession(false); }
  };

  // ── Apply fee head adjustments as concession ──
  const handleApplyAdjustments = async () => {
    if (adjustmentDelta <= 0) return;
    if (adjustmentDelta > maxMoreConcession) {
      toast.error(`Adjustments total ${inr(adjustmentDelta)} exceeds 75% concession cap headroom of ${inr(maxMoreConcession)}`);
      return;
    }
    setApplyingAdjustments(true);
    try {
      await apiClient.post("/FeeConcession/applications", {
        studentId: record.studentId,
        feeRecordId: record.id,
        concessionType: "management",
        discountType: "fixed",
        discountValue: adjustmentDelta,
        appliedAmount: adjustmentDelta,
        approvedAmount: adjustmentDelta,
        status: "Approved",
        academicYear: record.academicYear,
        reason: `Fee head adjustment: ${Object.entries(headOverrides)
          .map(([k, v]) => {
            const h = FEE_HEADS.find(f => f.key === k);
            return h ? `${h.label} → ${inr(v)}` : k;
          }).join(", ")}`,
      });
      toast.success(`Fee adjustment of ${inr(adjustmentDelta)} saved as concession`);
      setHeadOverrides({});
      setAmount(String(Math.max(0, outstanding - adjustmentDelta)));
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to apply adjustment");
    } finally { setApplyingAdjustments(false); }
  };

  // ── Reverse payment ──
  const handleVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { toast.error("Reversal reason is required"); return; }
    setVoiding(true);
    try {
      await feeApi.processRefund(voidTarget.id, { amount: voidTarget.amount, reason: voidReason });
      toast.success(`Payment of ${inr(voidTarget.amount)} reversed`);
      onSuccess(); setVoidTarget(null); setVoidReason("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Reversal failed");
    } finally { setVoiding(false); }
  };

  // ── Edit payment (correct a mistake) ──
  const handleEditPayment = async () => {
    if (!editTarget || !editFields.editReason.trim()) { toast.error("Edit reason is required"); return; }
    setEditing(true);
    try {
      await editPayment(editTarget.id, {
        amount: editFields.amount ? parseFloat(editFields.amount) : undefined,
        method: editFields.method || undefined,
        date: editFields.date || undefined,
        chequeNumber: editFields.chequeNumber || undefined,
        bankName: editFields.bankName || undefined,
        gatewayRef: editFields.gatewayRef || undefined,
        remarks: editFields.remarks || undefined,
        editReason: editFields.editReason,
      });
      toast.success("Payment updated successfully");
      onSuccess(); setEditTarget(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update payment");
    } finally { setEditing(false); }
  };

  // ── Cashfree payment panel ──
  const renderCashfreePanel = () => (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">CF</div>
        <div>
          <div className="font-bold text-indigo-900 text-sm">Cashfree Online Payment — {inr(amt)}</div>
          <div className="text-xs text-indigo-700 mt-0.5">
            {cfCheckoutUrl ? "Payment window opened. Ask the parent/guardian to complete payment." : "Share the payment link with the parent or complete via the Cashfree window."}
          </div>
        </div>
        <div className="ml-auto text-right shrink-0">
          <div className="text-xs text-indigo-600">Elapsed</div>
          <div className="font-mono text-base font-bold text-indigo-800">
            {String(Math.floor(gwElapsed / 60)).padStart(2, "0")}:{String(gwElapsed % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Information box */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1">
        <div className="font-semibold">Payment Accepted via Cashfree</div>
        <div>Cashfree processes all digital payments: UPI, Net Banking, Credit / Debit Cards, Wallets.</div>
        <div>Once the parent completes payment, Cashfree sends a confirmation. Enter the Cashfree Transaction ID below.</div>
      </div>

      {cfCheckoutUrl && (
        <div className="flex items-center gap-2 p-2 rounded bg-muted border text-xs">
          <span className="text-muted-foreground truncate flex-1">{cfCheckoutUrl}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
            onClick={() => window.open(cfCheckoutUrl, "_blank", "width=900,height=700")}>
            Reopen
          </Button>
        </div>
      )}

      {/* Cashfree Transaction ID entry */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">
          Cashfree Transaction ID *
        </Label>
        <Input
          className="h-10 text-sm font-mono tracking-widest"
          placeholder="e.g. TXN_XXXXXXXXXXX or order_XXXXXXXXXX"
          value={cfTxnId}
          onChange={e => setCfTxnId(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Found in Cashfree dashboard → Payments, or on the parent's payment confirmation screen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Received By</Label>
          <Input className="h-9 text-sm" placeholder="Staff name / counter" value={processedBy} onChange={e => setProcessedBy(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Payment Date</Label>
          <Input className="h-9 text-sm" type="date" max={today} value={payDate} onChange={e => setPayDate(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={() => setGwStep("form")}>← Back</Button>
        <Button size="sm" className="h-8 flex-1 bg-green-600 hover:bg-green-700 text-white font-bold gap-1.5"
          disabled={saving || !cfTxnId.trim()} onClick={handleConfirmCashfree}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Confirm Cashfree Payment &amp; Print Receipt
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">

        {/* ── Dialog Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">{record.studentName}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {record.class} &nbsp;·&nbsp; {record.academicYear}
                {(record.feeStructureName ?? linkedStructureName) ? (
                  <span className="text-primary font-medium">·&nbsp;{record.feeStructureName ?? linkedStructureName}</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Link2 className="h-3 w-3" />Linking structure…
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusConfig[record.status]?.color ?? ""}`}>
              {statusConfig[record.status]?.label ?? record.status}
            </span>
          </div>
        </div>

        {/* ── Two-Column Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ─────────── LEFT: Fee Account Ledger ─────────── */}
          <div className="w-[52%] border-r flex flex-col min-h-0">
            <div className="px-5 py-2.5 border-b bg-muted/30 shrink-0 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fee Account Ledger</span>
              {hasAdjustments && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Adjustments pending save
                </span>
              )}
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* ── Fee Head Breakdown (editable) ── */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-2">
                  Fee Head Breakdown
                  <span className="font-normal text-muted-foreground/60 normal-case">— click ✎ to adjust any head</span>
                </div>
                {structure && feeHeads.length > 0 ? (
                  <>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left pb-2 font-semibold text-muted-foreground text-xs">Head</th>
                          <th className="text-right pb-2 font-semibold text-muted-foreground text-xs">Gross</th>
                          <th className="text-right pb-2 font-semibold text-green-700 text-xs">Concession</th>
                          <th className="text-right pb-2 font-semibold text-muted-foreground text-xs">Net</th>
                          <th className="w-7 pb-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {feeHeads.map(h => {
                          const gross = (structure as any)[h.key] as number;
                          const disc = Math.round(gross * discountRatio);
                          const originalNet = gross - disc;
                          const overrideNet = headOverrides[h.key] ?? originalNet;
                          const isEditing = editingHead === h.key;
                          const isAdjusted = headOverrides[h.key] !== undefined && headOverrides[h.key] !== originalNet;
                          return (
                            <tr key={h.key} className={`border-b border-border/40 ${isAdjusted ? "bg-amber-50/60" : ""}`}>
                              <td className="py-1.5 text-muted-foreground text-xs">{h.label}</td>
                              <td className="py-1.5 text-right tabular-nums text-xs">{inr(gross)}</td>
                              <td className="py-1.5 text-right tabular-nums text-xs text-green-700 font-medium">
                                {disc > 0 ? `−${inr(disc)}` : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="py-1.5 text-right tabular-nums text-xs font-semibold">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <input className="w-20 h-6 text-right text-xs border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                      type="number" min={0} max={originalNet}
                                      value={editingVal}
                                      onChange={e => setEditingVal(e.target.value)}
                                      autoFocus
                                    />
                                    <button className="text-green-600 hover:text-green-800 text-[11px] font-bold"
                                      onClick={() => {
                                        const v = parseFloat(editingVal);
                                        if (!isNaN(v) && v >= 0 && v <= originalNet) {
                                          setHeadOverrides(prev => ({ ...prev, [h.key]: v }));
                                          if (v < originalNet) {
                                            setAmount(String(Math.max(0, adjustedOutstanding - (originalNet - v))));
                                          }
                                        }
                                        setEditingHead(null);
                                      }}>✓</button>
                                    <button className="text-muted-foreground hover:text-foreground text-[11px]"
                                      onClick={() => setEditingHead(null)}>✕</button>
                                  </div>
                                ) : (
                                  <span className={isAdjusted ? "text-amber-700" : ""}>
                                    {isAdjusted ? (
                                      <><span className="line-through text-muted-foreground/50 mr-1">{inr(originalNet)}</span>{inr(overrideNet)}</>
                                    ) : inr(overrideNet)}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 text-center">
                                {!isEditing && (
                                  <button onClick={() => { setEditingHead(h.key); setEditingVal(String(overrideNet)); }}
                                    className="opacity-30 hover:opacity-80 text-blue-600 transition-opacity" title="Edit this head">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-border">
                        <tr className="font-semibold">
                          <td className="pt-2 text-sm">Sub-total</td>
                          <td className="pt-2 text-right tabular-nums text-sm">{inr(record.totalAmount)}</td>
                          <td className="pt-2 text-right tabular-nums text-sm text-green-700">
                            {(record.discountAmount ?? 0) > 0 ? `−${inr(record.discountAmount)}` : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="pt-2 text-right tabular-nums text-sm">{inr((record.totalAmount ?? 0) - (record.discountAmount ?? 0))}</td>
                          <td />
                        </tr>
                        {(record.lateFeeAmount ?? 0) > 0 && (
                          <tr className="text-amber-700 text-xs">
                            <td className="py-1">Late Fee Charged</td>
                            <td colSpan={3} className="py-1 text-right">+ {inr(record.lateFeeAmount)}</td>
                            <td />
                          </tr>
                        )}
                        {totalExtraCharges > 0 && (
                          <tr className="text-orange-700 text-xs">
                            <td className="py-1">Additional Charges</td>
                            <td colSpan={3} className="py-1 text-right">+ {inr(totalExtraCharges)}</td>
                            <td />
                          </tr>
                        )}
                        {extraItems.length > 0 && (
                          <tr className="text-orange-600 text-[10px] bg-orange-50/50">
                            <td colSpan={4} className="py-1 px-2">
                              {extraItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span className="text-orange-700 italic">{item.label}</span>
                                  <span className="font-medium">{inr(item.amount)}</span>
                                </div>
                              ))}
                            </td>
                            <td />
                          </tr>
                        )}
                        {hasAdjustments && (
                          <tr className="text-amber-700 text-xs font-semibold">
                            <td className="py-1">Head Adjustments</td>
                            <td colSpan={3} className="py-1 text-right">− {inr(adjustmentDelta)}</td>
                            <td />
                          </tr>
                        )}
                        <tr className="bg-muted/50">
                          <td className="py-2 px-1.5 rounded-l font-bold text-sm">
                            {hasAdjustments || totalExtraCharges > 0 ? "Adjusted Payable" : "Total Payable"}
                          </td>
                          <td colSpan={3} className="py-2 px-1.5 rounded-r font-bold text-sm text-right tabular-nums">
                            {inr((record.totalAmount ?? 0) - (record.discountAmount ?? 0) + (record.lateFeeAmount ?? 0) - adjustmentDelta + totalExtraCharges)}
                          </td>
                          <td />
                        </tr>
                        <tr className="text-green-700 text-sm">
                          <td className="py-1.5">Amount Paid</td>
                          <td colSpan={3} className="py-1.5 text-right tabular-nums">(−{inr(record.paidAmount)})</td>
                          <td />
                        </tr>
                        <tr className="border-t-2 border-red-300 font-bold text-red-700">
                          <td className="py-2 text-base">Outstanding Balance</td>
                          <td colSpan={3} className="py-2 text-right tabular-nums text-lg">{inr(adjustedOutstanding)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>

                    {/* Apply adjustment button */}
                    {hasAdjustments && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                        <p className="text-xs text-amber-800 font-medium">
                          You've adjusted fee heads by a total of <strong>{inr(adjustmentDelta)}</strong>. Save these as a concession to make it permanent.
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setHeadOverrides({}); setAmount(String(outstanding)); }}>
                            Reset Adjustments
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={applyingAdjustments || adjustmentDelta > maxMoreConcession}
                            onClick={handleApplyAdjustments}>
                            {applyingAdjustments ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Save as Concession
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Total Fee", val: record.totalAmount, cls: "" },
                      { label: "Discount Applied", val: record.discountAmount, cls: "text-green-700" },
                      { label: "Late Fee", val: record.lateFeeAmount, cls: "text-amber-700" },
                      { label: "Amount Paid", val: record.paidAmount, cls: "text-green-700" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between pr-2 border-b border-dashed py-1.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-semibold tabular-nums ${row.cls}`}>{inr(row.val)}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex justify-between py-2 font-bold text-red-700 border-t-2 border-red-200">
                      <span>Outstanding Balance</span>
                      <span className="text-lg tabular-nums">{inr(outstanding)}</span>
                    </div>
                  </div>
                )}

                {/* Collection progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Collection progress</span>
                    <span className="font-semibold">{collectedPct}% collected</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${collectedPct}%` }} />
                  </div>
                </div>
              </div>

              {/* ── Payment History with Reverse ── */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Payment History &nbsp;<span className="font-normal">({payments.length} transactions)</span>
                </div>
                {payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {payments.map((p: any, i: number) => (
                      <div key={p.id ?? i}>
                        <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${
                          p.status === "voided" || p.status === "refunded" ? "bg-muted/30 opacity-60" : "bg-background"
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">
                              {p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                              p.method === "cash" ? "bg-green-50 text-green-700 border-green-200"
                                : p.method === "upi" ? "bg-blue-50 text-blue-700 border-blue-200"
                                : p.method === "cheque" || p.method === "dd" ? "bg-amber-50 text-amber-700 border-amber-200"
                                : p.method === "card" ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-muted text-muted-foreground border-border"
                            }`}>
                              {(p.method ?? "CASH").toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{p.receiptNumber ?? ""}</span>
                            {(p.status === "voided" || p.status === "refunded") && (
                              <span className="text-xs text-red-500 font-medium">REVERSED</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-bold tabular-nums ${p.status === "voided" || p.status === "refunded" ? "line-through text-muted-foreground" : "text-green-700"}`}>
                              {inr(p.amount)}
                            </span>
                            {p.status !== "voided" && p.status !== "refunded" && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditTarget(editTarget?.id === p.id ? null : p);
                                    setVoidTarget(null);
                                    if (editTarget?.id !== p.id) {
                                      setEditFields({
                                        amount: String(p.amount), method: p.method ?? "",
                                        date: p.date ? new Date(p.date).toISOString().split("T")[0] : "",
                                        chequeNumber: p.chequeNumber ?? "", bankName: p.bankName ?? "",
                                        gatewayRef: p.gatewayRef ?? "", remarks: p.remarks ?? "", editReason: "",
                                      });
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded px-1.5 py-0.5 transition-colors">
                                  Edit
                                </button>
                                <button
                                  onClick={() => setVoidTarget(voidTarget?.id === p.id ? null : { id: p.id, amount: p.amount, receiptNumber: p.receiptNumber })}
                                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-1.5 py-0.5 transition-colors">
                                  Reverse
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {/* ── Edit Payment Panel ── */}
                        {editTarget?.id === p.id && (
                          <div className="mt-1 mx-1 p-3 rounded-lg border-2 border-blue-300 bg-blue-50/80 space-y-2.5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                              <Pencil className="h-4 w-4" />
                              Edit Payment — {p.receiptNumber ?? "Receipt"}
                            </div>
                            <p className="text-xs text-blue-600">Correct the payment details. All changes are audit-logged. Enter the reason for editing below.</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Amount (₹)</Label>
                                <Input className="h-7 text-xs border-blue-300" type="number"
                                  value={editFields.amount} onChange={e => setEditFields(f => ({ ...f, amount: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Method</Label>
                                <select className="h-7 text-xs border border-blue-300 rounded w-full px-2 bg-white"
                                  value={editFields.method} onChange={e => setEditFields(f => ({ ...f, method: e.target.value }))}>
                                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Payment Date</Label>
                                <Input className="h-7 text-xs border-blue-300" type="date"
                                  value={editFields.date} onChange={e => setEditFields(f => ({ ...f, date: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Cheque / DD / Ref No.</Label>
                                <Input className="h-7 text-xs border-blue-300 font-mono"
                                  value={editFields.chequeNumber} onChange={e => setEditFields(f => ({ ...f, chequeNumber: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Bank Name</Label>
                                <Input className="h-7 text-xs border-blue-300"
                                  value={editFields.bankName} onChange={e => setEditFields(f => ({ ...f, bankName: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Gateway / CF Ref</Label>
                                <Input className="h-7 text-xs border-blue-300 font-mono"
                                  value={editFields.gatewayRef} onChange={e => setEditFields(f => ({ ...f, gatewayRef: e.target.value }))} />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Updated Remarks</Label>
                                <Input className="h-7 text-xs border-blue-300"
                                  value={editFields.remarks} onChange={e => setEditFields(f => ({ ...f, remarks: e.target.value }))} />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[11px] font-bold text-blue-700 mb-1 block">Reason for Edit *</Label>
                                <Input className="h-7 text-xs border-blue-400 focus-visible:ring-blue-400"
                                  placeholder="e.g. Wrong amount entered, Cheque bounced, Payment failed"
                                  value={editFields.editReason} onChange={e => setEditFields(f => ({ ...f, editReason: e.target.value }))} />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => setEditTarget(null)}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={editing || !editFields.editReason.trim()} onClick={handleEditPayment}>
                                {editing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        )}
                        {/* ── Void / Reverse Panel ── */}
                        {voidTarget?.id === p.id && (
                          <div className="mt-1 mx-1 p-3 rounded-lg border-2 border-red-300 bg-red-50/80 space-y-2.5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                              <AlertTriangle className="h-4 w-4" />
                              Reverse {inr(p.amount)} — {p.receiptNumber ?? "this payment"}
                            </div>
                            <p className="text-xs text-red-600">This will create a refund entry. The student's outstanding balance will be restored. This action will be logged.</p>
                            <Input className="h-8 text-xs border-red-300 focus-visible:ring-red-400"
                              placeholder="Reason for reversal (required) *"
                              value={voidReason} onChange={e => setVoidReason(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => { setVoidTarget(null); setVoidReason(""); }}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                disabled={voiding || !voidReason.trim()} onClick={handleVoid}>
                                {voiding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Confirm Reversal
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─────────── RIGHT: Payment Collect Form OR Transaction Summary ─────────── */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-2.5 border-b bg-muted/30 shrink-0 flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {activeRecord.status === "paid" ? "Transaction Summary" : "Collect Payment"}
              </span>
              {isDigital && gwStep !== "form" && record.status !== "paid" && (
                <div className="flex gap-1.5 text-[11px] font-semibold">
                  <span className={`px-2 py-0.5 rounded-full ${gwStep === "request" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>Cashfree Checkout</span>
                </div>
              )}
            </div>

            {/* PAID STUDENT VIEW: Transaction Summary */}
            {activeRecord.status === "paid" ? (
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-green-700 mb-0.5">Payment Status</div>
                    <div className="text-2xl font-black text-green-700">✓ Fully Paid</div>
                    {activeRecord.lastPaymentDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last payment: {new Date(activeRecord.lastPaymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Payment History &nbsp;<span className="font-normal">({payments.length} transactions)</span>
                  </div>
                  {fetchingRecord ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />Loading history…
                    </div>
                  ) : payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p: any, i: number) => (
                        <div key={p.id ?? i}>
                          <div className={`flex flex-col gap-2 px-4 py-3 rounded-lg border ${
                            p.status === "voided" || p.status === "refunded" ? "bg-muted/30 opacity-60" : "bg-background border-border hover:border-primary/50"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">
                                  {p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                                  p.method === "cash" ? "bg-green-50 text-green-700 border-green-200"
                                    : p.method === "upi" ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : p.method === "cheque" || p.method === "dd" ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : p.method === "card" || p.method === "cashfree" ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}>
                                  {(p.method ?? "CASH").toUpperCase()}
                                </span>
                              </div>
                              <span className={`font-bold tabular-nums text-lg ${p.status === "voided" || p.status === "refunded" ? "line-through text-muted-foreground" : "text-green-700"}`}>
                                {inr(p.amount)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              Ref: <span className="font-mono">{p.receiptNumber ?? p.gatewayRef ?? "—"}</span>
                              {(p.status === "voided" || p.status === "refunded") && (
                                <span className="text-red-500 font-medium ml-2">REVERSED</span>
                              )}
                            </div>
                          </div>
                          {/* Edit/Reverse buttons for non-voided transactions */}
                          {p.status !== "voided" && p.status !== "refunded" && (
                            <div className="flex gap-1.5 ml-4 mb-1.5">
                              <button
                                onClick={() => {
                                  setEditTarget(editTarget?.id === p.id ? null : p);
                                  setVoidTarget(null);
                                  if (editTarget?.id !== p.id) {
                                    setEditFields({
                                      amount: String(p.amount), method: p.method ?? "",
                                      date: p.date ? new Date(p.date).toISOString().split("T")[0] : "",
                                      chequeNumber: p.chequeNumber ?? "", bankName: p.bankName ?? "",
                                      gatewayRef: p.gatewayRef ?? "", remarks: p.remarks ?? "", editReason: "",
                                    });
                                  }
                                }}
                                className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded px-2 py-1 transition-colors">
                                Edit
                              </button>
                              <button
                                onClick={() => setVoidTarget(voidTarget?.id === p.id ? null : { id: p.id, amount: p.amount, receiptNumber: p.receiptNumber })}
                                className="text-[11px] font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors">
                                Reverse
                              </button>
                              <button
                                onClick={() => printReceipt(p.id)}
                                className="text-[11px] font-semibold text-green-500 hover:text-green-700 border border-green-200 hover:border-green-400 rounded px-2 py-1 transition-colors">
                                Print
                              </button>
                            </div>
                          )}
                          {/* ── Edit Payment Panel ── */}
                          {editTarget?.id === p.id && (
                            <div className="mt-1 mx-1 p-3 rounded-lg border-2 border-blue-300 bg-blue-50/80 space-y-2.5 mb-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                                <Pencil className="h-4 w-4" />
                                Edit Payment — {p.receiptNumber ?? "Receipt"}
                              </div>
                              <p className="text-xs text-blue-600">Correct the payment details. All changes are audit-logged. Enter the reason for editing below.</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[11px] text-muted-foreground mb-1 block">Amount (₹)</Label>
                                  <Input className="h-7 text-xs border-blue-300" type="number"
                                    value={editFields.amount} onChange={e => setEditFields(f => ({ ...f, amount: e.target.value }))} />
                                </div>
                                <div>
                                  <Label className="text-[11px] text-muted-foreground mb-1 block">Method</Label>
                                  <select className="h-7 text-xs border border-blue-300 rounded w-full px-2 bg-white"
                                    value={editFields.method} onChange={e => setEditFields(f => ({ ...f, method: e.target.value }))}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-[11px] font-bold text-blue-700 mb-1 block">Reason for Edit *</Label>
                                  <Input className="h-7 text-xs border-blue-400 focus-visible:ring-blue-400"
                                    placeholder="e.g. Incorrect amount, Cheque bounced"
                                    value={editFields.editReason} onChange={e => setEditFields(f => ({ ...f, editReason: e.target.value }))} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditTarget(null)}>Cancel</Button>
                                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  disabled={editing || !editFields.editReason.trim()} onClick={handleEditPayment}>
                                  {editing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                          {/* ── Void / Reverse Panel ── */}
                          {voidTarget?.id === p.id && (
                            <div className="mt-1 mx-1 p-3 rounded-lg border-2 border-red-300 bg-red-50/80 space-y-2.5 mb-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                                <AlertTriangle className="h-4 w-4" />
                                Reverse {inr(p.amount)} — {p.receiptNumber ?? "this payment"}
                              </div>
                              <p className="text-xs text-red-600">This will create a refund entry. The student's outstanding balance will be restored. This action will be logged.</p>
                              <Input className="h-8 text-xs border-red-300 focus-visible:ring-red-400"
                                placeholder="Reason for reversal (required) *"
                                value={voidReason} onChange={e => setVoidReason(e.target.value)} />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setVoidTarget(null); setVoidReason(""); }}>Cancel</Button>
                                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                  disabled={voiding || !voidReason.trim()} onClick={handleVoid}>
                                  {voiding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  Confirm Reversal
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* UNPAID/PENDING STUDENT VIEW: Collect Payment Form */
              <>
                {/* Cashfree gateway panel */}
                {isDigital && gwStep === "request" && (
                  <div className="overflow-y-auto flex-1 px-5 py-4">
                    {renderCashfreePanel()}
                  </div>
                )}

                {/* Normal form (step = form) */}
                {gwStep === "form" && (
                  <>
                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    {/* Outstanding prominently at top */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-red-700 mb-0.5">
                        {hasAdjustments ? "Adjusted Outstanding" : "Outstanding Balance"}
                      </div>
                      <div className="text-3xl font-black text-red-700 tabular-nums">{inr(adjustedOutstanding)}</div>
                      {record.dueDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(record.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                          {daysOverdue(record.dueDate) > 0 && (
                            <span className="text-red-600 font-semibold ml-2">· {daysOverdue(record.dueDate)}d overdue</span>
                          )}
                        </div>
                      )}
                    </div>
                    {amt > 0 && amt <= adjustedOutstanding + 0.01 && (
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">After This Payment</div>
                        <div className={`text-xl font-bold tabular-nums mt-0.5 ${afterPayment === 0 ? "text-green-600" : "text-amber-600"}`}>
                          {afterPayment === 0 ? "✓ Cleared" : inr(afterPayment)}
                        </div>
                        {amt < adjustedOutstanding && <div className="text-xs text-muted-foreground">{inr(afterPayment)} remaining</div>}
                      </div>
                    )}
                  </div>

                  {/* Concession Panel */}
                  <div className="rounded-xl border">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors rounded-xl"
                      onClick={() => setConcessionOpen(!concessionOpen)}>
                      <span className="flex items-center gap-2 font-semibold">
                        <Tag className="h-4 w-4 text-blue-600" />
                        Apply Concession / Waiver
                        {(record.discountAmount ?? 0) > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            {inr(record.discountAmount)} active
                          </span>
                        )}
                      </span>
                      {concessionOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {concessionOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        <div className="p-2 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
                          75% cap: <strong>{inr((record.totalAmount ?? 0) * 0.75)}</strong> &nbsp;|&nbsp;
                          Applied: <strong>{inr(record.discountAmount ?? 0)}</strong> &nbsp;|&nbsp;
                          Headroom: <strong>{inr(maxMoreConcession)}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Concession Type</Label>
                            <Select value={concessionType} onValueChange={setConcessionType}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CONCESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Mode</Label>
                            <div className="flex h-8 rounded-md border overflow-hidden">
                              <button onClick={() => setConcessionMode("fixed")}
                                className={`flex-1 text-xs font-semibold transition-colors ${concessionMode === "fixed" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                                ₹ Fixed
                              </button>
                              <button onClick={() => setConcessionMode("percent")}
                                className={`flex-1 text-xs font-semibold transition-colors ${concessionMode === "percent" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                                % Rate
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              {concessionMode === "fixed" ? "Amount (₹)" : "Percentage (%)"}
                            </Label>
                            <Input className="h-8 text-sm tabular-nums" type="number" min={0}
                              max={concessionMode === "percent" ? 75 : maxMoreConcession}
                              placeholder={concessionMode === "fixed" ? "e.g. 2000" : "e.g. 10"}
                              value={concessionValue} onChange={e => setConcessionValue(e.target.value)} />
                          </div>
                          {concessionCalcAmt > 0 && (
                            <div className="text-sm font-bold text-green-700 pb-1.5 tabular-nums shrink-0">
                              = {inr(concessionCalcAmt)}
                            </div>
                          )}
                          <Button size="sm" className="h-8 shrink-0" onClick={handleApplyConcession}
                            disabled={applyingConcession || concessionCalcAmt <= 0}>
                            {applyingConcession ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Apply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Additional Charges (Hostel, Library Fine, Misc) ── */}
                  <div className="rounded-xl border">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors rounded-xl"
                      onClick={() => setExtraChargesOpen(!extraChargesOpen)}>
                      <span className="flex items-center gap-2 font-semibold">
                        <PackagePlus className="h-4 w-4 text-orange-500" />
                        Add Extra Charges
                        {extraItems.length > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                            {inr(totalExtraCharges)} added
                          </span>
                        )}
                      </span>
                      {extraChargesOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {extraChargesOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        <div className="p-2 rounded bg-orange-50 border border-orange-100 text-xs text-orange-700">
                          Add hostel fees, library fines, or miscellaneous charges to this collection.
                          These will be recorded and included in the receipt. Hostel &amp; Library modules will be wired here when ready.
                        </div>
                        {extraItems.length > 0 && (
                          <div className="space-y-1.5">
                            {extraItems.map((item, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm">
                                <span className="font-medium text-orange-800">{item.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold tabular-nums text-orange-700">{inr(item.amount)}</span>
                                  <button onClick={() => {
                                    if (parseFloat(amount) === adjustedOutstanding) {
                                      setAmount(String(Math.max(0, adjustedOutstanding - item.amount)));
                                    }
                                    setExtraItems(prev => prev.filter((_, idx) => idx !== i));
                                  }}
                                    className="text-red-400 hover:text-red-600 text-[11px]">✕</button>
                                </div>
                              </div>
                            ))}
                            <div className="text-xs font-semibold text-orange-700 text-right pr-1">
                              Total extra: {inr(totalExtraCharges)}
                            </div>
                          </div>
                        )}
                        {/* Add new charge */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Charge Type</Label>
                            <select className="h-8 text-xs border border-input rounded w-full px-2 bg-background"
                              value={newExtraPreset}
                              onChange={e => {
                                setNewExtraPreset(e.target.value);
                                if (e.target.value !== "custom") {
                                  const preset = EXTRA_CHARGE_PRESETS.find(p => p.value === e.target.value);
                                  if (preset) setNewExtraLabel(preset.label);
                                } else {
                                  setNewExtraLabel("");
                                }
                              }}>
                              {EXTRA_CHARGE_PRESETS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</Label>
                            <Input className="h-8 text-sm tabular-nums" type="number" min={1}
                              placeholder="0" value={newExtraAmt}
                              onChange={e => setNewExtraAmt(e.target.value)} />
                          </div>
                          {newExtraPreset === "custom" && (
                            <div className="col-span-2">
                              <Label className="text-xs text-muted-foreground mb-1 block">Custom Label</Label>
                              <Input className="h-8 text-sm" placeholder="Describe the charge…"
                                value={newExtraLabel} onChange={e => setNewExtraLabel(e.target.value)} />
                            </div>
                          )}
                        </div>
                        <Button size="sm" className="h-8 w-full gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={!newExtraAmt || parseFloat(newExtraAmt) <= 0 || !newExtraLabel}
                          onClick={() => {
                            const newChargeAmt = parseFloat(newExtraAmt);
                            const labelText = newExtraPreset === "custom"
                              ? newExtraLabel
                              : (EXTRA_CHARGE_PRESETS.find(p => p.value === newExtraPreset)?.label ?? "Charge");
                            // Auto-update amount if it hasn't been manually changed from the current outstanding
                            if (parseFloat(amount) === adjustedOutstanding) {
                              setAmount(String(Math.max(0, adjustedOutstanding + newChargeAmt)));
                            }
                            setExtraItems(prev => [...prev, { label: labelText, amount: newChargeAmt }]);
                            setNewExtraAmt(""); setNewExtraLabel("");
                          }}>
                          <Plus className="h-3.5 w-3.5" />Add Charge
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Amount to Collect *
                        {totalExtraCharges > 0 && (
                          <span className="ml-2 text-orange-600 font-bold normal-case">incl. {inr(totalExtraCharges)} extra</span>
                        )}
                      </Label>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => setAmount(String(adjustedOutstanding))}
                          className="font-semibold text-primary hover:underline">Full</button>
                        {adjustedOutstanding > 1000 && (
                          <button onClick={() => setAmount(String(Math.ceil(adjustedOutstanding / 2)))}
                            className="text-muted-foreground hover:text-foreground hover:underline">Half</button>
                        )}
                        {adjustedOutstanding > 1000 && (
                          <button onClick={() => setAmount("")}
                            className="text-muted-foreground hover:text-foreground hover:underline">Custom</button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground select-none">₹</span>
                      <Input
                        className="pl-9 h-14 text-3xl font-black tabular-nums border-2 focus-visible:ring-2"
                        type="number" step="1" min={1}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Enter any amount"
                      />
                    </div>
                    {amt > 0 && amt < adjustedOutstanding - 0.01 && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Partial payment — {inr(afterPayment)} will remain outstanding
                      </p>
                    )}
                    {amt > adjustedOutstanding + 0.01 && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">⚠ Amount exceeds outstanding balance</p>
                    )}
                  </div>

                  {/* Payment Date + Received By */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Payment Date</Label>
                      <Input className="h-9 text-sm" type="date" max={today} value={payDate} onChange={e => setPayDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Received By</Label>
                      <Input className="h-9 text-sm" placeholder="Staff name / counter" value={processedBy} onChange={e => setProcessedBy(e.target.value)} />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Payment Method *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PAYMENT_METHODS.map(m => (
                        <button key={m.value} onClick={() => { setMethod(m.value); setGwStep("form"); }}
                          className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                            method === m.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted text-muted-foreground"
                          }`}>
                          <span className="text-lg leading-none">{m.icon}</span>
                          {m.label.split("(")[0].trim().split(" ").slice(0, 2).join(" ")}
                        </button>
                      ))}
                    </div>
                    {isDigital && (
                      <p className="text-[11px] text-blue-700 mt-1.5 font-medium">
                        Online payment via Cashfree — handles UPI, Cards, Net Banking &amp; Wallets.
                        A payment link or checkout window will open.
                      </p>
                    )}
                  </div>

                  {/* Cheque / DD — inline reference fields for non-digital */}
                  {(method === "cheque" || method === "dd") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                          {method === "dd" ? "Demand Draft No. *" : "Cheque No. *"}
                        </Label>
                        <Input className="h-9 text-sm font-mono" placeholder="Instrument number" value={chequeNo} onChange={e => setChequeNo(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Date on Instrument</Label>
                        <Input className="h-9 text-sm" type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Drawee Bank</Label>
                        <Input className="h-9 text-sm" placeholder="e.g. SBI, HDFC" value={bankName} onChange={e => setBankName(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* Narration */}
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Narration</Label>
                    <Input className="h-9 text-sm" placeholder="Optional note" value={narration} onChange={e => setNarration(e.target.value)} />
                  </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 px-5 py-4 border-t bg-muted/20 flex gap-3">
                  <Button variant="outline" onClick={onClose} className="w-28">Cancel</Button>
                  {isDigital ? (
                    <Button
                      className="flex-1 h-11 font-bold gap-2 text-base bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={saving || !amt || amt <= 0 || amt > adjustedOutstanding + 0.01}
                      onClick={handleInitiateCashfree}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Pay {amt > 0 ? inr(amt) : ""} via Cashfree →
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 h-11 font-bold gap-2 text-base"
                      disabled={saving || !amt || amt <= 0 || amt > adjustedOutstanding + 0.01}
                      onClick={handleCollect}
                    >
                      {saving
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
                        : <><Receipt className="h-4 w-4" />Collect {amt > 0 ? inr(amt) : ""} &amp; Print Receipt</>
                      }
                    </Button>
                  )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Fee Structure Tab ────────────────────────────────────
function FeeStructureTab({ academicYear }: { academicYear: string }) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [form, setForm] = useState<Partial<CreateFeeStructureDto>>({ installmentCount: 1 });
  const [assigning, setAssigning] = useState<string | null>(null); // structureId being assigned

  const availableStandards = Array.from(new Set(allClasses.map(c => c.standard))).sort(
    (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
  );

  const totalFee = useMemo(() => FEE_HEADS.reduce((s, h) => s + (parseFloat(String((form as any)[h.key])) || 0), 0), [form]);

  useEffect(() => {
    academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(() => {});
    feeApi.getFeeStructures().then(r => setStructures(r || [])).catch(() => {}).finally(() => setLoading(false));
  }, [academicYear]);

  const openCreate = () => { setEditing(null); setForm({ installmentCount: 1, academicYear }); setShowDialog(true); };
  const openEdit = (s: FeeStructure) => {
    setEditing(s);
    setForm({
      name: s.name, class: s.class, academicYear: s.academicYear,
      tuitionFee: s.tuitionFee, examFee: s.examFee, libraryFee: s.libraryFee,
      labFee: s.labFee, developmentFee: s.developmentFee, sportsFee: s.sportsFee,
      admissionFee: s.admissionFee, transportFee: s.transportFee, hostelFee: s.hostelFee,
      uniformFee: s.uniformFee, booksFee: s.booksFee, miscellaneous: s.miscellaneous,
      installmentCount: s.installmentCount,
    });
    setShowDialog(true);
  };

  const handleAssign = async (structure: FeeStructure) => {
    setAssigning(structure.id);
    try {
      const res = await bulkAssignStructure(structure.id);
      if (res.assigned > 0) {
        toast.success(`${res.assigned} student(s) in Class ${structure.class} assigned fee records.${res.skipped > 0 ? ` ${res.skipped} already had records (skipped).` : ""}`);
      } else {
        toast.info(res.skipped > 0
          ? `All ${res.skipped} students in Class ${structure.class} already have fee records for this structure.`
          : `No active students found in Class ${structure.class}.`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to assign structure");
    } finally { setAssigning(null); }
  };

  const handleSave = async () => {
    if (!form.name || !form.class) { toast.error("Provide structure name and class"); return; }
    setSaving(true);
    try {      const payload: CreateFeeStructureDto = {
        schoolId: "", name: form.name!, class: form.class!, academicYear: form.academicYear || academicYear,
        ...FEE_HEADS.reduce((acc, h) => ({ ...acc, [h.key]: (form as any)[h.key] || 0 }), {}),
        installmentCount: form.installmentCount || 1,
      } as CreateFeeStructureDto;
      if (editing) {
        await feeApi.updateFeeStructure(editing.id, payload);
        toast.success("Fee structure updated");
      } else {
        await feeApi.createFeeStructure(payload);
        toast.success("Fee structure created");
      }
      const updated = await feeApi.getFeeStructures();
      setStructures(updated || []);
      setShowDialog(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Fee Structures</h3>
          <p className="text-sm text-muted-foreground">Define fee heads and installment plans per class</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Structure</Button>
      </div>

      {/* Auto-link info */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
        <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
        <div>
          <span className="font-semibold">How auto-assignment works: </span>
          Create a structure for a class (e.g. "Annual Fee 2025-26 — Class 1"), then click
          <strong> "Assign to Class"</strong> to automatically create fee records for every active student in that class.
          Students already having a record for the same structure are skipped. After assigning, students appear in the
          <em> Collect Fees</em> tab with their outstanding balance.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : structures.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-xl">
          <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-muted-foreground mb-2">No fee structures yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Set up fee heads for each class to start collecting fees</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create First Structure</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {structures.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted-foreground">Class {s.class} · {s.academicYear}</div>
                  </div>
                  <div className="text-xl font-bold text-primary">{inr(s.totalAmount)}</div>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {INSTALLMENT_PLANS.find(p => p.value === String(s.installmentCount))?.label ?? `${s.installmentCount} installments`}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                  {FEE_HEADS.filter(h => (s as any)[h.key] > 0).slice(0, 4).map(h => (
                    <div key={h.key} className="flex justify-between bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground truncate">{h.label.split(" ")[0]}</span>
                      <span className="font-medium ml-1">{inr((s as any)[h.key])}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" className="h-7 text-xs flex-1 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={assigning === s.id}
                    onClick={() => handleAssign(s)}
                    title={`Auto-create fee records for all Class ${s.class} students`}>
                    {assigning === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                    Assign to Class
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600"
                    onClick={async () => { try { await feeApi.deleteFeeStructure(s.id); setStructures(prev => prev.filter(x => x.id !== s.id)); toast.success("Deleted"); } catch { toast.error("Failed"); } }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => !v && setShowDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Fee Structure" : "New Fee Structure"}</DialogTitle>
            <DialogDescription>Define fee heads for a class. Leave blank for fee heads not applicable.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Structure Name *</Label>
                <Input className="h-9 text-sm" placeholder="e.g. Annual Fee 2025-26" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Class *</Label>
                <Select value={form.class ?? ""} onValueChange={v => setForm({ ...form, class: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {availableStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee heads grouped by category */}
            {["Academic", "Development", "Other"].map(cat => (
              <div key={cat} className="col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b pb-1">{cat} Fees</div>
                <div className="grid grid-cols-2 gap-3">
                  {FEE_HEADS.filter(h => h.category === cat).map(h => (
                    <div key={h.key}>
                      <Label className="text-xs text-muted-foreground mb-1 block">{h.label}</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                        <Input
                          className="h-8 text-sm pl-6"
                          type="number" min={0}
                          value={(form as any)[h.key] ?? ""}
                          onChange={e => setForm({ ...form, [h.key]: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Total & Installments */}
            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="font-semibold">Total Annual Fee</div>
              <div className="text-2xl font-bold text-primary">{inr(totalFee)}</div>
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Installment Plan</Label>
              <Select value={String(form.installmentCount ?? 1)} onValueChange={v => setForm({ ...form, installmentCount: parseInt(v) })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTALLMENT_PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.installmentCount && form.installmentCount > 1 && totalFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Each installment ≈ {inr(Math.ceil(totalFee / form.installmentCount))}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Saving…" : editing ? "Update Structure" : "Save Structure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Concessions Tab ─────────────────────────────────────
function ConcessionsTab({ academicYear }: { academicYear: string }) {
  const [concessions, setConcessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    studentName: "", studentId: "", class: "", concessionType: "merit",
    discountType: "percentage", discountValue: "", academicYear,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: `${new Date().getFullYear() + 1}-03-31`,
    reason: "", approvedBy: "",
  });

  const load = () => {
    setLoading(true);
    apiClient.get("/FeeConcession/applications")
      .then(r => setConcessions(r.data?.concessions ?? r.data?.items ?? r.data ?? []))
      .catch(() => setConcessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [academicYear]);

  const handleSave = async () => {
    if (!form.studentName || !form.discountValue) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await apiClient.post("/FeeConcession/applications", {
        ...form,
        discountValue: parseFloat(form.discountValue),
        academicYear: form.academicYear || academicYear,
        schoolId: "",
      });
      toast.success("Concession applied successfully");
      load();
      setShowDialog(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save concession");
    } finally { setSaving(false); }
  };

  const filtered = concessions.filter(c =>
    !search || (c.studentName ?? "").toLowerCase().includes(search.toLowerCase()) || (c.class ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Fee Concessions & Waivers</h3>
          <p className="text-sm text-muted-foreground">Merit, RTE, EWS/BPL, SC/ST, Sibling, Staff Ward and more</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2 shrink-0"><Plus className="h-4 w-4" />Add Concession</Button>
      </div>

      {/* Concession type reference */}
      <div className="flex flex-wrap gap-2">
        {CONCESSION_TYPES.slice(0, 6).map(t => (
          <span key={t.value} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${t.color}`}>{t.label}</span>
        ))}
        <span className="text-[11px] text-muted-foreground py-1">+{CONCESSION_TYPES.length - 6} more types</span>
      </div>

      {/* India quick reference */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-3">
          <div className="text-xs text-amber-800 space-y-1">
            <div className="font-semibold">India Concession Reference</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-1">
              <div>• <strong>RTE 25%</strong>: Govt mandated, EWS/SC/ST free seats</div>
              <div>• <strong>Sibling</strong>: 2nd child 10%, 3rd+ child 20% (typical)</div>
              <div>• <strong>SC/ST</strong>: As per state government directive</div>
              <div>• <strong>Staff Ward</strong>: As per school policy (50–100%)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 h-9 text-sm" placeholder="Search by student name or class…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{concessions.length === 0 ? "No concessions yet" : "No matches found"}</p>
          <p className="text-sm mt-1">Add concessions to apply discounts to student fees</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, i) => {
                const ct = CONCESSION_TYPES.find(t => t.value === c.concessionType || t.value === c.type);
                return (
                  <TableRow key={c.id ?? i}>
                    <TableCell className="font-medium">{c.studentName}</TableCell>
                    <TableCell>{c.class}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ct?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {ct?.label ?? c.concessionType}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      {c.discountType === "fixed" ? inr(c.discountValue) : `${c.discountValue ?? c.percentage}%`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.validUntil}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.status === "active" ? "text-green-700 border-green-300" : "text-gray-500"}>
                        {c.status ?? "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.approvedBy ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add concession dialog */}
      <Dialog open={showDialog} onOpenChange={v => !v && setShowDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Fee Concession</DialogTitle>
            <DialogDescription>Apply a discount or waiver to a student's fee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Student Name *</Label>
                <Input className="h-9 text-sm" placeholder="Student full name" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Class</Label>
                <Input className="h-9 text-sm" placeholder="e.g. Class 9" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Concession Type *</Label>
                <Select value={form.concessionType} onValueChange={v => setForm({ ...form, concessionType: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONCESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm({ ...form, discountType: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {form.discountType === "fixed" ? "Amount (₹) *" : "Percentage (%) *"}
                </Label>
                <Input className="h-9 text-sm" type="number" min={0} max={form.discountType === "percentage" ? 100 : undefined}
                  placeholder={form.discountType === "fixed" ? "e.g. 5000" : "e.g. 25"}
                  value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Valid From</Label>
                <Input className="h-9 text-sm" type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Valid Until</Label>
                <Input className="h-9 text-sm" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Reason / Remarks</Label>
                <Input className="h-9 text-sm" placeholder="e.g. Rank 1 scholarship, RTE seat…" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Approved By</Label>
                <Input className="h-9 text-sm" placeholder="Principal / Administrator" value={form.approvedBy} onChange={e => setForm({ ...form, approvedBy: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Saving…" : "Apply Concession"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────
function ReportsTab({ records, academicYear }: { records: FeeRecord[]; academicYear: string }) {
  const [sending, setSending] = useState(false);

  const overdue = records.filter(r => r.status === "overdue");
  const pending = records.filter(r => r.status === "pending" || r.status === "overdue" || r.status === "partial");
  const paid = records.filter(r => r.status === "paid");
  const totalCollected = records.reduce((s, r) => s + r.paidAmount, 0);
  const totalPending = records.reduce((s, r) => s + r.pendingAmount, 0);

  // Class-wise summary
  const classSummary = Object.entries(
    records.reduce((acc, r) => {
      if (!acc[r.class]) acc[r.class] = { collected: 0, pending: 0, students: 0 };
      acc[r.class].collected += r.paidAmount;
      acc[r.class].pending += r.pendingAmount;
      acc[r.class].students += 1;
      return acc;
    }, {} as Record<string, { collected: number; pending: number; students: number }>)
  ).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  const downloadDefaulters = () => {
    const headers = ["#", "Student Name", "Class", "Total Fee", "Paid", "Balance Due", "Due Date", "Days Overdue"];
    const rows = overdue.map((r, i) => [
      i + 1, r.studentName, r.class, r.totalAmount, r.paidAmount, r.pendingAmount,
      r.dueDate, daysOverdue(r.dueDate)
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Defaulters_${academicYear}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const downloadClassWise = () => {
    const headers = ["Class", "Students", "Total Collected", "Total Pending", "Collection %"];
    const rows = classSummary.map(([cls, d]) => {
      const total = d.collected + d.pending;
      const pct = total ? Math.round((d.collected / total) * 100) : 0;
      return [cls, d.students, d.collected, d.pending, `${pct}%`].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Class_Fee_Summary_${academicYear}.csv`;
    a.click();
  };

  const sendReminders = async () => {
    setSending(true);
    try {
      await feeApi.sendFeeReminders({ channels: ["sms"], minOverdueDays: 1 });
      toast.success(`Reminders sent to ${overdue.length} defaulters`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to send reminders");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      {/* Collection Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Collected", value: inr(totalCollected), color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Pending", value: inr(totalPending), color: "text-red-600", bg: "bg-red-50" },
          { label: "Defaulters", value: overdue.length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Collection Rate", value: `${records.length ? Math.round((paid.length / records.length) * 100) : 0}%`, color: "text-blue-600", bg: "bg-blue-50" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className={`p-4 ${c.bg} rounded-lg`}>
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" onClick={downloadDefaulters} disabled={!overdue.length}>
          <Download className="h-4 w-4" />Download Defaulters List ({overdue.length})
        </Button>
        <Button variant="outline" className="gap-2" onClick={downloadClassWise}>
          <Download className="h-4 w-4" />Class-wise Fee Summary
        </Button>
        <Button variant="outline" className="gap-2" onClick={sendReminders} disabled={sending || !overdue.length}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending…" : `Send SMS Reminders (${overdue.length})`}
        </Button>
      </div>

      {/* Defaulters table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Fee Defaulters ({overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdue.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-70" />
              <p className="font-medium">No defaulters! 🎉</p>
              <p className="text-sm">All students are up to date with payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate)).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.studentName ?? "Unknown"}</TableCell>
                      <TableCell>{r.class ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{inr(r.pendingAmount ?? 0)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.dueDate || "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          {daysOverdue(r.dueDate)}d overdue
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class-wise summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Class-wise Fee Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Collection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummary.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data available</TableCell></TableRow>
                ) : classSummary.map(([cls, d]) => {
                  const total = d.collected + d.pending;
                  const pct = total ? Math.round((d.collected / total) * 100) : 0;
                  return (
                    <TableRow key={cls}>
                      <TableCell className="font-medium">{cls}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.students}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{inr(d.collected)}</TableCell>
                      <TableCell className="text-right text-red-600">{inr(d.pending)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium w-9 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aging Analysis Tab ──────────────────────────────────
function AgingTab() {
  const [aging, setAging] = useState<AgingBucket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSchoolAging()
      .then(setAging)
      .catch(() => toast.error("Failed to load aging data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!aging) return <div className="text-center p-12 text-muted-foreground">No aging data available</div>;

  const buckets = [
    { label: "Current", amount: aging.current, color: "bg-green-500", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    { label: "0–30 Days", amount: aging.days0To30, color: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    { label: "31–60 Days", amount: aging.days31To60, color: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    { label: "61–90 Days", amount: aging.days61To90, color: "bg-red-400", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    { label: "90+ Days", amount: aging.days90Plus, color: "bg-red-700", bg: "bg-red-50", text: "text-red-800", border: "border-red-300" },
  ];
  const maxBucket = Math.max(...buckets.map(b => b.amount), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Outstanding Receivables — Aging Analysis</h3>
          <p className="text-sm text-muted-foreground">CA-audit ready breakdown · {aging.studentCount} students with dues</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total Outstanding</div>
          <div className="text-2xl font-bold text-red-600">{inr(aging.totalOutstanding)}</div>
        </div>
      </div>

      {/* Bucket cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {buckets.map(b => (
          <Card key={b.label} className={`${b.bg} border ${b.border}`}>
            <CardContent className="p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{b.label}</div>
              <div className={`text-xl font-bold mt-1 ${b.text}`}>{inr(b.amount)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {aging.totalOutstanding > 0 ? `${Math.round((b.amount / aging.totalOutstanding) * 100)}%` : "0%"} of total
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Aging Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buckets.map(b => (
              <div key={b.label} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-right shrink-0">{b.label}</div>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${b.color} rounded-lg transition-all duration-700 flex items-center justify-end px-3`}
                    style={{ width: `${Math.max((b.amount / maxBucket) * 100, 2)}%` }}
                  >
                    {b.amount > 0 && (
                      <span className="text-xs font-bold text-white drop-shadow">{inr(b.amount)}</span>
                    )}
                  </div>
                </div>
                <div className="w-16 text-xs text-muted-foreground text-right">
                  {aging.totalOutstanding > 0 ? `${Math.round((b.amount / aging.totalOutstanding) * 100)}%` : "0%"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CA note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm text-blue-800 space-y-1">
            <div className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Audit Note</div>
            <p className="text-xs">This aging schedule classifies outstanding fee receivables by the number of days past their due date. Amounts in the "90+ Days" bucket may require provision for doubtful debts as per applicable accounting standards. All figures are computed in real-time from the fee ledger.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Audit Trail Tab ─────────────────────────────────────
function AuditTrailTab() {
  const [logs, setLogs] = useState<FeeAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = () => {
    setLoading(true);
    getAuditTrail({
      action: actionFilter !== "all" ? actionFilter : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      pageSize: 30,
    })
      .then(res => { setLogs(res.logs); setTotal(res.total); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, actionFilter, dateFrom, dateTo]);

  const actionColors: Record<string, string> = {
    PaymentReceived: "bg-green-100 text-green-800 border-green-200",
    ConcessionApproved: "bg-blue-100 text-blue-800 border-blue-200",
    ConcessionRejected: "bg-red-100 text-red-800 border-red-200",
    FeeRecordCreated: "bg-purple-100 text-purple-800 border-purple-200",
    LateFeeApplied: "bg-amber-100 text-amber-800 border-amber-200",
    RefundProcessed: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Audit Trail</h3>
          <p className="text-sm text-muted-foreground">Immutable log of every financial mutation — CA traceable</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">{total} entries</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="PaymentReceived">Payment Received</SelectItem>
            <SelectItem value="ConcessionApproved">Concession Approved</SelectItem>
            <SelectItem value="ConcessionRejected">Concession Rejected</SelectItem>
            <SelectItem value="FeeRecordCreated">Fee Record Created</SelectItem>
            <SelectItem value="LateFeeApplied">Late Fee Applied</SelectItem>
            <SelectItem value="RefundProcessed">Refund Processed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
          <Input type="date" className="h-9 text-sm w-40" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
          <Input type="date" className="h-9 text-sm w-40" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setActionFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}>
          <RefreshCw className="h-3.5 w-3.5" />Clear
        </Button>
      </div>

      {/* Logs table */}
      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No audit entries found</p>
          <p className="text-sm mt-1">Financial events will appear here as they occur</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    <br />
                    {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${actionColors[log.action] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {log.action.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{log.entityType}</div>
                    <div className="text-xs text-muted-foreground font-mono">{log.entityId?.slice(0, 8)}…</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {log.amount != null ? inr(log.amount) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{log.performedByName ?? "System"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={log.remarks ?? ""}>
                    {log.remarks ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} entries)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Audit integrity note */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="text-sm text-green-800 space-y-1">
            <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Audit Integrity</div>
            <p className="text-xs">All entries in this log are immutable (insert-only). No record can be edited or deleted once created. Each entry captures the old and new state as JSON snapshots, the performing user, timestamp, and transaction amount. This log can be used as primary evidence for statutory audit.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Fee Module Page ─────────────────────────────────
export default function Fees() {
  const { academicYear, availableYears } = useAcademicYear();
  const [activeTab, setActiveTab] = useState("collect");
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 });

  // Quick Collect
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickRecord, setQuickRecord] = useState<FeeRecord | null>(null);

  const quickMatches = useMemo(() => {
    if (!quickSearch.trim() || quickSearch.length < 2) return [];
    const q = quickSearch.toLowerCase();
    return records
      .filter(r =>
        r.studentName?.toLowerCase().includes(q) ||
        (r.studentId ?? "").toLowerCase().includes(q) ||
        (r.class ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [quickSearch, records]);

  // Collect/Student dues
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);

  // Sibling discount dialog
  const [siblingDiscountOpen, setSiblingDiscountOpen] = useState(false);
  const [siblingDiscountRecord, setSiblingDiscountRecord] = useState<FeeRecord | null>(null);
  const [siblingDiscountType, setSiblingDiscountType] = useState<"percentage" | "flat">("percentage");
  const [siblingDiscountValue, setSiblingDiscountValue] = useState("");
  const [siblingDiscountReason, setSiblingDiscountReason] = useState("Sibling studying in same school");
  const [siblingDiscountLoading, setSiblingDiscountLoading] = useState(false);
  const [siblingDiscountResult, setSiblingDiscountResult] = useState<{ applied: number; totalSaved: number; siblings: { id: string; name: string; class: string; section: string }[] } | null>(null);

  const handleSiblingDiscount = async () => {
    if (!siblingDiscountRecord || !siblingDiscountValue) { toast.error("Enter discount value"); return; }
    setSiblingDiscountLoading(true);
    try {
      const result = await feeApi.applySiblingDiscount({
        studentId: siblingDiscountRecord.studentId,
        discountType: siblingDiscountType,
        discountValue: parseFloat(siblingDiscountValue),
        reason: siblingDiscountReason || undefined,
        appliedBy: "Admin",
      });
      setSiblingDiscountResult(result);
      toast.success(`Sibling discount applied! ${inr(result.totalSaved)} saved across ${result.applied} fee records.`);
      loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data || "Failed to apply sibling discount");
    } finally {
      setSiblingDiscountLoading(false);
    }
  };

  const uniqueClasses = useMemo(() =>
    Array.from(new Set(records.map(r => r.class))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [records]
  );

  const loadData = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      feeApi.getFeeRecords(1, 500, undefined, filterStatus !== "all" ? filterStatus : undefined),
      feeApi.getFeeStructures(),
    ]).then(([recordRes, structRes]) => {
      const raw: FeeRecord[] = (recordRes as any).feeRecords ?? (recordRes as any).items ?? (recordRes as any).records ?? [];
      setRecords(raw);
      setStructures(structRes || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const loadStats = () => {
    setStatsLoading(true);
    feeApi.getFeeStats(academicYear ?? undefined)
      .then(s => setStats({
        totalCollected: s.totalCollected,
        totalPending: s.totalPending,
        totalOverdue: s.totalOverdue,
        collectionRate: s.collectionRate,
      }))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => { loadData(); loadStats(); }, [academicYear, filterStatus]);

  const filteredRecords = useMemo(() => records.filter(r => {
    const ms = !search || r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (r.studentId ?? "").toLowerCase().includes(search.toLowerCase());
    const mc = filterClass === "all" || r.class === filterClass;
    const ss = filterStatus === "all" || r.status === filterStatus;
    return ms && mc && ss;
  }), [records, search, filterClass, filterStatus]);

  const todayCollected = useMemo(() =>
    records.flatMap(r => (r as any).payments ?? [])
      .filter((p: any) => p.date?.startsWith(new Date().toISOString().split("T")[0]))
      .reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
    [records]
  );

  const kpiCards = [
    { label: "Today's Collection", value: inr(todayCollected), sub: "Cash counter today", color: "text-green-600", bg: "bg-green-50", icon: <IndianRupee className="h-5 w-5 text-green-600" /> },
    { label: "Total Collected", value: inr(stats.totalCollected), sub: "This academic year", color: "text-blue-600", bg: "bg-blue-50", icon: <TrendingUp className="h-5 w-5 text-blue-600" /> },
    { label: "Total Pending", value: inr(stats.totalPending), sub: "Across all students", color: "text-amber-600", bg: "bg-amber-50", icon: <Clock className="h-5 w-5 text-amber-600" /> },
    { label: "Overdue", value: inr(stats.totalOverdue), sub: `${records.filter(r => r.status === "overdue").length} students`, color: "text-red-600", bg: "bg-red-50", icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
    { label: "Collection Rate", value: `${Math.round(stats.collectionRate)}%`, sub: "Of total fees", color: "text-purple-600", bg: "bg-purple-50", icon: <BarChart3 className="h-5 w-5 text-purple-600" /> },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee className="h-7 w-7 text-primary" />
            Fee Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Collect fees, manage installments, concessions, and reports — all in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => loadData()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setQuickSearch(""); setQuickRecord(null); setQuickOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />Quick Collect
          </Button>
        </div>
      </div>

      {/* ── KPI Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground leading-tight">{k.label}</span>
                <div className={`h-8 w-8 rounded-full ${k.bg} flex items-center justify-center shrink-0`}>{k.icon}</div>
              </div>
              <div className={`text-xl font-bold ${k.color}`}>
                {statsLoading && k.label !== "Today's Collection" ? <span className="text-muted-foreground text-base">—</span> : k.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="collect" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <Receipt className="h-4 w-4" /><span>Collect Fees</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <CalendarDays className="h-4 w-4" /><span>Day Summary</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <Building2 className="h-4 w-4" /><span>Fee Structure</span>
          </TabsTrigger>
          <TabsTrigger value="concessions" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <Tag className="h-4 w-4" /><span>Concessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <BarChart3 className="h-4 w-4" /><span>Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Collect Fees Tab (Student Dues) ──────────────── */}
        <TabsContent value="collect" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder="Search by student name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed rounded-xl">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="font-semibold text-muted-foreground">
                {records.length === 0 ? "No fee records yet" : "No students match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Set up fee structures and assign fees to students to get started</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{filteredRecords.length} students</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(r => {
                      const sc = statusConfig[r.status] ?? statusConfig.pending;
                      const isExpanded = expandedRow === r.id;
                      const overdueDays = r.status === "overdue" ? daysOverdue(r.dueDate) : 0;
                      return (
                        <>
                          <TableRow key={r.id} className={`cursor-pointer hover:bg-muted/30 ${isExpanded ? "bg-muted/20" : ""}`}
                            onClick={() => setExpandedRow(isExpanded ? null : r.id)}>
                            <TableCell>
                              <div className="font-medium">{r.studentName ?? "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{r.studentId ?? "—"}</div>
                            </TableCell>
                            <TableCell>{r.class ?? "—"}</TableCell>
                            <TableCell className="text-right">{inr(r.totalAmount ?? 0)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{inr(r.paidAmount ?? 0)}</TableCell>
                            <TableCell className="text-right font-semibold text-red-600">{inr(r.pendingAmount ?? 0)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {r.dueDate || "—"}
                              {overdueDays > 0 && (
                                <div className="text-xs text-red-600 font-medium">{overdueDays}d overdue</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                                {sc.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" className={`h-7 text-xs gap-1 ${r.status === "paid" ? "variant-outline" : ""}`} onClick={e => { e.stopPropagation(); setSelectedRecord(r); setPayDialogOpen(true); }}>
                                  <IndianRupee className="h-3 w-3" />
                                  {r.status === "paid" ? "View Summary" : "Collect"}
                                </Button>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/10">
                              <TableCell colSpan={8} className="py-3 px-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Fee Structure</div>
                                    <div className="font-medium">{r.feeStructureName ?? "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Discount Applied</div>
                                    <div className="font-medium text-green-600">{r.discountAmount ? inr(r.discountAmount) : "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Late Fee</div>
                                    <div className="font-medium text-amber-600">{r.lateFeeAmount ? inr(r.lateFeeAmount) : "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Last Payment</div>
                                    <div className="font-medium">{r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString("en-IN") : "—"}</div>
                                  </div>
                                  {(r as any).payments?.length > 0 && (
                                    <div className="col-span-2 md:col-span-4">
                                      <div className="text-xs text-muted-foreground mb-2">Payment History</div>
                                      <div className="space-y-1">
                                        {(r as any).payments.slice(0, 5).map((p: any, i: number) => (
                                          <div key={i} className="flex items-center justify-between text-xs bg-background border rounded px-3 py-1.5">
                                            <span>{new Date(p.date ?? p.createdAt).toLocaleDateString("en-IN")} — {p.method?.toUpperCase() ?? "CASH"}</span>
                                            <span className="font-semibold text-green-600">{inr(p.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {r.pendingAmount > 0 && (
                                    <div className="col-span-2 md:col-span-4 pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5 text-pink-700 border-pink-200 hover:bg-pink-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSiblingDiscountRecord(r);
                                          setSiblingDiscountResult(null);
                                          setSiblingDiscountValue("");
                                          setSiblingDiscountType("percentage");
                                          setSiblingDiscountReason("Sibling studying in same school");
                                          setSiblingDiscountOpen(true);
                                        }}
                                      >
                                        <Users className="h-3.5 w-3.5" />
                                        Apply Sibling Discount
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Day Summary Tab ───────────────────────────────── */}
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <CalendarDays className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">Today: </span>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Recent payments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {records.flatMap(r => ((r as any).payments ?? []).map((p: any) => ({ ...p, studentName: r.studentName, class: r.class }))).length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground text-sm">No payment transactions found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.flatMap(r => ((r as any).payments ?? []).map((p: any) => ({ ...p, studentName: r.studentName, class: r.class })))
                          .sort((a: any, b: any) => new Date(b.date ?? b.createdAt).getTime() - new Date(a.date ?? a.createdAt).getTime())
                          .slice(0, 20)
                          .map((p: any, i: number) => (
                            <TableRow key={p.id ?? i}>
                              <TableCell className="font-medium">{p.studentName}</TableCell>
                              <TableCell>{p.class}</TableCell>
                              <TableCell className="capitalize">
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                  {PAYMENT_METHODS.find(m => m.value === p.method)?.icon ?? "💵"} {p.method ?? "cash"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">{inr(p.amount)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{p.receiptNumber ?? "—"}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cashfree info */}
            <Card className="border border-indigo-200 bg-indigo-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">🔗</span>
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-800">Cashfree Online Gateway Active</div>
                    <div className="text-sm text-indigo-700 mt-0.5">
                      Select "Online Gateway (Cashfree)" when collecting fees to accept UPI, Cards, Net Banking and Wallets.
                      A Cashfree checkout window opens and the receipt is generated only after confirmed payment.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Fee Structure Tab ─────────────────────────────── */}
        <TabsContent value="structure" className="mt-4">
          <FeeStructureTab academicYear={academicYear ?? ""} />
        </TabsContent>

        {/* ── Concessions Tab ───────────────────────────────── */}
        <TabsContent value="concessions" className="mt-4">
          <ConcessionsTab academicYear={academicYear ?? ""} />
        </TabsContent>

        {/* ── Reports Tab ───────────────────────────────────── */}
        <TabsContent value="reports" className="mt-4">
          <ReportsTab records={records} academicYear={academicYear ?? ""} />
        </TabsContent>
      </Tabs>

      {/* ── Collect Payment Dialog ─────────────────────────── */}
      <CollectPaymentDialog
        open={payDialogOpen}
        onClose={() => setPayDialogOpen(false)}
        record={selectedRecord}
        onSuccess={() => loadData(true)}
        structures={structures}
      />

      {/* ── Quick Collect Dialog ─────────────────────────────── */}
      <Dialog open={quickOpen} onOpenChange={v => { if (!v) { setQuickOpen(false); setQuickRecord(null); setQuickSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Quick Collect
            </DialogTitle>
            <DialogDescription>Search by student name or admission number. Paid students open the Transaction Summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!quickRecord ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    className="pl-9 h-10"
                    placeholder="Type student name or admission no…"
                    value={quickSearch}
                    onChange={e => setQuickSearch(e.target.value)}
                  />
                </div>
                {quickSearch.length >= 2 && (
                  quickMatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No fee records found for "{quickSearch}"
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {quickMatches.map(r => (
                        <button
                          key={r.id}
                          onClick={() => { setQuickRecord(r); setQuickOpen(false); setSelectedRecord(r); setPayDialogOpen(true); }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <div>
                            <div className="font-semibold text-sm">{r.studentName}</div>
                            <div className="text-xs text-muted-foreground">{r.class} · Adm: {r.studentId ?? "—"}</div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className={`text-sm font-bold ${
                              r.status === "paid" ? "text-green-600"
                              : r.status === "overdue" ? "text-red-600"
                              : "text-amber-600"
                            }`}>
                              {r.status === "paid" ? inr(r.totalAmount ?? 0) : inr(r.pendingAmount ?? 0)}
                            </div>
                            <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-0.5 ${statusConfig[r.status]?.color ?? ""}`}>
                              {r.status === "paid" ? "View Summary" : statusConfig[r.status]?.label}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
                {quickSearch.length < 2 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Type at least 2 characters to search
                  </div>
                )}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sibling Discount Dialog ─────────────────────────── */}
      <Dialog open={siblingDiscountOpen} onOpenChange={v => { if (!v) { setSiblingDiscountOpen(false); setSiblingDiscountResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-600" />
              Apply Sibling Discount
            </DialogTitle>
          </DialogHeader>
          {siblingDiscountRecord && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 text-sm">
                <p className="font-semibold text-pink-800">Student: {siblingDiscountRecord.studentName}</p>
                <p className="text-pink-700 text-xs mt-0.5">
                  {siblingDiscountRecord.class} &bull; Pending: {inr(siblingDiscountRecord.pendingAmount)}
                </p>
                <p className="text-pink-600 text-xs mt-1">
                  This will apply a sibling discount to <strong>all pending fee records</strong> of this student and their linked siblings.
                </p>
              </div>

              {!siblingDiscountResult ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Discount Type</label>
                      <Select value={siblingDiscountType} onValueChange={(v: "percentage" | "flat") => setSiblingDiscountType(v)}>
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {siblingDiscountType === "percentage" ? "Discount %" : "Discount Amount (₹)"}
                      </label>
                      <Input
                        type="number"
                        className="h-9 mt-1"
                        placeholder={siblingDiscountType === "percentage" ? "e.g. 10" : "e.g. 1000"}
                        value={siblingDiscountValue}
                        onChange={e => setSiblingDiscountValue(e.target.value)}
                        min={0}
                        max={siblingDiscountType === "percentage" ? 100 : undefined}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reason</label>
                    <Input
                      className="h-9 mt-1"
                      value={siblingDiscountReason}
                      onChange={e => setSiblingDiscountReason(e.target.value)}
                      placeholder="Reason for discount"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    disabled={!siblingDiscountValue || siblingDiscountLoading}
                    onClick={handleSiblingDiscount}
                  >
                    {siblingDiscountLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    {siblingDiscountLoading ? "Applying..." : "Apply Sibling Discount"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-green-800">Discount Applied Successfully!</p>
                    <p className="text-sm text-green-700 mt-1">
                      {inr(siblingDiscountResult.totalSaved)} saved across {siblingDiscountResult.applied} fee record{siblingDiscountResult.applied > 1 ? "s" : ""}
                    </p>
                  </div>
                  {siblingDiscountResult.siblings.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Siblings Affected:</p>
                      <div className="space-y-1.5">
                        {siblingDiscountResult.siblings.map(sib => (
                          <div key={sib.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                            <div className="h-6 w-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 text-xs font-bold">
                              {sib.name?.charAt(0)}
                            </div>
                            <span className="font-medium">{sib.name}</span>
                            <span className="text-xs text-muted-foreground">{sib.class}-{sib.section}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => { setSiblingDiscountOpen(false); setSiblingDiscountResult(null); }}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
