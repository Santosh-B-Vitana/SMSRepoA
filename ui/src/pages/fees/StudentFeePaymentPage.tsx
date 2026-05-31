import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, type SiblingFeeInfo, type ConcessionType } from "@/services/api/feeApi";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface LineItemWithConcession {
  id: string;
  studentId: string;
  studentName: string;
  feeType: string;
  feeTerm: string;
  amount: number;
  status: string;
  selectedConcessionId?: string;
  discountAmount: number;
  selected: boolean;
}

interface PreviewItem {
  studentName: string;
  feeType: string;
  feeTerm: string;
  originalAmount: number;
  discountAmount: number;
  netAmount: number;
  concessionName?: string;
}

interface StudentFeePaymentPageProps {
  /** When rendered inside the parent portal, pass the childId here instead of relying on :studentId route param */
  studentIdOverride?: string;
  /** When true, the concession dropdown is hidden and only already-approved concessions are shown read-only */
  viewOnlyConcessions?: boolean;
}

export default function StudentFeePaymentPage({ studentIdOverride, viewOnlyConcessions = false }: StudentFeePaymentPageProps = {}) {
  const { studentId: studentIdParam } = useParams<{ studentId: string }>();
  const studentId = studentIdOverride ?? studentIdParam;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { academicYear } = useSchoolContext();

  // Data
  const [siblings, setSiblings] = useState<SiblingFeeInfo[]>([]);
  const [concessionTypes, setConcessionTypes] = useState<ConcessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected students (main + selected siblings)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Fee line items with concession details
  const [lineItems, setLineItems] = useState<LineItemWithConcession[]>([]);
  const [expandedFeeType, setExpandedFeeType] = useState<string>("");

  // Preview dialog
  const [showPreview, setShowPreview] = useState(false);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "cheque" | "dd" | "bank_transfer">("cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load sibling fee data
  const loadData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const [siblingData, concessionsData] = await Promise.all([
        feeApi.getSiblingInfo(studentId, academicYear || undefined),
        viewOnlyConcessions ? Promise.resolve([]) : feeApi.getConcessionTypes(),
      ]);
      setSiblings(siblingData);
      setConcessionTypes((concessionsData as ConcessionType[]).filter(c => c.isActive));

      // Set initial selected students to the anchor (main student)
      const anchor = siblingData.find(s => s.isAnchor) ?? siblingData[0];
      if (anchor) {
        setSelectedStudentIds(new Set([anchor.studentId]));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fee information");
      toast({ title: "Error", description: "Could not load fee information", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform sibling fee data into line items grouped by fee type and term
  useEffect(() => {
    if (selectedStudentIds.size === 0 || siblings.length === 0) {
      setLineItems([]);
      return;
    }

    const items: LineItemWithConcession[] = [];

    // Iterate through all selected students
    Array.from(selectedStudentIds).forEach(selStudentId => {
      // A student may have multiple fee records (e.g. two structures assigned);
      // collect all entries for this studentId so every record's line items are shown.
      const selectedEntries = siblings.filter(s => s.studentId === selStudentId);
      if (selectedEntries.length === 0) return;

      selectedEntries.forEach(selected => {
      // Track which fee heads are already present in installments so we don't double-count
      // transport / hostel when they're already baked into the structure breakdown.
      const headsInInstallments = new Set<string>();

      // Flatten installments into line items
      selected.installments?.forEach(inst => {
        const feeType = inst.feeType || selected.feeStructureName || "Fee";
        const feeTerm = inst.name || `Term ${inst.number}`;

        // If no head breakdown, add single item
        if (!inst.feeHeads || Object.keys(inst.feeHeads).length === 0) {
          items.push({
            id: `${selected.feeRecordId}-${inst.number}`,
            studentId: selected.studentId,
            studentName: selected.studentName,
            feeType,
            feeTerm,
            amount: inst.dueInInstallment,
            status: inst.status,
            discountAmount: 0,
            selected: false,
          });
        } else {
          // Add item per head
          Object.entries(inst.feeHeads).forEach(([headName, headAmount]) => {
            headsInInstallments.add(headName.toLowerCase());
            items.push({
              id: `${selected.feeRecordId}-${inst.number}-${headName}`,
              studentId: selected.studentId,
              studentName: selected.studentName,
              feeType: headName,
              feeTerm,
              amount: headAmount,
              status: inst.status,
              discountAmount: 0,
              selected: false,
            });
          });
        }
      });

      // Add Transport / Hostel monthly module fees as separate line items when the student
      // is actively enrolled and they aren't already included in installment fee heads.
      const recordKey = selected.feeRecordId ?? selected.studentId;
      if (selected.transportMonthlyFee && selected.transportMonthlyFee > 0 && !headsInInstallments.has("transport fee")) {
        items.push({
          id: `${recordKey}-transport-monthly`,
          studentId: selected.studentId,
          studentName: selected.studentName,
          feeType: "Transport Fee",
          feeTerm: "Monthly",
          amount: selected.transportMonthlyFee,
          status: "current",
          discountAmount: 0,
          selected: false,
        });
      }
      if (selected.hostelMonthlyFee && selected.hostelMonthlyFee > 0 && !headsInInstallments.has("hostel fee")) {
        items.push({
          id: `${recordKey}-hostel-monthly`,
          studentId: selected.studentId,
          studentName: selected.studentName,
          feeType: "Hostel Fee",
          feeTerm: "Monthly",
          amount: selected.hostelMonthlyFee,
          status: "current",
          discountAmount: 0,
          selected: false,
        });
      }
      }); // end selectedEntries.forEach
    });

    setLineItems(items);
  }, [selectedStudentIds, siblings]);

  // Group line items by fee type, then by student
  const groupedByFeeTypeAndStudent = useMemo(() => {
    const groups: Record<string, Record<string, LineItemWithConcession[]>> = {};
    lineItems.forEach(item => {
      if (!groups[item.feeType]) {
        groups[item.feeType] = {};
      }
      if (!groups[item.feeType][item.studentId]) {
        groups[item.feeType][item.studentId] = [];
      }
      groups[item.feeType][item.studentId].push(item);
    });
    return groups;
  }, [lineItems]);

  // Selected items for preview
  const selectedItems = lineItems.filter(item => item.selected);
  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.amount - item.discountAmount), 0);

  // Generate preview data
  const previewItems: PreviewItem[] = selectedItems.map(item => {
    const concession = item.selectedConcessionId 
      ? concessionTypes.find(c => c.id === item.selectedConcessionId)
      : undefined;
    return {
      studentName: item.studentName,
      feeType: item.feeType,
      feeTerm: item.feeTerm,
      originalAmount: item.amount,
      discountAmount: item.discountAmount,
      netAmount: item.amount - item.discountAmount,
      concessionName: concession?.name,
    };
  });

  const handleToggleLineItem = (id: string) => {
    setLineItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const handleConcessionChange = (id: string, concessionId: string) => {
    // If clearing concession
    if (!concessionId) {
      setLineItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, selectedConcessionId: undefined, discountAmount: 0 }
            : item
        )
      );
      return;
    }

    const concession = concessionTypes.find(c => c.id === concessionId);
    if (!concession) return;

    const lineItem = lineItems.find(item => item.id === id);
    if (!lineItem) return;

    // Calculate discount based on concession type
    let discountAmount = 0;
    if (concession.discountType === "Percentage") {
      discountAmount = (lineItem.amount * concession.discountValue) / 100;
      if (concession.maxDiscountAmount && discountAmount > concession.maxDiscountAmount) {
        discountAmount = concession.maxDiscountAmount;
      }
    } else {
      // Fixed amount
      discountAmount = concession.discountValue;
      if (discountAmount > lineItem.amount) {
        discountAmount = lineItem.amount;
      }
    }

    setLineItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, selectedConcessionId: concessionId, discountAmount }
          : item
      )
    );
  };

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1 text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Fee Payment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewOnlyConcessions
              ? "Select fees to pay. Concessions are managed by the school."
              : "Select fees to pay and add any applicable concessions or discounts"}
          </p>
        </div>
      </div>

      {/* Main Student Card */}
      {siblings.length > 0 && (
        <div className="space-y-4">
          {/* Primary Student */}
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Primary Student</p>
            {(() => {
              const anchor = siblings.find(s => s.isAnchor) ?? siblings[0];
              // Sum pending across ALL fee records for the anchor student (handles multi-record students)
              const anchorTotalPending = siblings
                .filter(s => s.studentId === anchor.studentId)
                .reduce((sum, s) => sum + s.pendingAmount, 0);
              return (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{anchor.studentName}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Class {anchor.class} {anchor.section} • Roll No: {anchor.studentId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Total Pending: <span className="font-semibold text-red-600">{fmt(anchorTotalPending)}</span>
                        </p>
                      </div>
                      <Badge className="bg-primary">Selected</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Siblings */}
          {siblings.filter(s => !s.isAnchor).length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4" /> Siblings
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {siblings
                  .filter(s => !s.isAnchor)
                  .map(sib => {
                    const isSelected = selectedStudentIds.has(sib.studentId);
                    return (
                      <button
                        key={sib.studentId}
                        onClick={() => {
                          setSelectedStudentIds(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(sib.studentId)) {
                              newSet.delete(sib.studentId);
                            } else {
                              newSet.add(sib.studentId);
                            }
                            return newSet;
                          });
                        }}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{sib.studentName}</h4>
                            <p className="text-sm text-slate-600 mt-1">
                              Class {sib.class} {sib.section}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Pending: <span className="font-semibold text-red-600">{fmt(sib.pendingAmount)}</span>
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedStudentIds.size === 1
              ? `Fees for ${siblings.find(s => selectedStudentIds.has(s.studentId))?.studentName}`
              : `Fees for ${selectedStudentIds.size} students`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No fees available for this student
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByFeeTypeAndStudent).map(([feeType, studentGroups]) => {
                const isExpanded = expandedFeeType === feeType;
                const allItemsInType = Object.values(studentGroups).flat();
                const typeTotal = allItemsInType.reduce((sum, item) => sum + (item.amount - item.discountAmount), 0);
                const selectedCount = allItemsInType.filter(i => i.selected).length;

                return (
                  <div key={feeType} className="border rounded-lg overflow-hidden">
                    {/* Fee Type Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFeeType(isExpanded ? "" : feeType)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-semibold text-slate-900">
                          {feeType}
                        </span>
                        <Badge variant="secondary">{allItemsInType.length} items</Badge>
                        {selectedCount > 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {selectedCount} selected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">
                          {fmt(typeTotal)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {/* Fee Items by Student */}
                    {isExpanded && (
                      <div className="divide-y">
                        {Object.entries(studentGroups).map(([studentId, studentItems]) => {
                          const studentName = studentItems[0]?.studentName || "Unknown";
                          const studentTotal = studentItems.reduce((sum, item) => sum + (item.amount - item.discountAmount), 0);
                          const studentSelectedCount = studentItems.filter(i => i.selected).length;

                          return (
                            <div key={studentId}>
                              {/* Student Sub-header */}
                              <div className="bg-slate-100 px-4 py-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{studentName}</span>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="text-xs">
                                    {studentItems.length} items
                                  </Badge>
                                  {studentSelectedCount > 0 && (
                                    <Badge className="bg-blue-50 text-blue-700 text-xs">
                                      {studentSelectedCount} selected
                                    </Badge>
                                  )}
                                  <span className="text-sm font-semibold text-slate-900">
                                    {fmt(studentTotal)}
                                  </span>
                                </div>
                              </div>

                              {/* Student's Items Table */}
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-t">
                                      <TableHead className="w-12"></TableHead>
                                      <TableHead>Term</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Concession Type</TableHead>
                                      <TableHead className="text-right">Discount</TableHead>
                                      <TableHead className="text-right">Net Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {studentItems.map(item => (
                                      <TableRow key={item.id} className="hover:bg-slate-50">
                                        {/* Checkbox */}
                                        <TableCell className="w-12">
                                          <div className="flex items-center justify-center">
                                            <Checkbox
                                              checked={item.selected}
                                              disabled={item.status === "paid"}
                                              onCheckedChange={() => handleToggleLineItem(item.id)}
                                            />
                                          </div>
                                        </TableCell>

                                        {/* Term */}
                                        <TableCell className="font-medium">
                                          {item.feeTerm}
                                        </TableCell>

                                        {/* Amount */}
                                        <TableCell className="text-right font-medium">
                                          {fmt(item.amount)}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                          <Badge
                                            variant={
                                              item.status === "paid"
                                                ? "default"
                                                : item.status === "current"
                                                ? "destructive"
                                                : "secondary"
                                            }
                                          >
                                            {item.status}
                                          </Badge>
                                        </TableCell>

                                        {/* Concession Type */}
                                        <TableCell>
                                          {viewOnlyConcessions ? (
                                            (() => {
                                              // Show admin-approved concessions for this student as read-only
                                              const sib = siblings.find(s => s.studentId === item.studentId);
                                              const appliedConcessions = sib?.concessions ?? [];
                                              return appliedConcessions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {appliedConcessions.map((c, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                      {c.name}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                              );
                                            })()
                                          ) : item.selected ? (
                                            <Select 
                                              value={item.selectedConcessionId || "none"} 
                                              onValueChange={(value) => {
                                                if (value === "none") {
                                                  handleConcessionChange(item.id, "");
                                                } else {
                                                  handleConcessionChange(item.id, value);
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="h-8 text-xs w-full">
                                                <SelectValue placeholder="Select concession..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">— No concession</SelectItem>
                                                {concessionTypes.length > 0 ? (
                                                  concessionTypes.map(concession => (
                                                    <SelectItem key={concession.id} value={concession.id}>
                                                      {concession.name}
                                                    </SelectItem>
                                                  ))
                                                ) : (
                                                  <div className="p-2 text-xs text-slate-500">No concessions available</div>
                                                )}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            "—"
                                          )}
                                        </TableCell>

                                        {/* Discount Amount (Read-only) */}
                                        <TableCell>
                                          {item.selected ? (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-slate-400">₹</span>
                                              <span className="text-xs font-medium">{item.discountAmount.toFixed(2)}</span>
                                            </div>
                                          ) : (
                                            "—"
                                          )}
                                        </TableCell>

                                        {/* Net Amount */}
                                        <TableCell className="text-right font-semibold">
                                          {fmt(item.amount - item.discountAmount)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary and Preview Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
          </p>
          <p className="text-2xl font-bold text-slate-900">
            Total to pay: {fmt(totalAmount)}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowPreview(true)}
          disabled={selectedItems.length === 0}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Preview & Pay
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {previewItems.map((item, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.feeType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.feeTerm} • {item.studentName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 line-through">
                      {fmt(item.originalAmount)}
                    </p>
                    {item.discountAmount > 0 && (
                      <p className="text-xs text-green-600">
                        Discount: −{fmt(item.discountAmount)}
                        {item.concessionName && (
                          <span className="text-slate-600 ml-1">
                            ({item.concessionName})
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary">
                      {fmt(item.netAmount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between items-center py-2 bg-slate-50 px-4 rounded-lg">
              <span className="font-semibold text-slate-900">Total Amount</span>
              <span className="text-2xl font-bold text-primary">
                {fmt(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-semibold text-slate-700">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {(["cash", "cheque", "dd", "bank_transfer"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  {m === "cash" ? "Cash" : m === "cheque" ? "Cheque" : m === "dd" ? "Demand Draft" : "NEFT / IMPS / RTGS"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Payment Date</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              {(paymentMethod === "cheque" || paymentMethod === "dd") && (
                <div>
                  <Label className="text-xs text-slate-600">{paymentMethod === "dd" ? "DD Number" : "Cheque Number"}</Label>
                  <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="h-8 text-sm mt-1" placeholder="Instrument number" />
                </div>
              )}
              {(paymentMethod === "cheque" || paymentMethod === "dd") && (
                <div>
                  <Label className="text-xs text-slate-600">Bank Name</Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-8 text-sm mt-1" placeholder="e.g. SBI, HDFC" />
                </div>
              )}
              {(paymentMethod === "cheque" || paymentMethod === "dd") && (
                <div>
                  <Label className="text-xs text-slate-600">{paymentMethod === "dd" ? "DD Date" : "Cheque Date"}</Label>
                  <Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              )}
              {paymentMethod === "bank_transfer" && (
                <div>
                  <Label className="text-xs text-slate-600">UTR / Reference Number</Label>
                  <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="h-8 text-sm mt-1" placeholder="UTR / NEFT ref" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              disabled={submitting}
              onClick={async () => {
                if ((paymentMethod === "cheque" || paymentMethod === "dd") && !chequeNumber.trim()) {
                  toast({ title: `${paymentMethod === "dd" ? "DD" : "Cheque"} number required`, variant: "destructive" });
                  return;
                }
                if (paymentMethod === "bank_transfer" && !referenceNumber.trim()) {
                  toast({ title: "UTR / Reference number required", variant: "destructive" });
                  return;
                }

                // Build per-student batch entries from selected line items
                const entryMap = new Map<string, { studentId: string; feeRecordId: string; amount: number; discount: number; lines: string[] }>();
                selectedItems.forEach(item => {
                  const sib = siblings.find(s => s.studentId === item.studentId);
                  if (!sib?.feeRecordId) return;
                  const key = sib.feeRecordId;
                  if (!entryMap.has(key)) entryMap.set(key, { studentId: sib.studentId, feeRecordId: sib.feeRecordId, amount: 0, discount: 0, lines: [] });
                  const e = entryMap.get(key)!;
                  e.amount += item.amount - item.discountAmount;
                  e.discount += item.discountAmount;
                  e.lines.push(`${item.feeType} – ${item.feeTerm}`);
                });

                const payments = Array.from(entryMap.values()).map(e => ({
                  studentId: e.studentId,
                  feeRecordId: e.feeRecordId,
                  amount: e.amount,
                  discountApplied: e.discount > 0 ? e.discount : undefined,
                  remarks: e.lines.join(", "),
                }));

                setSubmitting(true);
                try {
                  const result = await feeApi.createBatchPayment({
                    payments,
                    method: paymentMethod,
                    date: new Date(paymentDate + "T00:00:00").toISOString(),
                    chequeNumber: (paymentMethod === "cheque" || paymentMethod === "dd") ? chequeNumber || undefined : undefined,
                    chequeDate: (paymentMethod === "cheque" || paymentMethod === "dd") && chequeDate ? chequeDate : undefined,
                    bankName: (paymentMethod === "cheque" || paymentMethod === "dd") ? bankName || undefined : undefined,
                    referenceNumber: paymentMethod === "bank_transfer" ? referenceNumber || undefined : undefined,
                    notifyParents: true,
                  });
                  setShowPreview(false);
                  toast({ title: "Payment recorded", description: `${result.processed} receipt(s) created · Ref: ${result.batchRef}` });
                  navigate(-1);
                } catch (err: unknown) {
                  toast({ title: "Payment failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
                } finally {
                  setSubmitting(false);
                }
              }}
              className="gap-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Confirm Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
