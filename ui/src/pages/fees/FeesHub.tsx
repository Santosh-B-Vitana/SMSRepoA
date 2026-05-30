import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  Receipt,
  Settings2,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Building2,
  Tags,
  BellRing,
  Tag,
  Users,
  Upload,
  FileText,
  Loader2,
} from "lucide-react";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { getFeeStats } from "@/services/api/feeApi";

// ── Format as Indian Rupees ────────────────────────────────────────────────────
function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function FeesHub() {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const [stats, setStats] = useState<{
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    collectionRate: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!academicYear) return;
    setStatsLoading(true);
    getFeeStats(academicYear)
      .then((s) =>
        setStats({
          totalCollected: s.totalCollected,
          totalPending: s.totalPending,
          totalOverdue: s.totalOverdue,
          collectionRate: s.collectionRate,
        })
      )
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [academicYear]);

  const rate = stats
    ? Math.round(isFinite(stats.collectionRate) ? stats.collectionRate : 0)
    : null;

  // ── Top KPI strip ──────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Total Collected",
      value: stats ? inr(stats.totalCollected) : "—",
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Total Pending",
      value: stats ? inr(stats.totalPending) : "—",
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Overdue",
      value: stats ? inr(stats.totalOverdue) : "—",
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    },
    {
      label: "Collection Rate",
      value: rate !== null ? `${rate}%` : "—",
      icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
            <p className="text-sm text-muted-foreground">
              {academicYear ? `Academic Year: ${academicYear}` : "Manage school fees end-to-end"}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${k.bg}`}
          >
            <div className="shrink-0">{k.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{k.label}</p>
              <p className={`text-base font-bold ${k.color}`}>
                {statsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin inline-block" />
                ) : (
                  k.value
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two big navigation tiles ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Tile 1: Collect & Reports ── */}
        <Card
          className="group relative overflow-hidden border-2 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all duration-200 cursor-pointer"
          onClick={() => navigate("/fees/collect")}
        >
          {/* Accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-lg" />

          <CardContent className="p-7 flex flex-col gap-5">
            {/* Icon + badge */}
            <div className="flex items-start justify-between">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Receipt className="h-7 w-7 text-emerald-600" />
              </div>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                Day-to-day
              </Badge>
            </div>

            {/* Title + description */}
            <div>
              <h2 className="text-xl font-bold mb-1.5">Collect Fees &amp; Reports</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Collect term fees, handle advance payments, track defaulters, and
                download detailed financial reports.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-2">
              {[
                { icon: <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />, label: "Collect & record fee payments" },
                { icon: <Users className="h-3.5 w-3.5 text-emerald-600" />, label: "View student fee status" },
                { icon: <AlertTriangle className="h-3.5 w-3.5 text-emerald-600" />, label: "Defaulters list & overdue tracking" },
                { icon: <Upload className="h-3.5 w-3.5 text-emerald-600" />, label: "Bulk payment upload" },
                { icon: <FileText className="h-3.5 w-3.5 text-emerald-600" />, label: "Receipt templates & day summary" },
                { icon: <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />, label: "Collection analytics & reports" },
              ].map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="shrink-0">{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              className="mt-auto w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(e) => { e.stopPropagation(); navigate("/fees/collect"); }}
            >
              Open Collect &amp; Reports
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Tile 2: Fee Setup ── */}
        <Card
          className="group relative overflow-hidden border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer"
          onClick={() => navigate("/fees/setup")}
        >
          {/* Accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-lg" />

          <CardContent className="p-7 flex flex-col gap-5">
            {/* Icon + badge */}
            <div className="flex items-start justify-between">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Settings2 className="h-7 w-7 text-blue-600" />
              </div>
              <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-xs">
                Configuration
              </Badge>
            </div>

            {/* Title + description */}
            <div>
              <h2 className="text-xl font-bold mb-1.5">Fee Setup &amp; Configuration</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Define fee structures, manage fee types, configure payment reminders,
                and set up concession policies for your school.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-2">
              {[
                { icon: <Building2 className="h-3.5 w-3.5 text-blue-600" />, label: "Fee structures per class" },
                { icon: <Tags className="h-3.5 w-3.5 text-blue-600" />, label: "Fee heads & types" },
                { icon: <BellRing className="h-3.5 w-3.5 text-blue-600" />, label: "Payment reminder schedules" },
                { icon: <Tag className="h-3.5 w-3.5 text-blue-600" />, label: "Concession types & policies" },
                { icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />, label: "Promote fee structures across years" },
              ].map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="shrink-0">{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              className="mt-auto w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => { e.stopPropagation(); navigate("/fees/setup"); }}
            >
              Open Fee Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
