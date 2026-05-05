import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, CheckCircle, Clock, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import leaveManagementApi from "@/services/api/leaveManagementApi";
import { LoadingState } from "@/components/common";
import { StudentLeaveRequestForm } from "./StudentLeaveRequestForm";

interface StudentLeaveSectionProps {
  studentId: string;
  studentName: string;
}

interface LeaveBalance {
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  leaveTypeId: string;
  leaveType: string;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  leaveType: string;
  createdAt: string;
}

export function StudentLeaveSection({ studentId, studentName }: StudentLeaveSectionProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  useEffect(() => {
    fetchLeaveData();
  }, [studentId]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      // Fetch leave requests for this student
      const requests = await leaveManagementApi.getLeaveRequests(
        1,
        100,
        studentId
      );
      setLeaveRequests(requests.items || []);

      // Calculate balances from requests
      calculateBalances(requests.items || []);
    } catch (error) {
      console.error("Failed to fetch leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = (requests: LeaveRequest[]) => {
    const leaveTypeMap = new Map<string, LeaveBalance>();

    requests.forEach((req) => {
      if (!leaveTypeMap.has(req.leaveType)) {
        leaveTypeMap.set(req.leaveType, {
          allocatedDays: 12, // Default allocation, adjust as needed
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 12,
          leaveTypeId: req.id,
          leaveType: req.leaveType,
        });
      }

      const balance = leaveTypeMap.get(req.leaveType)!;
      if (req.status === "Approved") {
        balance.usedDays += req.days;
      } else if (req.status === "Pending") {
        balance.pendingDays += req.days;
      }
      balance.remainingDays = balance.allocatedDays - balance.usedDays - balance.pendingDays;
    });

    setBalances(Array.from(leaveTypeMap.values()));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-4 h-4" />;
      case "Rejected":
        return <AlertCircle className="w-4 h-4" />;
      case "Pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="balance">Leave Balance</TabsTrigger>
          <TabsTrigger value="history">Leave History</TabsTrigger>
        </TabsList>

        {/* Leave Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          {balances.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No leave types configured for this student.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balances.map((balance) => (
                  <Card key={balance.leaveTypeId} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm">{balance.leaveType}</h3>
                          <Badge variant="outline">{balance.allocatedDays} days</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/50 dark:bg-white/10 rounded p-2">
                            <p className="text-muted-foreground text-xs">Used</p>
                            <p className="font-semibold text-red-600">{balance.usedDays} days</p>
                          </div>
                          <div className="bg-white/50 dark:bg-white/10 rounded p-2">
                            <p className="text-muted-foreground text-xs">Pending</p>
                            <p className="font-semibold text-yellow-600">{balance.pendingDays} days</p>
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/10 rounded p-2">
                          <p className="text-muted-foreground text-xs">Remaining</p>
                          <p className="font-semibold text-green-600 text-lg">{Math.max(0, balance.remainingDays)} days</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Request Leave
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                  </DialogHeader>
                  <StudentLeaveRequestForm
                    studentId={studentId}
                    studentName={studentName}
                    onSuccess={() => {
                      setIsRequestDialogOpen(false);
                      fetchLeaveData();
                    }}
                    onClose={() => setIsRequestDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        {/* Leave History Tab */}
        <TabsContent value="history" className="space-y-4">
          {leaveRequests.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No leave requests found.</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.leaveType}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          <span className="text-muted-foreground">({request.days}d)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          <span className="mr-1">{getStatusIcon(request.status)}</span>
                          {request.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
