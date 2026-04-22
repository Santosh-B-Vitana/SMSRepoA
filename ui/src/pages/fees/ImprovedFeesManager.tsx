import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircl,
  Download,
  Search,
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi } from "@/services/api/feeApi";
import { useSchoolContext, getAcademicYearsArray } from "@/hooks/useSchoolContext";
import { PaymentProcessor } from "@/components/fees/PaymentProcessor";
import { FeeDetailsDialog } from "@/components/fees/FeeDetailsDialog";

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

export default function ImprovedFeesManager() {
  const { academicYear: defaultYear } = useSchoolContext();
  const { toast } = useToast();
  
  const [academicYear, setAcademicYear] = useState(defaultYear || "2025-26");
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);

  const academicYears = getAcademicYearsArray();

  // Load fee records
  useEffect(() => {
    const loadFees = async () => {
      setLoading(true);
      try {
        const res = await feeApi.getFeeRecords(1, 200);
        const records = ((res as any).feeRecords ?? (res as any).items ?? []) as FeeRecord[];
        setFeeRecords(records);
      } catch (err) {
        toast({ title: "Failed to load fee records", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadFees();
  }, [academicYear]);

  // Calculate key metrics
  const metrics = {
    totalPending: feeRecords.reduce((sum, r) => sum + r.pendingAmount, 0),
    totalCollected: feeRecords.reduce((sum, r) => sum + r.paidAmount, 0),
    overdueCount: feeRecords.filter(r => r.status === 'overdue').length,
    partialCount: feeRecords.filter(r => r.status === 'partial').length,
  };

  // Filter records
  const filteredRecords = feeRecords.filter(record => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesSearch =record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.class.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate days overdue
  const getDaysOverdue = (dueDate: string, status: string) => {
    if (status !== 'overdue') return null;
    const due = new Date(dueDate);
    const today = new Date();
    const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Status badge styling
  const getStatusStyles = (status: string) => {
    const styles: Record<string, { bg: string; icon: any }> = {
      paid: { bg: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
      overdue: { bg: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-4 w-4" /> },
      partial: { bg: 'bg-blue-100 text-blue-800', icon: <TrendingUp className="h-4 w-4" /> },
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage student fees and collect payments
          </p>
        </div>
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₹{(metrics.totalCollected / 100000).toFixed(1)}L
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {feeRecords.filter(r => r.status === 'paid').length} fully paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              ₹{(metrics.totalPending / 100000).toFixed(1)}L
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From {feeRecords.filter(r => r.status !== 'paid').length} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {metrics.overdueCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Students past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
             Partial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {metrics.partialCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Installment pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: simplified from 9 to 3 */}
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records">Fee Records</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Tab 1: Fee Records — Main workflow */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students & Payments</CardTitle>
              <CardDescription>
                View and manage individual student fee records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student name or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Student & Class</TableHead>
                      <TableHead className="text-right">Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const daysOverdue = getDaysOverdue(record.dueDate, record.status);
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.studentName}</p>
                              <p className="text-sm text-muted-foreground">{record.class}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm">
                              {new Date(record.dueDate).toLocaleDateString()}
                            </div>
                            {daysOverdue && daysOverdue > 0 && (
                              <div className="text-xs text-red-600 font-medium">
                                {daysOverdue} days ago
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{record.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            ₹{record.paidAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            ₹{record.pendingAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusStyles(record.status).bg}>
                              {getStatusStyles(record.status).icon}
                              <span className="ml-1 capitalize">{record.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setPaymentDialogOpen(true);
                                  }}
                                >
                                  Collect Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Send Reminder
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Fee Structure */}
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure</CardTitle>
              <CardDescription>
                Manage and update fee structure for each class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fee structure management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Reports */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download Collection Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download Overdue Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedRecord && (
        <>
          <FeeDetailsDialog
            open={detailsDialogOpen}
            onClose={() => setDetailsDialogOpen(false)}
            feeRecord={selectedRecord}
            installmentPlans={[]}
            academicYear={academicYear}
          />
          <PaymentProcessor
            open={paymentDialogOpen}
            onClose={() => setPaymentDialogOpen(false)}
            feeRecord={selectedRecord}
            onPaymentSuccess={() => {
              toast({ title: "Payment recorded successfully" });
              // Refresh
            }}
          />
        </>
      )}
    </div>
  );
}
