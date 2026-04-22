import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, CheckCircle, XCircle, FileText, Plus, Loader2,
  ChevronDown, ChevronUp, AlertCircle, CalendarDays, MessageSquare,
  ArrowRight, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import leaveManagementApi, { LeaveRequest, LeaveType } from "../../services/api/leaveManagementApi";

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

export function StaffLeaveManager() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState<StaffLeaveData>({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const previewDays = daysBetween(form.startDate, form.endDate);
  const selectedType = leaveTypes.find(t => t.id === form.leaveTypeId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [types, response] = await Promise.all([
          leaveManagementApi.getLeaveTypes("Staff"),
          leaveManagementApi.getMyLeaveRequests(1, 100),
        ]);
        setLeaveTypes(types);
        setLeaves(response.items);
      } catch {
        toast({ title: "Error", description: "Failed to load leave data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason) {
      toast({ title: "Incomplete", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast({ title: "Invalid dates", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    if (form.reason.trim().length < 10) {
      toast({ title: "Too short", description: "Reason must be at least 10 characters", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const newLeave = await leaveManagementApi.createLeaveRequest(form);
      setLeaves(prev => [newLeave, ...prev]);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
      toast({ title: "Submitted", description: "Your leave request has been sent for approval." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to submit leave request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const total    = leaves.length;
  const pending  = leaves.filter(l => l.status === "Pending").length;
  const approved = leaves.filter(l => l.status === "Approved").length;
  const rejected = leaves.filter(l => l.status === "Rejected").length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-56 bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Apply for leave and track your requests</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="gap-2 w-fit">
          {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Apply for Leave"}
        </Button>
      </div>

      {/* Apply Leave Form — inline collapsible */}
      {showForm && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <CalendarDays className="h-4 w-4" />New Leave Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Leave Type pills */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Leave Type <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {leaveTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, leaveTypeId: type.id }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                      form.leaveTypeId === type.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {type.name}
                    <span className="ml-1.5 opacity-60 text-xs">({type.maxDaysPerYear}d/yr)</span>
                  </button>
                ))}
                {leaveTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />No leave types configured yet
                  </p>
                )}
              </div>
            </div>

            {/* Date range + live preview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-sm font-medium">Start Date <span className="text-destructive">*</span></Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-sm font-medium">End Date <span className="text-destructive">*</span></Label>
                <Input id="endDate" type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>

            {/* Duration preview */}
            {form.startDate && form.endDate && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Duration: <strong className="text-foreground">{previewDays} day{previewDays !== 1 ? "s" : ""}</strong>
                {selectedType && <span className="ml-2 text-xs text-muted-foreground">({selectedType.maxDaysPerYear - previewDays >= 0 ? selectedType.maxDaysPerYear - previewDays : 0} days remaining this year)</span>}
                </span>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">({form.reason.trim().length}/10 min)</span>
              </Label>
              <Textarea
                id="reason"
                rows={3}
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Briefly describe the reason for your leave..."
                className="resize-none"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : <><ArrowRight className="h-4 w-4" />Submit Request</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: total,    icon: <FileText className="h-5 w-5 text-blue-500" />,   bg: "bg-blue-50   dark:bg-blue-950/30",   border: "border-l-blue-400",   text: "text-blue-700  dark:text-blue-400"  },
          { label: "Pending",  value: pending,  icon: <Clock className="h-5 w-5 text-amber-500" />,    bg: "bg-amber-50  dark:bg-amber-950/30",  border: "border-l-amber-400",  text: "text-amber-700 dark:text-amber-400" },
          { label: "Approved", value: approved, icon: <CheckCircle className="h-5 w-5 text-green-500" />, bg: "bg-green-50  dark:bg-green-950/30",  border: "border-l-green-400",  text: "text-green-700 dark:text-green-400" },
          { label: "Rejected", value: rejected, icon: <XCircle className="h-5 w-5 text-red-500" />,    bg: "bg-red-50    dark:bg-red-950/30",    border: "border-l-red-400",    text: "text-red-700   dark:text-red-400"   },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border border-l-4 ${s.bg} ${s.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.value}</p>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Leave request cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Requests</h2>

        {leaves.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-muted-foreground">No leave requests yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Click "Apply for Leave" to submit your first request</p>
              <Button variant="outline" className="mt-5 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />Apply for Leave
              </Button>
            </CardContent>
          </Card>
        ) : (
          leaves.map(leave => {
            const isExpanded = expandedId === leave.id;
            const start = new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const end   = new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const applied = new Date(leave.applicationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            return (
              <Card
                key={leave.id}
                className={`transition-shadow duration-200 hover:shadow-md cursor-pointer ${leave.status === "Approved" ? "border-l-4 border-l-green-400" : leave.status === "Rejected" ? "border-l-4 border-l-red-400" : leave.status === "Pending" ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-slate-300"}`}
                onClick={() => setExpandedId(isExpanded ? null : leave.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{leave.leaveTypeName ?? "Leave"}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground font-medium">{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <span>{start}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{end}</span>
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Applied: {applied}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={leave.status} />
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</p>
                        <p className="text-sm text-foreground">{leave.reason}</p>
                      </div>
                      {leave.approverRemarks && (
                        <div className={`flex gap-2.5 p-3 rounded-lg ${leave.status === "Approved" ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                          <MessageSquare className={`h-4 w-4 shrink-0 mt-0.5 ${leave.status === "Approved" ? "text-green-600" : "text-red-500"}`} />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Approver Remarks</p>
                            <p className="text-sm">{leave.approverRemarks}</p>
                          </div>
                        </div>
                      )}
                      {leave.status === "Pending" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          Awaiting approval from admin or principal
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}