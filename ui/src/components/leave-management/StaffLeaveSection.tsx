import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, CheckCircle, Clock, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import leaveManagementApi, { LeaveRequest, LeaveBalance, LeaveType } from "@/services/api/leaveManagementApi";
import { useToast } from "@/hooks/use-toast";

interface StaffLeaveSectionProps {
  /** Staff entity ID — used for identification only */
  staffId: string;
  staffName: string;
  /** UserLogin.Id — required to fetch leave requests (leave requests are stored with UserLogin.Id as applicantId) */
  userLoginId?: string;
  /** When true (admin/principal context) show approve/deny controls */
  canApprove?: boolean;
}

type ActionDialog =
  | { type: "approve"; leaveId: string; remarks: string }
  | { type: "reject"; leaveId: string; remarks: string }
  | null;

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "approved") return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1 inline-flex items-center">
      <CheckCircle className="w-3 h-3" />Approved
    </Badge>
  );
  if (s === "rejected") return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1 inline-flex items-center">
      <X className="w-3 h-3" />Rejected
    </Badge>
  );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1 inline-flex items-center">
      <Clock className="w-3 h-3" />Pending
    </Badge>
  );
}

export function StaffLeaveSection({ staffId, staffName, userLoginId, canApprove = false }: StaffLeaveSectionProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const { toast } = useToast();

  // effectiveId: used for leave request queries (requests may be stored under either ID)
  // Balance queries always use staffId (balances are stored under Staff entity ID)
  const effectiveId = userLoginId || staffId;

  useEffect(() => {
    load();
  }, [effectiveId]);

  const load = async () => {
    try {
      setLoading(true);
      const [typesRes, leavesRes, balanceRes] = await Promise.allSettled([
        leaveManagementApi.getLeaveTypes("Staff"),
        leaveManagementApi.getLeaveRequests(1, 100, effectiveId, undefined),
        leaveManagementApi.getLeaveBalance(staffId, "Staff"),
      ]);
      const types = typesRes.status === "fulfilled" ? typesRes.value : [];
      const leaveItems = leavesRes.status === "fulfilled" ? leavesRes.value.items : [];
      const bal = balanceRes.status === "fulfilled" ? balanceRes.value : [];
      setLeaveTypes(types);
      setLeaves(leaveItems);
      setBalances(bal);
    } catch (e) {
      console.error("StaffLeaveSection load error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string, remarks: string) => {
    try {
      setActionLoading(true);
      await leaveManagementApi.approveLeave(leaveId, remarks || undefined);
      toast({ title: "Approved", description: "Leave request has been approved." });
      setActionDialog(null);
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Failed to approve", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (leaveId: string, remarks: string) => {
    if (!remarks.trim()) {
      toast({ title: "Reason required", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    try {
      setActionLoading(true);
      await leaveManagementApi.rejectLeave(leaveId, remarks);
      toast({ title: "Rejected", description: "Leave request has been rejected." });
      setActionDialog(null);
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Failed to reject", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Compute display balances from API data or fall back to calculating from leave requests
  const displayBalances = leaveTypes.map((lt) => {
    const apiBalance = balances.find((b) => b.leaveTypeId === lt.id);
    if (apiBalance) return { leaveTypeId: lt.id, leaveTypeName: lt.name, totalAllowed: apiBalance.totalAllowed, used: apiBalance.used, available: apiBalance.available, carriedForward: apiBalance.carriedForward };
    const typeLeaves = leaves.filter((l) => l.leaveTypeId === lt.id);
    const used = typeLeaves.filter((l) => l.status === "Approved").reduce((s, l) => s + l.totalDays, 0);
    const pending = typeLeaves.filter((l) => l.status === "Pending").reduce((s, l) => s + l.totalDays, 0);
    return { leaveTypeId: lt.id, leaveTypeName: lt.name, totalAllowed: lt.maxDaysPerYear, used, available: Math.max(0, lt.maxDaysPerYear - used - pending), carriedForward: 0 };
  });

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={canApprove && pendingLeaves.length > 0 ? "pending" : "history"} className="w-full">
        <TabsList className={`grid w-full ${canApprove ? "grid-cols-3" : "grid-cols-2"}`}>
          {canApprove && (
            <TabsTrigger value="pending">
              Pending
              {pendingLeaves.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {pendingLeaves.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="history">All Leaves</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
        </TabsList>

        {/* Pending approvals — admin/principal only */}
        {canApprove && (
          <TabsContent value="pending" className="mt-4">
            {pendingLeaves.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No pending leave requests from {staffName}.</AlertDescription>
              </Alert>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.leaveTypeName ?? "Leave"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {" – "}
                          {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell><Badge variant="outline">{leave.totalDays}d</Badge></TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="text-sm text-muted-foreground truncate block cursor-pointer hover:text-foreground" onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}>
                            {leave.reason}
                          </span>
                          {expandedId === leave.id && <p className="text-sm mt-1 text-muted-foreground">{leave.reason}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(leave.applicationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setActionDialog({ type: "approve", leaveId: leave.id, remarks: "" })}>
                              <Check className="w-3 h-3" />Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 gap-1" onClick={() => setActionDialog({ type: "reject", leaveId: leave.id, remarks: "" })}>
                              <X className="w-3 h-3" />Deny
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* All leaves */}
        <TabsContent value="history" className="mt-4">
          {leaves.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No leave requests found for {staffName}.</AlertDescription></Alert>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {canApprove && <TableHead>Remarks</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.leaveTypeName ?? "Leave"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" – "}
                        {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell><Badge variant="outline">{leave.totalDays}d</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                      <TableCell><StatusBadge status={leave.status} /></TableCell>
                      {canApprove && <TableCell className="text-sm text-muted-foreground italic">{leave.approverRemarks ?? "—"}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Leave balance */}
        <TabsContent value="balance" className="mt-4">
          {displayBalances.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No leave balance information available.</AlertDescription></Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayBalances.map((b) => {
                const pct = b.totalAllowed > 0 ? Math.round((b.used / b.totalAllowed) * 100) : 0;
                return (
                  <Card key={b.leaveTypeId} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">{b.leaveTypeName}</p>
                        <Badge variant="outline">{b.totalAllowed} days</Badge>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600 font-medium">Used: {b.used}</span>
                        <span className="text-green-600 font-medium">Left: {b.available}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve dialog */}
      <Dialog open={actionDialog?.type === "approve"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Approve Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional remarks for the staff member..."
              value={actionDialog?.type === "approve" ? actionDialog.remarks : ""}
              onChange={(e) => actionDialog?.type === "approve" && setActionDialog({ ...actionDialog, remarks: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={actionLoading}
                onClick={() => actionDialog?.type === "approve" && handleApprove(actionDialog.leaveId, actionDialog.remarks)}>
                {actionLoading ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={actionDialog?.type === "reject"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Deny Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for denial <span className="text-red-500">*</span></Label>
              <Textarea
                className="mt-1.5"
                placeholder="Required — reason is mandatory when denying a leave request..."
                value={actionDialog?.type === "reject" ? actionDialog.remarks : ""}
                onChange={(e) => actionDialog?.type === "reject" && setActionDialog({ ...actionDialog, remarks: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button variant="destructive" disabled={actionLoading || (actionDialog?.type === "reject" ? !actionDialog.remarks.trim() : true)}
                onClick={() => actionDialog?.type === "reject" && handleReject(actionDialog.leaveId, actionDialog.remarks)}>
                {actionLoading ? "Denying…" : "Deny"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
