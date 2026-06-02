/**
 * Example Usage: Cashfree Test Pay Fee Implementation
 * 
 * This file shows how to use the "Test Pay Fee" button and payment flow
 * in your parent portal application.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. BACKEND USAGE: Calling the test-pay-cashfree Endpoint
// ═══════════════════════════════════════════════════════════════════════════

// Example 1: Basic Payment Initiation
async function initiateTestPayment() {
  const feeRecordId = "550e8400-e29b-41d4-a716-446655440000";
  const amount = 5000; // ₹5000

  try {
    const response = await fetch("/api/fees/test-pay-cashfree", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer <auth-token>"
      },
      body: JSON.stringify({
        feeRecordId,
        amount,
        returnUrl: "https://app.yourdomain.com/parent-fees/payment-callback",
        notifyUrl: "https://app.yourdomain.com/api/payment-gateway/webhook/cashfree"
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Payment initiated:", data);

    // Redirect to Cashfree checkout
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  } catch (error) {
    console.error("Payment failed:", error);
  }
}

// Example 2: Payment with Full Pending Amount
async function initiateFullPayment(feeRecordId: string) {
  try {
    const response = await fetch("/api/fees/test-pay-cashfree", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        feeRecordId: feeRecordId,
        // amount is optional - defaults to full pending amount
      })
    });

    const data = await response.json();
    if (data.success) {
      window.location.href = data.redirectUrl;
    }
  } catch (error) {
    console.error("Payment initiation failed:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. FRONTEND: Using the CashfreeTestPayButton Component
// ═══════════════════════════════════════════════════════════════════════════

// Example 3: Simple Button Usage
import { CashfreeTestPayButton } from "@/components/fees/CashfreeTestPayButton";

export function SimplePaymentExample() {
  return (
    <CashfreeTestPayButton
      feeRecordId="550e8400-e29b-41d4-a716-446655440000"
      studentName="John Doe"
      amount={5000}
      onPaymentSuccess={() => {
        console.log("Payment successful!");
        // Refresh fee data or redirect
      }}
      size="sm"
    />
  );
}

// Example 4: Payment Button with Custom Callbacks
export function AdvancedPaymentExample() {
  const [isPaymentComplete, setIsPaymentComplete] = React.useState(false);

  const handlePaymentSuccess = () => {
    setIsPaymentComplete(true);
    // Trigger fee record refresh
    loadFeeData();
    // Show success message
    toast.success("Payment completed successfully!");
    // Optionally navigate to receipt page
    setTimeout(() => {
      navigate("/parent-fees/receipt");
    }, 2000);
  };

  return (
    <div>
      <CashfreeTestPayButton
        feeRecordId="550e8400-e29b-41d4-a716-446655440000"
        studentName="Jane Doe"
        amount={10000}
        onPaymentSuccess={handlePaymentSuccess}
        variant="default"
        size="default"
      />
      {isPaymentComplete && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-green-800">Payment received! Your fee record will be updated shortly.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. INTEGRATION: Adding to Parent Portal
// ═══════════════════════════════════════════════════════════════════════════

// Example 5: Integration in Fee Card Component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CashfreeTestPayButton } from "@/components/fees/CashfreeTestPayButton";

interface FeeCardProps {
  studentId: string;
  studentName: string;
  feeRecordId: string;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export function FeeCard({
  studentId,
  studentName,
  feeRecordId,
  totalAmount,
  pendingAmount,
  paidAmount
}: FeeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{studentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="flex justify-between">
          <span>Total: ₹{totalAmount.toLocaleString()}</span>
          <span>Paid: ₹{paidAmount.toLocaleString()}</span>
          <Badge variant={pendingAmount > 0 ? "destructive" : "default"}>
            {pendingAmount > 0 ? `₹${pendingAmount.toLocaleString()} Due` : "Paid"}
          </Badge>
        </div>

        {/* Payment Buttons */}
        {pendingAmount > 0 && (
          <div className="flex gap-2">
            {/* Traditional payment method */}
            <Button variant="outline">
              Traditional Payment
            </Button>

            {/* Test Cashfree Payment */}
            <CashfreeTestPayButton
              feeRecordId={feeRecordId}
              studentName={studentName}
              amount={pendingAmount}
              onPaymentSuccess={() => {
                // Refresh parent component
                window.location.reload();
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PAYMENT FLOW: Step-by-step Implementation
// ═══════════════════════════════════════════════════════════════════════════

// Example 6: Complete Payment Flow
interface PaymentFlowState {
  step: "selection" | "confirmation" | "processing" | "success" | "error";
  selectedFeeRecords: string[];
  totalAmount: number;
  error: string | null;
}

export function CompletePaymentFlow() {
  const [state, setState] = React.useState<PaymentFlowState>({
    step: "selection",
    selectedFeeRecords: [],
    totalAmount: 0,
    error: null
  });

  // Step 1: Select fees to pay
  const handleSelectFees = (feeRecordIds: string[], amounts: number[]) => {
    setState({
      ...state,
      step: "confirmation",
      selectedFeeRecords: feeRecordIds,
      totalAmount: amounts.reduce((a, b) => a + b, 0)
    });
  };

  // Step 2: Confirm and initiate payment
  const handleConfirmPayment = async () => {
    setState({ ...state, step: "processing" });

    try {
      const response = await fetch("/api/fees/test-pay-cashfree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feeRecordId: state.selectedFeeRecords[0],
          amount: state.totalAmount
        })
      });

      if (!response.ok) {
        throw new Error("Payment initiation failed");
      }

      const data = await response.json();
      
      // Step 3: Success - redirect
      if (data.redirectUrl) {
        setState({ ...state, step: "success" });
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1500);
      }
    } catch (error) {
      setState({
        ...state,
        step: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Render based on step
  switch (state.step) {
    case "selection":
      return <div>Select fees to pay...</div>;
    case "confirmation":
      return (
        <div>
          <h2>Confirm Payment</h2>
          <p>Amount: ₹{state.totalAmount.toLocaleString()}</p>
          <Button onClick={handleConfirmPayment}>Proceed to Payment</Button>
        </div>
      );
    case "processing":
      return <div>Processing... Redirecting to Cashfree...</div>;
    case "success":
      return <div>Payment initiated successfully! Redirecting...</div>;
    case "error":
      return <div>Error: {state.error}</div>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ERROR HANDLING: Common Scenarios
// ═══════════════════════════════════════════════════════════════════════════

// Example 7: Robust Error Handling
async function handlePaymentWithErrorHandling() {
  try {
    const response = await fetch("/api/fees/test-pay-cashfree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeRecordId: "550e8400-e29b-41d4-a716-446655440000"
      })
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          console.error("Bad request:", errorData.message);
          break;
        case 403:
          console.error("Unauthorized - cannot access this child's fees");
          break;
        case 404:
          console.error("Fee record not found");
          break;
        case 500:
          console.error("Server error - please try again");
          break;
        default:
          console.error("Unexpected error:", errorData.message);
      }
      throw new Error(errorData.message);
    }

    const data = await response.json();
    
    // Validate response
    if (!data.success) {
      throw new Error(data.message || "Payment initiation failed");
    }

    if (!data.redirectUrl) {
      throw new Error("No redirect URL received");
    }

    // Redirect
    window.location.href = data.redirectUrl;

  } catch (error) {
    if (error instanceof Error) {
      console.error("Payment error:", error.message);
      // Show user-friendly error message
      showErrorToast(getErrorMessage(error.message));
    } else {
      console.error("Unknown error:", error);
      showErrorToast("An unexpected error occurred. Please try again.");
    }
  }
}

// Helper function to get user-friendly error message
function getErrorMessage(error: string): string {
  if (error.includes("not found")) return "Fee record not found. Please refresh and try again.";
  if (error.includes("Unauthorized")) return "You can only pay for your own child's fees.";
  if (error.includes("pending")) return "No pending fees to pay.";
  if (error.includes("configured")) return "Payment gateway not configured. Please contact support.";
  return "Payment initiation failed. Please try again.";
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. TESTING: Unit Tests Example
// ═══════════════════════════════════════════════════════════════════════════

// Example 8: Jest Unit Tests
describe("CashfreeTestPayButton", () => {
  it("should display button with correct props", () => {
    const { getByText } = render(
      <CashfreeTestPayButton
        feeRecordId="test-id"
        studentName="John Doe"
        amount={5000}
      />
    );
    
    expect(getByText(/Test Pay Fee/i)).toBeInTheDocument();
  });

  it("should open confirmation dialog on click", () => {
    const { getByText, getByRole } = render(
      <CashfreeTestPayButton
        feeRecordId="test-id"
        studentName="John Doe"
        amount={5000}
      />
    );
    
    fireEvent.click(getByRole("button", { name: /Test Pay Fee/i }));
    expect(getByText(/Initiate Cashfree Payment/i)).toBeInTheDocument();
  });

  it("should display correct payment amount", () => {
    const { getByText } = render(
      <CashfreeTestPayButton
        feeRecordId="test-id"
        studentName="John Doe"
        amount={5000}
      />
    );
    
    fireEvent.click(getByRole("button"));
    expect(getByText(/₹5,000/i)).toBeInTheDocument();
  });

  it("should call API endpoint on payment confirmation", async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Implement test...
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. CONFIGURATION: Environment Setup
// ═══════════════════════════════════════════════════════════════════════════

// Example 9: Environment Configuration
// appsettings.Development.json
{
  "PaymentGateways": {
    "Cashfree": {
      "MerchantId": "TEST0000XXXXX",
      "ApiKey": "xxxxxxxxxxxxxxxx",
      "ApiSecret": "xxxxxxxxxxxxxxxx",
      "Mode": "Test",
      "ApiVersion": "2023-08-01",
      "ReturnUrl": "https://localhost:3000/parent-fees/payment-callback",
      "WebhookUrl": "https://localhost:5000/api/payment-gateway/webhook/cashfree"
    }
  }
}

// Example 10: React Component Configuration
// config/payment.ts
export const paymentConfig = {
  cashfree: {
    mode: import.meta.env.VITE_CASHFREE_MODE || "Test",
    appId: import.meta.env.VITE_CASHFREE_APP_ID,
    returnUrl: import.meta.env.VITE_CASHFREE_RETURN_URL,
    notifyUrl: import.meta.env.VITE_CASHFREE_NOTIFY_URL,
  }
};

export default {
  initiateTestPayment,
  initiateFullPayment,
  handlePaymentWithErrorHandling,
  CompletePaymentFlow,
  FeeCard,
  SimplePaymentExample,
  AdvancedPaymentExample
};
