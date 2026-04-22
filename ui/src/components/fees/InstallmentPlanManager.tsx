import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, DollarSign } from "lucide-react";

interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  lateFee: number;
}

interface InstallmentPlan {
  id: string;
  studentId: string;
  studentName: string;
  totalFee: number;
  installments: Installment[];
  academicYear: string;
}

export function InstallmentPlanManager() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([
    {
      id: "PLAN001",
      studentId: "STU001",
      studentName: "Aarav Gupta",
      totalFee: 45000,
      academicYear: "2024-25",
      installments: [
        { installmentNumber: 1, amount: 15000, dueDate: "2024-04-15", status: "paid", paidDate: "2024-04-10", lateFee: 0 },
        { installmentNumber: 2, amount: 15000, dueDate: "2024-07-15", status: "pending", lateFee: 0 },
        { installmentNumber: 3, amount: 15000, dueDate: "2024-10-15", status: "pending", lateFee: 0 }
      ]
    }
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const markAsPaid = (planId: string, installmentNumber: number) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        return {
          ...plan,
          installments: plan.installments.map(inst => 
            inst.installmentNumber === installmentNumber 
              ? { ...inst, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
              : inst
          )
        };
      }
      return plan;
    }));
    
    toast({
      title: "Success",
      description: "Installment marked as paid"
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Installment Plans
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Installment Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Student ID</Label>
                  <Input placeholder="Enter student ID" />
                </div>
                <div>
                  <Label>Total Fee Amount</Label>
                  <Input type="number" placeholder="Enter total fee" />
                </div>
                <div>
                  <Label>Number of Installments</Label>
                  <Input type="number" placeholder="e.g., 3" />
                </div>
                <Button className="w-full">Create Plan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {plans.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{plan.studentName}</h3>
                <p className="text-sm text-muted-foreground">
                  Total: ₹{plan.totalFee.toLocaleString()} | {plan.academicYear}
                </p>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.installments.map((inst) => (
                  <TableRow key={inst.installmentNumber}>
                    <TableCell>#{inst.installmentNumber}</TableCell>
                    <TableCell className="font-medium">
                      ₹{inst.amount.toLocaleString()}
                      {inst.lateFee > 0 && (
                        <span className="text-red-600 text-xs ml-1">
                          +₹{inst.lateFee} late fee
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{inst.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        inst.status === 'paid' ? 'default' :
                        inst.status === 'overdue' ? 'destructive' : 'secondary'
                      }>
                        {inst.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{inst.paidDate || '-'}</TableCell>
                    <TableCell>
                      {inst.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          onClick={() => markAsPaid(plan.id, inst.installmentNumber)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
