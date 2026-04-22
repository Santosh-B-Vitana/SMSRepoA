import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, Receipt, CreditCard, Download, User } from "lucide-react";
import { toast } from "sonner";

interface FeeRecord {
  id: string;
  feeType: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  academicYear: string;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  receiptNumber: string;
  feeType: string;
}

export default function StudentFeeDetails() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [selectedPayment, setSelectedPayment] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  // Mock student data
  const studentInfo = {
    id: studentId,
    name: "Aarav Gupta",
    rollNo: "001",
    class: "10-A",
    academicYear: "2024-25"
  };

  // Mock fee records for this student
  const [feeRecords] = useState<FeeRecord[]>([
    {
      id: "FEE001",
      feeType: "Tuition Fee - Q1",
      totalAmount: 45000,
      paidAmount: 45000,
      pendingAmount: 0,
      dueDate: "2024-07-15",
      status: "paid",
      academicYear: "2024-25"
    },
    {
      id: "FEE002",
      feeType: "Tuition Fee - Q2",
      totalAmount: 45000,
      paidAmount: 25000,
      pendingAmount: 20000,
      dueDate: "2024-10-15",
      status: "partial",
      academicYear: "2024-25"
    },
    {
      id: "FEE003",
      feeType: "Transport Fee - Oct",
      totalAmount: 5000,
      paidAmount: 0,
      pendingAmount: 5000,
      dueDate: "2024-10-01",
      status: "overdue",
      academicYear: "2024-25"
    },
    {
      id: "FEE004",
      feeType: "Library Fee",
      totalAmount: 2000,
      paidAmount: 0,
      pendingAmount: 2000,
      dueDate: "2024-11-01",
      status: "pending",
      academicYear: "2024-25"
    }
  ]);

  // Mock payment history
  const [paymentHistory] = useState<PaymentTransaction[]>([
    {
      id: "TXN001",
      amount: 45000,
      method: "razorpay",
      status: "completed",
      timestamp: "2024-07-10T10:30:00Z",
      receiptNumber: "RCP001",
      feeType: "Tuition Fee - Q1"
    },
    {
      id: "TXN002", 
      amount: 25000,
      method: "paytm",
      status: "completed",
      timestamp: "2024-09-15T14:20:00Z",
      receiptNumber: "RCP002",
      feeType: "Tuition Fee - Q2 (Partial)"
    }
  ]);

  const processPayment = (feeId: string, amount: number, method: string) => {
    toast.success(`Processing payment of ₹${amount.toLocaleString()} via ${method}`);
    // Simulate payment processing
    setTimeout(() => {
      toast.success("Payment completed successfully!");
    }, 2000);
  };

  const generateReceipt = (transactionId: string) => {
    const transaction = paymentHistory.find(t => t.id === transactionId);
    if (!transaction) return;

    // Create and download receipt
    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .content { margin: 20px 0; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Vitana Schools</h1>
            <p>123 Education Street, Delhi 110001</p>
          </div>
          <div class="content">
            <h2>Fee Payment Receipt</h2>
            <p><strong>Receipt No:</strong> ${transaction.receiptNumber}</p>
            <p><strong>Student:</strong> ${studentInfo.name} (${studentInfo.rollNo})</p>
            <p><strong>Class:</strong> ${studentInfo.class}</p>
            <p><strong>Fee Type:</strong> ${transaction.feeType}</p>
            <p><strong>Amount:</strong> ₹${transaction.amount.toLocaleString()}</p>
            <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${transaction.status.toUpperCase()}</p>
          </div>
          <div class="footer">
            <p>This is a computer-generated receipt.</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${transaction.receiptNumber}_${studentInfo.name}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Receipt downloaded successfully");
  };

  const getTotalOutstanding = () => {
    return feeRecords.reduce((total, record) => total + record.pendingAmount, 0);
  };

  const getTotalPaid = () => {
    return feeRecords.reduce((total, record) => total + record.paidAmount, 0);
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={() => navigate(-1)} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Student Fee Details</h1>
          <p className="text-muted-foreground">
            {studentInfo.name} • Roll No: {studentInfo.rollNo} • Class: {studentInfo.class}
          </p>
        </div>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Paid</div>
                <div className="text-xl font-semibold text-green-600">₹{getTotalPaid().toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Outstanding</div>
                <div className="text-xl font-semibold text-red-600">₹{getTotalOutstanding().toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Academic Year</div>
                <div className="text-xl font-semibold">{studentInfo.academicYear}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="outstanding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding Fees</TabsTrigger>
          <TabsTrigger value="all">All Fees</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Fees</CardTitle>
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
                              Pay
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pay Fee - {record.feeType}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <p><strong>Student:</strong> {studentInfo.name}</p>
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
                                    <SelectItem value="razorpay">Razorpay</SelectItem>
                                    <SelectItem value="payu">PayU</SelectItem>
                                    <SelectItem value="paytm">Paytm</SelectItem>
                                    <SelectItem value="phonepe">PhonePe</SelectItem>
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

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Fee Records</CardTitle>
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
                  {feeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.feeType}</TableCell>
                      <TableCell>₹{record.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>₹{record.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className={record.pendingAmount > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        ₹{record.pendingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{new Date(record.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === 'paid' ? 'default' :
                          record.status === 'overdue' ? 'destructive' :
                          record.status === 'partial' ? 'secondary' : 'outline'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'paid' && (
                          <Button variant="outline" size="sm">
                            <Receipt className="h-3 w-3 mr-1" />
                            Receipt
                          </Button>
                        )}
                        {record.pendingAmount > 0 && (
                          <Button size="sm">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
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
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium">{txn.receiptNumber}</TableCell>
                      <TableCell>{txn.feeType}</TableCell>
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