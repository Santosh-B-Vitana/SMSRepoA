
import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  IndianRupee, Users, AlertTriangle, TrendingUp, Receipt, Search,
  Plus, Download, RefreshCw, CheckCircle2, Clock, XCircle,
  Printer, Tag, BarChart3, Loader2, Calendar, Building2,
  QrCode, ChevronDown, ChevronUp, Send, Pencil, Trash2,
  FileText, CalendarDays, CreditCard, Banknote, Filter, Link2, PackagePlus,
  Tags, Upload, ShieldOff, Check, BellRing, Eye, Wand2, X, GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { feeApi, FeeRecord, FeeStructure, CreateFeeStructureDto, TermSchedule, AgingBucket, FeeAuditLogEntry, InvoiceBreakdown, getSchoolAging, getAuditTrail, getInvoice, bulkAssignStructure, addExtraCharges, editPayment, linkStructure, updateFeeRecord, patchModuleFees, getFeeRecordById, ConcessionType, getConcessionTypes, createConcessionType, updateConcessionType, deleteConcessionType, applyFeeHeadOverrides, removeDiscount, syncStudentFeeRecords, recalculateFeeTotals, getLinkedClasses, linkClass, unlinkClass, ClassFeeStructureLink, getStructureComponents, setStructureComponents, FeeHead, FeeStructureComponent, toggleStructureActive } from "@/services/api/feeApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import apiClient from "@/services/api/apiClient";
import { boardApi, SchoolBoardConfigResponse } from "@/services/api/boardApi";
import { FeeHeadsManager } from "@/components/fees/FeeHeadsManager";
import { ReceiptTemplateManager } from "@/components/fees/ReceiptTemplateManager";
import { BulkFeePaymentUpload } from "@/components/fees/BulkFeePaymentUpload";
import { PromoteFeesDialog } from "@/components/fees/PromoteFeesDialog";
import { AdvancedPagination } from "@/components/common/AdvancedPagination";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── India‑specific constants ─────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash",     label: "Cash",                    icon: "💵" },
  { value: "cheque",   label: "Cheque",                  icon: "📄" },
  { value: "dd",       label: "Demand Draft (DD)",       icon: "🏦" },
  { value: "cashfree", label: "Online Gateway (Cashfree)", icon: "🔗" },
];

// Transport Fee and Hostel Fee are intentionally excluded from fee structures.
// They are per-student charges calculated individually in student fee records
// based on the student's bus route and hostel room assignment.
const FEE_HEADS = [
  { key: "tuitionFee",      label: "Tuition Fee",         category: "Academic" },
  { key: "examFee",         label: "Examination Fee",     category: "Academic" },
  { key: "libraryFee",      label: "Library Fee",         category: "Academic" },
  { key: "labFee",          label: "Science / Computer Lab Fee", category: "Academic" },
  { key: "developmentFee",  label: "Development Fund",    category: "Development" },
  { key: "sportsFee",       label: "Sports / Activity Fee", category: "Development" },
  { key: "admissionFee",    label: "Admission / Registration Fee (One-time)", category: "Other" },
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
  { value: "merit",        label: "Merit Scholarship",             color: "bg-yellow-100 text-yellow-800 border-yellow-200", discountType: "percent" as const, discountValue: 25  },
  { value: "rte",          label: "RTE 25% (Right to Education)",  color: "bg-green-100 text-green-800 border-green-200",  discountType: "percent" as const, discountValue: 25  },
  { value: "ews",          label: "EWS / BPL",                    color: "bg-blue-100 text-blue-800 border-blue-200",    discountType: "percent" as const, discountValue: 50  },
  { value: "sc_st",        label: "SC / ST Category",             color: "bg-purple-100 text-purple-800 border-purple-200", discountType: "percent" as const, discountValue: 50  },
  { value: "obc",          label: "OBC",                          color: "bg-indigo-100 text-indigo-800 border-indigo-200", discountType: "percent" as const, discountValue: 25  },
  { value: "sibling",      label: "Sibling Discount",             color: "bg-pink-100 text-pink-800 border-pink-200",    discountType: "percent" as const, discountValue: 10  },
  { value: "staff_ward",   label: "Staff Ward",                   color: "bg-orange-100 text-orange-800 border-orange-200", discountType: "percent" as const, discountValue: 50  },
  { value: "sports",       label: "Sports Achievement",           color: "bg-teal-100 text-teal-800 border-teal-200",    discountType: "percent" as const, discountValue: 20  },
  { value: "management",   label: "Management Quota",             color: "bg-gray-100 text-gray-800 border-gray-200",    discountType: "percent" as const, discountValue: 15  },
  { value: "special",      label: "Special Need / Disability",    color: "bg-red-100 text-red-800 border-red-200",       discountType: "percent" as const, discountValue: 30  },
];

