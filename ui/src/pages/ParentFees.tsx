import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee, Loader2, AlertCircle, Users, ChevronRight,
  CheckCircle, Clock, CreditCard, GraduationCap, CalendarClock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { studentApi, type StudentBasic, type StudentProfileSummary } from "@/services/api/studentApi";
import { getFeeRecords, getFeeStructureById, type FeeRecord, type FeeStructure, type TermSchedule } from "@/services/api/feeApi";
import { CashfreeTestPayButton } from "@/components/fees/CashfreeTestPayButton";
import { toast } from "sonner";

interface ChildFeeData {
  child: StudentBasic;
  feeRecords: FeeRecord[];
  feeStructures: Record<string, FeeStructure>;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  loading: boolean;
}

export default function ParentFees() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<StudentBasic[]>([]);
  const [childFees, setChildFees] = useState<ChildFeeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const childrenData = await studentApi.getMyChildren();
      setChildren(childrenData);

      const feePromises = childrenData.map(async (child) => {
        try {
          const res = await getFeeRecords(1, 50, child.id);
          const records = res.feeRecords || res.items || [];
          const totalAmount = records.reduce((s: number, r: FeeRecord) => s + r.totalAmount, 0);
          const paidAmount = records.reduce((s: number, r: FeeRecord) => s + r.paidAmount, 0);

          // Fetch fee structures for term schedule display
          const structureIds = [...new Set(records.map((r: FeeRecord) => r.feeStructureId).filter(Boolean))] as string[];
          const structureMap: Record<string, FeeStructure> = {};
          await Promise.all(
            structureIds.map(async (sid) => {
              try { structureMap[sid] = await getFeeStructureById(sid); } catch { /* skip */ }
            })
          );

          return {
            child,
            feeRecords: records,
            feeStructures: structureMap,
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
            loading: false,
          };
        } catch {
          return { child, feeRecords: [], feeStructures: {}, totalAmount: 0, paidAmount: 0, pendingAmount: 0, loading: false };
        }
      });

      const results = await Promise.all(feePromises);
      setChildFees(results);
    } catch {
      toast.error("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  };

  const totalPending = childFees.reduce((s, c) => s + c.pendingAmount, 0);
  const totalPaid = childFees.reduce((s, c) => s + c.paidAmount, 0);
  const grandTotal = childFees.reduce((s, c) => s + c.totalAmount, 0);

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

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No children linked to your account</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground mt-1">View and manage fee payments for your children</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1 text-blue-600">
              <BadgeIndianRupee className="h-4 w-4" />
              <span className="text-xs font-medium">Total Fees</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{"\u20B9"}{grandTotal.toLocaleString("en-IN")}</p>
            <p className="text-xs text-blue-500 mt-1">{children.length} child{children.length > 1 ? "ren" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{"\u20B9"}{totalPaid.toLocaleString("en-IN")}</p>
            <p className="text-xs text-green-500 mt-1">{grandTotal > 0 ? ((totalPaid / grandTotal) * 100).toFixed(0) : 0}% complete</p>
          </CardContent>
        </Card>
        <Card className={`border-amber-200 ${totalPending > 0 ? "bg-amber-50/50" : "bg-green-50/50 border-green-200"}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${totalPending > 0 ? "text-amber-600" : "text-green-600"}`}>
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Total Pending</span>
            </div>
            <p className={`text-2xl font-bold ${totalPending > 0 ? "text-amber-700" : "text-green-700"}`}>
              {"\u20B9"}{totalPending.toLocaleString("en-IN")}
            </p>
            {totalPending > 0 && <p className="text-xs text-amber-500 mt-1">Payment required</p>}
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1 text-purple-600">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Children</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{children.length}</p>
            <p className="text-xs text-purple-500 mt-1">{childFees.filter(c => c.pendingAmount > 0).length} with pending fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      {grandTotal > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Payment Progress</span>
              <span className="text-sm font-bold">{((totalPaid / grandTotal) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={(totalPaid / grandTotal) * 100} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Per-Child Fee Cards */}
      <div className="space-y-4">
        {childFees.map(cf => {
          const pctPaid = cf.totalAmount > 0 ? (cf.paidAmount / cf.totalAmount) * 100 : 0;
          const hasOutstanding = cf.feeRecords.some(r => r.status === "Overdue");

          return (
            <Card key={cf.child.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{cf.child.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cf.child.class} {cf.child.section ? `- ${cf.child.section}` : ""} | Roll No: {cf.child.rollNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasOutstanding && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                      {cf.pendingAmount === 0 ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Fully Paid</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {"\u20B9"}{cf.pendingAmount.toLocaleString("en-IN")} due
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Fee breakdown bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Paid: {"\u20B9"}{cf.paidAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="font-medium">
                        Total: {"\u20B9"}{cf.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <Progress value={pctPaid} className="h-2" />
                  </div>

                  {/* Fee records summary */}
                  {cf.feeRecords.length > 0 && (
                    <div className="space-y-2">
                      {cf.feeRecords.map(record => {
                        const structure = record.feeStructureId ? cf.feeStructures[record.feeStructureId] : null;
                        const terms = parseTermSchedule(structure);
                        return (
                        <div key={record.id} className="flex flex-col py-2 px-3 rounded-lg bg-muted/50 gap-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{record.feeStructureName || "Fee"}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {new Date(record.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium">{"\u20B9"}{record.pendingAmount.toLocaleString("en-IN")}</p>
                                <p className="text-xs text-muted-foreground">of {"\u20B9"}{record.totalAmount.toLocaleString("en-IN")}</p>
                              </div>
                              <Badge
                                variant={record.status === "Paid" ? "default" : record.status === "Overdue" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {record.status}
                              </Badge>
                            </div>
                          </div>
                          {/* Term timeline */}
                          {terms.length > 0 && (
                            <TermTimeline terms={terms} paidAmount={record.paidAmount} />
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t px-5 py-3 flex items-center justify-end gap-2 bg-muted/30">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/parent-fees/${cf.child.id}`)}>
                    View Details <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  {cf.pendingAmount > 0 && cf.feeRecords.length > 0 && (
                    <>
                      {/* Traditional Payment Flow */}
                      <Button size="sm" onClick={() => navigate(`/parent-fees/${cf.child.id}/pay`)}>
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Pay Now
                      </Button>
                      
                      {/* Test Cashfree Payment - Sample Implementation */}
                      <CashfreeTestPayButton
                        feeRecordId={cf.feeRecords[0]?.id || ""}
                        studentName={cf.child.name}
                        amount={100}
                        onPaymentSuccess={() => {
                          // Refresh fee data after successful payment
                          loadFees();
                        }}
                        size="sm"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
      // prev > 0 means previous term(s) were fully covered — overpayment spilled here = prepay
      // prev === 0 means this is the first term, genuinely partially paid
      return prev > 0 ? "prepay" : "partial";
    }
    const now = new Date();
    const due = new Date(term.dueDate);
    return due <= now ? "due" : "upcoming";
  });
}

function TermTimeline({ terms, paidAmount }: { terms: TermSchedule[]; paidAmount: number }) {
  const statuses = getTermStatuses(terms, paidAmount);
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {terms.map((term, i) => {
        const status = statuses[i];
        const label = term.name || `Term ${term.termNumber}`;
        const dueFormatted = new Date(term.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        if (status === "paid") {
          return (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              <CheckCircle className="h-3 w-3" /> {label} Paid
            </span>
          );
        }
        if (status === "prepay") {
          return (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              <CalendarClock className="h-3 w-3" /> {label} Prepaid · due {dueFormatted}
            </span>
          );
        }
        if (status === "partial") {
          return (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              <Clock className="h-3 w-3" /> {label} Partial · due {dueFormatted}
            </span>
          );
        }
        if (status === "due") {
          return (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <CalendarClock className="h-3 w-3" /> {label} Due {dueFormatted}
            </span>
          );
        }
        return (
          <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
            <CalendarClock className="h-3 w-3" /> {label} · {dueFormatted}
          </span>
        );
      })}
    </div>
  );
}
