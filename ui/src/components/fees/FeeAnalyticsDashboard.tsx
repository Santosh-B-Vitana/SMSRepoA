import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, AlertCircle, TrendingUp } from "lucide-react";

interface FeeAnalyticsDashboardProps {
  totalPending: number;
  totalCollected: number;
  overdueCount: number;
  totalStudents: number;
}

export function FeeAnalyticsDashboard({
  totalPending,
  totalCollected,
  overdueCount,
  totalStudents
}: FeeAnalyticsDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pending Fees
          </CardTitle>
          <DollarSign className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            ₹{totalPending.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all students
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Collected
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            ₹{totalCollected.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This academic year
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue Payments
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {overdueCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Students with overdue fees
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Students
          </CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {totalStudents}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Active fee records
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
