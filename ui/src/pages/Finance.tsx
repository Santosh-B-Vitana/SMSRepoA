import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  IndianRupee, TrendingUp, TrendingDown, PiggyBank, Plus, RefreshCw,
  Loader2, AlertCircle, Download, Filter, Receipt, BarChart3,
  ArrowUpCircle, ArrowDownCircle, Wallet, Clock, CheckCircle2, XCircle,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  financeApi,
  type AddIncomeDto,
  type AddExpenseDto,
  type CreatePettyCashEntryDto,
  type ApprovePettyCashDto,
} from "@/services/api/financeApi";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const incomeSchema = z.object({
  accountId:   z.string().min(1, "Account required"),
  categoryId:  z.string().min(1, "Category required"),
  source:      z.enum(["FEE", "STORE", "DONATION", "OTHER"]),
  amount:      z.coerce.number().positive("Amount must be positive"),
  date:        z.string().min(1, "Date required"),
  description: z.string().min(2, "Description required"),
});

const expenseSchema = z.object({
  accountId:   z.string().min(1, "Account required"),
  categoryId:  z.string().min(1, "Category required"),
  source:      z.enum(["FEE", "STORE", "PETTY_CASH", "DONATION", "OTHER"]),
  amount:      z.coerce.number().positive("Amount must be positive"),
  date:        z.string().min(1, "Date required"),
  description: z.string().min(2, "Description required"),
});

const pettyCashSchema = z.object({
  date:       z.string().min(1, "Date required"),
  amount:     z.coerce.number().positive("Amount must be positive"),
  purpose:    z.string().min(3, "Purpose required (min 3 chars)"),
  receiptUrl: z.string().optional(),
});

type IncomeFormData    = z.infer<typeof incomeSchema>;
type ExpenseFormData   = z.infer<typeof expenseSchema>;
type PettyCashFormData = z.infer<typeof pettyCashSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n?: number | null) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, trend, variant = "default",
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; trend?: number; variant?: "default" | "income" | "expense" | "neutral";
}) {
  const { t } = useLanguage();
  const variantStyles = {
    default:  "border-border",
    income:   "border-l-4 border-l-green-500",
    expense:  "border-l-4 border-l-red-500",
    neutral:  "border-l-4 border-l-indigo-500",
  };
  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}{t('finance.kpi.vsLastMonth')}
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Income Dialog ─────────────────────────────────────────────────────────────

function AddIncomeDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: accounts = [] } = useQuery({ queryKey: ["fin-accounts"], queryFn: financeApi.getAccounts });
  const { data: categories = [] } = useQuery({
    queryKey: ["fin-cats-income"],
    queryFn: () => financeApi.getCategories("INCOME"),
  });
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: "OTHER", date: new Date().toISOString().split("T")[0] },
  });
  const mut = useMutation({
    mutationFn: (data: AddIncomeDto) => financeApi.addIncome(data),
    onSuccess: () => { toast.success("Income recorded"); form.reset(); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Income</DialogTitle>
          <DialogDescription>Log a new income transaction to the selected account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mut.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FEE">Fee</SelectItem>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="DONATION">Donation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹) *</FormLabel>
                  <FormControl><Input type="number" placeholder="0" inputMode="numeric" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Input placeholder="Brief description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Income
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Expense Dialog ────────────────────────────────────────────────────────────

function AddExpenseDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: accounts = [] } = useQuery({ queryKey: ["fin-accounts"], queryFn: financeApi.getAccounts });
  const { data: categories = [] } = useQuery({
    queryKey: ["fin-cats-expense"],
    queryFn: () => financeApi.getCategories("EXPENSE"),
  });
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { source: "OTHER", date: new Date().toISOString().split("T")[0] },
  });
  const mut = useMutation({
    mutationFn: (data: AddExpenseDto) => financeApi.addExpense(data),
    onSuccess: () => { toast.success("Expense recorded"); form.reset(); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>Log a new expense against the selected account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mut.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FEE">Fee</SelectItem>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                      <SelectItem value="DONATION">Donation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹) *</FormLabel>
                  <FormControl><Input type="number" placeholder="0" inputMode="numeric" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Input placeholder="Brief description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Expense
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Petty Cash Dialog ─────────────────────────────────────────────────────────

function AddPettyCashDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const form = useForm<PettyCashFormData>({
    resolver: zodResolver(pettyCashSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });
  const mut = useMutation({
    mutationFn: (data: CreatePettyCashEntryDto) => financeApi.createPettyCash(data),
    onSuccess: () => { toast.success("Petty cash entry submitted"); form.reset(); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Petty Cash Request</DialogTitle>
          <DialogDescription>Submit a petty cash request for approval.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mut.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹) *</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose *</FormLabel>
                <FormControl><Input placeholder="Office supplies, petrol, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="receiptUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt URL (optional)</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Finance() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [tab, setTab] = useState("overview");
  const [txFilter, setTxFilter] = useState({ type: "", search: "" });
  const [showIncome, setShowIncome]     = useState(false);
  const [showExpense, setShowExpense]   = useState(false);
  const [showPettyCash, setShowPettyCash] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["fin-stats"],
    queryFn: () => financeApi.getStats(),
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["fin-report"],
    queryFn: () => financeApi.getReport(),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["fin-transactions", txFilter],
    queryFn: () =>
      financeApi.getTransactions({ type: txFilter.type || undefined, searchQuery: txFilter.search || undefined }),
  });

  const { data: pettyCashData, isLoading: pcLoading } = useQuery({
    queryKey: ["fin-pettycash"],
    queryFn: () => financeApi.getPettyCash(),
  });

  const { data: incomeSources } = useQuery({
    queryKey: ["fin-income-sources"],
    queryFn: () => financeApi.getIncomeSources(),
  });

  const approvePcMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApprovePettyCashDto }) =>
      financeApi.approvePettyCash(id, dto),
    onSuccess: () => { toast.success("Petty cash updated"); qc.invalidateQueries({ queryKey: ["fin-pettycash"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Action failed"),
  });

  // ── Chart data ────────────────────────────────────────────────────────────────
  const trendData = useMemo(() =>
    report?.monthlyTrend?.slice(-6).map((m) => ({
      name: m.month.substring(0, 3),
      income:   m.income,
      expenses: m.expenses,
      net:      m.net,
    })) ?? [],
  [report]);

  const expensePieData = useMemo(() => {
    if (!stats?.expenseByCategory) return [];
    return Object.entries(stats.expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [stats]);

  const incomeSourcePieData = useMemo(() => {
    if (!stats?.incomeByCategory) return [];
    return Object.entries(stats.incomeByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [stats]);

  const visibleIncomeSources = useMemo(
    () => (incomeSources?.sources ?? []).filter((s) => s.sourceCategory !== "PETTY_CASH"),
    [incomeSources]
  );

  const visibleIncomeTotals = useMemo(
    () =>
      visibleIncomeSources.reduce(
        (acc, source) => {
          acc.totalThisMonth += source.thisMonth;
          acc.totalLastMonth += source.lastMonth;
          acc.totalYearToDate += source.yearToDate;
          acc.totalPending += source.pending;
          acc.totalTransactions += source.transactionCount;
          return acc;
        },
        {
          totalThisMonth: 0,
          totalLastMonth: 0,
          totalYearToDate: 0,
          totalPending: 0,
          totalTransactions: 0,
        }
      ),
    [visibleIncomeSources]
  );

  const budgetData = useMemo(() =>
    report?.budgetSummary?.slice(0, 8).map((b) => ({
      name:    b.categoryName.length > 14 ? b.categoryName.substring(0, 13) + "…" : b.categoryName,
      budget:  b.budget,
      actual:  b.actual,
      pct:     b.utilizationPct,
    })) ?? [],
  [report]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["fin-stats"] });
    qc.invalidateQueries({ queryKey: ["fin-transactions"] });
    qc.invalidateQueries({ queryKey: ["fin-report"] });
    qc.invalidateQueries({ queryKey: ["fin-income-sources"] });
    refetchStats();
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('finance.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('finance.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> {t('finance.button.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPettyCash(true)}>
            <Wallet className="h-4 w-4 mr-1.5" /> {t('finance.button.pettyCash')}
          </Button>
          <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowExpense(true)}>
            <ArrowDownCircle className="h-4 w-4 mr-1.5" /> {t('finance.button.expense')}
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowIncome(true)}>
            <ArrowUpCircle className="h-4 w-4 mr-1.5" /> {t('finance.button.income')}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('finance.kpi.totalIncome')}
          value={fmt(stats?.totalIncome)}
          sub={`${t('finance.kpi.today')} ${fmt(stats?.todayIncome)}`}
          icon={TrendingUp}
          variant="income"
        />
        <StatCard
          title={t('finance.kpi.totalExpenses')}
          value={fmt(stats?.totalExpenses)}
          sub={`${t('finance.kpi.today')} ${fmt(stats?.todayExpenses)}`}
          icon={TrendingDown}
          variant="expense"
        />
        <StatCard
          title={t('finance.kpi.netSurplus')}
          value={fmt(stats?.netIncome)}
          icon={BarChart3}
          variant="neutral"
        />
        <StatCard
          title={t('finance.kpi.cashOnHand')}
          value={fmt(stats?.cashOnHand)}
          sub={`${stats?.pendingPettyCash ?? 0} ${t('finance.kpi.pettyCashPending')}`}
          icon={PiggyBank}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">{t('finance.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="transactions">{t('finance.tabs.transactions')}</TabsTrigger>
          <TabsTrigger value="pettycash">{t('finance.tabs.pettyCash')}</TabsTrigger>
          <TabsTrigger value="budget">{t('finance.tabs.budget')}</TabsTrigger>
          <TabsTrigger value="sources">{t('finance.tabs.incomeSources')}</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('finance.overview.monthlyTrendTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : trendData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('finance.overview.noTrendData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="income"   name={t('finance.chart.income')}   stroke="#22c55e" fill="url(#inc)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name={t('finance.chart.expenses')} stroke="#ef4444" fill="url(#exp)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie charts row */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('finance.overview.incomeByCategory')}</CardTitle></CardHeader>
              <CardContent>
                {incomeSourcePieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">{t('finance.overview.noData')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={incomeSourcePieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {incomeSourcePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('finance.overview.expensesByCategory')}</CardTitle></CardHeader>
              <CardContent>
                {expensePieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">{t('finance.overview.noData')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={expensePieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TRANSACTIONS ──────────────────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4 mt-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t('finance.transactions.searchPlaceholder')}
              value={txFilter.search}
              onChange={(e) => setTxFilter((f) => ({ ...f, search: e.target.value }))}
              className="max-w-xs"
            />
            <Select
              value={txFilter.type || "all"}
              onValueChange={(v) => setTxFilter((f) => ({ ...f, type: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-36">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('finance.transactions.filterAll')}</SelectItem>
                <SelectItem value="CREDIT">{t('finance.transactions.filterIncome')}</SelectItem>
                <SelectItem value="DEBIT">{t('finance.transactions.filterExpense')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : !txData?.items?.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('finance.transactions.noTransactions')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finance.transactions.col.date')}</TableHead>
                      <TableHead>{t('finance.transactions.col.description')}</TableHead>
                      <TableHead>{t('finance.transactions.col.account')}</TableHead>
                      <TableHead>{t('finance.transactions.col.category')}</TableHead>
                      <TableHead>{t('finance.transactions.col.source')}</TableHead>
                      <TableHead className="text-right">{t('finance.transactions.col.amount')}</TableHead>
                      <TableHead>{t('finance.transactions.col.type')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txData.items.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{new Date(tx.date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-sm">{tx.accountName}</TableCell>
                        <TableCell className="text-sm">{tx.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{tx.source}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "CREDIT" ? "default" : "destructive"} className="text-xs">
                            {tx.type === "CREDIT" ? t('finance.transactions.typeIncome') : t('finance.transactions.typeExpense')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {txData && (
            <p className="text-xs text-muted-foreground text-right">
              Showing {txData.items.length} of {txData.totalCount} transactions
            </p>
          )}
        </TabsContent>

        {/* ─── PETTY CASH ────────────────────────────────────────────── */}
        <TabsContent value="pettycash" className="space-y-4 mt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('finance.pettyCash.heading')}</h3>
            <Button size="sm" onClick={() => setShowPettyCash(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> {t('finance.pettyCash.newRequest')}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {pcLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : !pettyCashData?.items?.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('finance.pettyCash.noEntries')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finance.pettyCash.col.date')}</TableHead>
                      <TableHead>{t('finance.pettyCash.col.purpose')}</TableHead>
                      <TableHead>{t('finance.pettyCash.col.requestedBy')}</TableHead>
                      <TableHead className="text-right">{t('finance.pettyCash.col.amount')}</TableHead>
                      <TableHead>{t('finance.pettyCash.col.status')}</TableHead>
                      <TableHead>{t('finance.pettyCash.col.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pettyCashData.items.map((pc) => (
                      <TableRow key={pc.id}>
                        <TableCell className="text-sm">{new Date(pc.date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{pc.purpose}</TableCell>
                        <TableCell className="text-sm">{pc.requestedByName}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{fmt(pc.amount)}</TableCell>
                        <TableCell>
                          {pc.status === "APPROVED" && (
                            <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{t('finance.pettyCash.status.approved')}</Badge>
                          )}
                          {pc.status === "REJECTED" && (
                            <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />{t('finance.pettyCash.status.rejected')}</Badge>
                          )}
                          {pc.status === "PENDING" && (
                            <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />{t('finance.pettyCash.status.pending')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pc.status === "PENDING" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={approvePcMut.isPending}
                                onClick={() => approvePcMut.mutate({ id: pc.id, dto: { status: "APPROVED" } })}
                              >
                                {t('finance.pettyCash.button.approve')}
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={approvePcMut.isPending}
                                onClick={() => approvePcMut.mutate({ id: pc.id, dto: { status: "REJECTED" } })}
                              >
                                {t('finance.pettyCash.button.reject')}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BUDGET ────────────────────────────────────────────────── */}
        <TabsContent value="budget" className="space-y-4 mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('finance.budget.title')}</CardTitle>
              <CardDescription>{t('finance.budget.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : budgetData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('finance.budget.noData')}</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={budgetData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="budget" name={t('finance.budget.legend.budget')} fill="#6366f1" opacity={0.6} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name={t('finance.budget.legend.actual')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    {report?.budgetSummary?.slice(0, 6).map((b, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{b.categoryName}</span>
                          <span className={b.utilizationPct > 90 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                            {b.utilizationPct.toFixed(0)}{t('finance.budget.used')}
                          </span>
                        </div>
                        <Progress value={Math.min(b.utilizationPct, 100)} className={`h-1.5 ${b.utilizationPct > 90 ? "[&>div]:bg-red-500" : ""}`} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('finance.budget.actual')} {fmt(b.actual)}</span>
                          <span>{t('finance.budget.budget')} {fmt(b.budget)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── INCOME SOURCES ──────────────────────────────────────── */}
        <TabsContent value="sources" className="space-y-4 mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('finance.incomeSources.title')}</CardTitle>
              <CardDescription>Month-over-month comparison for all income streams</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!visibleIncomeSources.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No income source data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">This Month</TableHead>
                      <TableHead className="text-right">Last Month</TableHead>
                      <TableHead className="text-right">Year To Date</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-center">Txns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleIncomeSources.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.sourceName}</p>
                            <p className="text-xs text-muted-foreground">{s.sourceCategory}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-600">{fmt(s.thisMonth)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{fmt(s.lastMonth)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(s.yearToDate)}</TableCell>
                        <TableCell className="text-right text-sm text-amber-600">{fmt(s.pending)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">{s.transactionCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td className="px-4 py-3 text-sm">Total</td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">{fmt(visibleIncomeTotals.totalThisMonth)}</td>
                      <td className="px-4 py-3 text-right text-sm">{fmt(visibleIncomeTotals.totalLastMonth)}</td>
                      <td className="px-4 py-3 text-right text-sm">{fmt(visibleIncomeTotals.totalYearToDate)}</td>
                      <td className="px-4 py-3 text-right text-sm text-amber-600">{fmt(visibleIncomeTotals.totalPending)}</td>
                      <td className="px-4 py-3 text-center text-sm">{visibleIncomeTotals.totalTransactions}</td>
                    </tr>
                  </tfoot>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddIncomeDialog
        open={showIncome}
        onClose={() => setShowIncome(false)}
        onSuccess={() => { setShowIncome(false); invalidateAll(); }}
      />
      <AddExpenseDialog
        open={showExpense}
        onClose={() => setShowExpense(false)}
        onSuccess={() => { setShowExpense(false); invalidateAll(); }}
      />
      <AddPettyCashDialog
        open={showPettyCash}
        onClose={() => setShowPettyCash(false)}
        onSuccess={() => { setShowPettyCash(false); qc.invalidateQueries({ queryKey: ["fin-pettycash"] }); }}
      />
    </div>
  );
}
