
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CreditCard, Receipt, Download } from "lucide-react";
import { generateProfessionalFeeReceipt } from "@/utils/professionalPdfGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  feeType: string;
  academicYear: string;
}

interface PaymentTransaction {
  id: string;
  studentId: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  receiptNumber: string;
}

export function ParentFeePayment({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Mock data - would be fetched from API
  const [allFeeRecords] = useState<FeeRecord[]>([
    {
      id: "FEE001",
      studentId: "STU001",
      studentName: "Alice Johnson",
      class: "10-A",
      totalAmount: 45000,
      paidAmount: 25000,
      pendingAmount: 20000,
      dueDate: "2024-04-15",
      status: "partial",
      feeType: "Tuition Fee - Q2",
      academicYear: "2023-24"
    },
    {
      id: "FEE002", 
      studentId: "STU001",
      studentName: "Alice Johnson",
      class: "10-A",
      totalAmount: 5000,
      paidAmount: 0,
      pendingAmount: 5000,
      dueDate: "2024-04-30",
      status: "pending",
      feeType: "Transport Fee - April",
      academicYear: "2023-24"
    },
    {
      id: "FEE003",
      studentId: "STU002",
      studentName: "Rohan Mehra",
      class: "10-A",
      totalAmount: 45000,
      paidAmount: 0,
      pendingAmount: 45000,
      dueDate: "2024-04-15",
      status: "overdue",
      feeType: "Tuition Fee - Q2",
      academicYear: "2023-24"
    }
  ]);

  const [allPaymentTransactions] = useState<PaymentTransaction[]>([
    {
      id: "TXN001",
      studentId: "STU001",
      amount: 25000,
      method: "razorpay",
      status: "completed",
      timestamp: "2024-03-10T10:30:00Z",
      receiptNumber: "RCP001"
    }
  ]);

  // Filter for this student
  const feeRecords = allFeeRecords.filter(f => f.studentId === studentId);
  const paymentTransactions = allPaymentTransactions.filter(t => t.studentId === studentId);

  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  // Mock school data - would be fetched from context/API
  const schoolInfo = {
  name: "Vitana Schools",
    address: "123 Education Street, Delhi 110001",
    phone: "+91-11-12345678",
  email: "info@vitanaSchools.edu",
    affiliationNo: "DL001234",
    schoolCode: "GWA001"
  };

  const processPayment = (feeId: string, amount: number, method: string) => {
    toast({
      title: "Payment Processing",
      description: `Processing ₹${amount.toLocaleString()} payment via ${method}...`,
    });

    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: `Payment of ₹${amount.toLocaleString()} processed successfully`,
      });
    }, 2000);
  };

  const generateReceipt = (transactionId: string) => {
    const transaction = paymentTransactions.find(t => t.id === transactionId);
    const feeRecord = feeRecords.find(f => f.studentId === transaction?.studentId);
    
    if (!transaction || !feeRecord || !schoolInfo) {
      toast({
        title: "Error",
        description: "Unable to generate receipt",
        variant: "destructive"
      });
      return;
    }

    const receiptData = {
      receiptNo: transaction.receiptNumber,
      date: new Date(transaction.timestamp).toLocaleDateString('en-IN'),
      studentName: feeRecord.studentName,
      studentId: feeRecord.studentId,
      class: feeRecord.class,
      academicYear: feeRecord.academicYear,
      totalAmount: feeRecord.totalAmount,
      paidAmount: transaction.amount,
      outstandingAmount: feeRecord.pendingAmount,
      paymentMethod: transaction.method,
      transactionId: transaction.id,
      paymentDate: new Date(transaction.timestamp).toLocaleDateString('en-IN'),
      feeType: feeRecord.feeType
    };

    generateProfessionalFeeReceipt(schoolInfo, receiptData);

    toast({
      title: "Receipt Generated",
      description: "Receipt downloaded successfully",
    });
  };

  const getTotalOutstanding = () => {
    return feeRecords.reduce((total, record) => total + record.pendingAmount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fee Payment Portal</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          Outstanding: ₹{getTotalOutstanding().toLocaleString()}
        </Badge>
      </div>
      <Tabs defaultValue="outstanding">
        <TabsList className="mb-4">
          <TabsTrigger value="outstanding">Outstanding Fees</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Outstanding Fees</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeRecords.filter(record => record.pendingAmount > 0).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.feeType}</TableCell>
                      <TableCell>₹{record.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>₹{record.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        ₹{record.pendingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{new Date(record.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === 'overdue' ? 'destructive' :
                          record.status === 'partial' ? 'secondary' : 'outline'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay Now
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pay Fee - {record.feeType}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <p><strong>Student:</strong> {record.studentName}</p>
                                <p><strong>Class:</strong> {record.class}</p>
                                <p><strong>Outstanding Amount:</strong> ₹{record.pendingAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label>Payment Amount</Label>
                                <Input 
                                  type="number"
                                  placeholder={`Max: ₹${record.pendingAmount}`}
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Payment Gateway</Label>
                                <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="razorpay">Razorpay (Cards, UPI, Wallets)</SelectItem>
                                    <SelectItem value="payu">PayU (All Payment Methods)</SelectItem>
                                    <SelectItem value="paytm">Paytm (UPI, Wallet, Cards)</SelectItem>
                                    <SelectItem value="phonepe">PhonePe (UPI, Cards)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                onClick={() => processPayment(record.id, Number(paymentAmount), selectedPayment)}
                                className="w-full"
                                disabled={!paymentAmount || !selectedPayment}
                              >
                                Proceed to Payment
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium">{txn.receiptNumber}</TableCell>
                      <TableCell>₹{txn.amount.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{txn.method}</TableCell>
                      <TableCell>{new Date(txn.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generateReceipt(txn.id)}
                        >
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
