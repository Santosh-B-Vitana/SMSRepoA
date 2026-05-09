import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar, Clock, CheckCircle, XCircle, FileText, Plus, Loader2,
  ChevronDown, ChevronUp, AlertCircle, CalendarDays, TrendingDown,
  ArrowRight, Info, BarChart3, AlertTriangle, X
} from "lucide-react";
import { toast } from "sonner";
import leaveManagementApi, { LeaveRequest, LeaveType } from "../../services/api/leaveManagementApi";

interface StaffLeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  carryForwardDays: number;
}

interface StaffLeaveData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    Pending:  { label: "Pending",  className: "bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-950/40 dark:text-amber-400",  icon: <Clock className="h-3 w-3" /> },
    Approved: { label: "Approved", className: "bg-green-100  text-green-700  border-green-200  dark:bg-green-950/40 dark:text-green-400",  icon: <CheckCircle className="h-3 w-3" /> },
    Rejected: { label: "Rejected", className: "bg-red-100    text-red-700    border-red-200    dark:bg-red-950/40   dark:text-red-400",    icon: <XCircle className="h-3 w-3" /> },
    Cancelled:{ label: "Cancelled",className: "bg-slate-100  text-slate-600  border-slate-200  dark:bg-slate-800    dark:text-slate-400",  icon: <XCircle className="h-3 w-3" /> },
  };
  const c = config[status] ?? config.Pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
}

function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

