import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  lastPaymentDate?: string;
  academicYear: string;
  siblings?: {
    id: string;
    name: string;
    class: string;
    pendingAmount: number;
  }[];
}

interface InstallmentPlan {
  studentId: string;
  studentName: string;
  totalFee: number;
  academicYear: string;
  installments: {
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: string;
    paidDate?: string;
    lateFee: number;
  }[];
}

interface FeeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  feeRecord: FeeRecord | null;
  installmentPlans: InstallmentPlan[];
  academicYear: string;
}

export function FeeDetailsDialog({
  open,
  onClose,
  feeRecord,
  installmentPlans,
  academicYear
}: FeeDetailsDialogProps) {
  if (!feeRecord) return null;

  const studentInstallments = installmentPlans.find(
    plan => plan.studentId === feeRecord.studentId && plan.academicYear === academicYear
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Details - {feeRecord.studentName}</DialogTitle>
          <DialogDescription>
            Class {feeRecord.class} | Academic Year {academicYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">₹{feeRecord.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span className="font-semibold text-success">₹{feeRecord.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Amount:</span>
                <span className="font-semibold text-destructive">₹{feeRecord.pendingAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-semibold">{new Date(feeRecord.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge>{feeRecord.status}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Installments */}
          {studentInstallments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Installment Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Installment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentInstallments.installments.map((inst) => (
                      <TableRow key={inst.installmentNumber}>
                        <TableCell>#{inst.installmentNumber}</TableCell>
                        <TableCell>₹{inst.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={inst.status === 'paid' ? 'default' : 'secondary'}>
                            {inst.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inst.paidDate ? new Date(inst.paidDate).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Siblings */}
          {feeRecord.siblings && feeRecord.siblings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sibling Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Pending Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeRecord.siblings.map((sibling) => (
                      <TableRow key={sibling.id}>
                        <TableCell>{sibling.name}</TableCell>
                        <TableCell>{sibling.class}</TableCell>
                        <TableCell className="text-destructive">
                          ₹{sibling.pendingAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
