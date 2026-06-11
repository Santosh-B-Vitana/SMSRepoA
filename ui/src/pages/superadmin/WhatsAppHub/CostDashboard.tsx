import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppCostDashboard } from "@/services/api/whatsappApi";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

export default function WhatsAppCostDashboard() {
  const [data, setData] = useState<WhatsAppCostDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const d = await waApi.getCostDashboard();
      setData(d);
    } catch {
      toast.error("Failed to load cost dashboard");
    } finally {
      setLoading(false);
    }
  };

  const chartData = (data?.monthlyRevenue ?? []).map(m => ({
    period: m.period,
    "Provider Cost": Number(m.providerCost.toFixed(0)),
    Revenue: Number(m.revenue.toFixed(0)),
    Profit: Number(m.profit.toFixed(0)),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost & Revenue Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform-wide WhatsApp cost tracking and profitability</p>
        </div>
        <Button variant="outline" onClick={fetchData} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue (12mo)", value: fmt(data?.totalRevenueInr ?? 0), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Provider Cost (12mo)", value: fmt(data?.totalProviderCostInr ?? 0), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
          { label: "Gross Profit (12mo)", value: fmt(data?.grossProfit ?? 0), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Gross Margin", value: `${(data?.grossMarginPct ?? 0).toFixed(1)}%`, icon: ArrowUpRight, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className={`inline-flex p-2 rounded-lg ${k.bg} mb-3`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div className="text-xl font-bold text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-500 mt-1">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-emerald-700 font-medium">Expected Next Month Revenue</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">
              {fmt(data?.expectedNextMonthRevenue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-red-700 font-medium">Expected Next Month Provider Cost</p>
            <p className="text-2xl font-bold text-red-800 mt-1">
              {fmt(data?.expectedNextMonthCost ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">12-Month Revenue vs. Provider Cost vs. Profit</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="Provider Cost" fill="#f87171" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Revenue" fill="#34d399" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Profit" fill="#818cf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* School-wise Cost Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">School-wise Cost & Revenue — Current Month</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.schoolCosts?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">No school data this month.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Provider Cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.schoolCosts.map((s) => (
                  <TableRow key={s.schoolId}>
                    <TableCell className="font-medium">{s.schoolName}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(s.providerCost)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{fmt(s.revenue)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(s.profit)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.marginPct >= 40 ? "default" : s.marginPct >= 20 ? "secondary" : "destructive"}>
                        {s.marginPct.toFixed(1)}%
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
