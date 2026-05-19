import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee, ArrowLeft, Loader2, AlertCircle, CheckCircle,
  Clock, Receipt, Download, CreditCard, GraduationCap, CalendarDays,
  ChevronDown, ChevronUp, BookOpen, FlaskConical, Trophy, Bus, Home,
  Shirt, BookMarked, Wrench, HelpCircle, FileText, CalendarClock, Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { getFeeRecords, getFeeStructureById, getFeeRecordById, type FeeRecord, type FeeStructure, type PaymentTransaction, type TermSchedule } from "@/services/api/feeApi";
import { toast } from "sonner";

const FEE_HEAD_CONFIG: { key: string; label: string; icon: React.ReactNode; category: string }[] = [
  { key: "tuitionFee",     label: "Tuition Fee",           icon: <GraduationCap className="h-3.5 w-3.5" />, category: "Academic" },
  { key: "examFee",        label: "Examination Fee",       icon: <FileText className="h-3.5 w-3.5" />,      category: "Academic" },
  { key: "libraryFee",     label: "Library Fee",           icon: <BookOpen className="h-3.5 w-3.5" />,      category: "Academic" },
  { key: "labFee",         label: "Lab Fee",               icon: <FlaskConical className="h-3.5 w-3.5" />,  category: "Academic" },
  { key: "developmentFee", label: "Development Fund",      icon: <Wrench className="h-3.5 w-3.5" />,        category: "Development" },
  { key: "sportsFee",      label: "Sports / Activity Fee", icon: <Trophy className="h-3.5 w-3.5" />,        category: "Development" },
  { key: "admissionFee",   label: "Admission Fee",         icon: <FileText className="h-3.5 w-3.5" />,      category: "Other" },
  { key: "transportFee",   label: "Transport Fee",         icon: <Bus className="h-3.5 w-3.5" />,           category: "Other" },
  { key: "hostelFee",      label: "Hostel Fee",            icon: <Home className="h-3.5 w-3.5" />,          category: "Other" },
  { key: "uniformFee",     label: "Uniform Fee",           icon: <Shirt className="h-3.5 w-3.5" />,         category: "Other" },
  { key: "booksFee",       label: "Books / Stationery",    icon: <BookMarked className="h-3.5 w-3.5" />,    category: "Other" },
  { key: "miscellaneous",  label: "Miscellaneous",         icon: <HelpCircle className="h-3.5 w-3.5" />,    category: "Other" },
];