export function StaffLeaveManagerEnhanced() {
  // State
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<StaffLeaveBalance[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // toast from sonner (imported at top)

  const [form, setForm] = useState<StaffLeaveData>({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const previewDays = daysBetween(form.startDate, form.endDate);
  const selectedType = leaveTypes.find(t => t.id === form.leaveTypeId);
  const selectedBalance = leaveBalances.find(b => b.leaveTypeId === form.leaveTypeId);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [types, response] = await Promise.all([
          leaveManagementApi.getLeaveTypes("Staff"), // filter to Staff leave types only — avoids showing Student duplicates
          leaveManagementApi.getMyLeaveRequests(1, 100),
        ]);
        setLeaveTypes(types);
        setLeaves(response.items);

        // Calculate leave balances
        const balances: StaffLeaveBalance[] = types.map(type => {
          const typeLeaves = response.items.filter(l => l.leaveTypeId === type.id);
          const usedDays = typeLeaves.filter(l => l.status === "Approved").reduce((sum, l) => sum + l.totalDays, 0);
          const pendingDays = typeLeaves.filter(l => l.status === "Pending").reduce((sum, l) => sum + l.totalDays, 0);
          const allocated = type.maxDaysPerYear;
          const remaining = Math.max(0, allocated - usedDays - pendingDays);

          return {
            leaveTypeId: type.id,
            leaveTypeName: type.name,
            allocatedDays: allocated,
            usedDays,
            pendingDays,
            remainingDays: remaining,
            carryForwardDays: 0, // implement if needed
          };
        });
        setLeaveBalances(balances);
      } catch (error) {
        console.error("Failed to fetch:", error);
        toast.error("Error", { description: "Failed to load leave data" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Submit Leave Request
  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason) {
      toast.error("Incomplete", { description: "Please fill in all required fields" });
      return;
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast.error("Invalid dates", { description: "End date must be after start date" });
      return;
    }

    if (selectedBalance && previewDays > selectedBalance.remainingDays) {
      toast.error("Insufficient Balance", { description: `You have only ${selectedBalance.remainingDays} day${selectedBalance.remainingDays !== 1 ? "s" : ""} of ${selectedBalance.leaveTypeName} available` });
      return;
    }

    if (form.reason.trim().length < 10) {
      toast.error("Too short", { description: "Reason must be at least 10 characters" });
      return;
    }

    try {
      setSubmitting(true);
      const newLeave = await leaveManagementApi.createLeaveRequest(form);
      setLeaves(prev => [newLeave, ...prev]);

      // Update balance
      if (selectedBalance) {
        setLeaveBalances(prev => prev.map(b =>
          b.leaveTypeId === selectedBalance.leaveTypeId
            ? { ...b, pendingDays: b.pendingDays + previewDays, remainingDays: b.remainingDays - previewDays }
            : b
        ));
      }

      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
      toast.success("Submitted", { description: "Your leave request has been sent for approval." });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error", { description: error?.response?.data?.message || "Failed to submit leave request" });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === "Pending").length,
    approved: leaves.filter(l => l.status === "Approved").length,
    rejected: leaves.filter(l => l.status === "Rejected").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-56 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Apply for leave and track your requests</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      {/* Apply Leave Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
        }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              New Leave Request
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to submit your leave request for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Leave Type Pills */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Leave Type *</Label>
              <div className="flex flex-wrap gap-2">
                {leaveTypes.map(type => {
                  const balance = leaveBalances.find(b => b.leaveTypeId === type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, leaveTypeId: type.id }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.leaveTypeId === type.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      <span>{type.name}</span>
                      <span className="ml-2 opacity-70 text-xs">
                        {balance?.remainingDays ?? 0} available
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Picker */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Duration & Balance Check */}
            {previewDays > 0 && (
              <Alert className={selectedBalance && previewDays <= selectedBalance.remainingDays ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                <Info className={selectedBalance && previewDays <= selectedBalance.remainingDays ? "h-4 w-4 text-green-600" : "h-4 w-4 text-red-600"} />
                <AlertDescription className={selectedBalance && previewDays <= selectedBalance.remainingDays ? "text-green-800" : "text-red-800"}>
                  {previewDays} day{previewDays !== 1 ? "s" : ""} requested.
                  {selectedBalance ? (
                    <>
                      {" "}Remaining balance: <strong>{selectedBalance.remainingDays}</strong> days.
                      {previewDays > selectedBalance.remainingDays && " (Insufficient balance)"}
                    </>
                  ) : " Select a leave type to check balance"}
                </AlertDescription>
              </Alert>
            )}

            {/* Reason */}
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for Leave *
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({form.reason.trim().length}/10 characters minimum)
                </span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for your leave request..."
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="h-20"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.leaveTypeId || previewDays === 0}
                className="flex-1"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leaveBalances.map(balance => (
          <Card key={balance.leaveTypeId} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{balance.leaveTypeName}</p>
                    <p className="text-xs text-muted-foreground">Annual allocation: {balance.allocatedDays} days</p>
                  </div>
                  {balance.remainingDays <= 2 && (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>

                {/* Balance bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Used</span>
                      <span className="text-xs font-semibold">{balance.usedDays}/{balance.allocatedDays}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(balance.usedDays / balance.allocatedDays) * 100}%` }}
                      />
                    </div>
                  </div>

                  {balance.pendingDays > 0 && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Pending</span>
                        <span className="text-xs font-semibold">{balance.pendingDays}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(balance.pendingDays / balance.allocatedDays) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Remaining summary */}
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                    <p className="text-lg font-bold text-green-600">{balance.usedDays}</p>
                  </div>
                  <div className="border-l border-r">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-blue-600">{balance.pendingDays}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={`text-lg font-bold ${balance.remainingDays <= 2 ? 'text-red-600' : 'text-green-600'}`}>
                      {balance.remainingDays}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(leave => (
                <div key={leave.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <strong>{leave.leaveTypeName}</strong>
                        <StatusBadge status={leave.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <strong>{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</strong>
                      </p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedId === leave.id ? "rotate-180" : ""}`} />
                  </div>

                  {expandedId === leave.id && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reason</p>
                          <p>{leave.reason}</p>
                        </div>
                        {leave.status !== "Pending" && (
                          <div>
                            <p className="text-muted-foreground">
                              {leave.status === "Approved" ? "Approved" : leave.status === "Rejected" ? "Rejected" : "Cancelled"}
                              {leave.approvedDate && ` on ${new Date(leave.approvedDate).toLocaleDateString()}`}
                            </p>
                            {leave.approverRemarks && (
                              <p className="text-muted-foreground italic">"{leave.approverRemarks}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
