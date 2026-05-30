import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  Building2,
  Receipt,
  ChevronDown,
  ChevronRight,
  Clock,
  CalendarClock,
  Tag,
  Minus,
  Plus,
  BookOpen,
  AlertTriangle,
  Wifi,
  WifiOff,
  ExternalLink,
  FileText,
  Copy,
  Timer,
  Info,
  Printer,
  Bus,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  feeApi,
  type SiblingFeeInfo,
  type SiblingInstallment,
  type BatchPaymentEntry,
} from "@/services/api/feeApi";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { StudentConcessionPanel } from "@/components/fees/StudentConcessionPanel";

// ─── Compound selection key ───────────────────────────────────────────────────

interface HeadKey {
  studentId: string;
  feeRecordId: string;
  installmentNumber: number;
  head: string; // fee head label, or "__all__" when no breakdown available
}
function hKey(k: HeadKey) {
  return `${k.studentId}::${k.feeRecordId}::${k.installmentNumber}::${k.head}`;
}

type PaymentMode = "offline" | "online";
type OfflineMethod = "cash" | "cheque" | "dd" | "bank_transfer";

const OFFLINE_METHODS: { value: OfflineMethod; label: string; shortLabel: string; Icon: React.ElementType }[] = [
  { value: "cash",          label: "Cash",               shortLabel: "Cash",      Icon: Banknote   },
  { value: "cheque",        label: "Cheque",             shortLabel: "Cheque",    Icon: Receipt    },
  { value: "dd",            label: "Demand Draft (DD)",  shortLabel: "DD",        Icon: FileText   },
  { value: "bank_transfer", label: "NEFT / IMPS / RTGS", shortLabel: "Bank Txn",  Icon: Building2  },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusChip({ status }: { status: SiblingInstallment["status"] }) {
  if (status === "paid")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3 w-3" /> Paid</span>;
  if (status === "current")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full"><Clock className="h-3 w-3" /> Due</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><CalendarClock className="h-3 w-3" /> Upcoming</span>;
}

// ─── Fee Overview Panel ────────────────────────────────────────────────────────

function FeeOverviewPanel({ info }: { info: SiblingFeeInfo }) {
  const [open, setOpen] = useState(false);

  const hasFeeHeads = info.feeHeads && Object.keys(info.feeHeads).length > 0;
  const hasHeadBreakdown = hasFeeHeads;

  // A concession is "unapplied" if its approved amount is NOT yet reflected in discountAmount
  const approvedConcessionTotal = info.concessionAmount ?? 0;
  const appliedDiscount = info.discountAmount ?? 0;
  const unappliedConcession = Math.max(0, approvedConcessionTotal - appliedDiscount);

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/60">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="flex-1 text-xs font-semibold text-slate-600">Fee Structure Overview</span>
        {info.structureName && (
          <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[140px]">{info.structureName}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform shrink-0 ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-200 pt-2.5">

          {/* Balance calculation */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance Calculation</p>
            <div className="bg-white border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs">
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Total fee ({info.academicYear})</span>
                <span className="font-semibold text-slate-800 tabular-nums">{fmt(info.totalFee)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-green-700">− Discount applied</span>
                  <span className="font-semibold text-green-700 tabular-nums">−{fmt(appliedDiscount)}</span>
                </div>
              )}
              {(info.lateFeeAmount ?? 0) > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-red-600">+ Late fee charged</span>
                  <span className="font-semibold text-red-600 tabular-nums">+{fmt(info.lateFeeAmount!)}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">− Paid so far</span>
                <span className="font-semibold text-slate-600 tabular-nums">−{fmt(info.paidAmount)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-orange-50 rounded-b-lg">
                <span className="font-bold text-orange-700">= Remaining</span>
                <span className="font-bold text-orange-700 tabular-nums">{fmt(info.pendingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Fee head breakdown */}
          {hasHeadBreakdown ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fee Heads — {info.structureName ?? "Structure"}
              </p>
              <div className="bg-white border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs">
                {Object.entries(info.feeHeads!).map(([head, amt]) => {
                  // Resolve camelCase key from display label for frequency lookup
                  const camelKey = head.replace(/\s+(\w)/g, (_, c) => c.toLowerCase())
                    .replace(/^(\w)/, c => c.toLowerCase())
                    .replace(/\//g, '').replace(/\s/g, '');
                  const freq = info.feeHeadFrequencies?.[camelKey];
                  const freqLabel: Record<string, string> = {
                    once: "One-time", halfYearly: "2×/yr", quarterly: "4×/yr", monthly: "12×/yr"
                  };
                  return (
                    <div key={head} className="flex justify-between items-center px-3 py-1.5">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        {head}
                        {freq && freq !== "termly" && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-medium px-1.5 py-px">
                            {freqLabel[freq] ?? freq}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-800 tabular-nums">{fmt(amt)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between px-3 py-1.5 bg-slate-50 rounded-b-lg">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {fmt(Object.values(info.feeHeads!).reduce((s, v) => s + v, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No per-head breakdown configured in fee structure.</p>
          )}

          {/* Transport & Hostel module fees */}
          {((info.transportMonthlyFee ?? 0) > 0 || (info.hostelMonthlyFee ?? 0) > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Module Fees (per month)</p>
              <div className="bg-white border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs">
                {(info.transportMonthlyFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center px-3 py-1.5">
                    <span className="text-blue-700 flex items-center gap-1.5"><Bus className="h-3.5 w-3.5" /> Transport Fee</span>
                    <span className="font-semibold text-blue-700 tabular-nums">{fmt(info.transportMonthlyFee!)}/mo</span>
                  </div>
                )}
                {(info.hostelMonthlyFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center px-3 py-1.5">
                    <span className="text-purple-700 flex items-center gap-1.5"><Home className="h-3.5 w-3.5" /> Hostel Fee</span>
                    <span className="font-semibold text-purple-700 tabular-nums">{fmt(info.hostelMonthlyFee!)}/mo</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Concessions */}
          {(info.concessions?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Concessions</p>
              <div className="bg-white border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs">
                {info.concessions!.map((c, i) => (
                  <div key={i} className="px-3 py-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-700">{c.name}</span>
                      <span className="font-bold text-green-700 tabular-nums">{fmt(c.amount)}</span>
                    </div>
                    {c.reason && <p className="text-slate-400 mt-0.5">{c.reason}</p>}
                  </div>
                ))}
                {unappliedConcession > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-b-lg">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span className="text-amber-700">
                      <strong>{fmt(unappliedConcession)}</strong> concession approved but not yet applied to balance — use the Discount field when collecting to apply it.
                    </span>
                  </div>
                )}
                {unappliedConcession === 0 && appliedDiscount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-b-lg">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-green-700">Concession already applied to balance.</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Installment row (expandable) ─────────────────────────────────────────────

interface InstallmentRowProps {
  inst: SiblingInstallment;
  studentId: string;
  feeRecordId: string;
  selectedHeads: Set<string>;
  onToggleHead: (key: HeadKey, checked: boolean) => void;
  onToggleAllHeads: (studentId: string, feeRecordId: string, inst: SiblingInstallment, include: boolean) => void;
}

function InstallmentRow({ inst, studentId, feeRecordId, selectedHeads, onToggleHead, onToggleAllHeads }: InstallmentRowProps) {
  const [open, setOpen] = useState(inst.status === "current");
  const isPaid = inst.status === "paid";
  const hasHeads = inst.feeHeads && Object.keys(inst.feeHeads).length > 0;

  const heads = hasHeads ? Object.entries(inst.feeHeads!) : [["__all__", inst.dueInInstallment]] as [string, number][];
  const dueHeads = heads.filter(([, amt]) => amt > 0);

  const selectedCount = dueHeads.filter(([head]) =>
    selectedHeads.has(hKey({ studentId, feeRecordId, installmentNumber: inst.number, head }))
  ).length;
  const allSelected = dueHeads.length > 0 && selectedCount === dueHeads.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const selectedAmount = dueHeads.reduce((sum, [head, amt]) =>
    selectedHeads.has(hKey({ studentId, feeRecordId, installmentNumber: inst.number, head })) ? sum + amt : sum, 0);

  function handleRowCheck(checked: boolean) {
    onToggleAllHeads(studentId, feeRecordId, inst, checked);
  }

  return (
    <div className={`rounded-xl border transition-all ${
      isPaid ? "bg-slate-50/50 border-slate-100" :
      allSelected ? "bg-blue-50/60 border-blue-200" :
      someSelected ? "bg-amber-50/40 border-amber-200" :
      "bg-white border-slate-200 hover:border-slate-300"
    }`}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 ${!isPaid ? "cursor-pointer" : ""}`}
        onClick={() => !isPaid && setOpen(o => !o)}
      >
        {!isPaid && (
          <Checkbox
            checked={allSelected}
            data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
            onCheckedChange={(v) => handleRowCheck(!!v)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        {isPaid && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${isPaid ? "text-slate-400" : "text-slate-800"}`}>{inst.label}</span>
            <StatusChip status={inst.status} />
            {inst.dueDate && !isPaid && <span className="text-xs text-slate-400">due {fmtDate(inst.dueDate)}</span>}
          </div>
        </div>

        <div className="text-right shrink-0 ml-2">
          {isPaid ? (
            <span className="text-sm font-medium text-slate-400">{fmt(inst.amount)}</span>
          ) : (
            <div>
              <div className="text-sm font-bold">
                {someSelected
                  ? <span className="text-blue-700">{fmt(selectedAmount)}</span>
                  : <span className="text-slate-800">{fmt(inst.dueInInstallment)}</span>}
              </div>
              {someSelected && (
                <div className="text-xs text-amber-600">{fmt(inst.dueInInstallment - selectedAmount)} deferred</div>
              )}
            </div>
          )}
        </div>

        {!isPaid && (
          <div className="ml-1 text-slate-400 shrink-0">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
      </div>

      {open && !isPaid && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-2.5 space-y-1">
          {dueHeads.length === 0 ? (
            <p className="text-xs text-slate-400">No fee head breakdown available.</p>
          ) : (
            <>
              {dueHeads.map(([head, headAmt]) => {
                const k: HeadKey = { studentId, feeRecordId, installmentNumber: inst.number, head };
                const checked = selectedHeads.has(hKey(k));
                return (
                  <label key={head} className={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none ${
                    checked ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  }`}>
                    <Checkbox checked={checked} onCheckedChange={(v) => onToggleHead(k, !!v)} />
                    <span className="flex-1 text-sm">{head === "__all__" ? "Fee amount" : head}</span>
                    <span className={`text-sm font-semibold tabular-nums ${checked ? "text-blue-700" : "text-slate-600"}`}>{fmt(headAmt)}</span>
                  </label>
                );
              })}

              {someSelected && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {fmt(inst.dueInInstallment - selectedAmount)} unselected — will remain pending and carry over to the next collection.
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-1 pl-1">
                {!allSelected && (
                  <button type="button" className="text-xs text-blue-600 underline underline-offset-2"
                    onClick={() => onToggleAllHeads(studentId, feeRecordId, inst, true)}>
                    Select all
                  </button>
                )}
                {selectedCount > 0 && (
                  <button type="button" className="text-xs text-slate-500 underline underline-offset-2"
                    onClick={() => onToggleAllHeads(studentId, feeRecordId, inst, false)}>
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Student section card ──────────────────────────────────────────────────────

interface StudentSectionProps {
  info: SiblingFeeInfo;
  included: boolean;
  selectedHeads: Set<string>;
  onToggleIncluded: (studentId: string) => void;
  onToggleHead: (key: HeadKey, checked: boolean) => void;
  onToggleAllHeads: (studentId: string, feeRecordId: string, inst: SiblingInstallment, include: boolean) => void;
  onToggleAllForStudent: (info: SiblingFeeInfo, include: boolean) => void;
  onRefresh: () => void;
}

function StudentSection({ info, included, selectedHeads, onToggleIncluded, onToggleHead, onToggleAllHeads, onToggleAllForStudent, onRefresh }: StudentSectionProps) {
  const [concessionPanelOpen, setConcessionPanelOpen] = useState(false);
  const pendingInstallments = info.installments.filter(i => i.status !== "paid" && i.dueInInstallment > 0);
  const [collapsed, setCollapsed] = useState(!info.isAnchor);

  return (
    <Card className={`transition-all duration-200 ${included ? "border-primary/40 shadow-sm" : "border-slate-200 opacity-60"}`}>
      <CardHeader className="pb-0 pt-3 px-4">
        <div className="flex items-center gap-3">
          {!info.isAnchor && (
            <Checkbox checked={included} onCheckedChange={() => onToggleIncluded(info.feeRecordId!)} id={`include-${info.feeRecordId}`} />
          )}
          <div className="flex-1 flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setCollapsed(c => !c)}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold truncate">{info.studentName}</CardTitle>
                {info.isAnchor && <Badge variant="outline" className="text-xs border-primary/40 text-primary px-1.5 py-0">This student</Badge>}
              </div>
              <CardDescription className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{info.class} · {info.section} · {info.structureName ?? info.installmentPlan}</span>
                {(info.transportMonthlyFee ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <Bus className="h-3 w-3" />{fmt(info.transportMonthlyFee!)}/mo
                  </span>
                )}
                {(info.hostelMonthlyFee ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                    <Home className="h-3 w-3" />{fmt(info.hostelMonthlyFee!)}/mo
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-orange-600">{fmt(info.pendingAmount)}</div>
              <div className="text-xs text-slate-400">pending</div>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${collapsed ? "-rotate-90" : ""}`} />
          </div>
        </div>
      </CardHeader>

      {!collapsed && included && (
        <CardContent className="px-4 pb-4 pt-3 space-y-2">
          {/* Fee structure overview — always shown so staff can see the full picture */}
          <FeeOverviewPanel info={info} />

          {/* Concessions summary + manage button */}
          <div className="flex items-start gap-2">
            {info.concessions && info.concessions.length > 0 && (
              <div className="flex-1 flex flex-col gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  Concessions applied — {fmt(info.concessionAmount ?? 0)} discount
                </div>
                <div className="flex flex-col gap-0.5 pl-5">
                  {info.concessions.map((c, i) => (
                    <span key={i} className="text-green-600">
                      {c.name}: <span className="font-semibold">{fmt(c.amount)}</span>
                      {c.reason && <span className="text-green-500/80"> · {c.reason}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-xs shrink-0 h-8"
              onClick={() => setConcessionPanelOpen(true)}
            >
              <Tag className="h-3.5 w-3.5" />Manage Concessions
            </Button>
          </div>

          {/* Per-student concession management panel */}
          <StudentConcessionPanel
            open={concessionPanelOpen}
            onClose={() => setConcessionPanelOpen(false)}
            studentId={info.studentId}
            studentName={info.studentName}
            academicYear={info.academicYear}
            totalFee={info.totalFee}
            onChanged={() => { setConcessionPanelOpen(false); onRefresh(); }}
          />
          {info.installments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No fee record found.</p>
          ) : info.pendingAmount === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" /> All fees paid
            </div>
          ) : (
            <>
              {info.installments.map(inst => (
                <InstallmentRow
                  key={inst.number}
                  inst={inst}
                  studentId={info.studentId}
                  feeRecordId={info.feeRecordId!}
                  selectedHeads={selectedHeads}
                  onToggleHead={onToggleHead}
                  onToggleAllHeads={onToggleAllHeads}
                />
              ))}
              {pendingInstallments.length > 1 && (
                <div className="flex gap-3 pt-0.5 pl-1">
                  <button type="button" className="text-xs text-blue-600 underline underline-offset-2"
                    onClick={() => onToggleAllForStudent(info, true)}>Select all due</button>
                  <button type="button" className="text-xs text-slate-500 underline underline-offset-2"
                    onClick={() => onToggleAllForStudent(info, false)}>Clear all</button>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CollectPaymentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { academicYear } = useSchoolContext();

  const [siblings, setSiblings] = useState<SiblingFeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includedStudents, setIncludedStudents] = useState<Set<string>>(new Set());
  const [selectedHeads, setSelectedHeads] = useState<Set<string>>(new Set());
  // Per-student ad-hoc adjustments: { discount, lateFee }
  const [adjustments, setAdjustments] = useState<Record<string, { discount: number; lateFee: number }>>({});
  // ─── Payment mode (online / offline) ────────────────────────────────────────
  const [paymentMode, setPaymentMode]   = useState<PaymentMode>("offline");
  const [offlineMethod, setOfflineMethod] = useState<OfflineMethod>("cash");
  // offline detail fields
  const [paymentDate, setPaymentDate]   = useState(() => new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate]     = useState("");
  const [bankName, setBankName]         = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks]           = useState("");
  // Cashfree online flow
  const [cfStep, setCfStep]             = useState<"idle" | "initiated" | "confirming">("idle");
  const [cfCheckoutUrl, setCfCheckoutUrl] = useState<string | null>(null);
  const [cfTxnId, setCfTxnId]           = useState("");
  const [cfInitiating, setCfInitiating] = useState(false);
  const [cfElapsed, setCfElapsed]       = useState(0);
  const [submitting, setSubmitting]     = useState(false);
  // Post-success state
  const [successBatchRef, setSuccessBatchRef] = useState<string | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getHeadsForInstallment = (inst: SiblingInstallment): [string, number][] => {
    const hasHeads = inst.feeHeads && Object.keys(inst.feeHeads).length > 0;
    if (hasHeads) return Object.entries(inst.feeHeads!).filter(([, a]) => a > 0);
    return inst.dueInInstallment > 0 ? [["__all__", inst.dueInInstallment]] : [];
  };

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await feeApi.getSiblingInfo(studentId, academicYear || undefined);
      setSiblings(data);

      const defaultIncluded = new Set<string>();
      const defaultSelected = new Set<string>();

      data.forEach(s => {
        // Track inclusion by feeRecordId so each fee record can be independently toggled.
        // Auto-include all records for the anchor student (isAnchor=true) and if only one
        // student is returned.
        if ((s.isAnchor || data.length === 1) && s.feeRecordId) defaultIncluded.add(s.feeRecordId);
        if (!s.feeRecordId) return;
        s.installments.forEach(inst => {
          if (inst.status !== "current" || inst.dueInInstallment <= 0) return;
          const heads = getHeadsForInstallment(inst);
          heads.forEach(([head]) => {
            defaultSelected.add(hKey({ studentId: s.studentId, feeRecordId: s.feeRecordId!, installmentNumber: inst.number, head }));
          });
        });
      });

      setIncludedStudents(defaultIncluded);
      setSelectedHeads(defaultSelected);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fee information");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, academicYear]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Selection handlers ──────────────────────────────────────────────────────

  const handleToggleHead = (key: HeadKey, checked: boolean) => {
    setSelectedHeads(prev => {
      const next = new Set(prev);
      checked ? next.add(hKey(key)) : next.delete(hKey(key));
      return next;
    });
  };

  const handleToggleAllHeads = (sid: string, feeRecordId: string, inst: SiblingInstallment, include: boolean) => {
    setSelectedHeads(prev => {
      const next = new Set(prev);
      getHeadsForInstallment(inst).forEach(([head]) => {
        const k = hKey({ studentId: sid, feeRecordId, installmentNumber: inst.number, head });
        include ? next.add(k) : next.delete(k);
      });
      return next;
    });
  };

  const handleToggleAllForStudent = (info: SiblingFeeInfo, include: boolean) => {
    if (!info.feeRecordId) return;
    setSelectedHeads(prev => {
      const next = new Set(prev);
      info.installments.forEach(inst => {
        if (inst.status === "paid" || inst.dueInInstallment <= 0) return;
        getHeadsForInstallment(inst).forEach(([head]) => {
          const k = hKey({ studentId: info.studentId, feeRecordId: info.feeRecordId!, installmentNumber: inst.number, head });
          include ? next.add(k) : next.delete(k);
        });
      });
      return next;
    });
  };

  const handleToggleIncluded = (feeRecordId: string) => {
    const info = siblings.find(s => s.feeRecordId === feeRecordId);
    setIncludedStudents(prev => {
      const next = new Set(prev);
      if (next.has(feeRecordId)) {
        next.delete(feeRecordId);
        if (info) handleToggleAllForStudent(info, false);
      } else {
        next.add(feeRecordId);
      }
      return next;
    });
  };

  // ─── Compute payment entries ─────────────────────────────────────────────────

  const paymentEntries = (() => {
    const map = new Map<string, BatchPaymentEntry & { lines: string[] }>();

    siblings.forEach(info => {
      if (!info.feeRecordId || !includedStudents.has(info.feeRecordId)) return;
      const mapKey = `${info.studentId}::${info.feeRecordId}`;

      info.installments.forEach(inst => {
        if (inst.status === "paid" || inst.dueInInstallment <= 0) return;
        getHeadsForInstallment(inst).forEach(([head, amt]) => {
          if (!selectedHeads.has(hKey({ studentId: info.studentId, feeRecordId: info.feeRecordId!, installmentNumber: inst.number, head }))) return;
          if (!map.has(mapKey)) map.set(mapKey, { studentId: info.studentId, feeRecordId: info.feeRecordId!, amount: 0, lines: [] });
          const entry = map.get(mapKey)!;
          entry.amount += amt;
          const line = head === "__all__" ? inst.label : `${inst.label} – ${head}`;
          if (!entry.lines.includes(line)) entry.lines.push(line);
        });
      });
    });

    return Array.from(map.values()).map(({ lines, ...rest }) => {
      const adj = adjustments[rest.studentId] ?? { discount: 0, lateFee: 0 };
      const discount = Math.min(adj.discount, rest.amount + adj.lateFee - 0.01); // cap so net > 0
      const lateFee  = adj.lateFee;
      const netAmount = Math.max(0.01, rest.amount - discount + lateFee);
      return {
        ...rest,
        amount: netAmount,
        discountApplied: discount > 0 ? discount : undefined,
        lateFeeApplied:  lateFee  > 0 ? lateFee  : undefined,
        remarks: lines.join(", "),
      };
    });
  })();

  const grandTotal = paymentEntries.reduce((s, e) => s + e.amount, 0);

  // ─── Cashfree online timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (cfStep !== "initiated" && cfStep !== "confirming") return;
    const t = setInterval(() => setCfElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [cfStep]);

  // ─── Initiate Cashfree (create gateway order, open checkout) ────────────────
  const handleInitiateCashfree = async () => {
    if (paymentEntries.length === 0) {
      toast({ title: "Nothing selected", description: "Select at least one fee item.", variant: "destructive" });
      return;
    }
    const anchorEntry = paymentEntries[0];
    setCfInitiating(true);
    try {
      const res = await feeApi.initiatePayment(anchorEntry.feeRecordId, {
        amount: grandTotal,
        gateway: "cashfree",
        currency: "INR",
      });
      if (res.checkoutUrl) {
        setCfCheckoutUrl(res.checkoutUrl);
        window.open(res.checkoutUrl, "_blank", "width=960,height=720");
        toast({ title: "Payment link opened", description: "Ask the parent/student to complete payment in the new window." });
      } else {
        // Gateway configured but no URL — show manual entry prompt
        toast({
          title: "Gateway not fully configured",
          description: "No checkout URL received. Share payment details verbally and enter the transaction ID below once paid.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment gateway unavailable.";
      toast({
        title: "Could not reach payment gateway",
        description: `${msg} — Enter the transaction ID manually once the parent pays.`,
        variant: "destructive",
      });
    } finally {
      setCfInitiating(false);
      setCfStep("initiated");
      setCfElapsed(0);
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (paymentEntries.length === 0) {
      toast({ title: "Nothing selected", description: "Select at least one fee item.", variant: "destructive" });
      return;
    }
    const isOnline = paymentMode === "online";
    if (!isOnline) {
      if ((offlineMethod === "cheque" || offlineMethod === "dd") && !chequeNumber.trim()) {
        toast({ title: offlineMethod === "dd" ? "DD number required" : "Cheque number required", variant: "destructive" });
        return;
      }
      if (offlineMethod === "bank_transfer" && !referenceNumber.trim()) {
        toast({ title: "UTR / Reference number required for bank transfer", variant: "destructive" });
        return;
      }
    } else {
      if (!cfTxnId.trim()) {
        toast({ title: "Cashfree Transaction ID required", description: "Enter the transaction ID shown in the payment receipt.", variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    try {
      // Build payment date — use picker value for offline, today for online (Cashfree date is set by gateway)
      const dateIso = isOnline
        ? new Date().toISOString()
        : new Date(paymentDate + "T00:00:00").toISOString();

      const result = await feeApi.createBatchPayment({
        payments: paymentEntries,
        method: isOnline ? "cashfree" : offlineMethod,
        date: dateIso,
        chequeNumber: !isOnline && (offlineMethod === "cheque" || offlineMethod === "dd") ? chequeNumber : undefined,
        chequeDate:   !isOnline && (offlineMethod === "cheque" || offlineMethod === "dd") && chequeDate ? chequeDate : undefined,
        bankName:     !isOnline && (offlineMethod === "cheque" || offlineMethod === "dd" || offlineMethod === "bank_transfer") ? bankName || undefined : undefined,
        referenceNumber: !isOnline && offlineMethod === "bank_transfer" ? referenceNumber || undefined : undefined,
        // Cashfree txn ID stored in dedicated GatewayRef column for proper reconciliation
        gatewayRef:  isOnline ? cfTxnId : undefined,
        remarks: remarks || undefined,
        notifyParents: true,
      });

      if (result.failed === 0) {
        setSuccessBatchRef(result.batchRef);
        toast({ title: "Payment recorded", description: `${result.processed} receipt(s) created · Batch ref: ${result.batchRef}` });
      } else {
        toast({ title: "Partial success", description: `${result.processed} ok, ${result.failed} failed.`, variant: "destructive" });
        await loadData();
      }
    } catch (err: unknown) {
      toast({ title: "Payment failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading fee details…
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12 px-4 space-y-4">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Go back</Button>
      </div>
    );
  }

  // ─── Post-payment success screen ─────────────────────────────────────────────
  if (successBatchRef) {
    return (
      <div className="max-w-lg mx-auto mt-16 px-4">
        <Card className="shadow-md">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payment Recorded</h2>
              <p className="text-sm text-muted-foreground mt-1">Receipts have been generated successfully.</p>
            </div>
            <div className="w-full bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Batch Reference</p>
                <p className="font-mono font-semibold text-slate-800">{successBatchRef}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(successBatchRef);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
              </Button>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Button
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
              <Button
                className="flex-1 gap-1"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" /> Back to Fees
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const anchor = siblings.find(s => s.isAnchor) ?? siblings[0];
  // Use feeRecordId as the discriminator so that multiple fee records for the same
  // student (e.g. a separate transport or hostel record) all appear as independent
  // selectable sections rather than the first one silently hiding the rest.
  // One entry per sibling student — take the first (highest totalFee) record per student
  const seenSiblingIds = new Set<string>();
  const trueSiblings = siblings
    .filter(s => s.studentId !== anchor?.studentId)
    .filter(s => { if (seenSiblingIds.has(s.studentId)) return false; seenSiblingIds.add(s.studentId); return true; });
  const siblingCount = trueSiblings.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Collect Fee Payment</h1>
          {anchor && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {anchor.studentName} · {anchor.class} {anchor.section}
              {siblingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {siblingCount} sibling{siblingCount > 1 ? "s" : ""} linked
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Left: students ─────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {anchor && (
            <StudentSection
              key={anchor.feeRecordId ?? anchor.studentId}
              info={anchor}
              included={true}
              selectedHeads={selectedHeads}
              onToggleIncluded={handleToggleIncluded}
              onToggleHead={handleToggleHead}
              onToggleAllHeads={handleToggleAllHeads}
              onToggleAllForStudent={handleToggleAllForStudent}
              onRefresh={loadData}
            />
          )}

          {trueSiblings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" /> Siblings — tick to include
              </div>
              {trueSiblings.map(sib => (
                <StudentSection
                  key={sib.feeRecordId ?? sib.studentId}
                  info={sib}
                  included={!!sib.feeRecordId && includedStudents.has(sib.feeRecordId)}
                  selectedHeads={selectedHeads}
                  onToggleIncluded={handleToggleIncluded}
                  onToggleHead={handleToggleHead}
                  onToggleAllHeads={handleToggleAllHeads}
                  onToggleAllForStudent={handleToggleAllForStudent}
                  onRefresh={loadData}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: payment panel ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6">

          {/* Summary card */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {paymentEntries.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Select fee items on the left</p>
              ) : (
                <>
                  {paymentEntries.map(e => {
                    const info = siblings.find(s => s.studentId === e.studentId);
                    const adj = adjustments[e.studentId] ?? { discount: 0, lateFee: 0 };
                    const baseAmount = e.amount + (adj.discount ?? 0) - (adj.lateFee ?? 0); // recover original selected amount
                    const hasAdj = adj.discount > 0 || adj.lateFee > 0;
                    return (
                      <div key={e.studentId} className="space-y-1.5 pb-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-slate-800 truncate">{info?.studentName ?? "—"}</span>
                          <span className={`text-sm tabular-nums ml-2 shrink-0 ${hasAdj ? "line-through text-slate-400" : "font-bold text-primary"}`}>{fmt(baseAmount)}</span>
                        </div>
                        {e.remarks && <p className="text-xs text-slate-400 truncate pl-0.5">{e.remarks}</p>}

                        {/* Discount row */}
                        <div className="flex items-center gap-2 pl-0.5">
                          <span className="flex items-center gap-1 text-xs text-green-700 w-24 shrink-0">
                            <Minus className="h-3 w-3" /> Discount
                          </span>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                            <input
                              type="number" min={0} step={1}
                              value={adj.discount || ""}
                              placeholder="0"
                              onChange={e2 => {
                                const val = Math.max(0, parseFloat(e2.target.value) || 0);
                                setAdjustments(prev => ({ ...prev, [e.studentId]: { ...(prev[e.studentId] ?? { discount: 0, lateFee: 0 }), discount: val } }));
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs border border-green-200 rounded-md bg-green-50 focus:outline-none focus:ring-1 focus:ring-green-400 text-green-800"
                            />
                          </div>
                        </div>

                        {/* Late fee / fine row */}
                        <div className="flex items-center gap-2 pl-0.5">
                          <span className="flex items-center gap-1 text-xs text-red-600 w-24 shrink-0">
                            <Plus className="h-3 w-3" /> Fine / Late fee
                          </span>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                            <input
                              type="number" min={0} step={1}
                              value={adj.lateFee || ""}
                              placeholder="0"
                              onChange={e2 => {
                                const val = Math.max(0, parseFloat(e2.target.value) || 0);
                                setAdjustments(prev => ({ ...prev, [e.studentId]: { ...(prev[e.studentId] ?? { discount: 0, lateFee: 0 }), lateFee: val } }));
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs border border-red-200 rounded-md bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400 text-red-800"
                            />
                          </div>
                        </div>

                        {hasAdj && (
                          <div className="flex justify-between items-center pl-0.5 pt-0.5">
                            <span className="text-xs text-slate-500">Net payable</span>
                            <span className="text-sm font-bold text-primary tabular-nums">{fmt(e.amount)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-semibold text-slate-700">Total payable</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">{fmt(grandTotal)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Method + submit card */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">

              {/* ── Mode toggle ── */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setPaymentMode("offline"); setCfStep("idle"); setCfTxnId(""); setCfCheckoutUrl(null); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    paymentMode === "offline"
                      ? "bg-white shadow text-slate-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <WifiOff className="h-4 w-4" /> Offline
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMode("online"); setCfStep("idle"); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    paymentMode === "online"
                      ? "bg-white shadow text-indigo-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Wifi className="h-4 w-4" /> Online
                </button>
              </div>

              {/* ══════════════ OFFLINE ══════════════ */}
              {paymentMode === "offline" && (
                <>
                  {/* Method pills */}
                  <div className="grid grid-cols-2 gap-2">
                    {OFFLINE_METHODS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOfflineMethod(value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          offlineMethod === value
                            ? "bg-primary/5 border-primary text-primary font-semibold shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Cheque / DD details */}
                  {(offlineMethod === "cheque" || offlineMethod === "dd") && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">
                        {offlineMethod === "dd" ? "Demand Draft Details" : "Cheque Details"}
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">{offlineMethod === "dd" ? "DD Number" : "Cheque Number"} *</Label>
                        <Input className="h-9" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)}
                          placeholder={offlineMethod === "dd" ? "e.g. DD001234" : "e.g. 001234"} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{offlineMethod === "dd" ? "DD Date" : "Cheque Date"}</Label>
                          <Input className="h-9" type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Issuing Bank</Label>
                          <Input className="h-9" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="SBI" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NEFT / IMPS / RTGS */}
                  {offlineMethod === "bank_transfer" && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Bank Transfer Details</p>
                      <div className="space-y-1">
                        <Label className="text-xs">UTR / Reference Number *</Label>
                        <Input className="h-9" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                          placeholder="NEFT / IMPS / RTGS UTR" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Bank Name</Label>
                        <Input className="h-9" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="HDFC Bank" />
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Payment Date</Label>
                    <Input
                      className="h-9"
                      type="date"
                      max={new Date().toISOString().substring(0, 10)}
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Remarks <span className="text-slate-400">(optional)</span></Label>
                    <Input className="h-9" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes for this payment" />
                  </div>

                  <Button size="lg" className="w-full font-semibold"
                    disabled={paymentEntries.length === 0 || submitting}
                    onClick={handleSubmit}>
                    {submitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
                      : paymentEntries.length === 0
                        ? "Select items to pay"
                        : <><IndianRupee className="h-4 w-4 mr-1" /> Collect {fmt(grandTotal)}</>}
                  </Button>
                </>
              )}

              {/* ══════════════ ONLINE (Cashfree) ══════════════ */}
              {paymentMode === "online" && (
                <>
                  {/* Cashfree branding */}
                  <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">CF</div>
                      <div>
                        <p className="font-bold text-indigo-900 text-sm">Cashfree Payment Gateway</p>
                        <p className="text-xs text-indigo-600 mt-0.5">UPI · Net Banking · Credit / Debit Cards · Wallets</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["UPI", "Net Banking", "Visa / MC", "RuPay", "Wallets"].map(m => (
                        <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Step: idle — not yet initiated */}
                  {cfStep === "idle" && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Click <strong>Generate Payment Link</strong> to create a Cashfree checkout session for
                        <strong> {fmt(grandTotal)}</strong>. A payment window will open — the parent/guardian
                        completes payment on their device, then return here to confirm.
                      </p>
                      <Button
                        className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        disabled={paymentEntries.length === 0 || cfInitiating}
                        onClick={handleInitiateCashfree}
                      >
                        {cfInitiating
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating session…</>
                          : <><ExternalLink className="h-4 w-4" /> Generate Payment Link — {fmt(grandTotal)}</>}
                      </Button>
                      <p className="text-xs text-center text-slate-400">
                        Or <button type="button" className="underline text-indigo-600 hover:text-indigo-800"
                          onClick={() => setCfStep("confirming")}>
                          enter an existing Cashfree transaction ID
                        </button> directly
                      </p>
                    </div>
                  )}

                  {/* Step: initiated — link opened, waiting */}
                  {(cfStep === "initiated" || cfStep === "confirming") && (
                    <div className="space-y-3">
                      {/* Timer + status */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5" />
                          {cfStep === "initiated" ? "Awaiting payment…" : "Enter Transaction ID"}
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-900">
                          {String(Math.floor(cfElapsed / 60)).padStart(2, "0")}:{String(cfElapsed % 60).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Checkout URL */}
                      {cfCheckoutUrl && (
                        <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
                          <span className="text-xs text-slate-500 truncate flex-1 font-mono">{cfCheckoutUrl}</span>
                          <button type="button" title="Copy link"
                            onClick={() => { navigator.clipboard.writeText(cfCheckoutUrl); toast({ title: "Link copied" }); }}
                            className="shrink-0 text-slate-400 hover:text-slate-700">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="Re-open"
                            onClick={() => window.open(cfCheckoutUrl, "_blank", "width=960,height=720")}
                            className="shrink-0 text-indigo-500 hover:text-indigo-700">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Transaction ID */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Cashfree Transaction ID *</Label>
                        <Input
                          className="h-10 font-mono tracking-widest text-sm"
                          placeholder="TXN_XXXXXXXXXX or order_XXXXXXXXXX"
                          value={cfTxnId}
                          onChange={e => setCfTxnId(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-400">
                          Find this in Cashfree dashboard → Payments, or on the parent's confirmation screen.
                        </p>
                      </div>

                      {/* Remarks */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Remarks (optional)</Label>
                        <Input className="h-9" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes for this payment" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-1.5"
                          onClick={() => { setCfStep("idle"); setCfTxnId(""); setCfCheckoutUrl(null); setCfElapsed(0); }}>
                          ← Back
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
                          disabled={!cfTxnId.trim() || submitting}
                          onClick={handleSubmit}
                        >
                          {submitting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCircle2 className="h-4 w-4" />}
                          Confirm & Record
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}