export default function ParentChildFeeDetails() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<StudentBasic | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [detailedRecords, setDetailedRecords] = useState<Record<string, FeeRecord>>({});
  const [feeStructures, setFeeStructures] = useState<Record<string, FeeStructure>>({});
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const records = feeData.feeRecords || feeData.items || [];
      setFeeRecords(records);

      // Fetch each record individually to get transport/hostel module fees
      const detailMap: Record<string, FeeRecord> = {};
      await Promise.all(
        records.map(async (r: FeeRecord) => {
          try {
            detailMap[r.id] = await getFeeRecordById(r.id);
          } catch { detailMap[r.id] = r; }
        })
      );
      setDetailedRecords(detailMap);

      // Load fee structures for each record to show detailed breakdown
      const structureIds = [...new Set(records.map(r => r.feeStructureId).filter(Boolean))] as string[];
      const structureMap: Record<string, FeeStructure> = {};
      await Promise.all(
        structureIds.map(async (sid) => {
          try {
            structureMap[sid] = await getFeeStructureById(sid);
          } catch { /* structure not found, skip */ }
        })
      );
      setFeeStructures(structureMap);
    } catch {
      toast.error("Failed to load fee details");
    } finally {
      setLoading(false);
    }
  };

  // Use detailed record data (with transport/hostel) for totals
  // Subtract applied discounts so the summary reflects the net payable (matching admin view)
  const totalAmount = feeRecords.reduce((s, r) => {
    const det = detailedRecords[r.id] ?? r;
    return s + (det.totalAmount - (det.discountAmount || 0)) + (det.transportFee ?? 0) + (det.hostelFee ?? 0);
  }, 0);
  const paidAmount = feeRecords.reduce((s, r) => s + r.paidAmount, 0);
  const totalPending = feeRecords.reduce((s, r) => {
    const det = detailedRecords[r.id] ?? r;
    return s + (det.pendingAmount ?? 0) + (det.transportFee ?? 0) + (det.hostelFee ?? 0);
  }, 0);
  const pendingAmount = totalPending;
  const discountAmount = feeRecords.reduce((s, r) => s + (r.discountAmount || 0), 0);
  const lateFeeAmount = feeRecords.reduce((s, r) => s + (r.lateFeeAmount || 0), 0);

  // Collect all payment transactions across fee records
  const allPayments: (PaymentTransaction & { feeName?: string })[] = [];
  feeRecords.forEach(record => {
    if (record.payments) {
      record.payments.forEach(p => {
        allPayments.push({ ...p, feeName: record.feeStructureName || "Fee" });
      });
    }
  });
  allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading fee details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parent-fees")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Fee Details</h1>
          {child && (
            <p className="text-muted-foreground mt-0.5">
              {child.name} | {child.class} {child.section ? `- ${child.section}` : ""}
            </p>
          )}
        </div>
        {(pendingAmount > 0 || totalPending > 0) && (
          <Button onClick={() => navigate(`/parent-fees/${childId}/pay`)}>
            <CreditCard className="h-4 w-4 mr-1.5" />
            Pay Now
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Fee" value={totalAmount} color="blue" icon={<BadgeIndianRupee className="h-4 w-4" />} />
        <SummaryCard label="Paid" value={paidAmount} color="green" icon={<CheckCircle className="h-4 w-4" />} />
        <SummaryCard label="Pending" value={totalPending} color={totalPending > 0 ? "amber" : "green"} icon={<Clock className="h-4 w-4" />} />
        <SummaryCard label="Discount" value={discountAmount} color="purple" icon={<Receipt className="h-4 w-4" />} />
        <SummaryCard label="Late Fee" value={lateFeeAmount} color={lateFeeAmount > 0 ? "red" : "green"} icon={<CalendarDays className="h-4 w-4" />} />
      </div>

      {/* Progress */}
      {totalAmount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Payment Progress</span>
              <span className="text-sm font-bold">{((paidAmount / totalAmount) * 100).toFixed(0)}% paid</span>
            </div>
            <Progress value={(paidAmount / totalAmount) * 100} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="breakdown">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">
            <Receipt className="h-4 w-4 mr-1.5" />
            Fee Breakdown
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <CreditCard className="h-4 w-4 mr-1.5" />
            Payment History ({allPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="mt-4">
          {feeRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No fee records found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {feeRecords.map(record => {
                const structure = record.feeStructureId ? feeStructures[record.feeStructureId] : null;
                const det = detailedRecords[record.id] ?? record;
                const transportFee = det.transportFee ?? 0;
                const hostelFee = det.hostelFee ?? 0;
                const moduleTotal = transportFee + hostelFee;
                // Net fee = gross minus any applied concession/discount (matches admin view)
                const effectiveTotal = (det.totalAmount - (det.discountAmount || 0)) + moduleTotal;
                const effectivePending = (det.pendingAmount ?? 0) + moduleTotal;
                const isExpanded = expandedRecord === record.id;

                // Parse per-student fee head overrides (e.g. library fee ₹1500→₹1000)
                const overrides: Record<string, number> = (() => {
                  if (!det.feeHeadOverrides) return {};
                  try { return JSON.parse(det.feeHeadOverrides) as Record<string, number>; } catch { return {}; }
                })();
                const hasOverrides = Object.keys(overrides).length > 0;
                // Total saving from fee head adjustments
                const overrideSaving = structure
                  ? Object.entries(overrides).reduce((s, [key, overrideAmt]) => {
                      const orig = (structure as any)[key] as number ?? 0;
                      return s + Math.max(0, orig - overrideAmt);
                    }, 0)
                  : 0;

                const feeHeads = structure
                  ? FEE_HEAD_CONFIG.filter(h => {
                      const effAmt = overrides[h.key] !== undefined ? overrides[h.key] : (structure as any)[h.key] as number;
                      return effAmt > 0;
                    })
                  : [];
                // componentSum uses effective (overridden) amounts so percentages are correct
                const componentSum = feeHeads.reduce((s, h) => {
                  const effAmt = overrides[h.key] !== undefined ? overrides[h.key] : (structure as any)[h.key] as number;
                  return s + effAmt;
                }, 0);

                return (
                <Card key={record.id} className={`overflow-hidden ${record.academicYear && record.academicYear < getCurrentAcademicYear() ? "border-orange-200" : ""}`}>
                  <CardContent className="p-5">
                    {record.academicYear && record.academicYear < getCurrentAcademicYear() && (
                      <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 mb-3">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span><strong>Carry-forward balance</strong> from {record.academicYear} — this amount was outstanding from the previous academic year.</span>
                      </div>
                    )}
                    {/* Savings / Concessions applied banner */}
                    {(hasOverrides || record.discountAmount > 0) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Tag className="h-3.5 w-3.5 shrink-0" />
                          Savings applied
                        </div>
                        {hasOverrides && overrideSaving > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
                            Fee adjustments: - {"\u20B9"}{overrideSaving.toLocaleString("en-IN")}
                          </span>
                        )}
                        {record.discountAmount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
                            Concession: - {"\u20B9"}{record.discountAmount.toLocaleString("en-IN")}
                          </span>
                        )}
                        <span className="text-green-600 ml-auto font-semibold">
                          Total saved: {"\u20B9"}{(overrideSaving + record.discountAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{record.feeStructureName || "Fee Record"}</h3>
                        <p className="text-xs text-muted-foreground">
                          Academic Year: {record.academicYear} | Due: {new Date(record.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <Badge variant={record.status === "Paid" ? "default" : record.status === "Overdue" ? "destructive" : "secondary"}>
                        {record.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">{"\u20B9"}{effectiveTotal.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid</p>
                        <p className="font-semibold text-green-600">{"\u20B9"}{record.paidAmount.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className={`font-semibold ${effectivePending > 0 ? "text-amber-600" : "text-green-600"}`}>
                          {"\u20B9"}{effectivePending.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Payment</p>
                        <p className="font-semibold">
                          {record.lastPaymentDate
                            ? new Date(record.lastPaymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : "\u2014"}
                        </p>
                      </div>
                    </div>
                    {record.totalAmount > 0 && (
                      <Progress value={(record.paidAmount / effectiveTotal) * 100} className="h-1.5 mt-3" />
                    )}

                    {/* Term Schedule Timeline */}
                    {(() => {
                      const terms = parseTermSchedule(structure);
                      if (terms.length === 0) return null;
                      // Scale term amounts to reflect applied concession (paid terms keep gross; remaining scale proportionally)
                      const scaledTerms = scaleTermSchedule(terms, det.totalAmount, det.discountAmount || 0, record.paidAmount);
                      const statuses = getTermStatuses(scaledTerms, record.paidAmount);
                      let cumulative = 0;
                      return (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Term Schedule</p>
                          <div className="space-y-1.5">
                            {scaledTerms.map((term, i) => {
                              const prev = cumulative;
                              cumulative += term.amount;
                              const st = statuses[i];
                              const label = term.name || `Term ${term.termNumber}`;
                              const dueFormatted = new Date(term.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
                              const fromFormatted = new Date(term.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                              const toFormatted = new Date(term.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                              // For prepay: show how much was advanced and how much remains
                              const prepaidIntoTerm = st === "prepay" ? record.paidAmount - prev : 0;
                              const remainingForTerm = st === "prepay" ? cumulative - record.paidAmount : term.amount;
                              return (
                                <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg border ${
                                  st === "paid"    ? "bg-green-50 border-green-200" :
                                  st === "prepay"  ? "bg-blue-50 border-blue-200" :
                                  st === "partial" ? "bg-amber-50 border-amber-200" :
                                  st === "due"     ? "bg-red-50 border-red-200" :
                                  "bg-muted/40 border-muted"
                                }`}>
                                  <div className={`shrink-0 ${
                                    st === "paid"    ? "text-green-600" :
                                    st === "prepay"  ? "text-blue-600" :
                                    st === "partial" ? "text-amber-600" :
                                    st === "due"     ? "text-red-600" :
                                    "text-muted-foreground"
                                  }`}>
                                    {st === "paid" ? <CheckCircle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{label}</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                        st === "paid"    ? "bg-green-100 text-green-700" :
                                        st === "prepay"  ? "bg-blue-100 text-blue-700" :
                                        st === "partial" ? "bg-amber-100 text-amber-700" :
                                        st === "due"     ? "bg-red-100 text-red-700" :
                                        "bg-muted text-muted-foreground"
                                      }`}>
                                        {st === "paid" ? "Paid" : st === "prepay" ? "Prepaid" : st === "partial" ? "Partial" : st === "due" ? "Due Now" : "Upcoming"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {fromFormatted} – {toFormatted} · Due: {dueFormatted}
                                    </p>
                                    {st === "prepay" && (
                                      <p className="text-xs text-blue-600 mt-0.5">
                                        {"\u20B9"}{prepaidIntoTerm.toLocaleString("en-IN")} advance paid · {"\u20B9"}{remainingForTerm.toLocaleString("en-IN")} remaining
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold tabular-nums">{"\u20B9"}{term.amount.toLocaleString("en-IN")}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Transport & Hostel Module Fees */}
                    {moduleTotal > 0 && (
                      <div className="mt-3 pt-3 border-t rounded-lg bg-blue-50/60 border border-blue-100 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">Module Fees (Pro-rata)</p>
                        {transportFee > 0 && (
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 text-blue-800">
                              <Bus className="h-3.5 w-3.5" />
                              Transport Fee
                              {det.transportRoute && <span className="text-[11px] text-blue-500">({det.transportRoute})</span>}
                            </span>
                            <span className="font-semibold tabular-nums">{"\u20B9"}{transportFee.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {hostelFee > 0 && (
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 text-blue-800">
                              <Home className="h-3.5 w-3.5" />
                              Hostel Fee
                              {det.hostelRoom && <span className="text-[11px] text-blue-500">(Room: {det.hostelRoom})</span>}
                            </span>
                            <span className="font-semibold tabular-nums">{"\u20B9"}{hostelFee.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-bold pt-1.5 border-t border-blue-200 mt-1">
                          <span className="text-blue-700">Module Total</span>
                          <span className="text-blue-800">{"\u20B9"}{moduleTotal.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}

                    {/* Fee Head Breakdown Toggle */}
                    {feeHeads.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                          onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Hide" : "View"} Detailed Fee Breakdown ({feeHeads.length} components)
                        </button>

                        {isExpanded && structure && (
                          <div className="mt-3 space-y-3">
                            {/* Categorised fee breakdown */}
                            {["Academic", "Development", "Other"].map(cat => {
                              const catHeads = feeHeads.filter(h => h.category === cat);
                              if (catHeads.length === 0) return null;
                              return (
                                <div key={cat}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{cat}</p>
                                  <div className="space-y-1">
                                    {catHeads.map(h => {
                                      const origAmt = (structure as any)[h.key] as number;
                                      const overrideAmt = overrides[h.key];
                                      const effectiveAmt = overrideAmt !== undefined ? overrideAmt : origAmt;
                                      const pct = componentSum > 0 ? (effectiveAmt / componentSum) * 100 : 0;
                                      const isAdjusted = overrideAmt !== undefined && overrideAmt !== origAmt;
                                      return (
                                        <div key={h.key} className={`flex items-center gap-2 text-sm rounded px-1 py-0.5 ${isAdjusted ? "bg-green-50/70" : ""}`}>
                                          <span className="text-muted-foreground shrink-0">{h.icon}</span>
                                          <span className="flex-1">{h.label}</span>
                                          {isAdjusted && (
                                            <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">adjusted</span>
                                          )}
                                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                                          <span className="font-semibold tabular-nums min-w-[80px] text-right">
                                            {isAdjusted ? (
                                              <span>
                                                <span className="line-through text-muted-foreground text-xs mr-1">{"\u20B9"}{origAmt.toLocaleString("en-IN")}</span>
                                                <span className="text-green-700">{"\u20B9"}{effectiveAmt.toLocaleString("en-IN")}</span>
                                              </span>
                                            ) : (
                                              `\u20B9${effectiveAmt.toLocaleString("en-IN")}`
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Sub-total of listed components */}
                            <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                Listed components sub-total
                                {hasOverrides && (
                                  <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200 font-medium">adjusted</span>
                                )}
                              </span>
                              <span>{"\u20B9"}{componentSum.toLocaleString("en-IN")}</span>
                            </div>
                            {/* Show gap if record total doesn't match component sum */}
                            {record.totalAmount > componentSum && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  Other fee heads
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">(not itemised)</span>
                                </span>
                                <span>+ {"\u20B9"}{(record.totalAmount - componentSum).toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            {/* Fee structure total */}
                            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
                              <span>Fee Structure Total</span>
                              <span>{"\u20B9"}{record.totalAmount.toLocaleString("en-IN")}</span>
                            </div>
                            {/* Module fees */}
                            {moduleTotal > 0 && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Module Fees (pro-rata)</span>
                                <span>+ {"\u20B9"}{moduleTotal.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            {/* Grand total */}
                            <div className="flex items-center justify-between pt-2 border-t text-sm font-bold">
                              <span>Grand Total</span>
                              <span>{"\u20B9"}{effectiveTotal.toLocaleString("en-IN")}</span>
                            </div>

                            {/* Discount & Late fee info */}
                            {(record.discountAmount > 0 || record.lateFeeAmount > 0) && (
                              <div className="space-y-1 text-sm">
                                {record.discountAmount > 0 && (
                                  <div className="flex items-center justify-between text-green-600">
                                    <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Concession applied</span>
                                    <span>- {"\u20B9"}{record.discountAmount.toLocaleString("en-IN")}</span>
                                  </div>
                                )}
                                {record.lateFeeAmount > 0 && (
                                  <div className="flex items-center justify-between text-red-600">
                                    <span>Late Fee</span>
                                    <span>+ {"\u20B9"}{record.lateFeeAmount.toLocaleString("en-IN")}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between font-bold pt-1 border-t">
                                  <span>Net Payable</span>
                                  <span>{"\u20B9"}{(record.totalAmount).toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );})}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allPayments.length === 0 ? (
                <div className="p-8 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No payment transactions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {new Date(payment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.feeName}</TableCell>
                          <TableCell className="font-semibold">{"\u20B9"}{payment.amount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="capitalize">{payment.method}</TableCell>
                          <TableCell>
                            {payment.receiptNumber ? (
                              <span className="text-xs font-mono">{payment.receiptNumber}</span>
                            ) : "\u2014"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "Completed" || payment.status === "completed" ? "default" : "secondary"}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/50 text-blue-700",
    green: "border-green-200 bg-green-50/50 text-green-700",
    amber: "border-amber-200 bg-amber-50/50 text-amber-700",
    red: "border-red-200 bg-red-50/50 text-red-700",
    purple: "border-purple-200 bg-purple-50/50 text-purple-700",
  };
  return (
    <Card className={`border ${colorMap[color] ?? ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[10px] font-medium">{label}</span></div>
        <p className="text-lg font-bold">{"\u20B9"}{value.toLocaleString("en-IN")}</p>
      </CardContent>
    </Card>
  );
}

// ── Term helpers ────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return (now.getMonth() + 1) >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
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

type TermStatus = "paid" | "prepay" | "partial" | "due" | "upcoming";

function getTermStatuses(terms: TermSchedule[], paidAmount: number): TermStatus[] {
  let cumulative = 0;
  return terms.map(term => {
    const prev = cumulative;
    cumulative += term.amount;
    if (paidAmount >= cumulative) return "paid";
    if (paidAmount > prev) {
      return prev > 0 ? "prepay" : "partial";
    }
    const now = new Date();
    const due = new Date(term.dueDate);
    return due <= now ? "due" : "upcoming";
  });
}

/**
 * Scale installment term amounts to reflect an applied concession.
 * Paid terms keep their gross amount (receipts were issued at that price).
 * Only remaining (partial/upcoming) terms are scaled proportionally.
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
    if (g.isPaid) return term; // preserve gross — receipt issued at this price
    return { ...term, amount: g.grossPaid + Math.round(g.grossRemaining * scaleFactor) };
  });
}
