import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, CreditCard, BadgeIndianRupee, CheckCircle2,
  Shield, Smartphone, Building2, Wallet, ChevronDown, ChevronUp,
  GraduationCap, FileText, BookOpen, FlaskConical, Trophy, Bus,
  Home, Shirt, BookMarked, Wrench, HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { getFeeRecords, getFeeStructureById, initiatePayment, type FeeRecord, type FeeStructure, type PaymentGatewayResponse, type TermSchedule } from "@/services/api/feeApi";
import { toast } from "sonner";

const FEE_HEAD_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  tuitionFee:     { label: "Tuition Fee",          icon: <GraduationCap className="h-3 w-3" /> },
  examFee:        { label: "Examination Fee",      icon: <FileText className="h-3 w-3" /> },
  libraryFee:     { label: "Library Fee",          icon: <BookOpen className="h-3 w-3" /> },
  labFee:         { label: "Lab Fee",              icon: <FlaskConical className="h-3 w-3" /> },
  developmentFee: { label: "Development Fund",     icon: <Wrench className="h-3 w-3" /> },
  sportsFee:      { label: "Sports / Activity Fee",icon: <Trophy className="h-3 w-3" /> },
  admissionFee:   { label: "Admission Fee",        icon: <FileText className="h-3 w-3" /> },
  transportFee:   { label: "Transport Fee",        icon: <Bus className="h-3 w-3" /> },
  hostelFee:      { label: "Hostel Fee",           icon: <Home className="h-3 w-3" /> },
  uniformFee:     { label: "Uniform Fee",          icon: <Shirt className="h-3 w-3" /> },
  booksFee:       { label: "Books / Stationery",   icon: <BookMarked className="h-3 w-3" /> },
  miscellaneous:  { label: "Miscellaneous",        icon: <HelpCircle className="h-3 w-3" /> },
};

type Gateway = "razorpay" | "payu" | "paytm" | "phonepe" | "googlepay";

const gateways: { id: Gateway; name: string; icon: React.ReactNode; desc: string }[] = [
  { id: "razorpay", name: "Razorpay", icon: <CreditCard className="h-5 w-5" />, desc: "Cards, UPI, Netbanking, Wallets" },
  { id: "payu", name: "PayU", icon: <Building2 className="h-5 w-5" />, desc: "All payment methods" },
  { id: "paytm", name: "Paytm", icon: <Wallet className="h-5 w-5" />, desc: "UPI, Wallet, Cards" },
  { id: "phonepe", name: "PhonePe", icon: <Smartphone className="h-5 w-5" />, desc: "UPI payments" },
  { id: "googlepay", name: "Google Pay", icon: <Smartphone className="h-5 w-5" />, desc: "UPI payments" },
];

