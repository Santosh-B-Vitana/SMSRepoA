
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Receipt, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getFeeRecords, generateReceipt, FeeRecord, PaymentTransaction } from "@/services/api/feeApi";

function statusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "paid") return "default";
  if (status === "overdue") return "destructive";
  if (status === "partial") return "secondary";
  return "outline";
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function ParentFeePayment({ studentId }: { studentId: string }) {
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    getFeeRecords(1, 100, studentId)
      .then(res => setRecords(res.feeRecords ?? []))
      .catch(() => setError("Could not load fee records."))
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleDownloadReceipt = async (paymentId: string, receiptNumber?: string) => {
    setGeneratingReceipt(paymentId);
    try {
      const html = await generateReceipt(paymentId);
      const win = window.open("", "_blank", "width=860,height=700");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 600);
      }
      toast.success(`Receipt ${receiptNumber ?? ""} opened`);
    } catch {
      toast.error("Could not generate receipt");
    } finally {
      setGeneratingReceipt(null);
    }
  };

  // Flatten all payments across all records for history tab
  const allPayments: Array<PaymentTransaction & { feeStructureName?: string; studentName?: string }> = records
    .flatMap(r => (r.payments ?? []).map(p => ({
      ...p,
      feeStructureName: r.feeStructureName,
      studentName: r.studentName,
    })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalOutstanding = records.reduce((s, r) => s + (r.pendingAmount ?? 0), 0);
  const pendingRecords = records.filter(r => (r.pendingAmount ?? 0) > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading fee records…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive py-6">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No fee records found for this student.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Fee Summary</h3>
        <Badge variant={totalOutstanding > 0 ? "destructive" : "default"} className="text-sm px-3 py-1">
          Outstanding: {inr(totalOutstanding)}
        </Badge>
      </div>

      <Tabs defaultValue="outstanding">
        <TabsList className="mb-3">
          <TabsTrigger value="outstanding">Outstanding Fees{pendingRecords.length > 0 && ` (${pendingRecords.length})`}</TabsTrigger>
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="history">Payment History{allPayments.length > 0 && ` (${allPayments.length})`}</TabsTrigger>
        </TabsList>

        {/* Outstanding / pending */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Outstanding Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All fees are cleared. No outstanding dues.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Structure / Year</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRecords.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          <div>{rec.feeStructureName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{rec.academicYear}</div>
                        </TableCell>
                        <TableCell className="text-right">{inr(rec.totalAmount)}</TableCell>
                        <TableCell className="text-right text-green-600">{inr(rec.paidAmount)}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">{inr(rec.pendingAmount)}</TableCell>
                        <TableCell>{rec.dueDate ? new Date(rec.dueDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(rec.status)}>{rec.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All records */}
        <TabsContent value="all">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Structure / Year</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(rec => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">
                        <div>{rec.feeStructureName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{rec.academicYear}</div>
                      </TableCell>
                      <TableCell className="text-right">{inr(rec.totalAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{inr(rec.paidAmount)}</TableCell>
                      <TableCell className="text-right text-red-600">{inr(rec.pendingAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(rec.status)}>{rec.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment history */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {allPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Structure</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPayments.map(txn => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-medium text-xs">{txn.receiptNumber ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{txn.feeStructureName ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{inr(txn.amount)}</TableCell>
                        <TableCell className="capitalize text-xs">{txn.method}</TableCell>
                        <TableCell className="text-xs">{new Date(txn.date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={txn.status === "completed" || txn.status === "success" ? "default" : "secondary"} className="text-xs">
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={generatingReceipt === txn.id}
                            onClick={() => handleDownloadReceipt(txn.id, txn.receiptNumber)}
                          >
                            {generatingReceipt === txn.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Receipt className="h-3 w-3" />}
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
