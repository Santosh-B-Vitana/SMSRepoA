
import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  IndianRupee, Users, AlertTriangle, TrendingUp, Receipt, Search,
  Plus, Download, RefreshCw, CheckCircle2, Clock, XCircle,
  Printer, Tag, BarChart3, Loader2, Calendar, Building2,
  QrCode, ChevronDown, ChevronUp, Send, Pencil, Trash2,
  FileText, CalendarDays, CreditCard, Banknote, Filter, Link2, PackagePlus,
  Tags, Upload, ShieldOff, Check, BellRing, Eye, Wand2, X, GraduationCap, ArrowLeft, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { feeApi, FeeRecord, FeeStructure, CreateFeeStructureDto, TermSchedule, AgingBucket, FeeAuditLogEntry, InvoiceBreakdown, getSchoolAging, getAuditTrail, getInvoice, bulkAssignStructure, addExtraCharges, editPayment, linkStructure, updateFeeRecord, patchModuleFees, getFeeRecordById, ConcessionType, getConcessionTypes, createConcessionType, updateConcessionType, deleteConcessionType, applyFeeHeadOverrides, removeDiscount, syncStudentFeeRecords, recalculateFeeTotals, getLinkedClasses, linkClass, unlinkClass, ClassFeeStructureLink, getStructureComponents, setStructureComponents, updateStructureLineItems, assignClassesToStructure, getAssignedClasses, FeeHead, FeeStructureComponent, toggleStructureActive, FeeConcessionRecord, getSchoolConcessions, approveConcession, rejectConcession, FeeTerm, getFeeHeads, getFeeTerms } from "@/services/api/feeApi";
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
import { FeeTermsManager } from "@/components/fees/FeeTermsManager";
import { ReceiptTemplateManager } from "@/components/fees/ReceiptTemplateManager";
import { BulkFeePaymentUpload } from "@/components/fees/BulkFeePaymentUpload";
import { PromoteFeesDialog } from "@/components/fees/PromoteFeesDialog";
import { FeeReminderManager } from "@/components/fees/FeeReminderManager";
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

