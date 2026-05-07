/**
 * ParentLeaveTab — parent/guardian view of student leave management.
 * Shows per-child leave balance, request form, and leave history.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Plus, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import leaveManagementApi, { LeaveType, StudentLeaveItem } from "@/services/api/leaveManagementApi";

interface Props {
  studentId: string;
  studentName: string;
}

function statusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case "approved": return { label: "Approved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    case "rejected": return { label: "Rejected", icon: <XCircle className="h-3.5 w-3.5" />, cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
    default:          return { label: "Pending",  icon: <Clock className="h-3.5 w-3.5" />, cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ParentLeaveTab({ studentId, studentName }: Props) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<StudentLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [types, leaveData] = await Promise.all([
        leaveManagementApi.getLeaveTypes("Student"),
        leaveManagementApi.getMyChildrenLeaves(1, 100, studentId),
      ]);
      setLeaveTypes(types);
      setRequests(leaveData.items ?? []);
    } catch {
      toast.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const days = form.startDate && form.endDate
    ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : 0;

  const handleSubmit = async () => {
    if (!form.leaveTypeId) { toast.error("Please select a leave type"); return; }
    if (!form.startDate || !form.endDate) { toast.error("Please select start and end dates"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error("End date must be on or after start date"); return; }
    setSubmitting(true);
    try {
      await leaveManagementApi.createStudentLeave(studentId, {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      toast.success("Leave request submitted successfully");
      setShowForm(false);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats from history
  const pending  = requests.filter(r => r.status?.toLowerCase() === "pending").length;
  const approved = requests.filter(r => r.status?.toLowerCase() === "approved").length;
  const rejected = requests.filter(r => r.status?.toLowerCase() === "rejected").length;
  const usedDays = requests.filter(r => r.status?.toLowerCase() === "approved").reduce((s, r) => s + (r.totalDays ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Leave Management</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Request and track leave for {studentName}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Request Leave
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Days Used", value: usedDays, cls: "text-red-600" },
          { label: "Pending",   value: pending,  cls: "text-amber-600" },
          { label: "Approved",  value: approved, cls: "text-green-600" },
          { label: "Rejected",  value: rejected, cls: "text-gray-500" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${cls}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">No leave requests yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                Request First Leave
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const sc = statusConfig(r.status);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.leaveTypeName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.startDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.endDate)}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">{r.totalDays}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate text-muted-foreground">
                          {r.reason || "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {r.approverRemarks || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave for {studentName}</DialogTitle>
            <DialogDescription>
              Submit a leave request. Your child's class teacher will review and respond.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Leave Type <span className="text-destructive">*</span></Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm(f => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>To Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {days > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <span>{days} working day{days > 1 ? "s" : ""} of leave</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="e.g. Fever and cold, family function, medical appointment…"
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
