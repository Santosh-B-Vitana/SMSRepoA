import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import leaveManagementApi, { LeaveRequest } from "../../services/api/leaveManagementApi";

interface ApprovalDialogData {
  leaveId?: string;
  remarks: string;
  isRejecting: boolean;
}

export function AdminLeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogData>({
    leaveId: undefined,
    remarks: "",
    isRejecting: false
  });
  const { toast } = useToast();

  // Fetch leaves on mount and when status filter changes
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        const response = await leaveManagementApi.getLeaveRequests(1, 100, undefined, statusFilter);
        setLeaves(response.items);
      } catch (error: any) {
        console.error("Failed to fetch leaves:", error);
        toast({
          title: "Error",
          description: "Failed to load leave requests",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [statusFilter, toast]);

  const handleApprove = async (leaveId: string) => {
    setApprovalDialog({
      leaveId,
      remarks: "",
      isRejecting: false
    });
  };

  const handleReject = async (leaveId: string) => {
    setApprovalDialog({
      leaveId,
      remarks: "",
      isRejecting: true
    });
  };

  const submitApproval = async () => {
    if (!approvalDialog.leaveId) return;

    try {
      setProcessing(true);
      const leave = await leaveManagementApi.approveLeave(
        approvalDialog.leaveId,
        approvalDialog.remarks
      );

      setLeaves(prev => prev.map(l => l.id === approvalDialog.leaveId ? leave : l));
      setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false });

      toast({
        title: "Success",
        description: "Leave request approved successfully"
      });
    } catch (error: any) {
      console.error("Error approving leave:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to approve leave",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const submitRejection = async () => {
    if (!approvalDialog.leaveId) return;

    try {
      setProcessing(true);
      const leave = await leaveManagementApi.rejectLeave(
        approvalDialog.leaveId,
        approvalDialog.remarks
      );

      setLeaves(prev => prev.map(l => l.id === approvalDialog.leaveId ? leave : l));
      setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false });

      toast({
        title: "Success",
        description: "Leave request rejected successfully"
      });
    } catch (error: any) {
      console.error("Error rejecting leave:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject leave",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      case "Rejected":
        return "destructive";
      case "Pending":
        return "secondary";
      case "Cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="h-96 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Leave Management</h1>
        <p className="text-muted-foreground">Manage staff leave requests</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["All", "Pending", "Approved", "Rejected", "Cancelled"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status === "All" ? "" : status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{leaves.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                {leaves.filter(l => l.status === "Pending").length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">
                {leaves.filter(l => l.status === "Approved").length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold">
                {leaves.filter(l => l.status === "Rejected").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {leave.applicantName || `Staff (${leave.applicantId.substring(0, 8)}...)`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(leave.startDate).toLocaleDateString()} to{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">{leave.totalDays}</TableCell>
                      <TableCell>{leave.leaveTypeName || "N/A"}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(leave.status)}>
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(leave.applicationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {leave.status === "Pending" && (
                          <div className="flex gap-2">
                            <Dialog open={approvalDialog.leaveId === leave.id && !approvalDialog.isRejecting} onOpenChange={() => {
                              if (!approvalDialog.leaveId) setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false });
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(leave.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Leave Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {leave.totalDays} day(s) from{" "}
                                      {new Date(leave.startDate).toLocaleDateString()} to{" "}
                                      {new Date(leave.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                                    <Textarea
                                      id="remarks"
                                      value={approvalDialog.remarks}
                                      onChange={(e) => setApprovalDialog(prev => ({
                                        ...prev,
                                        remarks: e.target.value
                                      }))}
                                      placeholder="Add any remarks..."
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false })}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={submitApproval}
                                      disabled={processing}
                                    >
                                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Approve
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={approvalDialog.leaveId === leave.id && approvalDialog.isRejecting} onOpenChange={() => {
                              if (!approvalDialog.leaveId) setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false });
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(leave.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Leave Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {leave.totalDays} day(s) from{" "}
                                      {new Date(leave.startDate).toLocaleDateString()} to{" "}
                                      {new Date(leave.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label htmlFor="reject-remarks">Reason for Rejection</Label>
                                    <Textarea
                                      id="reject-remarks"
                                      value={approvalDialog.remarks}
                                      onChange={(e) => setApprovalDialog(prev => ({
                                        ...prev,
                                        remarks: e.target.value
                                      }))}
                                      placeholder="Provide reason for rejection..."
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => setApprovalDialog({ leaveId: undefined, remarks: "", isRejecting: false })}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={submitRejection}
                                      disabled={processing}
                                    >
                                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
