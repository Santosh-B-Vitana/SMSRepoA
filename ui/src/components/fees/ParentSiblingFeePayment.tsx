import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CreditCard, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ChildFee {
  childId: string;
  childName: string;
  class: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
}

export function ParentSiblingFeePayment() {
  const { toast } = useToast();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  // Mock data - would come from parent's children
  const [childrenFees] = useState<ChildFee[]>([
    {
      childId: "STU001",
      childName: "Aarav Gupta",
      class: "10-A",
      totalAmount: 45000,
      paidAmount: 25000,
      pendingAmount: 20000,
      dueDate: "2024-04-15",
      status: "partial"
    },
    {
      childId: "STU002",
      childName: "Rohan Gupta",
      class: "8-B",
      totalAmount: 40000,
      paidAmount: 25000,
      pendingAmount: 15000,
      dueDate: "2024-04-15",
      status: "partial"
    },
    {
      childId: "STU003",
      childName: "Diya Gupta",
      class: "6-A",
      totalAmount: 38000,
      paidAmount: 38000,
      pendingAmount: 0,
      dueDate: "2024-03-15",
      status: "paid"
    }
  ]);

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const getTotalSelectedAmount = () => {
    return childrenFees
      .filter(child => selectedChildren.includes(child.childId))
      .reduce((total, child) => total + child.pendingAmount, 0);
  };

  const handlePayment = () => {
    if (selectedChildren.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one child to pay fees for",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Processing Payment",
      description: `Processing ₹${getTotalSelectedAmount().toLocaleString()} via ${paymentMethod}...`
    });

    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: `Paid fees for ${selectedChildren.length} child(ren) - ₹${getTotalSelectedAmount().toLocaleString()}`
      });
      setSelectedChildren([]);
    }, 2000);
  };

  const getPendingChildren = () => childrenFees.filter(c => c.pendingAmount > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Children's Fee Payment</h2>
          <p className="text-sm text-muted-foreground">Pay fees for multiple children at once</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childrenFees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ₹{childrenFees.reduce((sum, c) => sum + c.pendingAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selected Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{getTotalSelectedAmount().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Children Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedChildren.length === getPendingChildren().length && getPendingChildren().length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedChildren(getPendingChildren().map(c => c.childId));
                      } else {
                        setSelectedChildren([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Child Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childrenFees.map((child) => (
                <TableRow key={child.childId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedChildren.includes(child.childId)}
                      disabled={child.pendingAmount === 0}
                      onCheckedChange={() => toggleChildSelection(child.childId)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{child.childName}</TableCell>
                  <TableCell>{child.class}</TableCell>
                  <TableCell>₹{child.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>₹{child.paidAmount.toLocaleString()}</TableCell>
                  <TableCell className={child.pendingAmount > 0 ? "text-destructive font-medium" : ""}>
                    ₹{child.pendingAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>{new Date(child.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      child.status === 'paid' ? 'default' :
                      child.status === 'overdue' ? 'destructive' :
                      child.status === 'partial' ? 'secondary' : 'outline'
                    }>
                      {child.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Section */}
      {selectedChildren.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Children Selected</p>
                <p className="text-lg font-semibold">{selectedChildren.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₹{getTotalSelectedAmount().toLocaleString()}</p>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="payu">PayU</SelectItem>
                  <SelectItem value="paytm">Paytm</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handlePayment} className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ₹{getTotalSelectedAmount().toLocaleString()}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
