import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { storeApi, StoreOrderResponse } from "@/services/api/storeApi";

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface StorePaymentProcessorProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  customerType: string;
  customerName: string;
  onPaymentSuccess: (order: StoreOrderResponse) => void;
}

const PAYMENT_GATEWAYS = [
  { id: "cash", name: "Cash", icon: Banknote, color: "bg-emerald-100 text-emerald-700", badge: "instant" },
  { id: "card", name: "Card/Debit", icon: CreditCard, color: "bg-blue-100 text-blue-700", badge: "online" },
  { id: "upi", name: "UPI", icon: Smartphone, color: "bg-purple-100 text-purple-700", badge: "online" },
];

export function StorePaymentProcessor({
  open,
  onClose,
  cartItems,
  subtotal,
  discount,
  finalAmount,
  customerType,
  customerName,
  onPaymentSuccess,
}: StorePaymentProcessorProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<StoreOrderResponse | null>(null);

  const gateway = PAYMENT_GATEWAYS.find(g => g.id === paymentMethod);
  const GatewayIcon = gateway?.icon || Banknote;

  const handleProcessPayment = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (paymentMethod !== "cash" && !paymentRef.trim()) {
      toast.error(`Please enter ${paymentMethod === "upi" ? "UPI ID" : "card reference"}`);
      return;
    }

    setProcessing(true);

    try {
      // Create the order with payment info
      const order = await storeApi.createOrder({
        customerType,
        customerName: customerName.trim(),
        items: cartItems.map(ci => ({ itemId: ci.itemId, quantity: ci.quantity })),
        paymentMethod: gateway?.name || "Cash",
        paymentReference: paymentRef || undefined,
        globalDiscount: discount,
        markAsPaid: true,
        remarks: `POS ${paymentMethod.toUpperCase()} payment`,
      });

      setCompletedOrder(order);
      setShowReceipt(true);
      toast.success("Payment processed successfully");
      onPaymentSuccess(order);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Payment failed");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setPaymentMethod("cash");
      setPaymentRef("");
      setShowReceipt(false);
      setCompletedOrder(null);
      onClose();
    }
  };

  if (showReceipt && completedOrder) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md text-center">
          <div className="pt-6 pb-4">
            <div className="rounded-full bg-emerald-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Payment Successful!</DialogTitle>
            </DialogHeader>

            <div className="my-6 space-y-3 text-left">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-mono font-semibold">{completedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{completedOrder.items?.length ?? 0} items</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                  <span>Total</span>
                  <span className="text-emerald-600">₹{completedOrder.finalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-2">Payment Method</p>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{completedOrder.paymentMethod}</Badge>
                  {completedOrder.paymentReference && (
                    <span className="text-xs text-muted-foreground">Ref: {completedOrder.paymentReference}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => {
              // Print receipt
              window.print?.();
              toast.success("Print dialog opened");
            }}>
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ({cartItems.length} items)</span>
              <span>₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>−₹{discount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total Amount</span>
              <span className="text-emerald-600">₹{finalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">CUSTOMER</p>
            <p className="font-semibold">{customerName}</p>
            <p className="text-xs text-muted-foreground">{customerType}</p>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_GATEWAYS.map(gw => (
                <button
                  key={gw.id}
                  onClick={() => {
                    setPaymentMethod(gw.id);
                    setPaymentRef("");
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === gw.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <div className={`rounded-lg p-2 mb-2 ${gw.color} w-fit mx-auto`}>
                    <gw.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium">{gw.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">{gw.badge}</Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Reference (for card/UPI) */}
          {(paymentMethod === "card" || paymentMethod === "upi") && (
            <div className="space-y-2">
              <Label>
                {paymentMethod === "upi" ? "UPI ID / Transaction ID" : "Card Reference / Last 4 digits"}
              </Label>
              <Input
                placeholder={paymentMethod === "upi" ? "user@upi or 12345678" : "Last 4 digits"}
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                maxLength={20}
              />
            </div>
          )}

          {/* Gateway Info */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-blue-900">
                <p className="font-medium">Payment Processing</p>
                <p className="text-xs mt-0.5">
                  {paymentMethod === "cash"
                    ? "Register this sale immediately"
                    : `${gateway?.name} payment will be verified before completion`}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" disabled={processing} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={processing}
            onClick={handleProcessPayment}
          >
            {processing ? "Processing..." : `Pay ₹${finalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