function inr(n: number | undefined | null) { 
  if (n === undefined || n === null || isNaN(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`; 
}
function daysOverdue(dueDate: string | undefined) {
  if (!dueDate) return 0;
  const due = new Date(dueDate); const today = new Date();
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

// ─── Status config ────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/60 dark:border-green-800" },
  partial: { label: "Partial", color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/60 dark:border-blue-800" },
  pending: { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800" },
  overdue: { label: "Overdue", color: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/60 dark:border-red-800" },
};

// ─── Term helpers ─────────────────────────────────────────
function getTermLabel(total: number, index: number): string {
  if (total === 1) return "Annual";
  if (total === 2) return `Term ${index + 1}`;
  if (total === 3) return `Term ${index + 1}`;
  if (total === 4) return `Q${index + 1}`;
  if (total === 12) return ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"][index % 12];
  return `Inst ${index + 1}`;
}
/** Normalize legacy half-year names (H1, H2) to proper term labels. */
function normalizeTermName(name: string, idx: number): string {
  if (/^h[12]$/i.test(name.trim())) return `Term ${idx + 1}`;
  return name;
}

/**
 * Scale installment schedule amounts to reflect an applied concession/discount.
 * Already-paid terms are kept at their gross (historical) amounts — a payment receipt was already
 * issued at that price, so we must not retroactively change those figures.
 * Only the remaining (partial or future) terms are scaled proportionally by the net fee still owed.
 */
function scaleSchedule(
  sched: TermSchedule[],
  totalAmount: number,
  discountAmount: number,
  paidAmount: number,
): TermSchedule[] {
  if (!discountAmount || !sched.length) return sched;
  const netTotal = Math.max(0, totalAmount - discountAmount);
  const netRemaining = Math.max(0, netTotal - paidAmount);

  // First pass: determine what portion of each term has already been paid (gross basis)
  let cumulativeGross = 0;
  const grossInfo = sched.map(term => {
    const prev = cumulativeGross;
    cumulativeGross += term.amount;
    const grossPaid = Math.max(0, Math.min(term.amount, paidAmount - prev));
    const grossRemaining = term.amount - grossPaid;
    return { grossPaid, grossRemaining, isPaid: grossRemaining <= 0 };
  });

  const grossRemainingTotal = grossInfo.reduce((s, g) => s + g.grossRemaining, 0);
  if (grossRemainingTotal <= 0) return sched; // nothing left to scale

  const scaleFactor = netRemaining / grossRemainingTotal;

  return sched.map((term, i) => {
    const g = grossInfo[i];
    if (g.isPaid) return term; // preserve gross amount — receipt already issued at this price
    // Net term = gross-paid portion (unchanged) + scaled net-remaining portion
    const scaledRemaining = Math.round(g.grossRemaining * scaleFactor);
    return { ...term, amount: g.grossPaid + scaledRemaining };
  });
}

/** For each term in the schedule, compute its status given how much has been paid so far. */
function computeTermStatuses(
  schedule: TermSchedule[],
  totalPaid: number,
): Array<{ term: TermSchedule; status: "paid" | "partial" | "due" | "upcoming"; cumulative: number; remaining: number }> {
  const todayStr = new Date().toISOString().split("T")[0];
  let cumulative = 0;
  return schedule.map(term => {
    const prev = cumulative;
    cumulative += term.amount;
    const paidForTerm = Math.max(0, Math.min(term.amount, totalPaid - prev));
    const remaining = term.amount - paidForTerm;
    let status: "paid" | "partial" | "due" | "upcoming";
    if (remaining <= 0) {
      status = "paid";
    } else if (paidForTerm > 0) {
      status = "partial";
    } else if (term.dueDate && term.dueDate <= todayStr) {
      status = "due";
    } else {
      status = "upcoming";
    }
    return { term, status, cumulative, remaining };
  });
}

/** Return the first unpaid/partial term — this is what should be collected next. */
function getCurrentDueTerm(
  schedule: TermSchedule[],
  totalPaid: number,
): { term: TermSchedule; idx: number; remaining: number } | null {
  if (!schedule.length) return null;
  const statuses = computeTermStatuses(schedule, totalPaid);
  const next = statuses.findIndex(s => s.status !== "paid");
  if (next === -1) return null;
  return { term: statuses[next].term, idx: next, remaining: statuses[next].remaining };
}
function termDotColor(status: string): string {
  if (status === "paid")    return "bg-green-500";
  if (status === "partial") return "bg-amber-400";
  if (status === "overdue") return "bg-red-600";
  return "bg-red-400";
}
function termDotRing(status: string): string {
  if (status === "paid")    return "ring-green-400 dark:ring-green-500";
  if (status === "partial") return "ring-amber-400 dark:ring-amber-500";
  return "ring-red-400 dark:ring-red-500";
}

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
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const { hasUserPermission } = usePermissions();
  const canManageFees = hasUserPermission('Fees', 'Create');
  const canEditFees   = hasUserPermission('Fees', 'Edit');
  const canDeleteFees = hasUserPermission('Fees', 'Delete');

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
  const [headOverrides, setHeadOverrides] = useState<Record<string, number>>({});       // pending (not yet saved)
  const [confirmedOverrides, setConfirmedOverrides] = useState<Record<string, number>>({}); // saved this session
  const [editingHead, setEditingHead] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [applyingAdjustments, setApplyingAdjustments] = useState(false);

  // ── Concession panel ──
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [concessionType, setConcessionType] = useState("merit");
  const [concessionMode, setConcessionMode] = useState<"fixed" | "percent">("fixed");
  const [concessionValue, setConcessionValue] = useState("");
  const [applyingConcession, setApplyingConcession] = useState(false);
  const [apiConcessionTypes, setApiConcessionTypes] = useState<ConcessionType[]>([]);
  const [customConcessionLabel, setCustomConcessionLabel] = useState("");
  // Notify parent toggle — shared for concessions, overrides, and payment collection
  const [notifyParent, setNotifyParent] = useState(true);

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

  // ── Module fee editing (transport / hostel monthly rate override) ──
  const [editingModule, setEditingModule] = useState<"transport" | "hostel" | null>(null);
  const [editingModuleVal, setEditingModuleVal] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  // ── Sibling discount panel (inside collect form) ──
  const [siblingPanelOpen, setSiblingPanelOpen] = useState(false);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [siblingDiscType, setSiblingDiscType] = useState<"percentage" | "flat">("percentage");
  const [siblingDiscValue, setSiblingDiscValue] = useState("");
  const [siblingDiscReason, setSiblingDiscReason] = useState("Sibling studying in same school");
  const [applyingSiblingDisc, setApplyingSiblingDisc] = useState(false);
  const [siblingDiscApplied, setSiblingDiscApplied] = useState<{ applied: number; totalSaved: number } | null>(null);

  const fetchSiblings = () => {
    if (!record) return;
    setSiblingsLoading(true);
    feeApi.getSiblingInfo(record.studentId, record.academicYear ?? undefined)
      .then(data => setSiblings(data))
      .catch(() => setSiblings([]))
      .finally(() => setSiblingsLoading(false));
  };

  const handleApplySiblingDiscount = async () => {
    if (!siblingDiscValue || parseFloat(siblingDiscValue) <= 0) { toast.error("Enter a valid discount value"); return; }
    setApplyingSiblingDisc(true);
    try {
      const result = await feeApi.applySiblingDiscount({
        studentId: record!.studentId,
        discountType: siblingDiscType,
        discountValue: parseFloat(siblingDiscValue),
        reason: siblingDiscReason || "Sibling concession",
        appliedBy: "Staff",
      });
      setSiblingDiscApplied({ applied: result.applied, totalSaved: result.totalSaved });
      toast.success(`Sibling discount applied — ${inr(result.totalSaved)} saved across ${result.applied} record(s)`);
      // Reload live record so outstanding updates immediately
      const fresh = await feeApi.getFeeRecordById(record!.id);
      setLiveRecord(fresh);
      const effectiveOutstanding = Math.round(((fresh.pendingAmount ?? 0) + (fresh.transportFee ?? 0) + (fresh.hostelFee ?? 0)) * 100) / 100;
      setAmount(String(effectiveOutstanding));
      // Refresh sibling data too
      fetchSiblings();
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to apply sibling discount");
    } finally {
      setApplyingSiblingDisc(false);
    }
  };

  const handleSaveModuleFee = async (module: "transport" | "hostel") => {
    if (!activeRecord) return;
    const newRate = parseFloat(editingModuleVal);
    if (isNaN(newRate) || newRate < 0) { toast.error("Invalid amount"); return; }
    setSavingModule(true);
    try {
      await patchModuleFees(activeRecord.id, module === "transport"
        ? { transportMonthlyFee: newRate }
        : { hostelMonthlyFee: newRate }
      );
      // Reload the record to get recalculated month-based values
      const fresh = await getFeeRecordById(activeRecord.id);
      setLiveRecord(fresh);
      setEditingModule(null);
      toast.success(`${module === "transport" ? "Transport" : "Hostel"} fee updated`);
    } catch {
      toast.error("Failed to update fee");
    } finally {
      setSavingModule(false);
    }
  };

  // ── Extra charges ──
  const [extraChargesOpen, setExtraChargesOpen] = useState(false);  const [extraItems, setExtraItems] = useState<Array<{ label: string; amount: number }>>([]);
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

  // ── Track whether the link-structure call is still in flight ──
  const [linkingStructure, setLinkingStructure] = useState(false);

  // ── Reset on open ──
  useEffect(() => {
    if (open && record) {
      // Load concession types from API (for the dropdown)
      getConcessionTypes().then(setApiConcessionTypes).catch(() => setApiConcessionTypes([]));
      setLiveRecord(record); // set immediately so dialog shows data while fetching
      setAmount(String(record.pendingAmount ?? ""));
      setMethod("cash"); setChequeNo(""); setChequeDate(""); setBankName("");
      setCfTxnId(""); setCfCheckoutUrl(""); setProcessedBy(""); setNarration(""); setPayDate(today);
      setConcessionOpen(false); setConcessionValue(""); setVoidTarget(null); setVoidReason("");
      setHeadOverrides({}); setConfirmedOverrides({}); setEditingHead(null); setGwStep("form"); setGwElapsed(0);
      setEditTarget(null); setExtraItems([]); setExtraChargesOpen(false); setLinkedStructureName(null);
      setLinkingStructure(false);
      setSiblingPanelOpen(false); setSiblings([]); setSiblingDiscValue(""); setSiblingDiscApplied(null);
      // Fetch fresh record so payments array and feeStructureName are populated
      setFetchingRecord(true);
      feeApi.getFeeRecordById(record.id)
        .then(fresh => {
          setLiveRecord(fresh);
          // Restore persisted fee head overrides from the fresh record
          if (fresh.feeHeadOverrides) {
            try { setConfirmedOverrides(JSON.parse(fresh.feeHeadOverrides)); } catch { /* ignore malformed JSON */ }
          }
          // Pre-fill with the current due term's amount if a schedule exists, else fall back to total outstanding
          const effectiveOutstanding = Math.round(((fresh.pendingAmount ?? 0) + (fresh.transportFee ?? 0) + (fresh.hostelFee ?? 0)) * 100) / 100;
          const linkedStructure = structures.find(s => s.id === fresh.feeStructureId);
          const sched = parseSchedule(linkedStructure?.installmentDueDates);
          const scaledSched = scaleSchedule(sched, fresh.totalAmount ?? 0, fresh.discountAmount ?? 0, fresh.paidAmount ?? 0);
          const freshDueTerm = scaledSched.length > 1 ? getCurrentDueTerm(scaledSched, fresh.paidAmount ?? 0) : null;
          const defaultAmt = freshDueTerm
            ? Math.round(Math.min(freshDueTerm.remaining, effectiveOutstanding) * 100) / 100
            : effectiveOutstanding;
          setAmount(String(defaultAmt));
          // If the freshly-fetched record still has no structure linked, try to auto-link
          if (!fresh.feeStructureId && !fresh.feeStructureName) {
            setLinkingStructure(true);
            linkStructure(fresh.id)
              .then(res => {
                setLinkedStructureName(res.structureName);
                setLiveRecord(prev => prev ? { ...prev, feeStructureId: res.structureId, feeStructureName: res.structureName } : prev);
              })
              .catch(() => setLinkedStructureName("")) // empty string = no structure found
              .finally(() => setLinkingStructure(false));
          }
        })
        .catch(() => {
          // keep the stale record; still try to link if no structure
          if (!record.feeStructureId) {
            setLinkingStructure(true);
            linkStructure(record.id)
              .then(res => setLinkedStructureName(res.structureName))
              .catch(() => setLinkedStructureName(""))
              .finally(() => setLinkingStructure(false));
          }
        })
        .finally(() => setFetchingRecord(false));
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

  // Compute adjustment delta from headOverrides.
  // Use confirmedOverrides as the base (not gross) so that re-editing a saved head
  // only sends the *additional* reduction, not the full delta from gross again.
  const adjustmentDelta = Object.entries(headOverrides).reduce((acc, [key, overrideNet]) => {
    const gross = structure ? (structure as any)[key] as number : 0;
    const base = confirmedOverrides[key] ?? gross; // delta from last saved state
    return acc + (base - overrideNet);
  }, 0);

  // Compute true gross fee sum from the CURRENT structure's fee heads with all overrides applied.
  // This is the single source of truth for display — it matches what the fee head table shows and
  // will be correct even when the stored FeeRecord.TotalAmount is stale (e.g. structure was edited
  // after the record was created).
  const structureFeeSum = feeHeads.reduce((sum, h) => {
    const gross = (structure as any)[h.key] as number;
    const net = headOverrides[h.key] ?? confirmedOverrides[h.key] ?? gross;
    return sum + net;
  }, 0);

  // Module fees (pro-rata transport + hostel, tracked separately from school fees)
  const moduleFeeTotal = (activeRecord.transportFee ?? 0) + (activeRecord.hostelFee ?? 0);

  // ── Term schedule ──
  const termSched = parseSchedule(structure?.installmentDueDates);
  // Scale term amounts proportionally to reflect applied concession.
  // Use structureFeeSum (the authoritative gross) so the ratio is always correct.
  const scaledTermSched = scaleSchedule(termSched, structureFeeSum || (activeRecord.totalAmount ?? 0), activeRecord.discountAmount ?? 0, activeRecord.paidAmount ?? 0);
  const termStatuses = scaledTermSched.length > 1 ? computeTermStatuses(scaledTermSched, activeRecord.paidAmount ?? 0) : [];
  const dueTerm = termStatuses.length > 0 ? getCurrentDueTerm(scaledTermSched, activeRecord.paidAmount ?? 0) : null;

  // School-fee total payable = structure fee heads (with overrides) - discount + late fee + extra charges
  const schoolFeePayable = structureFeeSum
    - (activeRecord.discountAmount ?? 0)
    + (activeRecord.lateFeeAmount ?? 0)
    + totalExtraCharges;

  // Grand total outstanding = school fees + module fees - amount already paid
  // This is the accounting-correct formula: Outstanding = Total Payable - Amount Paid
  const adjustedOutstanding = Math.max(0, schoolFeePayable + moduleFeeTotal - (activeRecord.paidAmount ?? 0));

  const amt = parseFloat(amount) || 0;
  const afterPayment = Math.max(0, adjustedOutstanding - amt);
  // Collection progress uses the same authoritative total (school fees + module fees + late fee)
  const totalPayableForProgress = (structureFeeSum || (activeRecord.totalAmount ?? 0)) + (activeRecord.lateFeeAmount ?? 0) + moduleFeeTotal;
  const collectedPct = totalPayableForProgress > 0
    ? Math.min(100, Math.round(((activeRecord.paidAmount ?? 0) / totalPayableForProgress) * 100))
    : 0;
  const maxMoreConcession = Math.max(0, structureFeeSum * 0.75 - (activeRecord.discountAmount ?? 0));
  const concessionCalcAmt = concessionMode === "percent"
    ? Math.round((adjustedOutstanding * (parseFloat(concessionValue) || 0)) / 100)
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
        notifyParent,
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
      await apiClient.post("/Fees/inline-discount", {
        feeRecordId: record.id,
        discountType: "fixed",
        discountValue: concessionCalcAmt,
        reason: `Concession applied at collection by ${processedBy || "Staff"}`,
        appliedBy: processedBy || "Staff",
        notifyParent,
      });
      toast.success(`Concession of ${inr(concessionCalcAmt)} applied`);
      // Refresh live record so outstanding & amount field reflect the new concession
      const freshAfterConcession = await feeApi.getFeeRecordById(record.id);
      setLiveRecord(freshAfterConcession);
      const effOutAfterConcession = Math.round(((freshAfterConcession.pendingAmount ?? 0) + (freshAfterConcession.transportFee ?? 0) + (freshAfterConcession.hostelFee ?? 0)) * 100) / 100;
      const concSched = parseSchedule(structures.find(s => s.id === freshAfterConcession.feeStructureId)?.installmentDueDates);
      const concScaledSched = scaleSchedule(concSched, freshAfterConcession.totalAmount ?? 0, freshAfterConcession.discountAmount ?? 0, freshAfterConcession.paidAmount ?? 0);
      const concDueTerm = concScaledSched.length > 1 ? getCurrentDueTerm(concScaledSched, freshAfterConcession.paidAmount ?? 0) : null;
      setAmount(String(concDueTerm ? Math.round(Math.min(concDueTerm.remaining, effOutAfterConcession) * 100) / 100 : effOutAfterConcession));
      onSuccess();
      setConcessionOpen(false); setConcessionValue("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to apply concession");
    } finally { setApplyingConcession(false); }
  };

  // ── Apply fee head overrides (structural exemptions — not a concession) ──
  const handleApplyAdjustments = async () => {
    if (Object.keys(headOverrides).length === 0) return;
    setApplyingAdjustments(true);
    try {
      const res = await applyFeeHeadOverrides(
        record.id,
        headOverrides,
        processedBy || "Staff",
        notifyParent,
      );
      toast.success(`Fee head adjustments saved (new outstanding: ${inr(res.newPendingAmount)})`);
      // Parse and merge the persisted overrides into confirmedOverrides
      const persisted: Record<string, number> = res.feeHeadOverrides
        ? JSON.parse(res.feeHeadOverrides)
        : {};
      setConfirmedOverrides(persisted);
      setHeadOverrides({});
      // Refresh live record so totalAmount / pendingAmount reflect the saved overrides
      const freshAfterOverride = await feeApi.getFeeRecordById(record.id);
      setLiveRecord(freshAfterOverride);
      const newOutstanding = Math.max(0, (freshAfterOverride.pendingAmount ?? 0) + (freshAfterOverride.transportFee ?? 0) + (freshAfterOverride.hostelFee ?? 0));
      const concSched = parseSchedule(structure?.installmentDueDates);
      const concScaledSched = scaleSchedule(concSched, freshAfterOverride.totalAmount ?? 0, freshAfterOverride.discountAmount ?? 0, freshAfterOverride.paidAmount ?? 0);
      const concDueTerm = concScaledSched.length > 1 ? getCurrentDueTerm(concScaledSched, freshAfterOverride.paidAmount ?? 0) : null;
      const newAmt = concDueTerm ? Math.round(Math.min(concDueTerm.remaining, newOutstanding) * 100) / 100 : newOutstanding;
      setAmount(String(newAmt));
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save fee head adjustments");
    } finally { setApplyingAdjustments(false); }
  };

  // ── Remove applied concession ──
  const handleRemoveConcession = async () => {
    if ((activeRecord.discountAmount ?? 0) <= 0) return;
    setApplyingConcession(true);
    try {
      await removeDiscount(record.id, "Concession removed by staff", processedBy || "Staff");
      toast.success("Concession removed");
      const freshAfterRemove = await feeApi.getFeeRecordById(record.id);
      setLiveRecord(freshAfterRemove);
      const newOut = Math.max(0, (freshAfterRemove.pendingAmount ?? 0) + (freshAfterRemove.transportFee ?? 0) + (freshAfterRemove.hostelFee ?? 0));
      const sched = parseSchedule(structures.find(s => s.id === freshAfterRemove.feeStructureId)?.installmentDueDates);
      // discountAmount is 0 after removal so scaleSchedule returns the unscaled schedule (correct)
      const scaledSchedAfterRemove = scaleSchedule(sched, freshAfterRemove.totalAmount ?? 0, freshAfterRemove.discountAmount ?? 0, freshAfterRemove.paidAmount ?? 0);
      const dt = scaledSchedAfterRemove.length > 1 ? getCurrentDueTerm(scaledSchedAfterRemove, freshAfterRemove.paidAmount ?? 0) : null;
      setAmount(String(dt ? Math.round(Math.min(dt.remaining, newOut) * 100) / 100 : newOut));
      onSuccess();
      setConcessionOpen(false); setConcessionValue("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to remove concession");
    } finally { setApplyingConcession(false); }
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
                {/* Show structure name — prefer liveRecord (has fresh feeStructureName from API) */}
                {(() => {
                  const structName = activeRecord.feeStructureName ?? linkedStructureName;
                  if (structName) {
                    return <span className="text-primary font-medium">·&nbsp;{structName}</span>;
                  }
                  if (linkingStructure || fetchingRecord) {
                    return (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />{t('fees.linkingStructure')}
                      </span>
                    );
                  }
                  // linkedStructureName === "" means we tried and found nothing
                  if (linkedStructureName === "") {
                    return (
                      <span className="flex items-center gap-1 text-red-500 font-medium" title="No fee structure found for this student's class. Create one in the Fee Structure tab first.">
                        <Link2 className="h-3 w-3" />{t('fees.noStructureLinked')}
                      </span>
                    );
                  }
                  return null;
                })()}
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('fees.feeAccountLedger')}</span>
              {hasAdjustments && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {t('fees.adjustmentsPendingSave')}
                </span>
              )}
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* ── Fee Head Breakdown (editable) ── */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-2">
                  {t('fees.feeHeadBreakdown')}
                  <span className="font-normal text-muted-foreground/60 normal-case">{t('fees.clickToAdjust')}</span>
                </div>
                {structure && feeHeads.length > 0 ? (
                  <>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left pb-2 font-semibold text-muted-foreground text-xs">Head</th>
                          <th className="text-right pb-2 font-semibold text-muted-foreground text-xs">Amount</th>
                          <th className="w-7 pb-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {feeHeads.map(h => {
                          const gross = (structure as any)[h.key] as number;
                          const confirmedNet = confirmedOverrides[h.key];
                          const pendingNet = headOverrides[h.key];
                          const overrideNet = pendingNet ?? confirmedNet ?? gross;
                          const isEditing = editingHead === h.key;
                          const isPendingAdjusted = pendingNet !== undefined && pendingNet !== gross;
                          const isConfirmedAdjusted = confirmedNet !== undefined && confirmedNet !== gross && pendingNet === undefined;
                          const isAdjusted = isPendingAdjusted || isConfirmedAdjusted;
                          return (
                            <tr key={h.key} className={`border-b border-border/40 ${isPendingAdjusted ? "bg-amber-50/60" : isConfirmedAdjusted ? "bg-green-50/50" : ""}`}>
                              <td className="py-1.5 text-muted-foreground text-xs">{h.label}</td>
                              <td className="py-1.5 text-right tabular-nums text-xs font-semibold">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <input className="w-20 h-6 text-right text-xs border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                      type="number" min={0} max={gross}
                                      value={editingVal}
                                      onChange={e => setEditingVal(e.target.value)}
                                      autoFocus
                                    />
                                    <button className="h-7 w-7 flex items-center justify-center rounded bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-900 font-bold text-sm transition-colors"
                                      onClick={() => {
                                        const v = parseFloat(editingVal);
                                        if (!isNaN(v) && v >= 0 && v <= gross) {
                                          const prevOverride = headOverrides[h.key] ?? confirmedOverrides[h.key] ?? gross;
                                          setHeadOverrides(prev => ({ ...prev, [h.key]: v }));
                                          if (v < gross) {
                                            setAmount(String(Math.max(0, adjustedOutstanding - (prevOverride - v))));
                                          }
                                        }
                                        setEditingHead(null);
                                      }}>✓</button>
                                    <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors"
                                      onClick={() => setEditingHead(null)}>✕</button>
                                  </div>
                                ) : isPendingAdjusted ? (
                                  <div className="flex flex-col items-end leading-tight">
                                    <span className="font-bold text-amber-700">{inr(overrideNet)}</span>
                                    <span className="text-[10px] text-muted-foreground/50 line-through">{inr(confirmedNet ?? gross)}</span>
                                  </div>
                                ) : isConfirmedAdjusted ? (
                                  <div className="flex flex-col items-end leading-tight">
                                    <span className="font-bold text-green-700">{inr(overrideNet)}</span>
                                    <span className="text-[10px] text-muted-foreground/50 line-through">{inr(gross)}</span>
                                  </div>
                                ) : (
                                  <span>{inr(gross)}</span>
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
                          <td className="pt-2 text-sm">{t('fees.subTotal')}</td>
                          <td className="pt-2 text-right tabular-nums text-sm">{inr(structureFeeSum)}</td>
                          <td />
                        </tr>
                        {(activeRecord.discountAmount ?? 0) > 0 && (
                          <tr className="text-green-700 text-xs">
                            <td className="py-0.5 text-muted-foreground">{t('fees.appliedConcession')}</td>
                            <td className="py-0.5 text-right">−{inr(activeRecord.discountAmount)}</td>
                            <td />
                          </tr>
                        )}
                        {(record.lateFeeAmount ?? 0) > 0 && (
                          <tr className="text-amber-700 text-xs">
                            <td className="py-1">{t('fees.lateFeeCharged')}</td>
                            <td className="py-1 text-right">+ {inr(record.lateFeeAmount)}</td>
                            <td />
                          </tr>
                        )}
                        {totalExtraCharges > 0 && (
                          <tr className="text-orange-700 text-xs">
                            <td className="py-1">{t('fees.additionalCharges')}</td>
                            <td className="py-1 text-right">+ {inr(totalExtraCharges)}</td>
                            <td />
                          </tr>
                        )}
                        {extraItems.length > 0 && (
                          <tr className="text-orange-600 text-[10px] bg-orange-50/50">
                            <td colSpan={2} className="py-1 px-2">
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
                        <tr className="bg-muted/50">
                          <td className="py-2 px-1.5 rounded-l font-bold text-sm">{t('fees.totalPayable')}</td>
                          <td className="py-2 px-1.5 rounded-r font-bold text-sm text-right tabular-nums">
                            {inr(schoolFeePayable)}
                          </td>
                          <td />
                        </tr>
                        <tr className="text-green-700 text-sm">
                          <td className="py-1.5">{t('fees.amountPaid')}</td>
                          <td className="py-1.5 text-right tabular-nums">(−{inr(activeRecord.paidAmount)})</td>
                          <td />
                        </tr>
                        <tr className="border-t-2 border-red-300 font-bold text-red-700">
                          <td className="py-2 text-base">{t('fees.outstandingBalance')}</td>
                          <td className="py-2 text-right tabular-nums text-lg">{inr(adjustedOutstanding)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>

                    {/* Apply adjustment button */}
                    {hasAdjustments && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                        <p className="text-xs text-amber-800 font-medium">
                          {t('fees.adjustmentsPending')}
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <Switch checked={notifyParent} onCheckedChange={setNotifyParent} className="scale-90" />
                          <span className="text-xs text-amber-800 flex items-center gap-1">
                            <BellRing className="h-3.5 w-3.5" />
                            {t('fees.notifyParentAdjustment')}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setHeadOverrides({}); }}>
                            {t('fees.cancelEdits')}
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={applyingAdjustments}
                            onClick={handleApplyAdjustments}>
                            {applyingAdjustments ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {t('fees.saveFeeHeadChanges')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: t('fees.totalAmount'), val: activeRecord.totalAmount, cls: "" },
                      { label: t('fees.discount'), val: activeRecord.discountAmount, cls: "text-green-700" },
                      { label: t('fees.lateFee'), val: activeRecord.lateFeeAmount, cls: "text-amber-700" },
                      { label: t('fees.amountPaid'), val: activeRecord.paidAmount, cls: "text-green-700" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between pr-2 border-b border-dashed py-1.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-semibold tabular-nums ${row.cls}`}>{inr(row.val)}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex justify-between py-2 font-bold text-red-700 border-t-2 border-red-200">
                      <span>{t('fees.outstandingBalance')}</span>
                      <span className="text-lg tabular-nums">{inr(adjustedOutstanding)}</span>
                    </div>
                  </div>
                )}

              {/* ── Transport & Hostel Module Fees ── */}
              {((activeRecord.transportMonthlyFee ?? 0) > 0 || (activeRecord.hostelMonthlyFee ?? 0) > 0) && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2.5 flex items-center gap-1.5">
                    <span>{t('fees.transportModule')}</span>
                    <span className="font-normal text-blue-500 normal-case">— {t('fees.charged')}</span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-blue-200">
                        <th className="text-left pb-1.5 font-semibold text-blue-600">{t('fees.feeStructure')}</th>
                        <th className="text-right pb-1.5 font-semibold text-blue-600">{t('fees.monthlyRate')}</th>
                        <th className="text-right pb-1.5 font-semibold text-blue-600">{t('fees.months')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeRecord.transportMonthlyFee ?? 0) > 0 && (
                        <tr className="border-b border-blue-100">
                          <td className="py-1.5 text-blue-800">
                            <div className="font-semibold">Transport Fee</div>
                            {activeRecord.transportRoute && (
                              <div className="text-[10px] text-blue-500 mt-0.5">
                                Route: {activeRecord.transportRoute}
                                {activeRecord.transportPickup ? ` · Pickup: ${activeRecord.transportPickup}` : ""}
                              </div>
                            )}
                            <div className="text-[10px] text-blue-400 mt-0.5">
                              {(activeRecord.transportMonthlyFee ?? 0) > 0
                                ? `${Math.round((activeRecord.transportFee ?? 0) / (activeRecord.transportMonthlyFee ?? 1))} months × ${inr(activeRecord.transportMonthlyFee ?? 0)}/mo`
                                : "Academic year months"}
                            </div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-blue-700 font-medium">
                            {inr(activeRecord.transportMonthlyFee ?? 0)}<span className="text-[9px] text-blue-400">/mo</span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums font-bold text-blue-800">
                            {editingModule === "transport" ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-[9px] text-blue-500 mb-0.5">Monthly rate →</div>
                                <div className="flex items-center gap-1 justify-end">
                                  <Input
                                    type="number" min={0} className="h-6 w-20 text-xs px-1.5 text-right"
                                    value={editingModuleVal}
                                    onChange={e => setEditingModuleVal(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === "Enter") handleSaveModuleFee("transport"); if (e.key === "Escape") setEditingModule(null); }}
                                  />
                                  <button onClick={() => handleSaveModuleFee("transport")} disabled={savingModule}
                                    className="h-7 w-7 flex items-center justify-center rounded bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-900 font-bold text-sm transition-colors disabled:opacity-50">
                                    {savingModule ? "…" : "✓"}
                                  </button>
                                  <button onClick={() => setEditingModule(null)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-red-600 text-sm transition-colors">✕</button>
                                </div>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 justify-end">
                                {inr(activeRecord.transportFee ?? 0)}
                                <button onClick={() => { setEditingModule("transport"); setEditingModuleVal(String(activeRecord.transportMonthlyFee ?? 0)); }}
                                  className="text-blue-400 hover:text-blue-700 ml-1" title="Edit monthly rate">
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                      {(activeRecord.hostelMonthlyFee ?? 0) > 0 && (
                        <tr className="border-b border-blue-100">
                          <td className="py-1.5 text-blue-800">
                            <div className="font-semibold">{t('fees.hostelFee')}</div>
                            {activeRecord.hostelRoom && (
                              <div className="text-[10px] text-blue-500 mt-0.5">Room: {activeRecord.hostelRoom}</div>
                            )}
                            <div className="text-[10px] text-blue-400 mt-0.5">
                              {(activeRecord.hostelMonthlyFee ?? 0) > 0
                                ? `${Math.round((activeRecord.hostelFee ?? 0) / (activeRecord.hostelMonthlyFee ?? 1))} months × ${inr(activeRecord.hostelMonthlyFee ?? 0)}/mo`
                                : "Academic year months"}
                            </div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-blue-700 font-medium">
                            {inr(activeRecord.hostelMonthlyFee ?? 0)}<span className="text-[9px] text-blue-400">/mo</span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums font-bold text-blue-800">
                            {editingModule === "hostel" ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-[9px] text-blue-500 mb-0.5">Monthly rate →</div>
                                <div className="flex items-center gap-1 justify-end">
                                  <Input
                                    type="number" min={0} className="h-6 w-20 text-xs px-1.5 text-right"
                                    value={editingModuleVal}
                                    onChange={e => setEditingModuleVal(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === "Enter") handleSaveModuleFee("hostel"); if (e.key === "Escape") setEditingModule(null); }}
                                  />
                                  <button onClick={() => handleSaveModuleFee("hostel")} disabled={savingModule}
                                    className="h-7 w-7 flex items-center justify-center rounded bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-900 font-bold text-sm transition-colors disabled:opacity-50">
                                    {savingModule ? "…" : "✓"}
                                  </button>
                                  <button onClick={() => setEditingModule(null)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-red-600 text-sm transition-colors">✕</button>
                                </div>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 justify-end">
                                {inr(activeRecord.hostelFee ?? 0)}
                                <button onClick={() => { setEditingModule("hostel"); setEditingModuleVal(String(activeRecord.hostelMonthlyFee ?? 0)); }}
                                  className="text-blue-400 hover:text-blue-700 ml-1" title="Edit monthly rate">
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t border-blue-200">
                      <tr>
                        <td className="pt-1.5 text-blue-700 font-semibold">{t('fees.totalModuleAdditions')}</td>
                        <td />
                        <td className="pt-1.5 text-right tabular-nums font-bold text-blue-900">
                          {inr((activeRecord.transportFee ?? 0) + (activeRecord.hostelFee ?? 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

                {/* Collection progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{t('fees.collectionProgress')}</span>
                    <span className="font-semibold">{collectedPct}% {t('fees.collectionRate')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${collectedPct}%` }} />
                  </div>
                </div>
              </div>

              {/* ── Term Status Timeline ── */}
              {termStatuses.length > 1 && (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {t('fees.termSchedule')}
                  </div>
                  <div className="space-y-1.5">
                    {termStatuses.map(({ term, status, remaining }, idx) => {
                      const label = normalizeTermName(term.name, idx);
                      const bgCls =
                        status === "paid"     ? "bg-green-50 border-green-200" :
                        status === "partial"  ? "bg-amber-50 border-amber-200" :
                        status === "due"      ? "bg-red-50 border-red-200" :
                                                "bg-muted/40 border-border";
                      const badgeCls =
                        status === "paid"     ? "text-green-700 bg-green-100 border-green-200" :
                        status === "partial"  ? "text-amber-700 bg-amber-100 border-amber-200" :
                        status === "due"      ? "text-red-700 bg-red-100 border-red-200" :
                                                "text-muted-foreground bg-muted border-border";
                      const badgeLabel =
                        status === "paid"     ? t('fees.paid') :
                        status === "partial"  ? t('fees.partial') :
                        status === "due"      ? t('fees.overdue') :
                                                t('fees.advancePayment');
                      return (
                        <div key={term.termNumber} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${bgCls}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{label}</span>
                            {term.dueDate && status !== "paid" && (
                              <span className="text-muted-foreground">
                                due {new Date(term.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{inr(term.amount)}</span>
                            {status !== "paid" && status !== "upcoming" && (
                              <span className="text-muted-foreground tabular-nums">({inr(remaining)} left)</span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded-full border font-bold ${badgeCls}`}>{badgeLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Payment History with Reverse ── */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  {t('fees.paymentHistory')} &nbsp;<span className="font-normal">({payments.length} transactions)</span>
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
                              <span className="text-xs text-red-500 font-medium">{t('fees.reversed')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-bold tabular-nums ${p.status === "voided" || p.status === "refunded" ? "line-through text-muted-foreground" : "text-green-700"}`}>
                              {inr(p.amount)}
                            </span>
                            {p.status !== "voided" && p.status !== "refunded" && (
                              <>
                                {canEditFees && (
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
                                )}
                                {canDeleteFees && (
                                  <button
                                    onClick={() => setVoidTarget(voidTarget?.id === p.id ? null : { id: p.id, amount: p.amount, receiptNumber: p.receiptNumber })}
                                    className="text-[11px] font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-1.5 py-0.5 transition-colors">
                                    {t('fees.reverse')}
                                  </button>
                                )}
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
                {activeRecord.status === "paid"
                  ? "Transaction Summary"
                  : dueTerm && termSched.length > 1
                    ? dueTerm.term.dueDate > new Date().toISOString().split("T")[0]
                      ? `Advance Payment — ${normalizeTermName(dueTerm.term.name, dueTerm.idx)}`
                      : `Collect Payment — ${normalizeTermName(dueTerm.term.name, dueTerm.idx)}`
                    : "Collect Payment"}
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
                              {canEditFees && (
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
                              )}
                              {canDeleteFees && (
                                <button
                                  onClick={() => setVoidTarget(voidTarget?.id === p.id ? null : { id: p.id, amount: p.amount, receiptNumber: p.receiptNumber })}
                                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors">
                                  Reverse
                                </button>
                              )}
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
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Balance After Payment</div>
                        <div className={`text-xl font-bold tabular-nums mt-0.5 ${afterPayment === 0 ? "text-blue-600" : "text-amber-600"}`}>
                          {afterPayment === 0 ? "Will be cleared" : inr(afterPayment)}
                        </div>
                        {afterPayment === 0
                          ? <div className="text-xs text-blue-500">Full balance will clear on submission</div>
                          : <div className="text-xs text-muted-foreground">{inr(afterPayment)} remaining</div>
                        }
                      </div>
                    )}
                  </div>

                  {/* Concession Panel */}
                  <div className="rounded-xl border">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors rounded-xl"
                      onClick={() => setConcessionOpen(!concessionOpen)}>
                      <span className="flex items-center gap-2 font-semibold">
                        <Tag className="h-4 w-4 text-blue-600" />
                        {t('fees.applyWaiver')}
                        {(activeRecord.discountAmount ?? 0) > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            {inr(activeRecord.discountAmount)} active
                          </span>
                        )}
                      </span>
                      {concessionOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {concessionOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        <div className="p-2 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
                          75% cap: <strong>{inr(structureFeeSum * 0.75)}</strong> &nbsp;|&nbsp;
                          Applied: <strong>{inr(activeRecord.discountAmount ?? 0)}</strong> &nbsp;|&nbsp;
                          Headroom: <strong>{inr(maxMoreConcession)}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Concession Type</Label>
                            <Select value={concessionType} onValueChange={v => {
                              setConcessionType(v);
                              if (v !== "__custom__") setCustomConcessionLabel("");
                              if (v && v !== "__custom__") {
                                if (apiConcessionTypes.length > 0) {
                                  const ct = apiConcessionTypes.find(t => t.id === v);
                                  if (ct) {
                                    setConcessionMode(ct.discountType.toLowerCase() === "fixed" ? "fixed" : "percent");
                                    setConcessionValue(String(ct.discountValue));
                                  }
                                } else {
                                  const ct = CONCESSION_TYPES.find(t => t.value === v);
                                  if (ct) { setConcessionMode(ct.discountType); setConcessionValue(String(ct.discountValue)); }
                                }
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type…" /></SelectTrigger>
                              <SelectContent>
                                {apiConcessionTypes.length > 0
                                  ? apiConcessionTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                  : CONCESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)
                                }
                                <SelectItem value="__custom__">✏️ Custom…</SelectItem>
                              </SelectContent>
                            </Select>
                            {concessionType === "__custom__" && (
                              <Input className="h-7 text-xs mt-1" placeholder="Enter concession name…" value={customConcessionLabel} onChange={e => setCustomConcessionLabel(e.target.value)} />
                            )}
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
                            disabled={applyingConcession || concessionCalcAmt <= 0 || !canEditFees}>
                            {applyingConcession ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Apply
                          </Button>
                        </div>
                        {/* Remove concession button — only visible when a concession is active */}
                        {(activeRecord.discountAmount ?? 0) > 0 && canEditFees && (
                          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
                            <div className="text-xs text-red-700">
                              <span className="font-semibold">Active concession:</span> {inr(activeRecord.discountAmount)} applied
                            </div>
                            <Button size="sm" variant="destructive" className="h-7 text-xs px-3"
                              onClick={handleRemoveConcession} disabled={applyingConcession}>
                              {applyingConcession ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              Remove
                            </Button>
                          </div>
                        )}
                        {/* Notify parent toggle */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <Switch checked={notifyParent} onCheckedChange={setNotifyParent} className="scale-90" />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <BellRing className="h-3.5 w-3.5" />
                            Notify parent about this concession via parent portal
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* ── Additional Charges (Hostel, Library Fine, Misc) ── */}
                  <div className="rounded-xl border">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors rounded-xl"
                      onClick={() => setExtraChargesOpen(!extraChargesOpen)}>
                      <span className="flex items-center gap-2 font-semibold">
                        <PackagePlus className="h-4 w-4 text-orange-500" />
                        {t('fees.addExtraCharges')}
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
                                    // Always adjust amount by the removed charge delta
                                    setAmount(prev => String(Math.max(0, (parseFloat(prev) || 0) - item.amount)));
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
                          disabled={!newExtraAmt || parseFloat(newExtraAmt) <= 0 || !newExtraLabel || !canEditFees}
                          onClick={() => {
                            const newChargeAmt = parseFloat(newExtraAmt);
                            const labelText = newExtraPreset === "custom"
                              ? newExtraLabel
                              : (EXTRA_CHARGE_PRESETS.find(p => p.value === newExtraPreset)?.label ?? "Charge");
                            // Always bump amount by the new charge delta
                            setAmount(prev => String(Math.max(0, (parseFloat(prev) || 0) + newChargeAmt)));
                            setExtraItems(prev => [...prev, { label: labelText, amount: newChargeAmt }]);
                            setNewExtraAmt(""); setNewExtraLabel("");
                          }}>
                          <Plus className="h-3.5 w-3.5" />Add Charge
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ── Sibling Discount Panel ── */}
                  <div className="rounded-xl border border-pink-200">
                    <button className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-pink-50/40 transition-colors rounded-xl"
                      onClick={() => {
                        const next = !siblingPanelOpen;
                        setSiblingPanelOpen(next);
                        if (next && siblings.length === 0) fetchSiblings();
                      }}>
                      <span className="flex items-center gap-2 font-semibold text-pink-700">
                        <Users className="h-4 w-4 text-pink-500" />
                        {t('fees.siblingDiscount')}
                        {siblingDiscApplied && (
                          <span className="text-xs bg-pink-100 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-medium">
                            {inr(siblingDiscApplied.totalSaved)} applied
                          </span>
                        )}
                      </span>
                      {siblingPanelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {siblingPanelOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-pink-100 pt-3">
                        {siblingsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />Fetching sibling records…
                          </div>
                        ) : siblings.length <= 1 ? (
                          <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 text-xs text-pink-700">
                            No siblings found for this student. Sibling discount requires at least 2 siblings enrolled in the school.
                          </div>
                        ) : (
                          <>
                            {/* Sibling cards with installment breakdown */}
                            <div className="space-y-3">
                              {siblings.map((sib: any) => (
                                <div key={sib.studentId} className={`rounded-xl border text-sm ${
                                  sib.isAnchor ? "border-pink-300 bg-pink-50/60" : "border-border bg-background"
                                }`}>
                                  {/* Card header */}
                                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="h-7 w-7 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 text-xs font-bold shrink-0">
                                        {sib.studentName?.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-sm flex items-center gap-1.5">
                                          {sib.studentName}
                                          {sib.isAnchor && <span className="text-[10px] text-pink-600 font-bold bg-pink-100 px-1.5 py-0.5 rounded-full">current</span>}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {sib.class}{sib.section ? ` – ${sib.section}` : ""} &bull; {sib.installmentPlan ?? "Annual"}
                                          {sib.structureName && <> &bull; <span className="italic">{sib.structureName}</span></>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                      {sib.feeRecordId && (
                                        <a href={`/fees?recordId=${sib.feeRecordId}`} target="_blank" rel="noopener noreferrer"
                                          className="text-[10px] text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                                          View full fee ↗
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Installment / term rows */}
                                  <div className="px-3 py-2 space-y-1.5">
                                    {(sib.installments ?? []).length > 0 ? (
                                      (sib.installments as any[]).map((inst: any) => (
                                        <div key={inst.number} className={`rounded-lg text-xs ${
                                          inst.status === 'paid'
                                            ? 'bg-green-50 border border-green-100'
                                            : inst.status === 'current'
                                            ? 'bg-amber-50 border border-amber-200'
                                            : 'bg-muted/30 border border-transparent'
                                        }`}>
                                          {/* Main row */}
                                          <div className="flex items-center justify-between px-2.5 py-2">
                                            <div className="flex items-center gap-2">
                                              {inst.status === 'paid'    && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                                              {inst.status === 'current' && <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                              {inst.status === 'upcoming'&& <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/25 shrink-0" />}
                                              <div>
                                                <span className={`font-semibold ${
                                                  inst.status === 'paid'    ? 'text-green-800' :
                                                  inst.status === 'current' ? 'text-amber-900' :
                                                                               'text-muted-foreground'
                                                }`}>{inst.label}</span>
                                                {inst.dueDate && inst.status !== 'paid' && (
                                                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                                                    · due {new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                              <div className={`font-bold tabular-nums ${
                                                inst.status === 'paid'    ? 'text-green-700' :
                                                inst.status === 'current' ? 'text-amber-900' :
                                                                             'text-muted-foreground'
                                              }`}>{inr(inst.amount)}</div>
                                              <div className={`text-[10px] font-medium ${
                                                inst.status === 'paid'    ? 'text-green-600' :
                                                inst.status === 'current' ? 'text-amber-600' :
                                                                             'text-muted-foreground/70'
                                              }`}>
                                                {inst.status === 'paid'    ? '✓ Cleared'       :
                                                 inst.status === 'current' ? `₹${Number(inst.dueInInstallment ?? inst.amount).toLocaleString('en-IN')} due` :
                                                                              'Upcoming'}
                                              </div>
                                            </div>
                                          </div>
                                          {/* Sub-line: paid/remaining detail (only when non-trivial) */}
                                          {inst.status === 'current' && (inst.paidInInstallment ?? 0) > 0 && (
                                            <div className="px-[30px] pb-2 text-[10px] text-amber-700">
                                              <span className="font-medium">{inr(inst.paidInInstallment)}</span> paid towards this term &middot; <span className="font-semibold">{inr(inst.dueInInstallment)}</span> remaining
                                            </div>
                                          )}
                                          {inst.status === 'current' && (inst.paidInInstallment ?? 0) === 0 && (
                                            <div className="px-[30px] pb-2 text-[10px] text-amber-600">
                                              No payment received yet for this term
                                            </div>
                                          )}
                                          {inst.status === 'paid' && (
                                            <div className="px-[30px] pb-2 text-[10px] text-green-600">
                                              Full amount received ✓
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      /* No installment structure — show simple summary */
                                      <div className="flex justify-between items-center text-xs px-1">
                                        <span className="text-muted-foreground">Paid</span>
                                        <span className="font-semibold text-green-700">{inr(sib.paidAmount)}</span>
                                        <span className="text-muted-foreground">Pending</span>
                                        <span className={`font-semibold ${sib.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {sib.pendingAmount > 0 ? inr(sib.pendingAmount) : 'Nil ✓'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Collective summary */}
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-pink-50 border border-pink-200 text-sm">
                              <span className="font-semibold text-pink-800">Combined Outstanding</span>
                              <span className="font-black text-pink-800 tabular-nums text-base">
                                {inr(siblings.reduce((s: number, x: any) => s + (x.pendingAmount ?? 0), 0))}
                              </span>
                            </div>

                            {siblingDiscApplied ? (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>
                                  <strong>{inr(siblingDiscApplied.totalSaved)}</strong> discounted across{" "}
                                  <strong>{siblingDiscApplied.applied}</strong> fee record(s)
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Discount Type</Label>
                                    <Select value={siblingDiscType} onValueChange={(v: "percentage" | "flat") => setSiblingDiscType(v)}>
                                      <SelectTrigger className="h-8 text-xs border-pink-200"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">
                                      {siblingDiscType === "percentage" ? "Discount %" : "Discount ₹"}
                                    </Label>
                                    <Input
                                      type="number" min={0}
                                      max={siblingDiscType === "percentage" ? 100 : undefined}
                                      className="h-8 text-sm border-pink-200"
                                      placeholder={siblingDiscType === "percentage" ? "e.g. 10" : "e.g. 1000"}
                                      value={siblingDiscValue}
                                      onChange={e => setSiblingDiscValue(e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground mb-1 block">Reason</Label>
                                    <Input
                                      className="h-8 text-xs border-pink-200"
                                      value={siblingDiscReason}
                                      onChange={e => setSiblingDiscReason(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-8 w-full gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                                  disabled={applyingSiblingDisc || !siblingDiscValue || !canEditFees}
                                  onClick={handleApplySiblingDiscount}
                                >
                                  {applyingSiblingDisc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                                  Apply Sibling Discount to All
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {t('fees.amountToCollect')} *
                        {totalExtraCharges > 0 && (
                          <span className="ml-2 text-orange-600 font-bold normal-case">incl. {inr(totalExtraCharges)} extra</span>
                        )}
                      </Label>
                      <div className="flex gap-2 text-xs">
                        {dueTerm && (
                          <button onClick={() => setAmount(String(Math.round(Math.min(dueTerm.remaining, adjustedOutstanding) * 100) / 100))}
                            className="font-semibold text-primary hover:underline">
                            {normalizeTermName(dueTerm.term.name, dueTerm.idx)}
                          </button>
                        )}
                        {!dueTerm && (structure?.installmentCount ?? 1) > 1 && (
                          <button onClick={() => setAmount(String(Math.round((adjustedOutstanding / (structure?.installmentCount ?? 1)) * 100) / 100))}
                            className="font-semibold text-primary hover:underline">
                            Installment
                          </button>
                        )}
                        <button onClick={() => setAmount(String(adjustedOutstanding))}
                          className={(structure?.installmentCount ?? 1) > 1 ? "text-muted-foreground hover:text-foreground hover:underline" : "font-semibold text-primary hover:underline"}>
                          {t('fees.fullAmount')}
                        </button>
                        <button onClick={() => setAmount("")}
                          className="text-muted-foreground hover:text-foreground hover:underline">{t('fees.customAmount')}</button>
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
                        {t('fees.partialPayment')} — {inr(afterPayment)} {t('fees.willRemainOutstanding')}
                      </p>
                    )}
                    {amt > adjustedOutstanding + 0.01 && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">{t('fees.exceedsBalance')}</p>
                    )}
                  </div>

                  {/* Payment Date + Received By */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">{t('fees.paymentDate')}</Label>
                      <Input className="h-9 text-sm" placeholder="Staff name / counter" value={processedBy} onChange={e => setProcessedBy(e.target.value)} />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">{t('fees.paymentMethod')} *</Label>
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
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">{t('fees.narration')}</Label>
                    <Input className="h-9 text-sm" placeholder="Optional note" value={narration} onChange={e => setNarration(e.target.value)} />
                  </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 px-5 py-4 border-t bg-muted/20 flex gap-3">
                  <Button variant="outline" onClick={onClose} className="w-28">{t('fees.cancelButton')}</Button>
                  {canManageFees ? (
                    isDigital ? (
                      <Button
                        className="flex-1 h-11 font-bold gap-2 text-base bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={saving || !amt || amt <= 0 || amt > adjustedOutstanding + 0.01}
                        onClick={handleInitiateCashfree}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {amt > 0 ? `${t('fees.payNow')} ${inr(amt)} via Cashfree →` : `${t('fees.payNow')} via Cashfree →`}
                      </Button>
                    ) : (
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none px-1">
                          <Switch checked={notifyParent} onCheckedChange={setNotifyParent} className="scale-90" />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <BellRing className="h-3.5 w-3.5" />
                            {t('fees.sendConfirmation')}
                          </span>
                        </label>
                        <Button
                          className="w-full h-11 font-bold gap-2 text-base"
                          disabled={saving || !amt || amt <= 0 || amt > adjustedOutstanding + 0.01}
                          onClick={handleCollect}
                        >
                          {saving
                            ? <><Loader2 className="h-4 w-4 animate-spin" />{t('fees.processing')}</>
                            : <><Receipt className="h-4 w-4" />{amt > 0 ? `${t('fees.collect')} ${inr(amt)} & ${t('fees.collectAndPrint').replace('Collect & ', '')}` : t('fees.collectAndPrint')}</>
                          }
                        </Button>
                      </div>
                    )
                  ) : null}
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
// ─── Term-schedule helpers ────────────────────────────────────────────────

/** Build the default Indian academic year term schedule for the given plan */
function defaultTermSchedule(installmentCount: number, academicYear: string, totalFee: number): TermSchedule[] {
  const startYear = parseInt((academicYear || "2026-2027").split('-')[0]);
  const endYear = startYear + 1;
  const n = Math.max(1, installmentCount);
  const base = Math.floor(totalFee / n);
  const rem  = Math.round((totalFee - base * n) * 100) / 100;
  const amt  = (i: number) => i === n - 1 ? Math.round((base + rem) * 100) / 100 : base;

  const fmt = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

  if (n === 1) return [{ termNumber:1, name:"Annual",  fromDate:fmt(startYear,4,1),     toDate:fmt(endYear,3,31),      dueDate:fmt(startYear,4,30),       amount:amt(0) }];
  if (n === 2) return [
    { termNumber:1, name:"Term 1", fromDate:fmt(startYear,4,1),  toDate:fmt(startYear,9,30),  dueDate:fmt(startYear,4,30),  amount:amt(0) },
    { termNumber:2, name:"Term 2", fromDate:fmt(startYear,10,1), toDate:fmt(endYear,3,31),    dueDate:fmt(startYear,10,31), amount:amt(1) },
  ];
  if (n === 3) return [
    { termNumber:1, name:"Term 1", fromDate:fmt(startYear,4,1),  toDate:fmt(startYear,6,30),  dueDate:fmt(startYear,4,30),  amount:amt(0) },
    { termNumber:2, name:"Term 2", fromDate:fmt(startYear,7,1),  toDate:fmt(startYear,10,31), dueDate:fmt(startYear,7,31),  amount:amt(1) },
    { termNumber:3, name:"Term 3", fromDate:fmt(startYear,11,1), toDate:fmt(endYear,3,31),    dueDate:fmt(startYear,11,30), amount:amt(2) },
  ];
  if (n === 4) return [
    { termNumber:1, name:"Q1", fromDate:fmt(startYear,4,1),    toDate:fmt(startYear,6,30),  dueDate:fmt(startYear,4,30),    amount:amt(0) },
    { termNumber:2, name:"Q2", fromDate:fmt(startYear,7,1),    toDate:fmt(startYear,9,30),  dueDate:fmt(startYear,7,31),    amount:amt(1) },
    { termNumber:3, name:"Q3", fromDate:fmt(startYear,10,1),   toDate:fmt(startYear,12,31), dueDate:fmt(startYear,10,31),   amount:amt(2) },
    { termNumber:4, name:"Q4", fromDate:fmt(endYear,1,1),      toDate:fmt(endYear,3,31),    dueDate:fmt(endYear,1,31),      amount:amt(3) },
  ];
  if (n === 12) {
    const months = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    const nums   = [4,5,6,7,8,9,10,11,12,1,2,3];
    return months.map((name, i) => {
      const y = nums[i] >= 4 ? startYear : endYear;
      const m = nums[i];
      return { termNumber:i+1, name, fromDate:fmt(y,m,1), toDate:fmt(y,m,lastDay(y,m)), dueDate:fmt(y,m,7), amount:amt(i) };
    });
  }
  return Array.from({length:n}, (_,i) => ({
    termNumber:i+1, name:`Installment ${i+1}`, fromDate:"", toDate:"", dueDate:"", amount:amt(i)
  }));
}

/** Parse installmentDueDates JSON → TermSchedule[] (or [] if legacy / missing) */
function parseSchedule(raw?: string): TermSchedule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "termNumber" in parsed[0])
      return parsed as TermSchedule[];
  } catch {}
  return [];
}

const MONTH_OPTIONS = [
  {v:"01",l:"January"},{v:"02",l:"February"},{v:"03",l:"March"},{v:"04",l:"April"},
  {v:"05",l:"May"},{v:"06",l:"June"},{v:"07",l:"July"},{v:"08",l:"August"},
  {v:"09",l:"September"},{v:"10",l:"October"},{v:"11",l:"November"},{v:"12",l:"December"},
];

function MonthYearPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  // value = "YYYY-MM-DD" → break into year+month for dropdowns
  const year  = value ? value.slice(0,4) : "";
  const month = value ? value.slice(5,7) : "";
  const day   = value ? value.slice(8,10) : "01";

  const setYM = (y: string, m: string) => {
    if (y && m) {
      const last = new Date(parseInt(y), parseInt(m), 0).getDate();
      const d = Math.min(parseInt(day) || 1, last);
      onChange(`${y}-${m}-${String(d).padStart(2,'0')}`);
    }
  };

  const years = ["2024","2025","2026","2027","2028"];
  return (
    <div className="flex gap-1">
      <Select value={month} onValueChange={m => setYM(year || "2026", m)}>
        <SelectTrigger className="h-8 text-xs w-[90px]"><SelectValue placeholder={label || "Month"} /></SelectTrigger>
        <SelectContent>{MONTH_OPTIONS.map(o => <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year} onValueChange={y => setYM(y, month || "04")}>
        <SelectTrigger className="h-8 text-xs w-[70px]"><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>{years.map(y => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FeeStructureTab({ academicYear }: { academicYear: string }) {
  const { t } = useLanguage();
  const { availableYears } = useAcademicYear();
  const [tabYear, setTabYear] = useState(academicYear || "");
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [form, setForm] = useState<Partial<CreateFeeStructureDto>>({ installmentCount: 1 });
  const [termSchedule, setTermSchedule] = useState<TermSchedule[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null); // structureId being assigned
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set()); // recently successfully assigned
  const [seeding, setSeeding] = useState(false);
  const [linkedClassesMap, setLinkedClassesMap] = useState<Record<string, ClassFeeStructureLink[]>>({});
  const [linkedClassesLoading, setLinkedClassesLoading] = useState<Set<string>>(new Set());
  const [expandedLinkedClasses, setExpandedLinkedClasses] = useState<Set<string>>(new Set());
  const [addingClassFor, setAddingClassFor] = useState<string | null>(null); // structureId
  const [newClassInput, setNewClassInput] = useState("");
  const [togglingActive, setTogglingActive] = useState<string | null>(null); // structureId being toggled
  const [editLinkedClasses, setEditLinkedClasses] = useState<ClassFeeStructureLink[]>([]); // linked classes shown in edit dialog
  const [editLinkedClassesLoading, setEditLinkedClassesLoading] = useState(false);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Array<{ feeHeadId: string; feeHeadName: string; amount: number; remarks?: string }>>([]);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);
  const [boardFilter, setBoardFilter] = useState<string>("__all__");

  const handleSeedStructures = async () => {
    if (!tabYear) { toast.error("Select an academic year first"); return; }
    setSeeding(true);
    try {
      const res = await feeApi.seedFeeStructures(tabYear);
      if (res.created === 0) {
        toast.info(`All classes already have fee structures for ${tabYear}.`);
      } else {
        toast.success(`Created ${res.created} fee structure(s) for ${tabYear}. Use "Assign to Class" on each to generate student records.`);
        const updated = await feeApi.getFeeStructures(undefined, tabYear || undefined);
        setStructures(updated || []);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to seed structures");
    } finally { setSeeding(false); }
  };

  // Sync tabYear when parent academicYear prop changes
  useEffect(() => { if (academicYear) setTabYear(academicYear); }, [academicYear]);

  const toggleLinkedClasses = async (structureId: string) => {
    const isOpen = expandedLinkedClasses.has(structureId);
    if (isOpen) {
      setExpandedLinkedClasses(prev => { const s = new Set(prev); s.delete(structureId); return s; });
      return;
    }
    setExpandedLinkedClasses(prev => new Set(prev).add(structureId));
    if (linkedClassesMap[structureId]) return; // already loaded
    setLinkedClassesLoading(prev => new Set(prev).add(structureId));
    try {
      const classes = await getLinkedClasses(structureId);
      setLinkedClassesMap(prev => ({ ...prev, [structureId]: classes }));
    } catch {
      toast.error("Failed to load linked classes");
    } finally {
      setLinkedClassesLoading(prev => { const s = new Set(prev); s.delete(structureId); return s; });
    }
  };

  const handleLinkClass = async (structureId: string) => {
    const cn = newClassInput.trim();
    if (!cn) return;
    try {
      const linked = await linkClass(structureId, cn);
      const updatedClasses = [...(linkedClassesMap[structureId] ?? []), linked];
      setLinkedClassesMap(prev => ({ ...prev, [structureId]: updatedClasses }));
      setNewClassInput("");
      setAddingClassFor(null);
      const classNames = updatedClasses.map(c => c.className).join(", ");
      toast.success(`Classes linked to structure: ${classNames}`);
    } catch (e: any) {
      console.error("Link class error:", e?.response?.data || e?.message || e);
      const errMsg = e?.response?.data?.message || e?.message || "Failed to link class";
      toast.error(errMsg);
    }
  };

  const handleUnlinkClass = async (structureId: string, link: ClassFeeStructureLink) => {
    try {
      await unlinkClass(structureId, link.className);
      setLinkedClassesMap(prev => ({ ...prev, [structureId]: (prev[structureId] ?? []).filter(c => c.id !== link.id) }));
      toast.success(`Class "${link.className}" unlinked`);
    } catch (e: any) {
      console.error("Unlink class error:", e?.response?.data || e?.message || e);
      toast.error(e?.response?.data?.message ?? "Failed to unlink class");
    }
  };

  const handleToggleActive = async (s: FeeStructure) => {
    setTogglingActive(s.id);
    try {
      const result = await toggleStructureActive(s.id);
      setStructures(prev => prev.map(x => x.id === s.id ? { ...x, isActive: result.isActive } : x));
      toast.success(`"${s.name}" marked as ${result.isActive ? "active" : "inactive"}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to toggle status");
    } finally {
      setTogglingActive(null);
    }
  };

  const availableStandards = Array.from(new Set(allClasses.map(c => c.standard))).sort(
    (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
  );

  const totalFee = useMemo(() => FEE_HEADS.reduce((s, h) => s + (parseFloat(String((form as any)[h.key])) || 0), 0), [form]);

  const { hasUserPermission: hasFeePermission } = usePermissions();
  const fsCanManage = hasFeePermission('Fees', 'Create');
  const fsCanEdit   = hasFeePermission('Fees', 'Edit');
  const fsCanDelete = hasFeePermission('Fees', 'Delete');

  // Reload structures when tabYear changes
  useEffect(() => {
    setLoading(true);
    academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(e => console.error('Failed to load classes:', e));
    feeApi.getFeeStructures(undefined, tabYear || undefined)
      .then(r => setStructures(r || [])).catch(e => console.error('Failed to load structures:', e)).finally(() => setLoading(false));
    // Also load fee heads
    feeApi.getFeeHeads()
      .then(r => {
        console.log('Loaded fee heads:', r);
        setFeeHeads(r || []);
      })
      .catch(e => {
        console.error('Failed to load fee heads:', e);
        setFeeHeads([]);
      });
    // Load school boards
    boardApi.getSchoolBoards()
      .then(r => setSchoolBoards(r.boards || []))
      .catch(e => console.error('Failed to load boards:', e));
  }, [tabYear]);

  // When installment plan changes or total fee changes, rebuild the term schedule
  useEffect(() => {
    const count = form.installmentCount ?? 1;
    const year  = form.academicYear || tabYear;
    setTermSchedule(defaultTermSchedule(count, year, totalFee));
  }, [form.installmentCount, form.academicYear, tabYear, totalFee]);

  const openCreate = () => {
    const count = 1;
    setEditing(null);
    setForm({ installmentCount: count, academicYear: tabYear, boardConfigurationId: undefined });
    setTermSchedule(defaultTermSchedule(count, tabYear, 0));
    setSelectedComponents([]);
    setShowDialog(true);
  };
  
  const openEdit = async (s: FeeStructure) => {
    const existing = parseSchedule(s.installmentDueDates);
    setTermSchedule(existing.length > 0 ? existing : defaultTermSchedule(s.installmentCount, s.academicYear, s.totalAmount));
    setEditing(s);
    setForm({
      name: s.name, class: s.class, academicYear: s.academicYear,
      tuitionFee: s.tuitionFee, examFee: s.examFee, libraryFee: s.libraryFee,
      labFee: s.labFee, developmentFee: s.developmentFee, sportsFee: s.sportsFee,
      admissionFee: s.admissionFee,
      uniformFee: s.uniformFee, booksFee: s.booksFee, miscellaneous: s.miscellaneous,
      installmentCount: s.installmentCount,
      boardConfigurationId: s.boardConfigurationId || undefined,
    });
    // Load existing components
    setComponentsLoading(true);
    try {
      const comps = await getStructureComponents(s.id);
      setSelectedComponents(comps.map((c: FeeStructureComponent) => ({ feeHeadId: c.feeHeadId, feeHeadName: c.feeHeadName, amount: c.amount, remarks: c.remarks })));
    } catch (e) {
      console.error("Failed to load components:", e);
      setSelectedComponents([]);
    } finally {
      setComponentsLoading(false);
    }
    // Load linked classes for display in dialog
    setEditLinkedClassesLoading(true);
    setEditLinkedClasses([]);
    try {
      const cls = linkedClassesMap[s.id] ?? await getLinkedClasses(s.id);
      setEditLinkedClasses(cls);
      if (!linkedClassesMap[s.id]) setLinkedClassesMap(prev => ({ ...prev, [s.id]: cls }));
    } catch {
      setEditLinkedClasses([]);
    } finally {
      setEditLinkedClassesLoading(false);
    }
    setShowDialog(true);
  };

  const handleAssign = async (structure: FeeStructure) => {
    setAssigning(structure.id);
    try {
      const res = await bulkAssignStructure(structure.id);
      const classLabel = structure.class;
      if (res.assigned > 0) {
        toast.success(`${res.assigned} student(s) in ${classLabel} assigned fee records.${
          res.skipped > 0 ? ` ${res.skipped} already had records (skipped).` : ""
        }`);
      } else {
        toast.info(res.skipped > 0
          ? `All ${res.skipped} students in ${classLabel} already have fee records for this structure.`
          : `No active students found in ${classLabel} (including sections).`);
      }
      // Refresh structures so assignedStudentCount reflects the new state
      const updated = await feeApi.getFeeStructures(undefined, tabYear || undefined);
      setStructures(updated || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to assign structure");
    } finally { setAssigning(null); }
  };

  const handleSave = async () => {
    if (!form.name || !form.class) { toast.error("Provide structure name and class"); return; }
    // Validate term schedule amounts sum to total
    if (termSchedule.length > 1) {
      const schedTotal = termSchedule.reduce((s, t) => s + (t.amount || 0), 0);
      const diff = Math.abs(schedTotal - totalFee);
      if (diff > 1) { toast.error(`Term amounts (${inr(schedTotal)}) must add up to total fee (${inr(totalFee)})`); return; }
    }
    setSaving(true);
    try {
      const payload: CreateFeeStructureDto = {
        name: form.name!,
        class: form.class!,
        academicYear: form.academicYear || tabYear,
        ...FEE_HEADS.reduce((acc, h) => ({ ...acc, [h.key]: (form as any)[h.key] || 0 }), {}),
        installmentCount: form.installmentCount || 1,
        installmentDueDates: termSchedule.length > 0 ? JSON.stringify(termSchedule) : undefined,
        boardConfigurationId: form.boardConfigurationId || undefined,
      } as CreateFeeStructureDto;
      let structureId: string;
      if (editing) {
        await feeApi.updateFeeStructure(editing.id, payload);
        structureId = editing.id;
        toast.success("Fee structure updated");
      } else {
        const res = await feeApi.createFeeStructure(payload);
        structureId = (res as any).id;
        const autoAssigned: number = (res as any).autoAssigned ?? 0;
        const autoSkipped: number  = (res as any).autoSkipped  ?? 0;
        if (autoAssigned > 0) {
          toast.success(
            `Fee structure created & auto-assigned to ${autoAssigned} student(s) in Class ${form.class}.` +
            (autoSkipped > 0 ? ` ${autoSkipped} already had records (skipped).` : "")
          );
        } else {
          toast.success(
            `Fee structure created. No active students found in Class ${form.class} yet — use "Assign to Class" once students are enrolled.`
          );
        }
      }
      // Save components
      if (selectedComponents.length > 0) {
        try {
          await setStructureComponents(
            structureId,
            selectedComponents.map(c => ({ feeHeadId: c.feeHeadId, amount: c.amount, remarks: c.remarks }))
          );
        } catch (e) {
          console.error("Failed to save components:", e);
          toast.warning("Structure saved but some components failed to save");
        }
      }
      const updated = await feeApi.getFeeStructures(undefined, tabYear || undefined);
      setStructures(updated || []);
      setShowDialog(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header row: title + year dropdown + new button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t('fees.struct.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('fees.struct.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Board filter — only shown when school has multiple boards */}
          {schoolBoards.length > 1 && (
            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger className="h-9 text-sm w-[150px]">
                <SelectValue placeholder="All Boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Boards</SelectItem>
                {schoolBoards.map(b => (
                  <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>
                    {b.boardName}{b.isDefault ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Academic year picker scoped to this tab */}
          <Select value={tabYear} onValueChange={setTabYear}>
            <SelectTrigger className="h-9 text-sm w-[140px]">
              <SelectValue placeholder={t('fees.struct.selectYear')} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0
                ? availableYears.map(y => <SelectItem key={y.id} value={y.name}>{y.name}{y.isCurrent ? " (current)" : ""}</SelectItem>)
                : ["2024-2025","2025-2026","2026-2027"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)
              }
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleSeedStructures}
            disabled={seeding || !fsCanManage}
            className="gap-2 h-9 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
            title="Create default fee structures for all classes that don't have one yet"
          >
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {t('fees.struct.seedAllClasses')}
          </Button>
          <Button onClick={openCreate} className="gap-2" disabled={!fsCanManage}><Plus className="h-4 w-4" />{t('fees.struct.newStructure')}</Button>
        </div>
      </div>

      {/* Auto-link info */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
        <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
        <div>
          <span className="font-semibold">{t('fees.struct.howAutoAssign')}</span>
          {t('fees.struct.howAutoAssignBody')}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : structures.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-xl">
          <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-muted-foreground mb-2">{t('fees.struct.noStructures')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('fees.struct.noStructuresDesc')}</p>
          <Button onClick={openCreate} className="gap-2" disabled={!fsCanManage}><Plus className="h-4 w-4" />{t('fees.struct.createFirst')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {structures
            .filter(s => boardFilter === "__all__" || s.boardConfigurationId === boardFilter)
            .map(s => {
            const isAssigned = assignedIds.has(s.id) || (s.assignedStudentCount ?? 0) > 0;
            const justAssigned = assignedIds.has(s.id);
            return (
            <Card key={s.id} className={`transition-shadow hover:shadow-md ${isAssigned ? "border-green-200" : ""} ${s.isActive === false ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.class} · {s.academicYear}</div>
                    {s.boardName && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 mt-1">
                        {s.boardName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="text-xl font-bold text-primary">{inr(s.totalAmount)}</div>
                    {isAssigned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-semibold px-2 py-0.5">
                        <Check className="h-2.5 w-2.5" />
                        Assigned · {justAssigned ? (s.assignedStudentCount ?? 0) : s.assignedStudentCount} students
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        Not assigned
                      </span>
                    )}
                    <button
                      type="button"
                      title={s.isActive === false ? "Mark as Active" : "Mark as Inactive"}
                      disabled={togglingActive === s.id || !fsCanEdit}
                      onClick={() => handleToggleActive(s)}
                      className={`inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        s.isActive === false
                          ? "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {togglingActive === s.id
                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        : s.isActive === false
                          ? <><span className="w-2 h-2 rounded-full bg-gray-400 inline-block mr-0.5" />Inactive</>
                          : <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-0.5" />Active</>
                      }
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {INSTALLMENT_PLANS.find(p => p.value === String(s.installmentCount))?.label ?? `${s.installmentCount} installments`}
                </div>
                {/* Term schedule preview */}
                {(() => {
                  const sched = parseSchedule(s.installmentDueDates);
                  return sched.length > 0 ? (
                    <div className="space-y-1 mb-3">
                      {sched.map(t => (
                        <div key={t.termNumber} className="flex justify-between items-center text-xs bg-muted/40 rounded px-2 py-1">
                          <span className="font-medium text-foreground">{t.name}</span>
                          <span className="text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}) : "—"}</span>
                          <span className="font-semibold text-primary">{inr(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                      {FEE_HEADS.filter(h => (s as any)[h.key] > 0).slice(0, 4).map(h => (
                        <div key={h.key} className="flex justify-between bg-muted/50 rounded px-2 py-1">
                          <span className="text-muted-foreground truncate">{h.label.split(" ")[0]}</span>
                          <span className="font-medium ml-1">{inr((s as any)[h.key])}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => openEdit(s)} disabled={!fsCanEdit}>
                    <Pencil className="h-3 w-3 mr-1" />{t('fees.struct.editBtn')}
                  </Button>
                  <Button size="sm"
                    className={`h-7 text-xs flex-1 gap-1 text-white ${
                      isAssigned
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                    disabled={assigning === s.id || !fsCanManage}
                    onClick={() => handleAssign(s)}
                    title={isAssigned
                      ? `Re-assign to pick up newly enrolled students in ${s.class}`
                      : `Auto-create fee records for all sections of ${s.class}`}>
                    {assigning === s.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : isAssigned
                        ? <Check className="h-3 w-3" />
                        : <Users className="h-3 w-3" />}
                    {isAssigned ? t('fees.struct.assignToClass') : t('fees.struct.assignToClass')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600"
                    disabled={!fsCanDelete}
                    onClick={async () => { try { await feeApi.deleteFeeStructure(s.id); setStructures(prev => prev.filter(x => x.id !== s.id)); toast.success("Deleted"); } catch { toast.error("Failed"); } }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Linked Classes section */}
                <div className="mt-2 border-t pt-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => toggleLinkedClasses(s.id)}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="font-medium">Linked Classes</span>
                    {linkedClassesMap[s.id]?.length ? (
                      <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1.5 py-0">{linkedClassesMap[s.id].length}</Badge>
                    ) : null}
                    {expandedLinkedClasses.has(s.id)
                      ? <ChevronUp className="h-3 w-3 ml-auto" />
                      : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </button>

                  {expandedLinkedClasses.has(s.id) && (
                    <div className="mt-2 space-y-2">
                      {linkedClassesLoading.has(s.id) ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {(linkedClassesMap[s.id] ?? []).length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No classes linked yet</span>
                            ) : (
                              (linkedClassesMap[s.id] ?? []).map(link => (
                                <span
                                  key={link.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium px-2 py-0.5"
                                >
                                  {link.className}
                                  {fsCanManage && (
                                    <button
                                      type="button"
                                      className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                                      onClick={() => handleUnlinkClass(s.id, link)}
                                      title={`Unlink ${link.className}`}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </span>
                              ))
                            )}
                          </div>
                          {fsCanManage && (
                            addingClassFor === s.id ? (
                              <div className="flex items-center gap-1.5">
                                <Select
                                  value={newClassInput}
                                  onValueChange={setNewClassInput}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableStandards
                                      .filter(cls => !(linkedClassesMap[s.id] ?? []).some(l => l.className === cls))
                                      .map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => handleLinkClass(s.id)}
                                  disabled={!newClassInput}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2"
                                  onClick={() => { setAddingClassFor(null); setNewClassInput(""); }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 gap-1"
                                onClick={() => { setAddingClassFor(s.id); setNewClassInput(""); }}
                              >
                                <Plus className="h-3 w-3" /> Link Class
                              </Button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => !v && setShowDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('fees.struct.dialogEditTitle') : t('fees.struct.dialogCreateTitle')}</DialogTitle>
            <DialogDescription>Define fee heads for a class. Leave blank for fee heads not applicable.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Linked Classes (edit mode only) */}
            {editing && (
              <div className="col-span-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Linked Classes
                </div>
                {editLinkedClassesLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </div>
                ) : editLinkedClasses.length === 0 ? (
                  <span className="text-xs text-indigo-500 italic">No classes linked yet</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {editLinkedClasses.map(link => (
                      <span key={link.id} className="inline-flex items-center gap-1 rounded-full bg-white text-indigo-700 border border-indigo-300 text-[11px] font-medium px-2.5 py-0.5 shadow-sm">
                        {link.className}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.struct.structureName')} *</Label>
                <Input className="h-9 text-sm" placeholder="e.g. Annual Fee 2025-26" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.struct.academicYear')}</Label>
                <Select value={form.academicYear || tabYear} onValueChange={v => setForm({ ...form, academicYear: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {availableYears.length > 0
                      ? availableYears.map(y => <SelectItem key={y.id} value={y.name}>{y.name}{y.isCurrent ? " ✓" : ""}</SelectItem>)
                      : ["2024-2025","2025-2026","2026-2027"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.struct.forClass')} *</Label>
                <Select value={form.class ?? ""} onValueChange={v => setForm({ ...form, class: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {availableStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {schoolBoards.length > 1 && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Board</Label>
                  <Select
                    value={form.boardConfigurationId ?? "__all__"}
                    onValueChange={v => setForm({ ...form, boardConfigurationId: v === "__all__" ? undefined : v })}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Boards" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Boards (School Default)</SelectItem>
                      {schoolBoards.map(b => (
                        <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>
                          {b.boardName}{b.isDefault ? " (Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

            {/* Custom Fee Heads Section */}
            {feeHeads.length > 0 && (
              <div className="col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b pb-1">Custom Fee Heads from Fee Types</div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                  {feeHeads.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No custom fee heads created yet</div>
                  ) : (
                    feeHeads.map(fh => {
                      const isSelected = selectedComponents.some(c => c.feeHeadId === fh.id);
                      const comp = selectedComponents.find(c => c.feeHeadId === fh.id);
                      return (
                        <div key={fh.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComponents([...selectedComponents, { feeHeadId: fh.id, feeHeadName: fh.name, amount: 0 }]);
                              } else {
                                setSelectedComponents(selectedComponents.filter(c => c.feeHeadId !== fh.id));
                              }
                            }}
                          />
                          <label className="flex-1 text-sm font-medium cursor-pointer">{fh.name}</label>
                          {isSelected && (
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                              <Input
                                className="h-7 text-xs pl-5 w-[100px]"
                                type="number"
                                min={0}
                                value={comp?.amount ?? ""}
                                onChange={(e) => setSelectedComponents(prev => prev.map(c => c.feeHeadId === fh.id ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))}
                                placeholder="Amount"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="font-semibold">Total Annual Fee</div>
              <div className="text-2xl font-bold text-primary">{inr(totalFee)}</div>
            </div>

            {/* Installment Plan selector */}
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.struct.installmentPlan')}</Label>
              <Select value={String(form.installmentCount ?? 1)} onValueChange={v => setForm({ ...form, installmentCount: parseInt(v) })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTALLMENT_PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ─── Payment Schedule ─────────────────────────────── */}
            <div className="col-span-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b pb-1 flex items-center justify-between">
                <span>Payment Schedule</span>
                {termSchedule.length > 0 && (
                  <span className={`text-xs font-normal ${
                    Math.abs(termSchedule.reduce((s,t) => s + (t.amount||0), 0) - totalFee) > 1
                      ? "text-red-500"
                      : "text-green-600"
                  }`}>
                    Total: {inr(termSchedule.reduce((s,t) => s + (t.amount||0), 0))}
                    {Math.abs(termSchedule.reduce((s,t) => s + (t.amount||0), 0) - totalFee) > 1 && ` ≠ ${inr(totalFee)}`}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {termSchedule.map((term, idx) => (
                  <div key={term.termNumber} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    {/* Term header: number badge + name + amount */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{term.termNumber}</span>
                      <Input
                        className="h-8 text-sm font-medium flex-1"
                        value={term.name}
                        onChange={e => setTermSchedule(prev => prev.map((t,i) => i===idx ? {...t, name: e.target.value} : t))}
                        placeholder={`Term ${term.termNumber} name`}
                      />
                      <div className="relative shrink-0 w-[100px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                        <Input
                          className="h-8 text-sm pl-5 text-right"
                          type="number" min={0}
                          value={term.amount || ""}
                          onChange={e => setTermSchedule(prev => prev.map((t,i) => i===idx ? {...t, amount: parseFloat(e.target.value)||0} : t))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Date row: From · To · Due Date */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Collection From</Label>
                        <MonthYearPicker
                          value={term.fromDate}
                          onChange={v => setTermSchedule(prev => prev.map((t,i) => i===idx ? {...t, fromDate: v} : t))}
                          label="From"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Collection To</Label>
                        <MonthYearPicker
                          value={term.toDate}
                          onChange={v => setTermSchedule(prev => prev.map((t,i) => i===idx ? {...t, toDate: v} : t))}
                          label="To"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Due Date</Label>
                        <Input
                          className="h-8 text-xs"
                          type="date"
                          value={term.dueDate}
                          onChange={e => setTermSchedule(prev => prev.map((t,i) => i===idx ? {...t, dueDate: e.target.value} : t))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">{t('fees.struct.cancelBtn')}</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? t('fees.struct.savingBtn') : editing ? t('fees.struct.updateBtn') : t('fees.struct.saveBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Defaulters Tab ──────────────────────────────────────
const AGING_BUCKETS = [
  { key: "0-30",  label: "0–30 days",  cls: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  { key: "31-60", label: "31–60 days", cls: "bg-orange-50 border-orange-200 text-orange-800" },
  { key: "61-90", label: "61–90 days", cls: "bg-red-50 border-red-200 text-red-700" },
  { key: "90+",   label: "90+ days",   cls: "bg-red-100 border-red-300 text-red-900" },
] as const;

function agingBucket(days: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function DefaultersTab({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage();
  const [overdue, setOverdue] = useState<import("@/services/api/feeApi").OverdueFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("all");
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setOverdue(await feeApi.getOverdueFees()); }
    catch { setOverdue([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = overdue.filter(r => {
    if (bucket !== "all" && agingBucket(r.daysOverdue) !== bucket) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.studentName.toLowerCase().includes(q) || r.class.toLowerCase().includes(q) || r.admissionNumber.toLowerCase().includes(q);
    }
    return true;
  });

  const bucketCount = (k: string) => overdue.filter(r => agingBucket(r.daysOverdue) === k).length;
  const bucketAmt   = (k: string) => overdue.filter(r => agingBucket(r.daysOverdue) === k).reduce((s, r) => s + r.amount, 0);

  const handleSendReminder = async (record: import("@/services/api/feeApi").OverdueFeeRecord) => {
    setSending(record.feeRecordId);
    try {
      await feeApi.sendFeeReminders({ daysBefore: 0, channel: "push_notification" });
      toast.success(`Reminder sent for ${record.studentName}`);
    } catch { toast.error("Failed to send reminder"); }
    finally { setSending(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />{t('fees.def.title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('fees.def.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{t('fees.def.refresh')}
        </Button>
      </div>

      {/* Aging summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AGING_BUCKETS.map(b => (
          <button
            key={b.key}
            onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
            className={`rounded-xl border p-3 text-left transition-all ${b.cls} ${bucket === b.key ? "ring-2 ring-primary ring-offset-1" : "hover:shadow-sm"}`}
          >
            <div className="text-xs font-medium opacity-80">{b.label} {t('fees.def.overdue')}</div>
            <div className="text-2xl font-bold mt-1">{bucketCount(b.key)}</div>
            <div className="text-xs opacity-70 mt-0.5">{inr(bucketAmt(b.key))} {t('fees.def.outstanding')}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder={t('fees.def.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder={t('fees.def.allBuckets')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fees.def.allBuckets')} ({overdue.length})</SelectItem>
            {AGING_BUCKETS.map(b => <SelectItem key={b.key} value={b.key}>{b.label} ({bucketCount(b.key)})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed rounded-xl">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-400 mb-3" />
          <p className="font-semibold text-muted-foreground">
            {overdue.length === 0 ? t('fees.def.noOverdue') : t('fees.def.noMatch')}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fees.def.colStudent')}</TableHead>
                <TableHead>{t('fees.def.colAdmNo')}</TableHead>
                <TableHead>{t('fees.def.colClass')}</TableHead>
                <TableHead>{t('fees.def.colDueDate')}</TableHead>
                <TableHead className="text-center">{t('fees.def.colDaysOverdue')}</TableHead>
                <TableHead className="text-right">{t('fees.def.colAmount')}</TableHead>
                <TableHead className="text-right">{t('fees.def.colLateFee')}</TableHead>
                <TableHead>{t('fees.def.colContact')}</TableHead>
                {canManage && <TableHead className="text-center">{t('fees.def.colAction')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const bkt = AGING_BUCKETS.find(b => b.key === agingBucket(r.daysOverdue))!;
                return (
                  <TableRow key={r.feeRecordId}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.admissionNumber}</TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${bkt.cls}`}>{r.daysOverdue}d</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{inr(r.amount)}</TableCell>
                    <TableCell className="text-right text-orange-600 text-sm">{r.calculatedLateFee > 0 ? inr(r.calculatedLateFee) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.guardianPhone ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell className="text-center">
                        <Button
                          size="sm" variant="outline"
                          className="gap-1 h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          disabled={sending === r.feeRecordId}
                          onClick={() => handleSendReminder(r)}
                        >
                          {sending === r.feeRecordId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          {t('fees.def.remind')}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-sm">
          <span className="text-muted-foreground">{filtered.length} {t('common.of')} {overdue.length} {t('fees.def.students')}</span>
          <span className="font-semibold text-red-600">{inr(filtered.reduce((s, r) => s + r.amount, 0))} {t('fees.def.totalOutstanding')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Fee Reminders Tab ───────────────────────────────────
const REMINDER_TEMPLATES = [
  {
    key: "gentle",
    label: "Gentle Reminder",
    icon: "💬",
    message: "Dear Parent, this is a gentle reminder that the fee for {{studentName}} (Class {{class}}) of ₹{{amount}} was due on {{dueDate}}. Kindly pay at the earliest. Thank you.",
  },
  {
    key: "due_notice",
    label: "Payment Due Notice",
    icon: "📋",
    message: "Dear Parent, your child {{studentName}} (Class {{class}}) has an overdue fee of ₹{{amount}} due since {{dueDate}}. Please pay immediately to avoid late fees. Contact the school office for assistance.",
  },
  {
    key: "final_notice",
    label: "Final Notice",
    icon: "🚨",
    message: "Dear Parent, this is a FINAL NOTICE regarding the outstanding fee of ₹{{amount}} for {{studentName}} (Class {{class}}). Please clear the dues immediately. Failure to pay may affect your child's academic activities.",
  },
] as const;

const CHANNELS = [
  { value: "push_notification", label: "Push Notification", icon: "🔔" },
  { value: "sms",              label: "SMS",               icon: "📱" },
  { value: "email",            label: "Email",             icon: "📧" },
  { value: "whatsapp",         label: "WhatsApp",          icon: "💬" },
];

function RemindersTab({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage();
  const [template, setTemplate] = useState<string>("gentle");
  const [channel, setChannel] = useState("push_notification");
  const [customMsg, setCustomMsg] = useState("");
  const [daysBefore, setDaysBefore] = useState("0");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const tmplLabel = (key: string): string => ({
    gentle: t('fees.rem.gentleReminder'),
    due_notice: t('fees.rem.paymentDueNotice'),
    final_notice: t('fees.rem.finalNotice'),
  } as Record<string, string>)[key] ?? key;

  const selected = REMINDER_TEMPLATES.find(tmpl => tmpl.key === template);
  const previewMsg = template === "custom" ? customMsg : (selected?.message ?? "");

  const handleSend = async () => {
    if (template === "custom" && !customMsg.trim()) { toast.error("Please enter a custom message"); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await feeApi.sendFeeReminders({
        daysBefore: parseInt(daysBefore) || 0,
        channel,
        customMessage: template === "custom" ? customMsg : selected?.message,
      });
      const sent   = (res as any).sentSuccessfully ?? (res as any).totalSent ?? 0;
      const failed = (res as any).failed ?? (res as any).errors?.length ?? 0;
      setResult({ sent, failed });
      toast.success(`Reminders sent to ${sent} parent(s)`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to send reminders");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-blue-500" />{t('fees.rem.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{t('fees.rem.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Compose */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t('fees.rem.chooseTemplate')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {REMINDER_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.key}
                  onClick={() => setTemplate(tmpl.key)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${template === tmpl.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                >
                  <span className="text-lg mt-0.5">{tmpl.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{tmplLabel(tmpl.key)}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tmpl.message.substring(0, 90)}…</div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setTemplate("custom")}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${template === "custom" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <span className="text-lg mt-0.5">✏️</span>
                <div>
                  <div className="text-sm font-medium">{t('fees.rem.customMessage')}</div>
                  <div className="text-xs text-muted-foreground">{t('fees.rem.customMessageDesc')}</div>
                </div>
              </button>
              {template === "custom" && (
                <Textarea
                  className="text-sm mt-1"
                  rows={4}
                  placeholder={t('fees.rem.customPlaceholder')}
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t('fees.rem.targetAudience')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fees.rem.sendTo')}</Label>
                <Select value={daysBefore} onValueChange={setDaysBefore}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('fees.rem.allOverdue')}</SelectItem>
                    <SelectItem value="7">{t('fees.rem.due7')}</SelectItem>
                    <SelectItem value="15">{t('fees.rem.due15')}</SelectItem>
                    <SelectItem value="30">{t('fees.rem.due30')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fees.rem.deliveryChannel')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map(ch => (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${channel === ch.value ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}
                    >
                      <span>{ch.icon}</span>{ch.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + Send */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t('fees.rem.preview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground italic border border-dashed min-h-[100px]">
                {previewMsg || t('fees.rem.previewPlaceholder')}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["{{studentName}}", "{{class}}", "{{amount}}", "{{dueDate}}"].map(v => (
                  <span key={v} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">{v}</span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{t('fees.rem.variablesNote')}</p>
            </CardContent>
          </Card>

          {result && (
            <Card className={`border ${result.failed === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
              <CardContent className="p-4">
                <div className={`font-semibold text-sm ${result.failed === 0 ? "text-green-800" : "text-amber-800"}`}>
                  {result.failed === 0 ? t('fees.rem.successTitle') : t('fees.rem.partialTitle')}
                </div>
                <div className="text-sm mt-1 space-x-2 text-muted-foreground">
                  <span className="text-green-700 font-medium">{result.sent} {t('fees.rem.sent')}</span>
                  {result.failed > 0 && <span className="text-red-600 font-medium">· {result.failed} {t('fees.rem.failed')}</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full gap-2"
            disabled={!canManage || sending || (template === "custom" && !customMsg.trim())}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? t('fees.rem.sendingBtn') : t('fees.rem.sendBtn')}
          </Button>
          {!canManage && (
            <p className="text-xs text-center text-muted-foreground">{t('fees.rem.noPermission')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Concessions Tab ─────────────────────────────────────
/** India-standard system defaults; seeded on first use via API */
const SYSTEM_CONCESSION_DEFAULTS = [
  { name: "Merit Scholarship",          description: "Academic merit-based scholarship",                    discountType: "Percentage", discountValue: 25,  requiresDocuments: true,  requiresApproval: true  },
  { name: "RTE 25% (Right to Education)", description: "Govt-mandated RTE free seats for EWS/SC/ST",      discountType: "Percentage", discountValue: 25,  requiresDocuments: true,  requiresApproval: true  },
  { name: "EWS / BPL",                  description: "Economically weaker section / below poverty line",    discountType: "Percentage", discountValue: 50,  requiresDocuments: true,  requiresApproval: true  },
  { name: "SC / ST Category",           description: "State govt directive for SC/ST students",             discountType: "Percentage", discountValue: 50,  requiresDocuments: true,  requiresApproval: true  },
  { name: "OBC",                        description: "Other backward classes concession",                   discountType: "Percentage", discountValue: 25,  requiresDocuments: true,  requiresApproval: true  },
  { name: "Sibling Discount",           description: "2nd child 10%, 3rd+ 20% as per school policy",       discountType: "Percentage", discountValue: 10,  requiresDocuments: false, requiresApproval: false },
  { name: "Staff Ward",                 description: "Ward of school staff — 50–100% as per policy",       discountType: "Percentage", discountValue: 50,  requiresDocuments: false, requiresApproval: true  },
  { name: "Sports Achievement",         description: "National/state-level sports achievers",               discountType: "Percentage", discountValue: 20,  requiresDocuments: true,  requiresApproval: true  },
  { name: "Management Quota",           description: "Special consideration by school management",          discountType: "Percentage", discountValue: 15,  requiresDocuments: false, requiresApproval: true  },
  { name: "Special Need / Disability",  description: "Students with special needs or disabilities",         discountType: "Percentage", discountValue: 30,  requiresDocuments: true,  requiresApproval: true  },
];

const BLANK_CT_FORM = { name: "", description: "", discountType: "Percentage", discountValue: "", maxDiscountAmount: "", requiresDocuments: false, requiresApproval: false };

function ConcessionsTab({ academicYear: _ay }: { academicYear: string }) {
  const { t } = useLanguage();
  const [types, setTypes]       = useState<ConcessionType[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ConcessionType | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seeding, setSeeding]   = useState(false);
  const [form, setForm]         = useState({ ...BLANK_CT_FORM });
  const { hasUserPermission: hasPerm } = usePermissions();
  const canManage = hasPerm('Fees', 'Create');

  const load = async () => {
    setLoading(true);
    try { const loaded = await getConcessionTypes(); setTypes(loaded); return loaded; }
    catch { setTypes([]); return []; }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load().then(async loaded => {
      if (loaded.length === 0) {
        // Auto-seed India standard defaults on first visit — one-by-one so duplicates don't abort the batch
        setSeeding(true);
        let created = 0;
        for (const d of SYSTEM_CONCESSION_DEFAULTS) {
          try { await createConcessionType(d); created++; } catch { /* skip if already exists */ }
        }
        if (created > 0) {
          await load();
          toast.success("Default concession types configured");
        }
        setSeeding(false);
      }
    });
  }, []);

  const openAdd = () => { setForm({ ...BLANK_CT_FORM }); setEditTarget(null); setShowForm(true); };
  const openEdit = (t: ConcessionType) => {
    setForm({ name: t.name, description: t.description ?? "", discountType: t.discountType, discountValue: String(t.discountValue), maxDiscountAmount: String(t.maxDiscountAmount ?? ""), requiresDocuments: t.requiresDocuments, requiresApproval: t.requiresApproval });
    setEditTarget(t); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.discountValue) { toast.error("Discount value is required"); return; }
    setSaving(true);
    try {
      const dto = { name: form.name.trim(), description: form.description || undefined, discountType: form.discountType, discountValue: parseFloat(form.discountValue), maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined, requiresDocuments: form.requiresDocuments, requiresApproval: form.requiresApproval };
      if (editTarget) { await updateConcessionType(editTarget.id, { ...dto, isActive: editTarget.isActive }); toast.success("Updated"); }
      else            { await createConcessionType(dto); toast.success("Concession type added"); }
      setShowForm(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await deleteConcessionType(id); setTypes(prev => prev.filter(t => t.id !== id)); toast.success("Removed"); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to delete"); }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (t: ConcessionType) => {
    try {
      const updated = await updateConcessionType(t.id, { name: t.name, discountType: t.discountType, discountValue: t.discountValue, isActive: !t.isActive });
      setTypes(prev => prev.map(x => x.id === t.id ? updated : x));
    } catch { toast.error("Failed to update status"); }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    // Re-fetch live list to avoid stale state causing false duplicate errors
    let liveTypes: ConcessionType[] = [];
    try { liveTypes = await getConcessionTypes(); } catch { /* ignore */ }
    const existingNames = new Set(liveTypes.map(t => t.name.toLowerCase()));
    const toCreate = SYSTEM_CONCESSION_DEFAULTS.filter(d => !existingNames.has(d.name.toLowerCase()));
    if (!toCreate.length) { toast.info("All defaults already configured"); setSeeding(false); return; }
    // Create one-by-one so a single duplicate doesn't abort the whole batch
    let created = 0;
    for (const d of toCreate) {
      try { await createConcessionType(d); created++; }
      catch { /* skip if duplicate or permission denied */ }
    }
    if (created > 0) { toast.success(`${created} default type(s) added`); await load(); }
    else { toast.warning("No new types added — all may already exist"); }
    setSeeding(false);
  };

  const discountLabel = (t: ConcessionType) => t.discountType === "Fixed" ? inr(t.discountValue) : `${t.discountValue}%`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />{t('fees.con.title')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('fees.con.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackagePlus className="h-3.5 w-3.5" />}
                {t('fees.con.loadDefaults')}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5" />{t('fees.con.addType')}
              </Button>
            </>
          )}
        </div>
      </div>

      {!loading && types.length === 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-sm text-amber-800">
            <div className="font-semibold mb-1">{t('fees.con.noTypesTitle')}</div>
            <div>{t('fees.con.noTypesDesc')}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map(ctype => (
            <Card key={ctype.id} className={`border transition-all ${ctype.isActive ? "" : "opacity-55 bg-muted/30"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ctype.name}</div>
                    {ctype.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ctype.description}</div>}
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[11px] font-medium ${ctype.isActive ? "text-green-700" : "text-gray-400"}`}>
                        {ctype.isActive ? t('fees.con.active') : t('fees.con.inactive')}
                      </span>
                      <Switch
                        checked={ctype.isActive}
                        onCheckedChange={() => handleToggleActive(ctype)}
                        aria-label={ctype.isActive ? `Disable ${ctype.name}` : `Enable ${ctype.name}`}
                      />
                    </div>
                  ) : (
                    <Badge variant="outline" className={ctype.isActive ? "text-green-700 border-green-300 bg-green-50 shrink-0" : "text-gray-400 shrink-0"}>
                      {ctype.isActive ? t('fees.con.active') : t('fees.con.inactive')}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    {discountLabel(ctype)} {ctype.discountType === "Percentage" ? t('fees.con.off') : t('fees.con.fixed')}
                  </span>
                  {ctype.maxDiscountAmount != null && ctype.maxDiscountAmount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border">{t('fees.con.cap')} {inr(ctype.maxDiscountAmount)}</span>
                  )}
                  {ctype.requiresDocuments && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{t('fees.con.docsReq')}</span>}
                  {ctype.requiresApproval  && <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{t('fees.con.approvalReq')}</span>}
                </div>
                {canManage && (
                  <div className="mt-3 flex items-center gap-1.5 pt-2 border-t">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => openEdit(ctype)}>
                      <Pencil className="h-3 w-3" />{t('fees.con.editBtn')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(ctype.id)} disabled={deleting === ctype.id}>
                      {deleting === ctype.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit form dialog */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t('fees.con.dialogEditTitle') : t('fees.con.dialogAddTitle')}</DialogTitle>
            <DialogDescription>
              {editTarget ? t('fees.con.dialogEditDesc') : t('fees.con.dialogAddDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.con.nameLbl')} *</Label>
              <Input className="h-9 text-sm" placeholder="e.g. Sports Achievement" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.con.descLbl')}</Label>
              <Input className="h-9 text-sm" placeholder="Brief eligibility description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.con.discTypeLbl')}</Label>
                <Select value={form.discountType} onValueChange={v => setForm({ ...form, discountType: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">{t('fees.con.percentage')}</SelectItem>
                    <SelectItem value="Fixed">{t('fees.con.fixedAmount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {form.discountType === "Fixed" ? t('fees.con.discValFixedLbl') : t('fees.con.discValLbl')}
                </Label>
                <Input className="h-9 text-sm" type="number" min={0} max={form.discountType === "Percentage" ? 100 : undefined}
                  placeholder={form.discountType === "Fixed" ? "e.g. 5000" : "e.g. 25"}
                  value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t('fees.con.maxCapLbl')}</Label>
              <Input className="h-9 text-sm" type="number" min={0} placeholder="Leave blank for no cap" value={form.maxDiscountAmount} onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })} />
            </div>
            <div className="flex gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.requiresDocuments} onChange={e => setForm({ ...form, requiresDocuments: e.target.checked })} className="rounded" />
                {t('fees.con.requiresDocs')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded" />
                {t('fees.con.requiresApproval')}
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{t('fees.con.cancelBtn')}</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? t('fees.con.savingBtn') : editTarget ? t('fees.con.updateBtn') : t('fees.con.addBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  paid: "#10b981",
  partial: "#f59e0b",
  pending: "#3b82f6",
  overdue: "#ef4444",
};

function ReportsTab({ records, academicYear }: { records: FeeRecord[]; academicYear: string }) {
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const overdue  = records.filter(r => r.status === "overdue");
  const partial  = records.filter(r => r.status === "partial");
  const pending  = records.filter(r => r.status === "pending");
  const paid     = records.filter(r => r.status === "paid");
  const nonPaid  = records.filter(r => r.status !== "paid");

  const totalBilled    = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalCollected = records.reduce((s, r) => s + r.paidAmount, 0);
  const totalPending   = nonPaid.reduce((s, r) => s + r.pendingAmount, 0);
  const totalOverdue   = overdue.reduce((s, r) => s + r.pendingAmount, 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // ── Monthly collection trend ──────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const byMonth: Record<string, { month: string; collected: number; pending: number; overdue: number }> = {};
    records.forEach(r => {
      if (!r.dueDate) return;
      const d = new Date(r.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      if (!byMonth[key]) byMonth[key] = { month: label, collected: 0, pending: 0, overdue: 0 };
      byMonth[key].collected += r.paidAmount;
      byMonth[key].pending   += r.status !== "paid" ? r.pendingAmount : 0;
      byMonth[key].overdue   += r.status === "overdue" ? r.pendingAmount : 0;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [records]);

  // ── Class-wise data ───────────────────────────────────────────────────────
  const classSummary = useMemo(() => {
    const map: Record<string, { collected: number; pending: number; students: Set<string>; total: number }> = {};
    records.forEach(r => {
      const cls = r.class || "Unknown";
      if (!map[cls]) map[cls] = { collected: 0, pending: 0, students: new Set(), total: 0 };
      map[cls].collected += r.paidAmount;
      map[cls].pending   += r.pendingAmount;
      map[cls].total     += r.totalAmount;
      map[cls].students.add(r.studentId);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([cls, d]) => ({ cls, collected: d.collected, pending: d.pending, total: d.total, students: d.students.size }));
  }, [records]);

  // ── Status distribution (pie data) ───────────────────────────────────────
  const statusDist = [
    { label: t('fees.rep.collected'), count: paid.length,    amount: paid.reduce((s, r) => s + r.paidAmount, 0),    color: STATUS_COLORS.paid    },
    { label: t('fees.rep.outstanding'), count: partial.length, amount: partial.reduce((s, r) => s + r.pendingAmount, 0), color: STATUS_COLORS.partial },
    { label: "Pending", count: pending.length, amount: pending.reduce((s, r) => s + r.pendingAmount, 0), color: STATUS_COLORS.pending },
    { label: t('fees.rep.overdue'), count: overdue.length, amount: overdue.reduce((s, r) => s + r.pendingAmount, 0), color: STATUS_COLORS.overdue },
  ];
  const statusPieData = statusDist.filter(d => d.count > 0).map(d => ({ name: d.label, value: d.count, fill: d.color }));

  // ── Fee-structure breakdown ───────────────────────────────────────────────
  const structureBreakdown = useMemo(() => {
    const map: Record<string, { collected: number; pending: number; count: number }> = {};
    records.forEach(r => {
      const key = r.feeStructureName ?? "General";
      if (!map[key]) map[key] = { collected: 0, pending: 0, count: 0 };
      map[key].collected += r.paidAmount;
      map[key].pending   += r.pendingAmount;
      map[key].count     += 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => (b.collected + b.pending) - (a.collected + a.pending))
      .map(([name, d]) => ({ name, ...d }));
  }, [records]);

  // ── Downloads ────────────────────────────────────────────────────────────
  const downloadDefaulters = () => {
    const headers = ["#", "Student Name", "Class", "Total Fee", "Paid", "Balance Due", "Due Date", "Days Overdue"];
    const rows = overdue
      .sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate))
      .map((r, i) => [
        i + 1,
        `"${r.studentName}"`, r.class, r.totalAmount, r.paidAmount, r.pendingAmount,
        r.dueDate, daysOverdue(r.dueDate),
      ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Defaulters_${academicYear}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const downloadClassWise = () => {
    const headers = ["Class", "Students", "Total Billed", "Total Collected", "Total Pending", "Collection %"];
    const rows = classSummary.map(d => {
      const pct = d.total ? Math.round((d.collected / d.total) * 100) : 0;
      return [d.cls, d.students, d.total, d.collected, d.pending, `${pct}%`].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Class_Fee_Summary_${academicYear}.csv`;
    a.click();
  };

  const downloadFeeRegister = () => {
    const headers = ["#", "Student Name", "Class", "Fee Structure", "Total Billed", "Paid", "Discount", "Late Fee", "Balance", "Status", "Due Date", "Last Payment"];
    const rows = records.map((r, i) => [
      i + 1,
      `"${r.studentName}"`, r.class,
      `"${r.feeStructureName ?? "General"}"`,
      r.totalAmount, r.paidAmount, r.discountAmount, r.lateFeeAmount, r.pendingAmount,
      r.status,
      r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-IN") : "",
      r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString("en-IN") : "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Fee_Register_${academicYear}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const sendReminders = async () => {
    setSending(true);
    try {
      await feeApi.sendFeeReminders({ daysBefore: 0, channel: "sms" });
      toast.success(`Reminders sent to ${overdue.length} defaulters`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to send reminders");
    } finally { setSending(false); }
  };

  // ── Recharts formatters ───────────────────────────────────────────────────
  const fmtInr = (v: number) => inr(v);
  const fmtInrTooltip = (v: number, name: string) => [inr(v), name];

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t('fees.rep.totalBilled'),    value: inr(totalBilled),    sub: `${records.length} ${t('fees.rep.records')}`,  color: "text-slate-700",  bg: "bg-slate-50",   border: "border-l-slate-400"  },
          { label: t('fees.rep.collected'),       value: inr(totalCollected), sub: `${paid.length} ${t('fees.rep.fullyPaid')}`,  color: "text-emerald-700",bg: "bg-emerald-50", border: "border-l-emerald-500"},
          { label: t('fees.rep.outstanding'),     value: inr(totalPending),   sub: `${nonPaid.length} ${t('fees.rep.students')}`, color: "text-rose-700",   bg: "bg-rose-50",    border: "border-l-rose-500"   },
          { label: t('fees.rep.overdue'),         value: inr(totalOverdue),   sub: `${overdue.length} ${t('fees.rep.defaulters')}`,color:"text-amber-700",  bg: "bg-amber-50",   border: "border-l-amber-500"  },
          { label: t('fees.rep.collectionRate'),  value: `${collectionRate}%`,sub: t('fees.rep.ofTotalBilled'),                color: collectionRate >= 80 ? "text-emerald-700" : collectionRate >= 60 ? "text-amber-700" : "text-rose-700",
            bg: collectionRate >= 80 ? "bg-emerald-50" : collectionRate >= 60 ? "bg-amber-50" : "bg-rose-50",
            border: collectionRate >= 80 ? "border-l-emerald-500" : collectionRate >= 60 ? "border-l-amber-500" : "border-l-rose-500" },
        ].map(c => (
          <Card key={c.label} className={`border-l-4 ${c.border}`}>
            <CardContent className={`p-4 ${c.bg} rounded-r-lg`}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Collection Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              {t('fees.rep.monthlyTrend')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('fees.rep.monthlyTrendSub')}</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {monthlyTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">{t('fees.rep.noMonthlyData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmtInr} width={70} />
                  <Tooltip formatter={fmtInrTooltip} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" name={t('fees.rep.collected')} fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pending"   name="Pending"   fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="overdue"   name={t('fees.rep.overdue')}   fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              {t('fees.rep.paymentStatus')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{records.length} {t('fees.rep.totalRecords')}</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4 px-4">
            {statusPieData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">{t('fees.rep.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={58} paddingAngle={2} dataKey="value">
                    {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} students`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="w-full mt-1 space-y-1.5">
              {statusDist.map(d => (
                <div key={d.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-muted-foreground">{d.count}</span>
                    <span>{inr(d.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Class-wise Bar Chart ─────────────────────────────────────────── */}
      {classSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              {t('fees.rep.classWise')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('fees.rep.classWiseSub')}</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={Math.max(160, classSummary.length * 28)}>
              <BarChart data={classSummary} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmtInr} />
                <YAxis type="category" dataKey="cls" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={55} />
                <Tooltip formatter={fmtInrTooltip} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="collected" name={t('fees.rep.collected')} fill="#10b981" radius={[0, 3, 3, 0]} />
                <Bar dataKey="pending"   name="Pending"   fill="#f43f5e" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Fee Structure Breakdown ──────────────────────────────────────── */}
      {structureBreakdown.length > 1 && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-violet-600" />
              {t('fees.rep.structureBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {structureBreakdown.map(s => {
              const total = s.collected + s.pending;
              const pct = total > 0 ? Math.round((s.collected / total) * 100) : 0;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[50%]">{s.name}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600 font-semibold">{inr(s.collected)}</span>
                      <span className="text-rose-500">{inr(s.pending)}</span>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Download & Actions ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-600" />
            {t('fees.rep.reportsActions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 h-9" onClick={downloadDefaulters} disabled={!overdue.length}>
              <Download className="h-4 w-4 text-red-500" />
              {t('fees.rep.downloadDefaulters')} ({overdue.length})
            </Button>
            <Button variant="outline" className="gap-2 h-9" onClick={downloadClassWise}>
              <Download className="h-4 w-4 text-blue-500" />
              {t('fees.rep.downloadClassWise')}
            </Button>
            <Button variant="outline" className="gap-2 h-9" onClick={downloadFeeRegister}>
              <Download className="h-4 w-4 text-slate-500" />
              {t('fees.rep.downloadRegister')}
            </Button>
            <Button variant="outline" className="gap-2 h-9" onClick={sendReminders} disabled={sending || !overdue.length}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-amber-500" />}
              {sending ? t('fees.rep.sendingReminders') : `${t('fees.rep.smsReminders')} (${overdue.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Fee Defaulters Table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {t('fees.rep.feeDefaulters')}
              {overdue.length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{overdue.length}</Badge>
              )}
            </CardTitle>
            {overdue.length > 0 && (
              <span className="text-xs text-muted-foreground">{t('fees.rep.totalOutstanding')}: <span className="font-semibold text-red-600">{inr(totalOverdue)}</span></span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {overdue.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-70" />
              <p className="font-semibold text-foreground">{t('fees.rep.noDefaulters')}</p>
              <p className="text-sm mt-1">{t('fees.rep.noDefaultersDesc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-5">{t('fees.rep.colNo')}</TableHead>
                    <TableHead>{t('fees.rep.colStudent')}</TableHead>
                    <TableHead>{t('fees.rep.colClass')}</TableHead>
                    <TableHead className="text-right">{t('fees.rep.colTotalFee')}</TableHead>
                    <TableHead className="text-right">{t('fees.rep.colPaid')}</TableHead>
                    <TableHead className="text-right">{t('fees.rep.colBalance')}</TableHead>
                    <TableHead>{t('fees.rep.colDueDate')}</TableHead>
                    <TableHead>{t('fees.rep.colDaysOverdue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...overdue].sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate)).map((r, idx) => {
                    const days = daysOverdue(r.dueDate);
                    return (
                      <TableRow key={r.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10">
                        <TableCell className="pl-5 text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{r.studentName ?? "—"}</TableCell>
                        <TableCell>{r.class ?? "—"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{inr(r.totalAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{inr(r.paidAmount)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{inr(r.pendingAmount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${days > 90 ? "bg-red-100 text-red-700 border-red-200" : days > 30 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                            {days}d
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Class-wise Summary Table ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            {t('fees.rep.classWiseSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-5">{t('fees.rep.colClass')}</TableHead>
                  <TableHead className="text-right">{t('fees.rep.colStudents')}</TableHead>
                  <TableHead className="text-right">{t('fees.rep.colBilled')}</TableHead>
                  <TableHead className="text-right">{t('fees.rep.colCollected')}</TableHead>
                  <TableHead className="text-right">{t('fees.rep.colPending')}</TableHead>
                  <TableHead className="min-w-[120px]">{t('fees.rep.colProgress')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummary.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('fees.rep.noDataAvailable')}</TableCell></TableRow>
                ) : classSummary.map(d => {
                  const pct = d.total > 0 ? Math.round((d.collected / d.total) * 100) : 0;
                  return (
                    <TableRow key={d.cls}>
                      <TableCell className="pl-5 font-semibold">{d.cls}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.students}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{inr(d.total)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{inr(d.collected)}</TableCell>
                      <TableCell className="text-right text-rose-600">{inr(d.pending)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-10 text-right">{pct}%</span>
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
  const { t } = useLanguage();
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
  if (!aging) return <div className="text-center p-12 text-muted-foreground">{t('fees.aging.noData')}</div>;

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
          <h3 className="font-semibold text-lg">{t('fees.aging.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('fees.aging.subtitle')} · {aging.studentCount} {t('fees.aging.studentsWithDues')}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t('fees.aging.totalOutstanding')}</div>
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
                {aging.totalOutstanding > 0 ? `${Math.round((b.amount / aging.totalOutstanding) * 100)}% ${t('fees.aging.ofTotal')}` : `0% ${t('fees.aging.ofTotal')}`}
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
            {t('fees.aging.distribution')}
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
            <div className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{t('fees.aging.auditNote')}</div>
            <p className="text-xs">{t('fees.aging.auditNoteText')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Audit Trail Tab ─────────────────────────────────────
function AuditTrailTab() {
  const { t } = useLanguage();
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
          <h3 className="font-semibold text-lg">{t('fees.audit.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('fees.audit.subtitle')}</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">{total} {t('fees.audit.entries')}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder={t('fees.audit.allActions')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fees.audit.allActions')}</SelectItem>
            <SelectItem value="PaymentReceived">{t('fees.audit.paymentReceived')}</SelectItem>
            <SelectItem value="ConcessionApproved">{t('fees.audit.concessionApproved')}</SelectItem>
            <SelectItem value="ConcessionRejected">{t('fees.audit.concessionRejected')}</SelectItem>
            <SelectItem value="FeeRecordCreated">{t('fees.audit.feeRecordCreated')}</SelectItem>
            <SelectItem value="LateFeeApplied">{t('fees.audit.lateFeeApplied')}</SelectItem>
            <SelectItem value="RefundProcessed">{t('fees.audit.refundProcessed')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('fees.audit.from')}</Label>
          <Input type="date" className="h-9 text-sm w-40" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('fees.audit.to')}</Label>
          <Input type="date" className="h-9 text-sm w-40" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setActionFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}>
          <RefreshCw className="h-3.5 w-3.5" />{t('fees.audit.clear')}
        </Button>
      </div>

      {/* Logs table */}
      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{t('fees.audit.noEntries')}</p>
          <p className="text-sm mt-1">{t('fees.audit.noEntriesDesc')}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">{t('fees.audit.colTimestamp')}</TableHead>
                <TableHead>{t('fees.audit.colAction')}</TableHead>
                <TableHead>{t('fees.audit.colEntity')}</TableHead>
                <TableHead className="text-right">{t('fees.audit.colAmount')}</TableHead>
                <TableHead>{t('fees.audit.colPerformedBy')}</TableHead>
                <TableHead>{t('fees.audit.colRemarks')}</TableHead>
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
                  <TableCell className="text-sm">{log.performedByName ?? t('fees.audit.system')}</TableCell>
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
          <span className="text-sm text-muted-foreground">{t('fees.audit.page')} {page} {t('fees.audit.of')} {totalPages} ({total} {t('fees.audit.entries')})</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('fees.audit.previous')}</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('fees.audit.next')}</Button>
          </div>
        </div>
      )}

      {/* Audit integrity note */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="text-sm text-green-800 space-y-1">
            <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{t('fees.audit.integrityTitle')}</div>
            <p className="text-xs">{t('fees.audit.integrityText')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Fee Module Page ─────────────────────────────────
export default function Fees() {
  const { t } = useLanguage();
  const { hasUserPermission } = usePermissions();
  const canViewFees    = hasUserPermission('Fees', 'View');
  const canManageFees  = hasUserPermission('Fees', 'Create');
  const canEditFees    = hasUserPermission('Fees', 'Edit');
  const canDeleteFees  = hasUserPermission('Fees', 'Delete');
  const accessDenied   = !canViewFees;

  const { academicYear, availableYears } = useAcademicYear();
  const [collectYear, setCollectYear] = useState<string | null>(null); // null = not yet initialized; "all-years" = show all records
  const [activeTab, setActiveTab] = useState("collect");
  const [feeSetupSubTab, setFeeSetupSubTab] = useState("structure");
  const [analyticsSubTab, setAnalyticsSubTab] = useState("overview");
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [feeRecordsPage, setFeeRecordsPage] = useState(1);
  const [feeRecordsPageSize, setFeeRecordsPageSize] = useState(50);
  const [feeRecordsTotal, setFeeRecordsTotal] = useState(0);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentPaymentsLoading, setRecentPaymentsLoading] = useState(false);

  // Quick Collect
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickRecord, setQuickRecord] = useState<FeeRecord | null>(null);

  const [syncingStudents, setSyncingStudents] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

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

  const uniqueClasses = useMemo(() =>
    Array.from(new Set(records.map(r => r.class))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [records]
  );

  const loadData = useCallback((silent = false, pageOverride?: number) => {
    const activePage = pageOverride ?? feeRecordsPage;
    if (!silent) setLoading(true);
    Promise.all([
      feeApi.getFeeRecords(activePage, feeRecordsPageSize, undefined, undefined, (!collectYear || collectYear === "all-years") ? undefined : collectYear),
      feeApi.getFeeStructures(),
    ]).then(([recordRes, structRes]) => {
      const raw: FeeRecord[] = (recordRes as any).feeRecords ?? (recordRes as any).items ?? (recordRes as any).records ?? [];
      const total: number = (recordRes as any).total ?? raw.length;
      setRecords(raw);
      setFeeRecordsTotal(total);
      setStructures(structRes || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [feeRecordsPage, feeRecordsPageSize, collectYear]);

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

  const loadRecentPayments = () => {
    setRecentPaymentsLoading(true);
    const todayStr = new Date().toISOString().split("T")[0];
    feeApi.getRecentPayments(todayStr)
      .then(data => setRecentPayments(data))
      .catch(() => {})
      .finally(() => setRecentPaymentsLoading(false));
  };

  const downloadReceipt = async (paymentId: string, _receiptNumber?: string) => {
    try {
      const html = await feeApi.generateReceipt(paymentId);
      const win = window.open("", "_blank", "width=860,height=700");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.addEventListener("load", () => { win.focus(); win.print(); });
      } else {
        toast.warning("Pop-up blocked — allow pop-ups for receipts.");
      }
    } catch {
      toast.error("Failed to generate receipt");
    }
  };

  // Sync collectYear with global year on first load only (don't fire loadData with all-years before context resolves)
  useEffect(() => { if (academicYear && !collectYear) setCollectYear(academicYear); }, [academicYear]);
  useEffect(() => { if (!collectYear) return; loadData(); loadStats(); loadRecentPayments(); }, [collectYear]);
  // Re-fetch when page/pageSize changes
  useEffect(() => { if (!collectYear) return; loadData(); }, [feeRecordsPage, feeRecordsPageSize]);

  const filteredRecords = useMemo(() => records.filter(r => {
    const ms = !search || r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (r.studentId ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.admissionNumber ?? "").toLowerCase().includes(search.toLowerCase());
    const mc = filterClass === "all" || r.class === filterClass;
    return ms && mc;
  }), [records, search, filterClass]);

  // Group by student so each student gets ONE row with per-term bubbles
  const groupedStudents = useMemo(() => {
    const map = new Map<string, FeeRecord[]>();
    filteredRecords.forEach(r => {
      if (!map.has(r.studentId)) map.set(r.studentId, []);
      map.get(r.studentId)!.push(r);
    });
    return Array.from(map.entries())
      .map(([studentId, recs]) => {
        const sorted = [...recs].sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        const totalFee     = recs.reduce((s, r) => s + r.totalAmount, 0);
        const totalPaid    = recs.reduce((s, r) => s + r.paidAmount, 0);
        const totalBalance = recs.reduce((s, r) => s + r.pendingAmount, 0);
        const allPaid     = recs.every(r => r.status === "paid");
        const anyOverdue  = recs.some(r => r.status === "overdue");
        const anyPartial  = recs.some(r => r.paidAmount > 0 && r.status !== "paid");
        const overallStatus = allPaid ? "paid" : anyOverdue ? "overdue" : anyPartial ? "partial" : "pending";
        return {
          studentId,
          studentName: recs[0].studentName,
          admissionNumber: recs[0].admissionNumber ?? "",
          class: recs[0].class,
          records: sorted,
          totalFee, totalPaid, totalBalance, overallStatus,
        };
      })
      .filter(g => filterStatus === "all" || g.overallStatus === filterStatus)
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredRecords, filterStatus]);

  const todayCollected = useMemo(() =>
    recentPayments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
    [recentPayments]
  );

  const kpiCards = [
    { label: t('fees.kpi.todayCollection'), value: inr(todayCollected), sub: t('fees.kpi.todayCollectionSub'), color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30", icon: <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" /> },
    { label: t('fees.kpi.totalCollected'), value: inr(stats.totalCollected), sub: t('fees.kpi.totalCollectedSub'), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", icon: <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" /> },
    { label: t('fees.totalPending'), value: inr(stats.totalPending), sub: t('fees.kpi.totalPendingSub'), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" /> },
    { label: t('fees.overdue'), value: inr(stats.totalOverdue), sub: `${records.filter(r => r.status === "overdue").length} ${t('fees.nStudents')}`, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", icon: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /> },
    { label: t('fees.kpi.collectionRateLabel'), value: `${isNaN(stats.collectionRate) || !isFinite(stats.collectionRate) ? 0 : Math.round(stats.collectionRate)}%`, sub: t('fees.kpi.collectionRateSub'), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", icon: <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" /> },
  ];

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <ShieldOff className="h-12 w-12" />
        <div className="text-center">
          <p className="text-lg font-semibold">{t('fees.accessDenied')}</p>
          <p className="text-sm">{t('fees.accessDeniedSubtitle')}</p>
        </div>
      </div>
    );
  }

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
            {canManageFees ? t('fees.subtitleManage') : t('fees.subtitleView')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => loadData()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{t('fees.btnRefresh')}
          </Button>
          {canManageFees && (
            <Button
              variant="outline" size="sm" className="gap-1.5"
              disabled={syncingStudents}
              onClick={async () => {
                setSyncingStudents(true);
                try {
                  const result = await syncStudentFeeRecords(collectYear && collectYear !== "all-years" ? collectYear : undefined);
                  toast.success(`Sync complete — ${result.created} student(s) added to fees, ${result.skipped} already enrolled.`);
                  if (result.created > 0) loadData();
                } catch {
                  toast.error("Failed to sync students into fees.");
                } finally {
                  setSyncingStudents(false);
                }
              }}
            >
              <Users className={`h-3.5 w-3.5 ${syncingStudents ? "animate-pulse" : ""}`} />
              {syncingStudents ? "Syncing…" : "Sync All Students"}
            </Button>
          )}
          {canManageFees && (
            <Button
              variant="outline" size="sm" className="gap-1.5"
              disabled={recalculating}
              onClick={async () => {
                setRecalculating(true);
                try {
                  const result = await recalculateFeeTotals();
                  toast.success(`Recalculate complete — ${result.fixed_} record(s) corrected, ${result.skipped} already accurate.`);
                  if (result.fixed_ > 0) loadData();
                } catch {
                  toast.error("Failed to recalculate fee totals.");
                } finally {
                  setRecalculating(false);
                }
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
              {recalculating ? "Recalculating…" : "Recalculate Totals"}
            </Button>
          )}
          {canManageFees && (
            <Button size="sm" className="gap-1.5" onClick={() => { setQuickSearch(""); setQuickRecord(null); setQuickOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />{t('fees.quickCollect')}
            </Button>
          )}
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
                {statsLoading && k.label !== t('fees.kpi.todayCollection') ? <span className="text-muted-foreground text-base">—</span> : k.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="collect" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <Receipt className="h-4 w-4" /><span>{t('fees.collectFee')}</span>
          </TabsTrigger>
          <TabsTrigger value="fee-setup" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <Building2 className="h-4 w-4" /><span>Fee Setup</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
            <BarChart3 className="h-4 w-4" /><span>Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Collect Fees Tab (Student Dues) ──────────────── */}
        <TabsContent value="collect" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder={t('fees.searchByNameOrAdmission')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Academic year filter — "all-years" shows every record */}
            <Select value={collectYear ?? ""} onValueChange={setCollectYear}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder={t('fees.allYears')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-years">{t('fees.allYears')}</SelectItem>
                {availableYears.map(y => <SelectItem key={y.id} value={y.name}>{y.name}{y.isCurrent ? " ✓" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder={t('fees.allClasses')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fees.allClasses')}</SelectItem>
                {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder={t('fees.allStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fees.allStatus')}</SelectItem>
                <SelectItem value="paid">{t('fees.paid')}</SelectItem>
                <SelectItem value="partial">{t('fees.partial')}</SelectItem>
                <SelectItem value="pending">{t('fees.pendingStatus')}</SelectItem>
                <SelectItem value="overdue">{t('fees.overdue')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : groupedStudents.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed rounded-xl">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="font-semibold text-muted-foreground">
                {records.length === 0 ? t('fees.noFeeRecordsYet') : t('fees.noStudentsMatchFilter')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t('fees.noFeeRecordsDesc')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{groupedStudents.length} {t('fees.nStudents')}</p>
              <div className="rounded-xl overflow-hidden border border-border dark:border-slate-700 shadow-sm bg-card dark:text-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-slate-800 dark:border-b-slate-600 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">{t('fees.colStudent')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('fees.class')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">{t('fees.totalAmount')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">{t('fees.paidAmount')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">{t('fees.balanceAmount')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('fees.colTerms')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">{t('fees.colAction')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:[&>tr]:border-slate-600/70">
                    {groupedStudents.map(g => {
                      const isExpanded = expandedRow === g.studentId;
                      const firstPendingRecord = g.records.find(r => r.status !== "paid");
                      // Compute next due/upcoming term for the action button label
                      const actionStruct = structures.find(s => s.id === g.records[0]?.feeStructureId);
                      const actionSched = parseSchedule(actionStruct?.installmentDueDates);
                      const actionTodayStr = new Date().toISOString().split("T")[0];
                      const actionNextTerm = actionSched.length > 1 ? (() => {
                        const stats = computeTermStatuses(actionSched, g.totalPaid);
                        const next = stats.find(s => s.status !== "paid");
                        if (!next) return null;
                        const ni = stats.indexOf(next);
                        return { label: normalizeTermName(next.term.name, ni), isUpcoming: next.term.dueDate > actionTodayStr };
                      })() : null;
                      const maxOverdueDays = g.records
                        .filter(r => r.status === "overdue")
                        .reduce((max, r) => Math.max(max, daysOverdue(r.dueDate)), 0);
                      return (
                        <Fragment key={g.studentId}>
                          {/* ── Student Summary Row ── */}
                          <TableRow
                            className={`cursor-pointer hover:bg-muted/30 dark:hover:bg-slate-700/40 dark:border-slate-600/70 transition-colors ${isExpanded ? "bg-blue-50/40 dark:bg-blue-950/30 border-b-0" : ""}`}
                            onClick={() => setExpandedRow(isExpanded ? null : g.studentId)}
                          >
                            {/* Student name + admission number */}
                            <TableCell>
                              <div className="font-semibold text-sm leading-tight dark:text-white">{g.studentName}</div>
                              {g.admissionNumber ? (
                                <div className="text-xs text-muted-foreground dark:text-slate-400 font-mono mt-0.5 tracking-wide">{g.admissionNumber}</div>
                              ) : (
                                <div className="text-xs text-muted-foreground/40 mt-0.5 italic">No adm. no.</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm dark:text-slate-200">{g.class ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium text-sm dark:text-slate-200">{inr(g.totalFee)}</TableCell>
                            <TableCell className="text-right font-medium text-sm text-green-600 dark:text-green-400">{inr(g.totalPaid)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {g.totalBalance > 0
                                ? <span className="font-bold text-red-600 dark:text-red-400">{inr(g.totalBalance)}</span>
                                : <span className="text-green-600 dark:text-green-400 font-medium">{t('fees.nil')}</span>
                              }
                              {maxOverdueDays > 0 && (
                                <div className="text-[10px] text-red-500 dark:text-red-400 font-medium">{maxOverdueDays}{t('fees.daysOverdue')}</div>
                              )}
                            </TableCell>
                            {/* Term bubbles — use rich schedule from fee structure when available */}
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(() => {
                                  const rec0 = g.records[0];
                                  const struct = structures.find(s => s.id === rec0?.feeStructureId);
                                  const sched = parseSchedule(struct?.installmentDueDates);
                                  const today = new Date(); today.setHours(0,0,0,0);

                                  if (sched.length > 1) {
                                    // Compute per-term status from cumulative paid amount
                                    let cumulative = 0;
                                    const paid = g.totalPaid;
                                    return sched.map(term => {
                                      const termCumul = cumulative + term.amount;
                                      let tStatus: string;
                                      if (paid >= termCumul) tStatus = "paid";
                                      else if (paid > cumulative) tStatus = "partial";
                                      else if (term.dueDate && new Date(term.dueDate) < today) tStatus = "overdue";
                                      else tStatus = "pending";
                                      cumulative = termCumul;
                                      return (
                                        <div key={term.termNumber} className="relative group/bubble flex flex-col items-center gap-0.5">
                                          <div className={`w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 ${termDotColor(tStatus)} ${termDotRing(tStatus)} transition-transform group-hover/bubble:scale-125`} />
                                          {sched.length <= 4 && (
                                            <span className="text-[9px] text-muted-foreground font-medium leading-none">{normalizeTermName(term.name, sched.indexOf(term))}</span>
                                          )}
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                            <div className="font-semibold">{normalizeTermName(term.name, sched.indexOf(term))}</div>
                                            <div>{inr(term.amount)} · {statusConfig[tStatus]?.label ?? tStatus}</div>
                                            {term.dueDate && <div className="text-gray-400 text-[10px]">Due {new Date(term.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div>}
                                          </div>
                                        </div>
                                      );
                                    });
                                  }

                                  // Fallback: one bubble per fee record
                                  return g.records.map((r, idx) => (
                                    <div key={r.id} className="relative group/bubble flex flex-col items-center gap-0.5">
                                      <div className={`w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 ${termDotColor(r.status)} ${termDotRing(r.status)} transition-transform group-hover/bubble:scale-125`} />
                                      {g.records.length <= 4 && (
                                        <span className="text-[9px] text-muted-foreground font-medium leading-none">
                                          {getTermLabel(g.records.length, idx)}
                                        </span>
                                      )}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                        <div className="font-semibold">{getTermLabel(g.records.length, idx)}</div>
                                        <div>{inr(r.totalAmount)} · {statusConfig[r.status]?.label ?? r.status}</div>
                                        <div className="text-gray-400 text-[10px]">Due {new Date(r.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </TableCell>
                            {/* Action button */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {g.overallStatus === "paid" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                                    onClick={e => { e.stopPropagation(); setSelectedRecord(g.records[g.records.length - 1]); setPayDialogOpen(true); }}
                                  >
                                    <Eye className="h-3 w-3" />
                                    {t('fees.viewSummary')}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className={`h-7 text-xs gap-1 ${actionNextTerm?.isUpcoming ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                                    onClick={e => { e.stopPropagation(); setSelectedRecord(firstPendingRecord ?? g.records[0]); setPayDialogOpen(true); }}
                                  >
                                    {actionNextTerm?.isUpcoming
                                      ? <CreditCard className="h-3 w-3" />
                                      : <IndianRupee className="h-3 w-3" />}
                                    {canManageFees
                                      ? actionNextTerm
                                        ? actionNextTerm.isUpcoming
                                          ? `${t('fees.advancePayment')} — ${actionNextTerm.label}`
                                          : `${t('fees.collect')} ${actionNextTerm.label}`
                                        : t('fees.collect')
                                      : t('fees.viewBtn')}
                                  </Button>
                                )}
                                {isExpanded
                                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                }
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* ── Expanded: Term-wise history ── */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/60 dark:bg-slate-800/60 dark:border-slate-600/70 hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                              <TableCell colSpan={7} className="px-4 py-4">
                                <div className="space-y-3">
                                  {g.records.map((r, idx) => {
                                    // Use term name from fee structure schedule if available
                                    const struct = structures.find(s => s.id === r.feeStructureId);
                                    const sched = parseSchedule(struct?.installmentDueDates);
                                    const tLabel = sched.length > 0 && sched[idx]
                                      ? normalizeTermName(sched[idx].name, idx)
                                      : getTermLabel(g.records.length, idx);
                                    // Compute per-term status from schedule; fall back to fee record status
                                    const termStats = sched.length > 0 ? computeTermStatuses(sched, r.paidAmount) : null;
                                    const rawTermStatus = termStats?.[idx]?.status ?? r.status;
                                    // Map computeTermStatuses output ("due"/"upcoming") to statusConfig keys
                                    const computedStatus = rawTermStatus === "due" ? "overdue" : rawTermStatus === "upcoming" ? "pending" : rawTermStatus;
                                    // Next unpaid term (for "Advance" / "Collect next" button when this term is settled)
                                    const todayRowStr = new Date().toISOString().split("T")[0];
                                    const nextDueTerm = termStats ? (() => {
                                      const next = termStats.find(ts => ts.status !== "paid");
                                      if (!next) return null;
                                      const ni = termStats.indexOf(next);
                                      return { label: normalizeTermName(next.term.name, ni), isUpcoming: next.term.dueDate > todayRowStr, remaining: next.remaining };
                                    })() : null;
                                    const sc = statusConfig[computedStatus] ?? statusConfig.pending;
                                    const headerBg = computedStatus === "paid" ? "bg-green-50 border-green-100" : computedStatus === "overdue" ? "bg-red-50 border-red-100" : computedStatus === "partial" ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100";
                                    // Show the term's own amount from schedule (not the whole fee record total)
                                    const termAmount = termStats?.[idx]?.term.amount ?? r.totalAmount;
                                    const termDueDate = sched[idx]?.dueDate ? new Date(sched[idx].dueDate) : new Date(r.dueDate);
                                    return (
                                      <div key={r.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                        {/* Term header */}
                                        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerBg}`}>
                                          <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${termDotColor(computedStatus)}`} />
                                            <span className="font-bold text-sm">{tLabel}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>Due: {termDueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            <span className="font-semibold text-foreground">{inr(termAmount)}</span>
                                          </div>
                                        </div>
                                        {/* Term body */}
                                        <div className="px-4 py-3 space-y-3">
                                          {/* Stats chips */}
                                          <div className="flex flex-wrap gap-4 text-sm">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-muted-foreground text-xs">{t('fees.totalAmount')}</span>
                                              <span className="font-semibold">{inr(r.totalAmount)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-muted-foreground text-xs">{t('fees.paidAmount')}</span>
                                              <span className="font-semibold text-green-600">{inr(r.paidAmount)}</span>
                                            </div>
                                            {r.discountAmount > 0 && (
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-muted-foreground text-xs">{t('fees.concession')}</span>
                                                <span className="font-semibold text-blue-600">−{inr(r.discountAmount)}</span>
                                              </div>
                                            )}
                                            {r.lateFeeAmount > 0 && (
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-muted-foreground text-xs">{t('fees.lateFee')}</span>
                                                <span className="font-semibold text-amber-600">+{inr(r.lateFeeAmount)}</span>
                                              </div>
                                            )}
                                            {r.pendingAmount > 0 && (
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-muted-foreground text-xs">{t('fees.balanceAmount')}</span>
                                                <span className="font-bold text-red-600">{inr(r.pendingAmount)}</span>
                                              </div>
                                            )}
                                          </div>
                                          {/* Payment history */}
                                          {r.payments && r.payments.length > 0 ? (
                                            <div>
                                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('fees.paymentHistory')}</div>
                                              <div className="space-y-1.5">
                                                {r.payments.map(p => (
                                                  <div key={p.id} className="flex items-center justify-between bg-green-50/70 border border-green-100 rounded-lg px-3 py-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                                      <span className="font-medium">{new Date(p.date ?? p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                                      <span className="text-muted-foreground">·</span>
                                                      <span className="text-muted-foreground uppercase text-xs font-medium">{p.method}</span>
                                                      {p.receiptNumber && <span className="text-muted-foreground text-xs">#{p.receiptNumber}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-green-700 text-sm">{inr(p.amount)}</span>
                                                      <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); downloadReceipt(p.id, p.receiptNumber); }}
                                                        className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md px-2 py-1 transition-colors font-medium"
                                                      >
                                                        <Printer className="h-3 w-3" />
                                                        Receipt
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-muted-foreground italic py-1">
                                              {r.status === "paid" ? t('fees.paymentRecorded') : t('fees.noPaymentsYet')}
                                            </div>
                                          )}
                                          {/* Term payment CTA */}
                                          {canManageFees && (r.pendingAmount > 0) && (
                                            <div className="flex items-center justify-between pt-2 border-t">
                                              {computedStatus === "paid" ? (
                                                /* This term is settled — prompt for the next unpaid term */
                                                <>
                                                  <span className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                    {tLabel} settled
                                                  </span>
                                                  <div className="flex items-center gap-2">
                                                    <Button
                                                      size="sm" variant="outline"
                                                      className="h-7 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                                                      onClick={e => { e.stopPropagation(); setSelectedRecord(r); setPayDialogOpen(true); }}
                                                    >
                                                      <Eye className="h-3 w-3" /> {t('fees.viewBtn')}
                                                    </Button>
                                                    {nextDueTerm && (
                                                      <Button
                                                        size="sm"
                                                        className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={e => { e.stopPropagation(); setSelectedRecord(r); setPayDialogOpen(true); }}
                                                      >
                                                        <CreditCard className="h-3 w-3" />
                                                    {nextDueTerm.isUpcoming ? `${t('fees.advancePayment')} — ${nextDueTerm.label}` : `${t('fees.collect')} ${nextDueTerm.label}`}
                                                      </Button>
                                                    )}
                                                  </div>
                                                </>
                                              ) : (
                                                /* Term is due / partial — standard collect */
                                                <>
                                                  <span className="text-xs text-muted-foreground">
                                                    {t('fees.outstanding')}: <span className="text-red-600 font-bold">{inr(r.pendingAmount)}</span>
                                                  </span>
                                                  <Button
                                                    size="sm" className="h-7 text-xs gap-1.5"
                                                    onClick={e => { e.stopPropagation(); setSelectedRecord(r); setPayDialogOpen(true); }}
                                                  >
                                                    <IndianRupee className="h-3 w-3" />
                                                    {t('fees.collect')} {tLabel}
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t">
                <AdvancedPagination
                  currentPage={feeRecordsPage}
                  pageSize={feeRecordsPageSize}
                  totalItems={feeRecordsTotal}
                  onPageChange={(p) => { setFeeRecordsPage(p); }}
                  onPageSizeChange={(s) => { setFeeRecordsPageSize(s); setFeeRecordsPage(1); }}
                  pageSizeOptions={[25, 50, 100, 200]}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Fee Setup Group ──────────────────────────────── */}
        <TabsContent value="fee-setup" className="mt-4">
          <Tabs value={feeSetupSubTab} onValueChange={setFeeSetupSubTab}>
            <TabsList className="grid w-full grid-cols-4 h-auto mb-1">
              <TabsTrigger value="structure" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Building2 className="h-4 w-4" /><span>{t('fees.feeStructure')}</span>
              </TabsTrigger>
              <TabsTrigger value="feetypes" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Tags className="h-4 w-4" /><span>Fee Types</span>
              </TabsTrigger>
              <TabsTrigger value="reminders" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <BellRing className="h-4 w-4" /><span>{t('fees.tabs.reminders')}</span>
              </TabsTrigger>
              <TabsTrigger value="concessions" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Tag className="h-4 w-4" /><span>{t('fees.concession')}</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Fee Structure Sub-Tab ── */}
            <TabsContent value="structure" className="mt-4">
              {canManageFees && (
                <div className="flex justify-end items-center gap-2 mb-3">
                  <PromoteFeesDialog structures={structures} onPromoted={() => loadData(true)} />
                </div>
              )}
              <FeeStructureTab academicYear={academicYear ?? ""} />
            </TabsContent>

            {/* ── Fee Types Sub-Tab ── */}
            <TabsContent value="feetypes" className="mt-4">
              <FeeHeadsManager />
            </TabsContent>

            {/* ── Reminders Sub-Tab ── */}
            <TabsContent value="reminders" className="mt-4">
              <RemindersTab canManage={canManageFees} />
            </TabsContent>

            {/* ── Concessions Sub-Tab ── */}
            <TabsContent value="concessions" className="mt-4">
              <ConcessionsTab academicYear={academicYear ?? ""} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Reports Group ─────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-4">
          <Tabs value={analyticsSubTab} onValueChange={setAnalyticsSubTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto mb-1">
              <TabsTrigger value="overview" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <CalendarDays className="h-4 w-4" /><span>{t('fees.tabs.daySummary')}</span>
              </TabsTrigger>
              <TabsTrigger value="defaulters" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <AlertTriangle className="h-4 w-4" /><span>{t('fees.tabs.defaulters')}</span>
              </TabsTrigger>
              <TabsTrigger value="bulkpayment" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Upload className="h-4 w-4" /><span>{t('fees.tabs.bulkUpload')}</span>
              </TabsTrigger>
              <TabsTrigger value="receipttemplates" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <FileText className="h-4 w-4" /><span>{t('fees.tabs.receipts')}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <BarChart3 className="h-4 w-4" /><span>{t('fees.tabs.reports')}</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Day Summary Sub-Tab ── */}
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <CalendarDays className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">{t('fees.daySummaryToday')} </span>
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>

                {/* Recent payments */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('fees.recentPayments')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentPaymentsLoading ? (
                      <div className="text-center p-8 text-muted-foreground text-sm">Loading...</div>
                    ) : recentPayments.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground text-sm">{t('fees.noPaymentsFound')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('fees.colStudent')}</TableHead>
                              <TableHead>{t('fees.class')}</TableHead>
                              <TableHead>{t('fees.colMethod')}</TableHead>
                              <TableHead className="text-right">{t('fees.totalAmount')}</TableHead>
                              <TableHead>{t('fees.colDate')}</TableHead>
                              <TableHead>{t('fees.colReceipt')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentPayments.map((p: any, i: number) => (
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
                            ))}
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

            {/* ── Defaulters Sub-Tab ── */}
            <TabsContent value="defaulters" className="mt-4">
              <DefaultersTab canManage={canManageFees} />
            </TabsContent>

            {/* ── Bulk Upload Sub-Tab ── */}
            <TabsContent value="bulkpayment" className="mt-4">
              <BulkFeePaymentUpload />
            </TabsContent>

            {/* ── Receipts Sub-Tab ── */}
            <TabsContent value="receipttemplates" className="mt-4">
              <ReceiptTemplateManager />
            </TabsContent>

            {/* ── Reports Sub-Tab ── */}
            <TabsContent value="reports" className="mt-4">
              <ReportsTab records={records} academicYear={academicYear ?? ""} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>



      {/* ── Collect Payment Dialog ─────────────────────────── */}
      <CollectPaymentDialog
        open={payDialogOpen}
        onClose={() => setPayDialogOpen(false)}
        record={selectedRecord}
        onSuccess={() => { loadData(true); loadStats(); loadRecentPayments(); }}
        structures={structures}
      />

      {/* ── Quick Collect Dialog ─────────────────────────────── */}
      <Dialog open={quickOpen} onOpenChange={v => { if (!v) { setQuickOpen(false); setQuickRecord(null); setQuickSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              {t('fees.quickCollect')}
            </DialogTitle>
            <DialogDescription>{t('fees.quickCollectDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!quickRecord ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    className="pl-9 h-10"
                    placeholder={t('fees.typeToSearch')}
                    value={quickSearch}
                    onChange={e => setQuickSearch(e.target.value)}
                  />
                </div>
                {quickSearch.length >= 2 && (
                  quickMatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('fees.noRecordsForSearch').replace('{query}', quickSearch)}
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
                    {t('fees.typeToSearch')}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sibling Discount Dialog ─────────────────────────── */}
      {/* REMOVED: Sibling discount is now embedded inside the Collect Payment dialog */}
    </div>
  );
}
