import { useEffect, useState } from "react";
import { Calendar, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { UpcomingRenewal, BillingInvoice } from "@/services/api/whatsappApi";

const daysDiff = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function WhatsAppRenewalDashboard() {
  const [renewals, setRenewals] = useState<UpcomingRenewal[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      waApi.getUpcomingRenewals(30).then(setRenewals),
      waApi.getInvoices({ page: 1, pageSize: 20 }).then(setInvoices),
    ])
      .catch(() => toast.error("Failed to load renewal data"))
      .finally(() => setLoading(false));
  }, []);

  const urgentCount = renewals.filter(r => daysDiff(r.renewalDate) <= 7).length;
  const soonCount = renewals.filter(r => daysDiff(r.renewalDate) > 7 && daysDiff(r.renewalDate) <= 30).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renewal Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and manage subscription renewals</p>
        </div>
        <Button variant="outline" size="sm" onClick={() =>
          Promise.all([waApi.getUpcomingRenewals(30).then(setRenewals), waApi.getInvoices().then(setInvoices)])
        }>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Renewing in 7 days", count: urgentCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Renewing in 30 days", count: soonCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Expected Revenue", count: `₹${renewals.reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")}`, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className={`inline-flex p-2 rounded-lg ${k.bg} mb-3`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{k.count}</div>
              <div className="text-xs text-gray-500 mt-1">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Renewals Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Upcoming Renewals (Next 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : renewals.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No upcoming renewals in the next 30 days.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead className="text-right">Days Until</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewals.map(r => {
                  const days = daysDiff(r.renewalDate);
                  return (
                    <TableRow key={r.subscriptionId}>
                      <TableCell className="font-medium">{r.schoolName}</TableCell>
                      <TableCell><Badge variant="outline">{r.planName}</Badge></TableCell>
                      <TableCell>{new Date(r.renewalDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={days <= 3 ? "destructive" : days <= 7 ? "default" : "secondary"}>
                          {days}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        ₹{r.amount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.schoolName}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(inv.periodStart).toLocaleDateString("en-IN")} –{" "}
                      {new Date(inv.periodEnd).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{inv.totalAmountInr.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === "Paid" ? "default" :
                          inv.status === "Overdue" ? "destructive" :
                          inv.status === "Issued" ? "secondary" : "outline"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