export default function ParentChildFeePayment() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<StudentBasic | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [feeStructures, setFeeStructures] = useState<Record<string, FeeStructure>>({});
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>("razorpay");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gatewayResponse, setGatewayResponse] = useState<PaymentGatewayResponse | null>(null);

  useEffect(() => {
    if (childId) loadData();
  }, [childId]);

  const loadData = async () => {
    try {
      const [childrenData, feeData] = await Promise.all([
        studentApi.getMyChildren(),
        getFeeRecords(1, 50, childId),
      ]);
      const found = childrenData.find((c: StudentBasic) => c.id === childId);
      setChild(found || null);
      // Include ALL pending records (including carry-forwards from previous years)
      const records = (feeData.feeRecords || feeData.items || []).filter((r: FeeRecord) => r.pendingAmount > 0);
      setFeeRecords(records);
      // Auto-select all pending records
      setSelectedRecords(new Set(records.map((r: FeeRecord) => r.id)));

      // Load fee structures for breakdown display
      const structureIds = [...new Set(records.map(r => r.feeStructureId).filter(Boolean))] as string[];
      const structMap: Record<string, FeeStructure> = {};
      await Promise.all(
        structureIds.map(async (sid) => {
          try { structMap[sid] = await getFeeStructureById(sid); } catch {}
        })
      );
      setFeeStructures(structMap);
    } catch {
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = (id: string) => {
    const next = new Set(selectedRecords);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecords(next);
  };

  const selectedTotal = feeRecords
    .filter(r => selectedRecords.has(r.id))
    .reduce((s, r) => {
      const structure = r.feeStructureId ? feeStructures[r.feeStructureId] : null;
      const terms = parseTermSchedule(structure);
      const due = getCurrentTermDue(terms, r.totalAmount, r.discountAmount || 0, r.paidAmount);
      return s + (due >= 0 ? due : r.pendingAmount);
    }, 0);

  const handlePayment = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Please select at least one fee record to pay");
      return;
    }

    setProcessing(true);
    try {
      // Process each selected fee record using current-term-due amount
      const selectedFees = feeRecords.filter(r => selectedRecords.has(r.id));

      for (const record of selectedFees) {
        const structure = record.feeStructureId ? feeStructures[record.feeStructureId] : null;
        const terms = parseTermSchedule(structure);
        const due = getCurrentTermDue(terms, record.totalAmount, record.discountAmount || 0, record.paidAmount);
        const amountToPay = due >= 0 ? due : record.pendingAmount;

        const response = await initiatePayment(record.id, {
          amount: amountToPay,
          gateway: selectedGateway,
          currency: "INR",
        });
        setGatewayResponse(response);
      }

      setShowSuccess(true);
      toast.success("Payment initiated successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment initiation failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/parent-fees/${childId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Make Payment</h1>
          {child && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {child.name} | {child.class} {child.section ? `- ${child.section}` : ""}
            </p>
          )}
        </div>
      </div>

      {feeRecords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">All Fees Paid!</h3>
            <p className="text-muted-foreground mt-1">There are no pending fees for this child.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/parent-fees")}>
              Back to Fee Overview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select Fee Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BadgeIndianRupee className="h-4 w-4 text-primary" />
                Select Fees to Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feeRecords.map(record => {
                const structure = record.feeStructureId ? feeStructures[record.feeStructureId] : null;
                const isBreakdownOpen = expandedBreakdown === record.id;
                const heads = structure
                  ? Object.entries(FEE_HEAD_ICONS).filter(([key]) => (structure as any)[key] > 0)
                  : [];
                const terms = parseTermSchedule(structure);
                const termDue = getCurrentTermDue(terms, record.totalAmount, record.discountAmount || 0, record.paidAmount);
                const amountToPay = termDue >= 0 ? termDue : record.pendingAmount;
                const currentTermLabel = getCurrentTermName(terms, record.paidAmount);
                const isCarryFwd = isCarryForward(record);

                return (
                <div key={record.id}>
                  {isCarryFwd && (
                    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 mb-1.5">
                      <span className="font-semibold">Carry-forward from {record.academicYear}</span>
                      <span className="text-orange-500">— previous year outstanding balance</span>
                    </div>
                  )}
                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRecords.has(record.id)
                        ? isCarryFwd ? "border-orange-400 bg-orange-50/60" : "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={() => toggleRecord(record.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-sm">{record.feeStructureName || "Fee"}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentTermLabel ? (
                            <><span className="font-medium text-foreground">{currentTermLabel}</span> · Due: {new Date(record.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
                          ) : (
                            <>Due: {new Date(record.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
                          )}
                        </p>
                        {/* Compact fee component summary */}
                        {heads.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Includes: {heads.slice(0, 3).map(([, h]) => h.label).join(", ")}
                            {heads.length > 3 && ` +${heads.length - 3} more`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{"\u20B9"}{amountToPay.toLocaleString("en-IN")}</p>
                      {termDue >= 0 && record.pendingAmount > termDue && (
                        <p className="text-[10px] text-muted-foreground">of {"\u20B9"}{record.pendingAmount.toLocaleString("en-IN")} total outstanding</p>
                      )}
                      <Badge variant={isCarryFwd ? "outline" : record.status === "Overdue" ? "destructive" : "secondary"} className={`text-xs mt-0.5 ${isCarryFwd ? "border-orange-400 text-orange-700" : ""}`}>
                        {isCarryFwd ? "Carry-forward" : record.status}
                      </Badge>
                    </div>
                  </label>

                  {/* Expandable breakdown */}
                  {heads.length > 0 && selectedRecords.has(record.id) && (
                    <div className="ml-7 mt-1">
                      <button
                        className="flex items-center gap-1 text-[11px] font-medium text-primary/70 hover:text-primary"
                        onClick={() => setExpandedBreakdown(isBreakdownOpen ? null : record.id)}
                      >
                        {isBreakdownOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isBreakdownOpen ? "Hide" : "What am I paying for?"}
                      </button>
                      {isBreakdownOpen && structure && (
                        <div className="mt-1.5 p-3 rounded-lg bg-muted/40 border text-xs space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Fee Components — {structure.name} ({structure.class})
                          </p>
                          {heads.map(([key, cfg]) => {
                            const amt = (structure as any)[key] as number;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">{cfg.icon}</span>
                                <span className="flex-1">{cfg.label}</span>
                                <span className="font-semibold tabular-nums">{"\u20B9"}{amt.toLocaleString("en-IN")}</span>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between pt-1.5 border-t font-bold">
                            <span>Structure Total</span>
                            <span>{"\u20B9"}{structure.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                          {record.discountAmount > 0 && (
                            <div className="flex items-center justify-between text-green-600">
                              <span>Discount</span>
                              <span>- {"\u20B9"}{record.discountAmount.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between font-bold text-primary pt-1 border-t">
                            <span>Amount Due</span>
                            <span>{"\u20B9"}{record.pendingAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

              {/* Summary of what the parent is paying for */}
              {selectedRecords.size > 0 && (
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-800 mt-4">
                  <p className="font-semibold mb-1">You are paying for:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {feeRecords.filter(r => selectedRecords.has(r.id)).map(r => {
                      const structure = r.feeStructureId ? feeStructures[r.feeStructureId] : null;
                      const terms = parseTermSchedule(structure);
                      const due = getCurrentTermDue(terms, r.totalAmount, r.discountAmount || 0, r.paidAmount);
                      const amtToPay = due >= 0 ? due : r.pendingAmount;
                      const termLabel = getCurrentTermName(terms, r.paidAmount);
                      return (
                        <li key={r.id}>
                          {r.feeStructureName || "Fee"}
                          {termLabel ? ` · ${termLabel}` : ""}
                          {isCarryForward(r) ? " (carry-forward)" : ""}
                          {" — "}{"\u20B9"}{amtToPay.toLocaleString("en-IN")}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t mt-4">
                <span className="text-sm font-medium">Total Payable</span>
                <span className="text-xl font-bold text-primary">{"\u20B9"}{selectedTotal.toLocaleString("en-IN")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Gateway Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {gateways.map(gw => (
                <label
                  key={gw.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedGateway === gw.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    checked={selectedGateway === gw.id}
                    onChange={() => setSelectedGateway(gw.id)}
                    className="h-4 w-4 text-primary"
                  />
                  <div className="text-primary/70">{gw.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{gw.name}</p>
                    <p className="text-xs text-muted-foreground">{gw.desc}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Security Note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Shield className="h-4 w-4 shrink-0" />
            <span>All transactions are encrypted and processed securely. You will be redirected to the payment gateway for completion.</span>
          </div>

          {/* Pay Button */}
          <Button
            className="w-full h-12 text-base"
            disabled={selectedRecords.size === 0 || processing}
            onClick={handlePayment}
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay {"\u20B9"}{selectedTotal.toLocaleString("en-IN")}
              </>
            )}
          </Button>
        </>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              Payment Initiated
            </DialogTitle>
            <DialogDescription>
              Your payment of {"\u20B9"}{selectedTotal.toLocaleString("en-IN")} has been initiated via {gateways.find(g => g.id === selectedGateway)?.name}.
            </DialogDescription>
          </DialogHeader>
          {gatewayResponse && (
            <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-medium">{gatewayResponse.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway</span>
                <span className="capitalize">{gatewayResponse.gateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">{"\u20B9"}{gatewayResponse.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowSuccess(false); navigate("/parent-fees"); }}>
              Back to Fees
            </Button>
            <Button className="flex-1" onClick={() => { setShowSuccess(false); navigate(`/parent-fees/${childId}`); }}>
              View Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return (now.getMonth() + 1) >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function isCarryForward(record: FeeRecord): boolean {
  return !!record.academicYear && record.academicYear < getCurrentAcademicYear();
}

function parseTermSchedule(structure: FeeStructure | null | undefined): TermSchedule[] {
  if (!structure?.installmentDueDates) return [];
  try {
    const parsed = JSON.parse(structure.installmentDueDates);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed as TermSchedule[];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Scale installment term amounts to reflect an applied concession.
 * Paid terms keep their gross amount (receipts were already issued).
 * Only remaining/upcoming terms are scaled proportionally.
 */
function scaleTermSchedule(
  terms: TermSchedule[],
  totalAmount: number,
  discountAmount: number,
  paidAmount: number,
): TermSchedule[] {
  if (!discountAmount || !terms.length) return terms;
  const netTotal = Math.max(0, totalAmount - discountAmount);
  const netRemaining = Math.max(0, netTotal - paidAmount);
  let cumulativeGross = 0;
  const grossInfo = terms.map(term => {
    const prev = cumulativeGross;
    cumulativeGross += term.amount;
    const grossPaid = Math.max(0, Math.min(term.amount, paidAmount - prev));
    const grossRemaining = term.amount - grossPaid;
    return { grossPaid, grossRemaining, isPaid: grossRemaining <= 0 };
  });
  const grossRemainingTotal = grossInfo.reduce((s, g) => s + g.grossRemaining, 0);
  if (grossRemainingTotal <= 0) return terms;
  const scaleFactor = netRemaining / grossRemainingTotal;
  return terms.map((term, i) => {
    const g = grossInfo[i];
    if (g.isPaid) return term;
    return { ...term, amount: g.grossPaid + Math.round(g.grossRemaining * scaleFactor) };
  });
}

/** Amount the parent should pay NOW for this fee record.
 *  Scales term amounts by discount before computing the current term due.
 *  Returns -1 if no term schedule exists (caller should fall back to pendingAmount). */
function getCurrentTermDue(
  terms: TermSchedule[],
  totalAmount: number,
  discountAmount: number,
  paidAmount: number,
): number {
  if (terms.length === 0) return -1;
  const scaled = scaleTermSchedule(terms, totalAmount, discountAmount, paidAmount);
  let cumulative = 0;
  for (const term of scaled) {
    cumulative += term.amount;
    if (paidAmount < cumulative) {
      return cumulative - paidAmount;
    }
  }
  return 0; // all terms paid
}

function getCurrentTermName(terms: TermSchedule[], paidAmount: number): string | null {
  if (terms.length === 0) return null;
  let cumulative = 0;
  for (const term of terms) {
    cumulative += term.amount;
    if (paidAmount < cumulative) {
      return term.name || `Term ${term.termNumber}`;
    }
  }
  return null;
}
