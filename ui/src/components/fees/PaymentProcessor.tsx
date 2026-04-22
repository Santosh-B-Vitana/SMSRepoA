import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
}

interface PaymentProcessorProps {
  open: boolean;
  onClose: () => void;
  feeRecord: FeeRecord | null;
  onPaymentSuccess: () => void;
}

export function PaymentProcessor({
  open,
  onClose,
  feeRecord,
  onPaymentSuccess
}: PaymentProcessorProps) {
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [processing, setProcessing] = useState(false);

  const handleProcessPayment = async () => {
    if (!feeRecord || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > feeRecord.pendingAmount) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount cannot exceed pending amount",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Payment Successful",
      description: `₹${amount.toLocaleString()} received from ${feeRecord.studentName}`
    });

    setProcessing(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    onPaymentSuccess();
    onClose();
  };

  if (!feeRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Process fee payment for {feeRecord.studentName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pending Amount</Label>
            <div className="text-2xl font-bold text-destructive">
              ₹{feeRecord.pendingAmount.toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              max={feeRecord.pendingAmount}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessPayment}
              disabled={processing}
            >
              {processing ? "Processing..." : "Process Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
