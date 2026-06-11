import { useEffect, useState } from "react";
import { MessageSquare, TrendingUp, DollarSign, Users, AlertTriangle, RefreshCw, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppHubDashboard } from "@/services/api/whatsappApi";

export default function WhatsAppHubOverview() {
  const [dashboard, setDashboard] = useState<WhatsAppHubDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await waApi.getHubDashboard();
      setDashboard(data);
    } catch {
      toast.error("Failed to load WhatsApp hub dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Active Schools",
      value: dashboard?.totalActiveSchools ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Messages Sent (MTD)",
      value: (dashboard?.totalMessagesMtd ?? 0).toLocaleString(),
      icon: MessageSquare,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Revenue (MTD)",
      value: `₹${(dashboard?.totalRevenueMtd ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Gross Profit (MTD)",
      value: `₹${(dashboard?.grossProfitMtd ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      sub: `${dashboard?.grossMarginPct?.toFixed(1) ?? 0}% margin`,
    },
    {
      title: "Pending Renewals",
      value: dashboard?.pendingRenewals ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Provider Cost (MTD)",
      value: `₹${(dashboard?.totalProviderCostMtd ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Communication Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Platform-wide WhatsApp metrics and management</p>
        </div>
        <Button variant="outline" onClick={fetchDashboard} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.title}</div>
              {kpi.sub && <div className="text-xs text-emerald-600 mt-1">{kpi.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Row */}
      {(dashboard?.pendingRenewals ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="text-amber-800 text-sm font-medium">
            {dashboard?.pendingRenewals} school{(dashboard?.pendingRenewals ?? 0) > 1 ? "s" : ""} have subscriptions
            renewing within 7 days.
          </span>
          <Button variant="outline" size="sm" className="ml-auto text-amber-700 border-amber-300">
            View Renewals <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Top Consuming Schools */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Top Consuming Schools — Current Month</CardTitle>
        </CardHeader>
        <CardContent>
          {!dashboard?.topConsumers?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet for this month.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Provider Cost</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.topConsumers.map((school, i) => (
                  <TableRow key={school.schoolId}>
                    <TableCell className="font-medium">
                      <span className="text-gray-400 mr-2">#{i + 1}</span>
                      {school.schoolName}
                    </TableCell>
                    <TableCell className="text-right">{school.messagesSent.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-700 font-medium">
                      ₹{school.revenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ₹{school.cost.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={school.margin >= 40 ? "default" : "secondary"}>
                        {school.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Manage Providers", href: "/superadmin/whatsapp/providers", icon: "🔌" },
          { label: "School Accounts", href: "/superadmin/whatsapp/accounts", icon: "🏫" },
          { label: "Cost Dashboard", href: "/superadmin/whatsapp/costs", icon: "💰" },
          { label: "Upcoming Renewals", href: "/superadmin/whatsapp/renewals", icon: "🔄" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">{link.icon}</span>
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
            <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
}
