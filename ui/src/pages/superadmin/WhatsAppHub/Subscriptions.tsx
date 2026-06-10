import { useEffect, useState } from "react";
import { Plus, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { SchoolSubscription, WhatsAppPlan, SchoolAccount } from "@/services/api/whatsappApi";

const statusBadge = (status: string) => {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Active: "default",
    Trial: "secondary",
    Suspended: "destructive",
    Expired: "outline",
    PendingRenewal: "secondary",
  };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
};

export default function WhatsAppSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [plans, setPlans] = useState<WhatsAppPlan[]>([]);
  const [accounts, setAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [form, setForm] = useState({ accountId: "", planId: "", renewalPolicy: "Expire", overagePolicy: "Block", autoRenew: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      waApi.getSubscriptions().then(setSubscriptions),
      waApi.getPlans().then(setPlans),
      waApi.getSchoolAccounts().then(setAccounts),
    ]).catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!form.accountId || !form.planId) return;
    try {
      setSubmitting(true);
      await waApi.assignPlan({
        accountId: Number(form.accountId),
        planId: Number(form.planId),
        renewalPolicy: form.renewalPolicy,
        overagePolicy: form.overagePolicy,
        autoRenew: form.autoRenew,
      });
      toast.success("Plan assigned successfully");
      setAssignDialog(false);
      const updated = await waApi.getSubscriptions();
      setSubscriptions(updated);
    } catch {
      toast.error("Failed to assign plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage school WhatsApp plan assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => waApi.getSubscriptions().then(setSubscriptions)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAssignDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Assign Plan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active", count: subscriptions.filter(s => s.status === "Active").length, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Trial", count: subscriptions.filter(s => s.status === "Trial").length, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Suspended", count: subscriptions.filter(s => s.status === "Suspended").length, icon: XCircle, color: "text-red-600" },
          { label: "Expired", count: subscriptions.filter(s => s.status === "Expired").length, icon: XCircle, color: "text-gray-400" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <k.icon className={`h-8 w-8 ${k.color}`} />
              <div>
                <div className="text-2xl font-bold">{k.count}</div>
                <div className="text-xs text-gray-500">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriptions Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Used / Quota</TableHead>
                <TableHead>Period End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">Loading...</TableCell></TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No subscriptions yet.</TableCell></TableRow>
              ) : subscriptions.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.schoolName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.planName}</Badge>
                  </TableCell>
                  <TableCell>{statusBadge(sub.status)}</TableCell>
                  <TableCell className="text-right">
                    <span className={sub.messagesUsed / sub.messagesQuota >= 0.9 ? "text-red-600 font-medium" : ""}>
                      {sub.messagesUsed.toLocaleString()} / {sub.messagesQuota.toLocaleString()}
                    </span>
                    {sub.messagesQuota > 0 && (
                      <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                        <div
                          className="bg-green-500 h-1 rounded-full"
                          style={{ width: `${Math.min(100, (sub.messagesUsed / sub.messagesQuota) * 100)}%` }}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Plan Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign WhatsApp Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>School Account</Label>
              <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.schoolName} ({a.mode === "A" ? "Shared" : "Dedicated"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.planId} onValueChange={v => setForm(f => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.planName} — {p.monthlyQuota.toLocaleString()} msgs @ ₹{p.baseMonthlyPriceInr}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Renewal Policy</Label>
                <Select value={form.renewalPolicy} onValueChange={v => setForm(f => ({ ...f, renewalPolicy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expire">Expire</SelectItem>
                    <SelectItem value="CarryForward">Carry Forward</SelectItem>
                    <SelectItem value="LimitedCarryForward">Limited Carry Forward</SelectItem>
                    <SelectItem value="Unlimited">Unlimited</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Overage Policy</Label>
                <Select value={form.overagePolicy} onValueChange={v => setForm(f => ({ ...f, overagePolicy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Block">Block</SelectItem>
                    <SelectItem value="Charge">Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={submitting || !form.accountId || !form.planId}>
              {submitting ? "Assigning..." : "Assign Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
