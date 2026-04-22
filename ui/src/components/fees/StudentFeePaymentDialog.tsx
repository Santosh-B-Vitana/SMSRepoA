import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Tag, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Concession {
  id: string;
  type: "percentage" | "fixed";
  value: number;
  reason: string;
  appliedBy?: string;
  appliedDate?: string;
}

interface StudentFeePaymentDialogProps {
  studentId: string;
  studentName: string;
  pendingAmount: number;
  onPaymentComplete: () => void;
}

export function StudentFeePaymentDialog({
  studentId,
  studentName,
  pendingAmount,
  onPaymentComplete
}: StudentFeePaymentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // Concession/Discount states
  const [applyConcession, setApplyConcession] = useState(false);
  const [concessionType, setConcessionType] = useState<"percentage" | "fixed">("percentage");
  const [concessionValue, setConcessionValue] = useState("");
  const [concessionReason, setConcessionReason] = useState("");

  const calculateConcessionAmount = () => {
    const amount = Number(paymentAmount) || pendingAmount;
    const value = Number(concessionValue);
    if (!value || !applyConcession) return 0;
    
    if (concessionType === "percentage") {
      return (amount * value) / 100;
    }
    return value;
  };

  const getFinalAmount = () => {
    const baseAmount = Number(paymentAmount) || pendingAmount;
    return baseAmount - calculateConcessionAmount();
  };

  const handleProcessPayment = () => {
    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    const finalAmount = getFinalAmount();
    
    if (applyConcession && concessionValue && !concessionReason) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the concession",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Processing Payment",
      description: `Processing ₹${finalAmount.toLocaleString()} via ${paymentMethod}${applyConcession ? ` (Concession: ₹${calculateConcessionAmount().toLocaleString()})` : ''}...`
    });

    setTimeout(() => {
      onPaymentComplete();
      setOpen(false);
      toast({
        title: "Payment Successful",
        description: `Payment of ₹${finalAmount.toLocaleString()} processed successfully`
      });
      
      // Reset form
      setPaymentAmount("");
      setPaymentMethod("");
      setApplyConcession(false);
      setConcessionValue("");
      setConcessionReason("");
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CreditCard className="h-3 w-3 mr-1" />
          Pay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment - {studentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pending Amount</Label>
            <div className="text-2xl font-bold text-destructive">
              ₹{pendingAmount.toLocaleString()}
            </div>
          </div>

          <div>
            <Label>Payment Amount</Label>
            <Input 
              type="number"
              placeholder={`Max: ₹${pendingAmount}`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to pay full amount
            </p>
          </div>

          {/* Concession/Discount Section */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="apply-concession"
                checked={applyConcession}
                onCheckedChange={(checked) => setApplyConcession(checked as boolean)}
              />
              <Label htmlFor="apply-concession" className="flex items-center gap-2 cursor-pointer">
                <Tag className="h-4 w-4" />
                Apply Concession/Discount
              </Label>
            </div>

            {applyConcession && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={concessionType} onValueChange={(v) => setConcessionType(v as "percentage" | "fixed")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="h-3 w-3" />
                            Percentage
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      placeholder={concessionType === "percentage" ? "e.g., 10" : "e.g., 5000"}
                      value={concessionValue}
                      onChange={(e) => setConcessionValue(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Reason for Concession</Label>
                  <Input
                    placeholder="e.g., Scholarship, Sibling discount, Financial hardship"
                    value={concessionReason}
                    onChange={(e) => setConcessionReason(e.target.value)}
                  />
                </div>

                {concessionValue && (
                  <div className="bg-primary/10 p-3 rounded text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Original Amount:</span>
                      <span className="font-medium">₹{(Number(paymentAmount) || pendingAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-1 text-green-600">
                      <span>Concession ({concessionType === "percentage" ? `${concessionValue}%` : "Fixed"}):</span>
                      <span className="font-medium">- ₹{calculateConcessionAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary/20">
                      <span className="font-semibold">Final Amount:</span>
                      <span className="font-bold text-lg">₹{getFinalAmount().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="payu">PayU</SelectItem>
                <SelectItem value="paytm">Paytm</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleProcessPayment}
            className="w-full"
            size="lg"
          >
            Process Payment - ₹{getFinalAmount().toLocaleString()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
