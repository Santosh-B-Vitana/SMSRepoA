import { useState, useEffect } from "react";
import { CreditCard, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/services/api/apiClient";
import { toast } from "sonner";

// Cashfree SDK type declaration
declare global {
  interface Window {
    Cashfree?: any;
  }
}

interface CashfreeTestPayButtonProps {
  feeRecordId: string;
  studentName: string;
  amount: number;
  onPaymentSuccess?: () => void;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentSessionId: string;
  paymentLink: string;
  redirectUrl: string;
  orderId: string;
  amount: number;
  currency: string;
  studentName: string;
  feeRecordId: string;
  message: string;
}

/**
 * Test Pay Fee Button - Cashfree Payment Integration
 * 
 * Features:
 * - Initiates Cashfree redirect payment flow using SDK v3
 * - Shows payment details before confirmation
 * - Handles payment session creation
 * - Uses Cashfree SDK v3 checkout() method for better UX
 * - Supports test mode and production mode
 * 
 * Mode Determination:
 * - Sandbox/Test Mode: Backend creates session with test credentials (Mode='Test')
 * - Production Mode: Backend creates session with production credentials (Mode='Production')
 * - The SDK automatically detects mode from the session ID
 * 
 * SDK v3 API:
 * - SDK is exported as a function: const cf = Cashfree()
 * - Call cf.checkout({ paymentSessionId }) to open payment interface
 * - SDK handles all payment flow and redirects internally
 * 
 * Flow:
 * 1. Parent clicks "Test Pay Fee" button
 * 2. Confirms payment in dialog
 * 3. Backend creates Cashfree order (determines mode here)
 * 4. Returns paymentSessionId to frontend
 * 5. SDK v3 checkout() opens payment interface
 * 6. Parent completes payment on Cashfree
 * 7. Callback webhook updates fee record
 * 8. Parent redirected back to app
 * 
 * Documentation:
 * - https://www.cashfree.com/docs/payments/online/web/redirect
 * - SDK v3: https://sdk.cashfree.com/js/v3/cashfree.js
 */
export function CashfreeTestPayButton({
  feeRecordId,
  studentName,
  amount,
  onPaymentSuccess,
  variant = "default",
  size = "default",
}: CashfreeTestPayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load Cashfree SDK when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    // Check if SDK is already loaded
    if (window.Cashfree) {
      setSdkLoaded(true);
      return;
    }

    // Load Cashfree SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;

    script.onload = () => {
      setSdkLoaded(true);
      console.log("Cashfree SDK v3 loaded successfully");
    };

    script.onerror = () => {
      setError("Failed to load Cashfree SDK. Please try again.");
      console.error("Failed to load Cashfree SDK");
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: don't remove the script as we might reuse it
    };
  }, [isOpen]);

  const handlePaymentClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate SDK is loaded
      if (!window.Cashfree) {
        throw new Error("Cashfree SDK not loaded. Please try again.");
      }

      // Step 1: Call backend to initiate Cashfree payment
      // Backend Mode setting determines Sandbox (Test) vs Production
      const response = await apiClient.post<PaymentResponse>(
        `/fees/test-pay-cashfree`,
        {
          feeRecordId,
          amount,
          returnUrl: `${window.location.origin}/parent-fees/payment-callback`,
          notifyUrl: `${window.location.origin}/api/payment-gateway/webhook/cashfree`,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to initiate payment");
      }

      setPaymentInitiated(true);
      toast.success("Payment initiated successfully!");
      console.log("Payment Response:", response.data);

      // Step 2: Open Cashfree checkout using SDK checkout() method
      // The SDK automatically determines Sandbox/Production based on the session ID
      const { paymentSessionId } = response.data;

      if (!paymentSessionId) {
        throw new Error("No payment session ID received from gateway");
      }

      // Use Cashfree SDK v3 checkout() method
      try {
        const cashfree = window.Cashfree;

        console.log(
          "Opening Cashfree v3 checkout with session:",
          paymentSessionId
        );
        console.log("Cashfree SDK object:", cashfree);

        if (typeof cashfree === "function") {
          // v3 SDK exports a function, call it to get instance
          const cf = cashfree({
            mode: 'sandbox'
          });
          console.log("Cashfree instance:", cf);
          console.log("Instance methods:", Object.keys(cf || {}));

          // Call checkout on the instance
          const result = await cf.checkout({
            paymentSessionId: paymentSessionId,
          });

          console.log("Checkout result:", result);
        } else {
          throw new Error("Cashfree SDK not available or not a function");
        }
      } catch (sdkError: any) {
        console.error("SDK checkout error:", sdkError);
        console.error("SDK error message:", sdkError?.message);
        console.error("SDK error stack:", sdkError?.stack);
        setError(
          `Checkout error: ${sdkError?.message || "Could not open checkout. Please try again."}`
        );
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to initiate payment. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
      setPaymentInitiated(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Pay Fee Button */}
      <Button
        onClick={() => setIsOpen(true)}
        disabled={isLoading || amount <= 0}
        variant={variant}
        size={size}
        className="gap-2"
      >
        <CreditCard className="h-4 w-4" />
        {isLoading ? "Processing..." : "Test Pay Fee"}
      </Button>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Cashfree Payment</DialogTitle>
            <DialogDescription>
              Secure payment via Cashfree Payments India
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Test Mode Badge */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="flex items-center gap-2">
                <Badge variant="secondary">TEST MODE</Badge>
                <span className="text-sm">
                  This is a test payment. Use test card credentials.
                </span>
              </AlertDescription>
            </Alert>

            {/* Payment Details Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student Name</span>
                  <span className="font-medium">{studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount Due</span>
                  <span className="font-medium text-lg">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fee Record ID</span>
                  <span className="font-mono text-xs text-gray-500">
                    {feeRecordId.substring(0, 8)}...
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-green-600">
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {paymentInitiated && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Payment session created! Redirecting to Cashfree...
                </AlertDescription>
              </Alert>
            )}

            {/* Test Card Info */}
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Test Card Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  <span className="font-mono text-gray-700">Card: 4111111111111111</span>
                </div>
                <div>
                  <span className="font-mono text-gray-700">Expiry: Any future date</span>
                </div>
                <div>
                  <span className="font-mono text-gray-700">CVV: Any 3 digits</span>
                </div>
              </CardContent>
            </Card>

            {/* Cashfree Info */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-xs text-amber-800">
                <strong>Note:</strong> You will be redirected to Cashfree's secure payment page.
                After payment, you'll be redirected back to this app.
              </AlertDescription>
            </Alert>

            {/* SDK Loading Status */}
            {!sdkLoaded && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="flex items-center gap-2 text-yellow-800 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Cashfree payment gateway...
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaymentClick}
                disabled={isLoading || paymentInitiated || !sdkLoaded}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : !sdkLoaded ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading SDK...
                  </>
                ) : paymentInitiated ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay ₹{amount.toLocaleString()}
                  </>
                )}
              </Button>
            </div>

            {/* Documentation Link */}
            <div className="text-center pt-2 border-t">
              <a
                href="https://www.cashfree.com/docs/payments/online/web/redirect"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View Cashfree Documentation →
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CashfreeTestPayButton;