const FREQ_OPTIONS = [
  { value: "termly",     label: "Every Installment",          description: "Billed in each installment (default)" },
  { value: "once",       label: "One-time",                    description: "Charged in the 1st installment only" },
  { value: "halfYearly", label: "Twice a Year",               description: "Charged in 2 installments per year" },
  { value: "quarterly",  label: "Quarterly (4×/year)",        description: "Charged in 4 installments per year" },
  { value: "monthly",    label: "Monthly (12×/year)",         description: "Charged every month" },
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
 * Parse installment schedule data from string or array format.
 * Returns a TermSchedule array, or an empty array if parsing fails.
 */
function parseSchedule(installmentDueDates: any): TermSchedule[] {
  if (!installmentDueDates) return [];
  try {
    // If it's already an array, return it
    if (Array.isArray(installmentDueDates)) return installmentDueDates;
    // If it's a string, parse it
    if (typeof installmentDueDates === "string") {
      const parsed = JSON.parse(installmentDueDates);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    console.warn("Failed to parse installment schedule:", installmentDueDates);
    return [];
  }
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
                                }
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type…" /></SelectTrigger>
                              <SelectContent>
                                {apiConcessionTypes.length > 0
                                  ? apiConcessionTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                  : <SelectItem value="__no_types__" disabled>No concession types configured</SelectItem>
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
                            {/* Sibling cards with installment breakdown — one card per student */}
                            <div className="space-y-3">
                              {Object.values(
                                siblings.reduce((acc: Record<string, any>, sib: any) => {
                                  if (!acc[sib.studentId]) {
                                    acc[sib.studentId] = { ...sib };
                                  } else {
                                    // Merge additional fee records: sum financials, keep isAnchor
                                    acc[sib.studentId].totalFee = (acc[sib.studentId].totalFee ?? 0) + (sib.totalFee ?? 0);
                                    acc[sib.studentId].paidAmount = (acc[sib.studentId].paidAmount ?? 0) + (sib.paidAmount ?? 0);
                                    acc[sib.studentId].pendingAmount = (acc[sib.studentId].pendingAmount ?? 0) + (sib.pendingAmount ?? 0);
                                    acc[sib.studentId].discountAmount = (acc[sib.studentId].discountAmount ?? 0) + (sib.discountAmount ?? 0);
                                  }
                                  return acc;
                                }, {})
                              ).map((sib: any) => (
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

// ─── Concessions Tab ─────────────────────────────────────
function ConcessionsTab({ academicYear }: { academicYear: string }) {
  const { t } = useLanguage();
  const [types, setTypes] = useState<ConcessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ConcessionType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", discountValue: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getConcessionTypes();
      setTypes(res ?? []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load concessions");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", description: "", discountValue: "" });
    setShowForm(true);
  };

  const openEdit = (ct: ConcessionType) => {
    setEditTarget(ct);
    setForm({ name: ct.name, description: ct.description || "", discountValue: String(ct.discountValue) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.discountValue) { toast.error("Discount percentage is required"); return; }
    setSaving(true);
    try {
      const dto = { name: form.name.trim(), description: form.description || undefined, discountType: "Percentage", discountValue: parseFloat(form.discountValue) };
      if (editTarget) { await updateConcessionType(editTarget.id, { ...dto, isActive: editTarget.isActive }); toast.success("Updated"); }
      else            { await createConcessionType(dto); toast.success("Concession added"); }
      setShowForm(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this concession type?")) return;
    setDeleting(id);
    try {
      await deleteConcessionType(id);
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete");
    }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (ct: ConcessionType) => {
    try {
      await updateConcessionType(ct.id, { ...ct, isActive: !ct.isActive });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Concessions
            </CardTitle>
            <CardDescription>Manage concession types and percentages</CardDescription>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Concession
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No concessions yet. Add one to get started.</TableCell></TableRow>
              )}
              {types.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{t.discountValue}%</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Concession" : "Add Concession"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Update concession details" : "Create a new concession type"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Name *</Label>
              <Input className="h-9 text-sm" placeholder="e.g. Merit Scholarship" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Description</Label>
              <Input className="h-9 text-sm" placeholder="Brief description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Discount Value (%) *</Label>
              <Input className="h-9 text-sm" type="number" min={0} max={100} placeholder="e.g. 25" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Saving..." : editTarget ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Fee Structure Tab (Simplified Composition Model) ──
// Line item type for fee structure composition
interface FeeStructureLineItem {
  id?: string; // temporary ID for unsaved items
  feeTypeId: string;
  feeTypeName?: string;
  feeTermId: string;
  feeTermName?: string;
  amount: number;
}

function FeeStructureTab({ academicYear }: { academicYear: string }) {
  const { t } = useLanguage();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeStructure | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CreateFeeStructureDto & { description?: string }>>({});
  
  // Line items management
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<FeeStructureLineItem[]>([]);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<FeeStructureLineItem | null>(null);
  const [lineItemForm, setLineItemForm] = useState<Omit<FeeStructureLineItem, 'id'>>({ feeTypeId: "", feeTermId: "", amount: 0 });
  
  // View structure dialog (read-only)
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewTarget, setViewTarget] = useState<FeeStructure | null>(null);
  const [viewLineItems, setViewLineItems] = useState<FeeStructureLineItem[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  
  // Class assignment management
  const [showAssignClassesModal, setShowAssignClassesModal] = useState(false);
  const [assigningStructureId, setAssigningStructureId] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; standard: string; section: string }[]>([]);
  const [structureClassAssignments, setStructureClassAssignments] = useState<Record<string, string[]>>({});
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [classTakenByStructure, setClassTakenByStructure] = useState<Record<string, { structureId: string; structureName: string; currentNames: string[] }>>({})
  
  // Dropdowns
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [feeTerms, setFeeTerms] = useState<FeeTerm[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [res, heads, terms] = await Promise.all([
        feeApi.getFeeStructures(undefined, academicYear),
        getFeeHeads(),
        getFeeTerms(),
      ]);
      setStructures(res ?? []);
      setFeeHeads(heads);
      setFeeTerms(terms);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load structures");
    }
    finally { setLoading(false); }
  };

  const loadClasses = async () => {
    try {
      const res = await academicApi.listClasses(1, 100);
      const classes = res.classes || [];
      setAvailableClasses(
        classes.map(c => ({
          id: c.id,
          name: c.name || `${c.standard}${c.section ? `-${c.section}` : ""}`,
          standard: c.standard,
          section: c.section || "",
        }))
      );
    } catch (e: any) {
      console.error("Failed to load classes", e);
    }
  };

  useEffect(() => { load(); loadClasses(); }, [academicYear]);

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Structure name is required"); return; }
    setSaving(true);
    try {
      const payload: CreateFeeStructureDto = {
        name: form.name!,
        academicYear: form.academicYear || academicYear,
      };
      let structureId: string;
      if (editTarget) {
        await feeApi.updateFeeStructure(editTarget.id, payload);
        structureId = editTarget.id;
      } else {
        const created = await feeApi.createFeeStructure(payload);
        structureId = created.id;
      }
      // Persist line items
      if (lineItems.length > 0) {
        await updateStructureLineItems(structureId, lineItems.map(item => ({
          feeHeadId: item.feeTypeId,
          feeTermId: item.feeTermId || undefined,
          amount: item.amount,
        })));
      }
      toast.success(editTarget ? "Structure updated" : "Structure created");
      setShowForm(false);
      load();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = data?.message
        ?? (data?.errors ? Object.values(data.errors as Record<string, string[]>).flat().join("; ") : null)
        ?? data?.title
        ?? "Failed to save";
      toast.error(msg);
    }
    finally { setSaving(false); }
  };

  const openLineItems = async (structure: FeeStructure) => {
    setEditingStructureId(structure.id);
    setLineItems([]);
    setLineItemForm({ feeTypeId: "", feeTermId: "", amount: 0 });
    try {
      const components = await getStructureComponents(structure.id);
      setLineItems(components.map(c => ({
        id: c.id,
        feeTypeId: c.feeHeadId,
        feeTypeName: c.feeHeadName,
        feeTermId: c.feeTermId ?? "",
        feeTermName: c.feeTermName,
        amount: c.amount,
      })));
    } catch {
      toast.error("Failed to load line items");
    }
  };

  const openView = async (structure: FeeStructure) => {
    setViewTarget(structure);
    setViewLineItems([]);
    setViewLoading(true);
    setShowViewDialog(true);
    try {
      const components = await getStructureComponents(structure.id);
      setViewLineItems(components.map(c => ({
        id: c.id,
        feeTypeId: c.feeHeadId,
        feeTypeName: c.feeHeadName,
        feeTermId: c.feeTermId ?? "",
        feeTermName: c.feeTermName,
        amount: c.amount,
      })));
    } catch {
      toast.error("Failed to load line items");
    } finally {
      setViewLoading(false);
    }
  };

  const handleAddLineItem = () => {
    if (!lineItemForm.feeTypeId || !lineItemForm.feeTermId || lineItemForm.amount <= 0) {
      toast.error("All fields are required");
      return;
    }
    
    const feeTypeName = feeHeads.find(h => h.id === lineItemForm.feeTypeId)?.name;
    const feeTermName = feeTerms.find(t => t.id === lineItemForm.feeTermId)?.name;

    if (editingLineItem) {
      setLineItems(items => items.map(item => 
        item.id === editingLineItem.id 
          ? { ...item, ...lineItemForm, feeTypeName, feeTermName }
          : item
      ));
      toast.success("Line item updated");
    } else {
      const newItem: FeeStructureLineItem = {
        id: Math.random().toString(36).substr(2, 9),
        ...lineItemForm,
        feeTypeName,
        feeTermName,
      };
      setLineItems([...lineItems, newItem]);
      toast.success("Line item added");
    }
    
    setShowLineItemDialog(false);
    setEditingLineItem(null);
    setLineItemForm({ feeTypeId: "", feeTermId: "", amount: 0 });
  };

  const handleEditLineItem = (item: FeeStructureLineItem) => {
    setEditingLineItem(item);
    setLineItemForm(item);
    setShowLineItemDialog(true);
  };

  const handleDeleteLineItem = (id: string | undefined) => {
    if (!id) return;
    setLineItems(items => items.filter(item => item.id !== id));
    toast.success("Line item removed");
  };

  const handleSaveLineItems = async () => {
    if (lineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    if (!editingStructureId) return;
    try {
      await updateStructureLineItems(editingStructureId, lineItems.map(item => ({
        feeHeadId: item.feeTypeId,
        feeTermId: item.feeTermId || undefined,
        amount: item.amount,
      })));
      toast.success("Line items saved");
      setEditingStructureId(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save line items");
    }
  };

  const handleDeleteStructure = async (structure: FeeStructure) => {
    if (!confirm(`Delete "${structure.name}"? This cannot be undone. Existing fee records are not affected.`)) return;
    try {
      await feeApi.deleteFeeStructure(structure.id);
      toast.success("Structure deleted");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete structure");
    }
  };

  const openAssignClasses = async (structure: FeeStructure) => {
    setAssigningStructureId(structure.id);
    setAssignmentLoading(true);
    setShowAssignClassesModal(true);

    // Build map of classes taken by OTHER structures
    const taken: Record<string, { structureId: string; structureName: string; currentNames: string[] }> = {};
    structures.forEach(st => {
      if (st.id === structure.id) return;
      const names = (st.class ?? "").split(",").map(c => c.trim()).filter(Boolean);
      names.forEach(name => {
        const found = availableClasses.find(c =>
          c.name === name || `${c.standard}${c.section ? `-${c.section}` : ""}` === name
        );
        if (found) taken[found.id] = { structureId: st.id, structureName: st.name, currentNames: names };
      });
    });
    setClassTakenByStructure(taken);

    try {
      const assigned = await getAssignedClasses(structure.id);
      // Map class names back to IDs using availableClasses
      const assignedIds = assigned.map(name => {
        const found = availableClasses.find(c =>
          c.name === name || `${c.standard}${c.section ? `-${c.section}` : ""}` === name
        );
        return found?.id ?? name;
      });
      setStructureClassAssignments(prev => ({ ...prev, [structure.id]: assignedIds }));
    } catch {
      toast.error("Failed to load class assignments");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleToggleClassAssignment = (classId: string) => {
    if (!assigningStructureId) return;
    
    setStructureClassAssignments(prev => {
      const current = prev[assigningStructureId] || [];
      const newAssignments = current.includes(classId)
        ? current.filter(id => id !== classId)
        : [...current, classId];
      
      return {
        ...prev,
        [assigningStructureId]: newAssignments,
      };
    });
  };

  const handleSaveClassAssignments = async () => {
    if (!assigningStructureId) return;

    const assignedClassIds = structureClassAssignments[assigningStructureId] || [];
    if (assignedClassIds.length === 0) {
      toast.error("Select at least one class");
      return;
    }

    // Detect classes being reassigned from another structure
    const reassigning = assignedClassIds.filter(id => classTakenByStructure[id]);
    if (reassigning.length > 0) {
      const names = reassigning.map(id => availableClasses.find(c => c.id === id)?.name ?? id);
      const fromStructures = [...new Set(reassigning.map(id => classTakenByStructure[id]?.structureName))].filter(Boolean);
      if (!confirm(`${names.join(", ")} ${names.length > 1 ? "are" : "is"} currently assigned to "${fromStructures.join('", "')}". Reassign ${names.length > 1 ? "them" : "it"} to this structure?`)) return;
    }

    const classNames = assignedClassIds.map(id => availableClasses.find(c => c.id === id)?.name ?? id);

    try {
      // First unlink reassigned classes from their current structures
      if (reassigning.length > 0) {
        const unlinkedStructures = new Map<string, string[]>();
        for (const classId of reassigning) {
          const info = classTakenByStructure[classId];
          if (!info) continue;
          if (!unlinkedStructures.has(info.structureId)) {
            unlinkedStructures.set(info.structureId, [...info.currentNames]);
          }
          const className = availableClasses.find(c => c.id === classId)?.name ?? classId;
          unlinkedStructures.set(info.structureId,
            (unlinkedStructures.get(info.structureId) ?? []).filter(n => n.toLowerCase() !== className.toLowerCase())
          );
        }
        for (const [structId, remainingNames] of unlinkedStructures) {
          await assignClassesToStructure(structId, remainingNames);
        }
      }

      await assignClassesToStructure(assigningStructureId, classNames);
      toast.success(`Structure assigned to ${classNames.length} class(es)`);
      setShowAssignClassesModal(false);
      setAssigningStructureId(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save class assignments");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Fee Structures</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define fee components, assign to classes, and manage installment schedules</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditTarget(null); setForm({}); setLineItems([]); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Structure
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {structures.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No fee structures yet</p>
                <p className="text-sm mt-1">Create your first structure to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {structures.map(s => {
                const classLabel = s.class ? s.class.split(",").map(c => c.trim()).filter(Boolean) : [];
                return (
                  <Card key={s.id} className="group overflow-hidden hover:shadow-md transition-all duration-200 border border-border/60">
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Icon badge */}
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{s.name}</span>
                          {s.academicYear && (
                            <Badge variant="outline" className="text-xs font-normal py-0">{s.academicYear}</Badge>
                          )}
                        </div>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{s.description}</p>
                        )}
                        {classLabel.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">Classes:</span>
                            {classLabel.slice(0, 4).map(c => (
                              <Badge key={c} variant="secondary" className="text-xs py-0 h-5">{c}</Badge>
                            ))}
                            {classLabel.length > 4 && (
                              <Badge variant="secondary" className="text-xs py-0 h-5">+{classLabel.length - 4} more</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => openView(s)}
                        >
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditTarget(s);
                            setForm({ name: s.name, description: s.description });
                            setLineItems([]);
                            setEditingStructureId(s.id);
                            setShowForm(true);
                            // Load existing line items
                            getStructureComponents(s.id).then(components => {
                              setLineItems(components.map(c => ({
                                id: c.id,
                                feeTypeId: c.feeHeadId,
                                feeTypeName: c.feeHeadName,
                                feeTermId: c.feeTermId ?? "",
                                feeTermName: c.feeTermName,
                                amount: c.amount,
                              })));
                            }).catch(() => {});
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openAssignClasses(s)}
                        >
                          <Users className="h-4 w-4" /> Assign Classes
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete structure"
                          onClick={() => handleDeleteStructure(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fee Structure Form Dialog - with inline line items */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Structure" : "Add Fee Structure"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3 border-b pb-6">
              <div>
                <Label>Structure Name *</Label>
                <Input placeholder="e.g. Class 10 2024-25" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input placeholder="Additional details about this structure" value={(form as any).description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-3 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fee Line Items</Label>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => { setEditingLineItem(null); setLineItemForm({ feeTypeId: "", feeTermId: "", amount: 0 }); setShowLineItemDialog(true); }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Fee Type</TableHead>
                      <TableHead className="text-xs">Fee Term</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-right w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-xs">
                          No line items added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineItems.map(item => (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="font-medium">{item.feeTypeName}</TableCell>
                          <TableCell>{item.feeTermName}</TableCell>
                          <TableCell className="text-right">₹{item.amount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditLineItem(item)} 
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteLineItem(item.id)} 
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    </TableBody>
                  </Table>
                </div>
              </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save {editTarget ? "Changes" : "Structure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Line Item Form Dialog (sub-dialog for adding/editing line items) */}
      <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLineItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fee Type *</Label>
              <Select value={lineItemForm.feeTypeId} onValueChange={(val) => setLineItemForm({ ...lineItemForm, feeTypeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  {feeHeads.map(head => (
                    <SelectItem key={head.id} value={head.id}>{head.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fee Term *</Label>
              <Select value={lineItemForm.feeTermId} onValueChange={(val) => setLineItemForm({ ...lineItemForm, feeTermId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee term" />
                </SelectTrigger>
                <SelectContent>
                  {feeTerms.map(term => (
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (₹) *</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01"
                value={lineItemForm.amount || ""} 
                onChange={(e) => setLineItemForm({ ...lineItemForm, amount: parseFloat(e.target.value) || 0 })} 
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLineItemDialog(false); setEditingLineItem(null); }}>Cancel</Button>
            <Button onClick={handleAddLineItem}>
              {editingLineItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Structure Dialog (read-only) */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {viewTarget?.name}
            </DialogTitle>
            {viewTarget?.description && (
              <DialogDescription>{viewTarget.description}</DialogDescription>
            )}
          </DialogHeader>

          {/* Meta badges */}
          <div className="flex items-center gap-2 flex-wrap -mt-1">
            {viewTarget?.academicYear && (
              <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{viewTarget.academicYear}</Badge>
            )}
            {viewTarget?.class && viewTarget.class.split(",").filter(Boolean).map(c => (
              <Badge key={c} variant="secondary" className="text-xs">{c.trim()}</Badge>
            ))}
          </div>

          {/* Line items table */}
          <div className="mt-2">
            <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-xs">Fee Line Items</p>
            {viewLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : viewLineItems.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg py-8 text-center text-muted-foreground text-sm">
                No line items configured for this structure.
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold">Fee Type</TableHead>
                        <TableHead className="text-xs font-semibold">Fee Term</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewLineItems.map((item, idx) => (
                        <TableRow key={item.id ?? idx}>
                          <TableCell className="font-medium text-sm">{item.feeTypeName ?? item.feeTypeId}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.feeTermName ?? (item.feeTermId ? item.feeTermId : "—")}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">₹{item.amount.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground mr-2">Total</span>
                  <span className="font-bold text-base">₹{viewLineItems.reduce((s, i) => s + i.amount, 0).toLocaleString("en-IN")}</span>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            <Button onClick={() => {
              setShowViewDialog(false);
              if (viewTarget) {
                setEditTarget(viewTarget);
                setForm({ name: viewTarget.name, description: viewTarget.description });
                setLineItems(viewLineItems);
                setShowForm(true);
              }
            }} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Classes Modal */}
      <Dialog open={showAssignClassesModal} onOpenChange={setShowAssignClassesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Classes to Fee Structure
            </DialogTitle>
            <DialogDescription>Select one or more classes. This structure's fees will apply to students in these classes.</DialogDescription>
          </DialogHeader>

          {assignmentLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : availableClasses.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg py-10 text-center text-muted-foreground text-sm">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No classes available. Configure classes in Academic Setup first.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{availableClasses.length} classes available</span>
                <span>{(structureClassAssignments[assigningStructureId || ""] || []).length} selected</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                {availableClasses.map(cls => {
                  const isSelected = (structureClassAssignments[assigningStructureId || ""] || []).includes(cls.id);
                  const takenBy = classTakenByStructure[cls.id];
                  return (
                    <button
                      key={cls.id}
                      onClick={() => handleToggleClassAssignment(cls.id)}
                      className={`px-3 py-2.5 border rounded-lg text-left transition-all text-sm font-medium ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : takenBy
                          ? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                      title={takenBy && !isSelected ? `Currently assigned to "${takenBy.structureName}" — click to reassign` : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <span className="truncate block">{cls.name}</span>
                          {takenBy && !isSelected && (
                            <span className="text-[10px] text-amber-700 truncate block leading-none mt-0.5">→ {takenBy.structureName}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {Object.keys(classTakenByStructure).length > 0 && (
                <p className="text-xs text-amber-700 flex items-center gap-1 pt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Amber classes are already assigned to another structure — select to reassign.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {(() => {
              const reassignCount = (structureClassAssignments[assigningStructureId || ""] || []).filter(id => classTakenByStructure[id]).length;
              return reassignCount > 0 ? (
                <p className="text-xs text-amber-700 flex items-center gap-1 mr-auto">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {reassignCount} class{reassignCount > 1 ? "es" : ""} will be moved from another structure
                </p>
              ) : null;
            })()}
            <Button variant="outline" onClick={() => setShowAssignClassesModal(false)}>Cancel</Button>
            <Button onClick={handleSaveClassAssignments} className="gap-1.5">
              <Check className="h-4 w-4" /> Save Assignments
            </Button>
          </DialogFooter>
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

// ─── Defaulters Tab ──────────────────────────────────────
function DefaultersTab({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage();
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load defaulters data
    setLoading(false);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Fee Defaulters
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : defaulters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium">No defaulters</p>
            <p className="text-sm mt-1">All fees are up to date</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Outstanding Amount</TableHead>
                <TableHead>Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaulters.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.studentName}</TableCell>
                  <TableCell>{d.class}</TableCell>
                  <TableCell className="font-medium text-red-600">{d.amount}</TableCell>
                  <TableCell>{d.daysOverdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Reminders Tab ──────────────────────────────────────
function RemindersTab({ canManage }: { canManage: boolean }) {
  return <FeeReminderManager />;
}

// ─── Main Fee Module Page ─────────────────────────────────
export default function Fees({ section }: { section?: "collect" | "setup" }) {
  const { t } = useLanguage();
  const { hasUserPermission } = usePermissions();
  const canViewFees    = hasUserPermission('Fees', 'View');
  const canManageFees  = hasUserPermission('Fees', 'Create');
  const canEditFees    = hasUserPermission('Fees', 'Edit');
  const canDeleteFees  = hasUserPermission('Fees', 'Delete');
  const accessDenied   = !canViewFees;

  const { academicYear, availableYears } = useAcademicYear();
  const [collectYear, setCollectYear] = useState<string | null>(null); // null = not yet initialized; "all-years" = show all records
  const [activeTab, setActiveTab] = useState(section === "setup" ? "fee-setup" : "collect");
  // Sync activeTab whenever the route's section prop changes (React reuses this component across routes)
  useEffect(() => {
    setActiveTab(section === "setup" ? "fee-setup" : "collect");
  }, [section]);
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
  const [setupKpis, setSetupKpis] = useState({ structures: 0, feeTypes: 0, feeTerms: 0, concessions: 0 });
  const [setupLoading, setSetupLoading] = useState(true);
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
  const navigate = useNavigate();
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
  // Load setup KPIs independently on mount (fast — no dependency on slow loadData)
  useEffect(() => {
    setSetupLoading(true);
    Promise.all([feeApi.getFeeStructures(), getFeeHeads(), getFeeTerms(), getConcessionTypes()])
      .then(([structs, heads, terms, concs]) =>
        setSetupKpis({ structures: structs.length, feeTypes: heads.length, feeTerms: terms.length, concessions: concs.length }))
      .catch(() => {})
      .finally(() => setSetupLoading(false));
  }, []);
  useEffect(() => {
    if (!collectYear) return;
    loadData();
    loadStats();
    loadRecentPayments();
  }, [collectYear]);
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

  const sectionTitle = section === "setup"
    ? "Fee Setup & Configuration"
    : section === "collect"
    ? "Collect Fees & Reports"
    : "Fee Management";

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-7 w-7 text-primary" />
              {sectionTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {canManageFees ? t('fees.subtitleManage') : t('fees.subtitleView')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => loadData()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{t('fees.btnRefresh')}
          </Button>
          {section !== "setup" && canManageFees && (
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
          {section !== "setup" && canManageFees && (
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
          {section !== "setup" && canManageFees && (
            <Button size="sm" className="gap-1.5" onClick={() => { setQuickSearch(""); setQuickRecord(null); setQuickOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />{t('fees.quickCollect')}
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Bar ──────────────────────────────────────────── */}
      {section === "setup" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Fee Structures", value: setupLoading ? "—" : String(setupKpis.structures), sub: "Configured structures", color: "text-blue-600", bg: "bg-blue-50", icon: <Building2 className="h-5 w-5 text-blue-600" /> },
            { label: "Fee Types", value: setupLoading ? "—" : String(setupKpis.feeTypes), sub: "Active fee heads", color: "text-violet-600", bg: "bg-violet-50", icon: <Tags className="h-5 w-5 text-violet-600" /> },
            { label: "Fee Terms", value: setupLoading ? "—" : String(setupKpis.feeTerms), sub: "Installment schedules", color: "text-amber-600", bg: "bg-amber-50", icon: <Calendar className="h-5 w-5 text-amber-600" /> },
            { label: "Concessions", value: setupLoading ? "—" : String(setupKpis.concessions), sub: "Discount types", color: "text-emerald-600", bg: "bg-emerald-50", icon: <Tag className="h-5 w-5 text-emerald-600" /> },
          ].map(k => (
            <Card key={k.label} className="hover:shadow-sm transition-shadow border-0 shadow-none bg-muted/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>{k.icon}</div>
                </div>
                <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
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
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Hide the tab switcher entirely when only one logical section is active */}
        {!section && (
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
        )}
        {section === "collect" && (
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="collect" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
              <Receipt className="h-4 w-4" /><span>{t('fees.collectFee')}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
              <BarChart3 className="h-4 w-4" /><span>Reports</span>
            </TabsTrigger>
          </TabsList>
        )}
        {/* section==="setup": no top tab bar needed — just show fee-setup content directly */}

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
                                    onClick={e => { e.stopPropagation(); navigate(`/fees/collect/${g.records[g.records.length - 1].studentId}`); }}
                                  >
                                    <Eye className="h-3 w-3" />
                                    {t('fees.viewSummary')}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={e => { e.stopPropagation(); navigate(`/fees/collect/${(firstPendingRecord ?? g.records[0]).studentId}`); }}
                                  >
                                    <IndianRupee className="h-3 w-3" />
                                    Pay Fees
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
                                                      onClick={e => { e.stopPropagation(); navigate(`/fees/collect/${r.studentId}`); }}
                                                    >
                                                      <Eye className="h-3 w-3" /> {t('fees.viewBtn')}
                                                    </Button>
                                                    {nextDueTerm && (
                                                      <Button
                                                        size="sm"
                                                        className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={e => { e.stopPropagation(); navigate(`/fees/collect/${r.studentId}`); }}
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
                                                    onClick={e => { e.stopPropagation(); navigate(`/fees/collect/${r.studentId}`); }}
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
            <TabsList className="grid w-full grid-cols-5 h-auto mb-1">
              <TabsTrigger value="structure" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Building2 className="h-4 w-4" /><span>{t('fees.feeStructure')}</span>
              </TabsTrigger>
              <TabsTrigger value="feetypes" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Tags className="h-4 w-4" /><span>Fee Types</span>
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Calendar className="h-4 w-4" /><span>Fee Terms</span>
              </TabsTrigger>
              <TabsTrigger value="concessions" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <Tag className="h-4 w-4" /><span>{t('fees.concession')}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <BellRing className="h-4 w-4" /><span>{t('fees.tabs.reminders')}</span>
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

            {/* ── Fee Terms Sub-Tab ── */}
            <TabsContent value="terms" className="mt-4">
              <FeeTermsManager />
            </TabsContent>

            {/* ── Concessions Sub-Tab ── */}
            <TabsContent value="concessions" className="mt-4">
              <ConcessionsTab academicYear={academicYear ?? ""} />
            </TabsContent>

            {/* ── Notifications Sub-Tab ── */}
            <TabsContent value="notifications" className="mt-4">
              <FeeReminderManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Reports Group ─────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-4">
          <Tabs value={analyticsSubTab} onValueChange={setAnalyticsSubTab}>
            <TabsList className="grid w-full grid-cols-6 h-auto mb-1">
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
              <TabsTrigger value="reminders" className="flex-col py-2 gap-0.5 text-xs sm:flex-row sm:text-sm sm:gap-1.5">
                <BellRing className="h-4 w-4" /><span>{t('fees.tabs.reminders')}</span>
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

            {/* ── Reminders Sub-Tab ── */}
            <TabsContent value="reminders" className="mt-4">
              <RemindersTab canManage={canManageFees} />
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
                          onClick={() => { setQuickOpen(false); navigate(`/fees/collect/${r.studentId}`); }}
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
