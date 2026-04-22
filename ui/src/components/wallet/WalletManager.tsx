import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Plus, Download,
  RefreshCw, CheckCircle, XCircle, Clock, BarChart3, ArrowUpRight,
  ArrowDownRight, ShoppingBag, CreditCard, Search, SlidersHorizontal,
  Banknote, PiggyBank, Receipt, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  financeApi,
  FinanceStatsDto, FinanceTransactionDto, FinanceCategoryDto,
  FinanceAccountDto, PettyCashEntryDto, StoreSaleDto, FinanceReportDto,
  TransactionFiltersDto, AggregatedIncomeDto,
} from "@/services/api/financeApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const todayStr = () => new Date().toISOString().slice(0, 10);

const SOURCE_LABELS: Record<string, string> = {
  FEE: "Fee", STORE: "Store", PETTY_CASH: "Petty Cash",
  DONATION: "Donation", OTHER: "Other",
};

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Other"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color, trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={cn("rounded-full p-2", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold flex items-center gap-1">
          {value}
          {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
          {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "APPROVED" ? "default" : status === "REJECTED" ? "destructive" : "secondary"
      }
      className={cn(status === "APPROVED" && "bg-emerald-600 text-white")}
    >
      {status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
      {status === "APPROVED" && <CheckCircle className="h-3 w-3 mr-1" />}
      {status === "REJECTED" && <XCircle className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-muted-foreground">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WalletManager() {
  const visitedTabs = useRef(new Set(["dashboard"]));

  const [stats, setStats] = useState<FinanceStatsDto | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [accounts, setAccounts] = useState<FinanceAccountDto[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);

  const [transactions, setTransactions] = useState<FinanceTransactionDto[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilters, setTxFilters] = useState<TransactionFiltersDto & { search: string }>({
    search: "", type: "", source: "", dateFrom: "", dateTo: "",
  });

  const [pettyCash, setPettyCash] = useState<PettyCashEntryDto[]>([]);
  const [pcTotal, setPcTotal] = useState(0);
  const [pcPage, setPcPage] = useState(1);
  const [pcLoading, setPcLoading] = useState(false);

  const [storeSales, setStoreSales] = useState<StoreSaleDto[]>([]);
  const [ssTotal, setSsTotal] = useState(0);
  const [ssPage, setSsPage] = useState(1);
  const [ssLoading, setSsLoading] = useState(false);

  const [report, setReport] = useState<FinanceReportDto | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [reportTo, setReportTo] = useState(todayStr());

  const [aggregatedIncome, setAggregatedIncome] = useState<AggregatedIncomeDto | null>(null);
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState(false);

  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [addSaleOpen, setAddSaleOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [approvePcId, setApprovePcId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const incCats = categories.filter(c => c.type === "INCOME");
  const expCats = categories.filter(c => c.type === "EXPENSE");
  const assetAccounts = accounts.filter(a => a.type === "ASSET");

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await financeApi.getStats();
      setStats(s);
    } catch {
      toast.error("Failed to load finance stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const [accs, cats] = await Promise.all([
        financeApi.getAccounts(),
        financeApi.getCategories(),
      ]);
      setAccounts(accs);
      setCategories(cats);
    } catch { /* silent */ }
  }, []);

  const loadTransactions = useCallback(async (page = 1, filters = txFilters) => {
    setTxLoading(true);
    try {
      const apiFilters: TransactionFiltersDto = {};
      if (filters.type) apiFilters.type = filters.type;
      if (filters.source) apiFilters.source = filters.source;
      if (filters.dateFrom) apiFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) apiFilters.dateTo = filters.dateTo;
      if (filters.search) apiFilters.searchQuery = filters.search;
      const res = await financeApi.getTransactions(apiFilters, page, 20);
      setTransactions(res.items);
      setTxTotal(res.totalCount);
      setTxPage(page);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  }, [txFilters]);

  const loadPettyCash = useCallback(async (page = 1) => {
    setPcLoading(true);
    try {
      const res = await financeApi.getPettyCash(page, 20);
      setPettyCash(res.items);
      setPcTotal(res.totalCount);
      setPcPage(page);
    } catch {
      toast.error("Failed to load petty cash entries");
    } finally {
      setPcLoading(false);
    }
  }, []);

  const loadStoreSales = useCallback(async (page = 1) => {
    setSsLoading(true);
    try {
      const res = await financeApi.getStoreSales(page, 20);
      setStoreSales(res.items);
      setSsTotal(res.totalCount);
      setSsPage(page);
    } catch {
      toast.error("Failed to load store sales");
    } finally {
      setSsLoading(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const r = await financeApi.getReport(reportFrom, reportTo);
      setReport(r);
    } catch {
      toast.error("Failed to load report");
    } finally {
      setReportLoading(false);
    }
  }, [reportFrom, reportTo]);

  const loadIncomeSources = useCallback(async () => {
    setIncomeSourcesLoading(true);
    try {
      const inc = await financeApi.getIncomeSources();
      setAggregatedIncome(inc);
    } catch {
      toast.error("Failed to load income sources");
    } finally {
      setIncomeSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadMeta();
    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: string) => {
    visitedTabs.current.add(tab);
    if (tab === "petty-cash" && pettyCash.length === 0) loadPettyCash();
    if (tab === "store-income" && storeSales.length === 0) loadStoreSales();
    if (tab === "reports" && !report) loadReport();
    if (tab === "income" && !aggregatedIncome) loadIncomeSources();
  };

  // ─── Form handlers ─────────────────────────────────────────────────────────

  const handleAddIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      await financeApi.addIncome({
        accountId: get("accountId"),
        categoryId: get("categoryId"),
        source: get("source") as "FEE" | "STORE" | "DONATION" | "OTHER",
        amount: parseFloat(get("amount")),
        date: get("date"),
        description: get("description"),
      });
      toast.success("Income recorded");
      setAddIncomeOpen(false);
      loadStats();
      loadTransactions(txPage);
    } catch {
      toast.error("Failed to record income");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      await financeApi.addExpense({
        accountId: get("accountId"),
        categoryId: get("categoryId"),
        source: get("source") as "FEE" | "STORE" | "PETTY_CASH" | "DONATION" | "OTHER",
        amount: parseFloat(get("amount")),
        date: get("date"),
        description: get("description"),
      });
      toast.success("Expense recorded");
      setAddExpenseOpen(false);
      loadStats();
      loadTransactions(txPage);
    } catch {
      toast.error("Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPettyCash = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    setSubmitting(true);
    try {
      await financeApi.createPettyCash({
        date: get("date"),
        amount: parseFloat(get("amount")),
        purpose: get("purpose"),
      });
      toast.success("Petty cash request submitted");
      setAddPcOpen(false);
      loadPettyCash(pcPage);
      loadStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePettyCash = async (entryId: string, status: "APPROVED" | "REJECTED", remarks: string) => {
    setSubmitting(true);
    try {
      await financeApi.approvePettyCash(entryId, { status, approvalRemarks: remarks || undefined });
      toast.success(`Request ${status.toLowerCase()}`);
      setApprovePcId(null);
      loadPettyCash(pcPage);
      loadStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStoreSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      await financeApi.createStoreSale({
        date: get("date"),
        amount: parseFloat(get("amount")),
        itemsCount: parseInt(get("itemsCount")),
        paymentMethod: get("paymentMethod"),
        notes: get("notes") || undefined,
      });
      toast.success("Store sale recorded");
      setAddSaleOpen(false);
      loadStoreSales(ssPage);
      loadStats();
    } catch {
      toast.error("Failed to record store sale");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      await financeApi.createAccount({
        name: get("name"),
        type: get("type") as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
        description: get("description") || undefined,
      });
      toast.success("Account created");
      setAddAccountOpen(false);
      loadMeta();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      const budgetVal = get("budget");
      await financeApi.createCategory({
        name: get("name"),
        type: get("type") as "INCOME" | "EXPENSE",
        budget: budgetVal ? parseFloat(budgetVal) : undefined,
      });
      toast.success("Category created");
      setAddCategoryOpen(false);
      loadMeta();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Approve Dialog (inner component) ─────────────────────────────────────
  function ApproveDialog() {
    const entry = pettyCash.find(p => p.id === approvePcId);
    const [remarks, setRemarks] = useState("");
    if (!entry) return null;
    return (
      <Dialog open={!!approvePcId} onOpenChange={() => setApprovePcId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Petty Cash Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Requested by</p>
                <p className="font-medium">{entry.requestedByName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium text-lg">{fmt(entry.amount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Purpose</p>
                <p className="font-medium">{entry.purpose}</p>
              </div>
            </div>
            <div>
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Add remarks..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" disabled={submitting}
              onClick={() => handleApprovePettyCash(entry.id, "REJECTED", remarks)}>
              <XCircle className="h-4 w-4 mr-2" />Reject
            </Button>
            <Button disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleApprovePettyCash(entry.id, "APPROVED", remarks)}>
              <CheckCircle className="h-4 w-4 mr-2" />Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Shared Transaction Form ───────────────────────────────────────────────
  function TransactionForm({
    mode, onSubmit, open, onClose,
  }: {
    mode: "income" | "expense";
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    open: boolean;
    onClose: () => void;
  }) {
    const cats = mode === "income" ? incCats : expCats;
    const sources = mode === "income"
      ? ["FEE", "STORE", "DONATION", "OTHER"]
      : ["FEE", "STORE", "PETTY_CASH", "DONATION", "OTHER"];
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "income"
                ? <><TrendingUp className="h-5 w-5 text-emerald-500" />Record Income</>
                : <><TrendingDown className="h-5 w-5 text-red-500" />Record Expense</>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            <div>
              <Label>Account *</Label>
              <Select name="accountId" required>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {assetAccounts.length === 0
                    ? <SelectItem value="__none" disabled>No accounts — create one first</SelectItem>
                    : assetAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select name="categoryId" required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {cats.length === 0
                    ? <SelectItem value="__none" disabled>No categories — create one first</SelectItem>
                    : cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source *</Label>
              <Select name="source" required>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {sources.map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹) *</Label>
                <Input name="amount" type="number" min={1} step="0.01" required placeholder="0.00" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input name="date" type="date" defaultValue={todayStr()} required />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea name="description" required placeholder="Brief description..." rows={2} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : mode === "income" ? "Record Income" : "Record Expense"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance & Wallet</h1>
          <p className="text-sm text-muted-foreground">Track income, expenses, petty cash and store revenue</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setAddAccountOpen(true)}>
            <Banknote className="h-4 w-4 mr-2" />Add Account
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddCategoryOpen(true)}>
            <PiggyBank className="h-4 w-4 mr-2" />Add Category
          </Button>
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadTransactions(txPage); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="petty-cash">
            Petty Cash
            {stats && stats.pendingPettyCash > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5 leading-none">
                {stats.pendingPettyCash}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="store-income">Store Income</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ═══════════ DASHBOARD ═══════════ */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {statsLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading dashboard…</div>
          ) : !stats ? (
            <div className="text-center py-16 text-muted-foreground">No data available</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Cash on Hand" value={fmt(stats.cashOnHand)} sub="All asset accounts" icon={Wallet} color="bg-blue-500" />
                <KpiCard title="MTD Income" value={fmt(stats.totalIncome)} sub="Month to date" icon={TrendingUp} color="bg-emerald-500" trend="up" />
                <KpiCard title="MTD Expenses" value={fmt(stats.totalExpenses)} sub="Month to date" icon={TrendingDown} color="bg-red-500" trend="down" />
                <KpiCard title="Net Surplus" value={fmt(stats.netIncome)} sub={stats.netIncome >= 0 ? "Surplus" : "Deficit"} icon={DollarSign} color={stats.netIncome >= 0 ? "bg-teal-500" : "bg-orange-500"} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                    <div className="rounded-full bg-emerald-100 p-3"><ArrowUpRight className="h-5 w-5 text-emerald-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Today's Income</p>
                      <p className="text-xl font-bold text-emerald-600">{fmt(stats.todayIncome)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                    <div className="rounded-full bg-red-100 p-3"><ArrowDownRight className="h-5 w-5 text-red-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Today's Expenses</p>
                      <p className="text-xl font-bold text-red-600">{fmt(stats.todayExpenses)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                    <div className="rounded-full bg-amber-100 p-3"><Clock className="h-5 w-5 text-amber-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Approvals</p>
                      <p className="text-xl font-bold text-amber-600">{stats.pendingPettyCash} requests</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />Income by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(stats.incomeByCategory).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No income recorded yet</p>
                    ) : Object.entries(stats.incomeByCategory).map(([cat, amt]) => {
                      const total = Object.values(stats.incomeByCategory).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.min((amt / total) * 100, 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate max-w-[55%]">{cat}</span>
                            <span className="text-muted-foreground text-xs">{fmt(amt)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />Expense by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(stats.expenseByCategory).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet</p>
                    ) : Object.entries(stats.expenseByCategory).map(([cat, amt]) => {
                      const total = Object.values(stats.expenseByCategory).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.min((amt / total) * 100, 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate max-w-[55%]">{cat}</span>
                            <span className="text-muted-foreground text-xs">{fmt(amt)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 8).map(tx => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground text-sm">{fmtDate(tx.date)}</TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                            <TableCell className="text-sm">{tx.categoryName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{SOURCE_LABELS[tx.source] ?? tx.source}</Badge>
                            </TableCell>
                            <TableCell className={cn("text-right font-semibold",
                              tx.type === "CREDIT" ? "text-emerald-600" : "text-red-600")}>
                              {tx.type === "CREDIT" ? "+" : "−"}{fmt(tx.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════ TRANSACTIONS ═══════════ */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search transactions…"
                value={txFilters.search}
                onChange={e => setTxFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") loadTransactions(1); }} />
            </div>
            <Select value={txFilters.type ?? "all"} onValueChange={v => setTxFilters(f => ({ ...f, type: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="CREDIT">Income</SelectItem>
                <SelectItem value="DEBIT">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={txFilters.source ?? "all"} onValueChange={v => setTxFilters(f => ({ ...f, source: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="w-38" value={txFilters.dateFrom ?? ""}
              onChange={e => setTxFilters(f => ({ ...f, dateFrom: e.target.value }))} />
            <Input type="date" className="w-38" value={txFilters.dateTo ?? ""}
              onChange={e => setTxFilters(f => ({ ...f, dateTo: e.target.value }))} />
            <Button variant="outline" onClick={() => loadTransactions(1)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />Filter
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button onClick={() => setAddIncomeOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <TrendingUp className="h-4 w-4 mr-2" />Income
              </Button>
              <Button onClick={() => setAddExpenseOpen(true)} variant="destructive">
                <TrendingDown className="h-4 w-4 mr-2" />Expense
              </Button>
            </div>
          </div>

          <Card>
            {txLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions found</TableCell>
                    </TableRow>
                  ) : transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{fmtDate(tx.date)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{tx.description}</TableCell>
                      <TableCell className="text-sm">{tx.accountName}</TableCell>
                      <TableCell className="text-sm">{tx.categoryName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[tx.source] ?? tx.source}</Badge></TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", tx.type === "CREDIT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")} variant="outline">
                          {tx.type === "CREDIT" ? "Income" : "Expense"}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold", tx.type === "CREDIT" ? "text-emerald-600" : "text-red-600")}>
                        {tx.type === "CREDIT" ? "+" : "−"}{fmt(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Pagination page={txPage} total={txTotal} pageSize={20} onChange={p => loadTransactions(p)} />
        </TabsContent>

        {/* ═══════════ INCOME ═══════════ */}
        <TabsContent value="income" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />Aggregated Income Sources
            </h2>
            <Button onClick={() => setAddIncomeOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />Record Income
            </Button>
          </div>

          {!aggregatedIncome ? (
            <div className="text-center py-16 text-muted-foreground">
              {incomeSourcesLoading ? "Loading income sources…" : "No data available"}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-emerald-600">{fmt(aggregatedIncome.totalThisMonth)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">Last Month</p>
                    <p className="text-2xl font-bold">{fmt(aggregatedIncome.totalLastMonth)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">Year to Date</p>
                    <p className="text-2xl font-bold text-teal-600">{fmt(aggregatedIncome.totalYearToDate)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">{fmt(aggregatedIncome.totalPending)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />Income by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aggregatedIncome.sources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>No income sources recorded yet.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Income Source</TableHead>
                          <TableHead className="text-right">This Month</TableHead>
                          <TableHead className="text-right">Last Month</TableHead>
                          <TableHead className="text-right">Year to Date</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead className="text-center">Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedIncome.sources.map(source => (
                          <TableRow key={source.sourceCategory}>
                            <TableCell className="font-medium flex items-center gap-2">
                              {source.sourceCategory === "FEE" && <Banknote className="h-4 w-4 text-blue-500" />}
                              {source.sourceCategory === "STORE" && <ShoppingBag className="h-4 w-4 text-violet-500" />}
                              {source.sourceCategory === "LIBRARY" && <Receipt className="h-4 w-4 text-orange-500" />}
                              {source.sourceCategory === "DONATION" && <Heart className="h-4 w-4 text-red-500" />}
                              {source.sourceCategory === "PETTY_CASH" && <Wallet className="h-4 w-4 text-amber-500" />}
                              {source.sourceName}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">{fmt(source.thisMonth)}</TableCell>
                            <TableCell className="text-right">{fmt(source.lastMonth)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmt(source.yearToDate)}</TableCell>
                            <TableCell className={cn("text-right font-medium", source.pending > 0 ? "text-amber-600" : "text-muted-foreground")}>
                              {fmt(source.pending)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{source.transactionCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Budget vs Actual — Income Categories</CardTitle></CardHeader>
                <CardContent>
                  {incCats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>No income categories yet.</p>
                      <Button variant="link" onClick={() => setAddCategoryOpen(true)}>Create a category</Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incCats.map(cat => {
                          const diff = cat.actualAmount - (cat.budget ?? 0);
                          const pct = cat.budget ? Math.min((cat.actualAmount / cat.budget) * 100, 100) : 0;
                          return (
                            <TableRow key={cat.id}>
                              <TableCell className="font-medium">{cat.name}</TableCell>
                              <TableCell className="text-right">{cat.budget ? fmt(cat.budget) : "—"}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-semibold">{fmt(cat.actualAmount)}</TableCell>
                              <TableCell className={cn("text-right font-medium", diff >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}
                              </TableCell>
                              <TableCell>
                                {cat.budget ? (
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                                  </div>
                                ) : <span className="text-muted-foreground text-sm">No budget</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════ EXPENSES ═══════════ */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />Expense Overview
            </h2>
            <Button onClick={() => setAddExpenseOpen(true)} variant="destructive">
              <Plus className="h-4 w-4 mr-2" />Record Expense
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold text-red-600">{fmt(stats?.totalExpenses ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Today's Expenses</p><p className="text-2xl font-bold text-red-600">{fmt(stats?.todayExpenses ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Expense Categories</p><p className="text-2xl font-bold">{expCats.length}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Budget vs Actual — Expense Categories</CardTitle></CardHeader>
            <CardContent>
              {expCats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No expense categories yet.</p>
                  <Button variant="link" onClick={() => setAddCategoryOpen(true)}>Create a category</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Utilisation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expCats.map(cat => {
                      const remaining = (cat.budget ?? 0) - cat.actualAmount;
                      const pct = cat.budget ? Math.min((cat.actualAmount / cat.budget) * 100, 100) : 0;
                      const over = cat.budget ? cat.actualAmount > cat.budget : false;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-right">{cat.budget ? fmt(cat.budget) : "—"}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">{fmt(cat.actualAmount)}</TableCell>
                          <TableCell className={cn("text-right font-medium", over ? "text-red-600" : "text-muted-foreground")}>
                            {over ? `Over by ${fmt(Math.abs(remaining))}` : fmt(remaining)}
                          </TableCell>
                          <TableCell>
                            {cat.budget ? (
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div className={cn("h-2 rounded-full", over ? "bg-red-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                              </div>
                            ) : <span className="text-muted-foreground text-sm">No budget</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ PETTY CASH ═══════════ */}
        <TabsContent value="petty-cash" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-500" />Petty Cash Management
            </h2>
            <Button onClick={() => setAddPcOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Request
            </Button>
          </div>
          {stats && stats.pendingPettyCash > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {stats.pendingPettyCash} petty cash request{stats.pendingPettyCash > 1 ? "s" : ""} awaiting approval
              </p>
            </div>
          )}
          <Card>
            {pcLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pettyCash.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No petty cash entries yet</TableCell>
                    </TableRow>
                  ) : pettyCash.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(entry.date)}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{entry.purpose}</TableCell>
                      <TableCell className="text-sm">{entry.requestedByName}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(entry.amount)}</TableCell>
                      <TableCell><StatusBadge status={entry.status} /></TableCell>
                      <TableCell className="text-sm">{entry.approvedByName ?? "—"}</TableCell>
                      <TableCell>
                        {entry.status === "PENDING" && (
                          <Button size="sm" variant="outline" onClick={() => setApprovePcId(entry.id)}>Review</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Pagination page={pcPage} total={pcTotal} pageSize={20} onChange={loadPettyCash} />
        </TabsContent>

        {/* ═══════════ STORE INCOME ═══════════ */}
        <TabsContent value="store-income" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-violet-500" />Store Income
            </h2>
            <Button onClick={() => setAddSaleOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />Record Sale
            </Button>
          </div>
          {storeSales.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["Cash", "Card", "UPI"] as const).map(method => {
                const total = storeSales.filter(s => s.paymentMethod === method).reduce((sum, s) => sum + s.amount, 0);
                return (
                  <Card key={method}>
                    <CardContent className="pt-5 flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-violet-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">{method} Sales</p>
                        <p className="text-xl font-bold">{fmt(total)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <Card>
            {ssLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No store sales recorded yet</TableCell>
                    </TableRow>
                  ) : storeSales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(sale.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.invoiceNumber ?? "—"}</TableCell>
                      <TableCell className="text-right">{sale.itemsCount}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{sale.paymentMethod}</Badge></TableCell>
                      <TableCell className="text-sm">{sale.processedByName ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-violet-600">{fmt(sale.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Pagination page={ssPage} total={ssTotal} pageSize={20} onChange={loadStoreSales} />
        </TabsContent>

        {/* ═══════════ REPORTS ═══════════ */}
        <TabsContent value="reports" className="space-y-6 mt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={loadReport} disabled={reportLoading}>
              <BarChart3 className="h-4 w-4 mr-2" />{reportLoading ? "Loading…" : "Generate Report"}
            </Button>
          </div>

          {!report ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a date range and click Generate Report</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Income", value: report.totalIncome, color: "text-emerald-600" },
                  { label: "Total Expenses", value: report.totalExpenses, color: "text-red-600" },
                  { label: "Net Surplus", value: report.netSurplus, color: report.netSurplus >= 0 ? "text-teal-600" : "text-orange-600" },
                  { label: "Store Sales", value: report.storeSalesTotal, color: "text-violet-600" },
                  { label: "Petty Cash Used", value: report.pettyCashTotal, color: "text-amber-600" },
                ].map(item => (
                  <Card key={item.label}>
                    <CardContent className="pt-5">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={cn("text-xl font-bold", item.color)}>{fmt(item.value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {report.monthlyTrend.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Monthly Income vs Expenses</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={report.monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {report.monthlyTrend.length > 1 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Monthly Net Surplus / Deficit</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={report.monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {report.budgetSummary.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Budget Utilisation Summary</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Utilisation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.budgetSummary.map(b => (
                          <TableRow key={b.categoryName}>
                            <TableCell className="font-medium">{b.categoryName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs",
                                b.categoryType === "INCOME" ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700")}>
                                {b.categoryType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{fmt(b.budget)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmt(b.actual)}</TableCell>
                            <TableCell className={cn("text-right font-medium", b.variance >= 0 ? "text-emerald-600" : "text-red-600")}>
                              {b.variance >= 0 ? "+" : ""}{fmt(b.variance)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div
                                    className={cn("h-2 rounded-full", b.utilizationPct > 100 ? "bg-red-500" : "bg-indigo-500")}
                                    style={{ width: `${Math.min(b.utilizationPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-10">{b.utilizationPct}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}

      <TransactionForm mode="income" open={addIncomeOpen} onClose={() => setAddIncomeOpen(false)} onSubmit={handleAddIncome} />
      <TransactionForm mode="expense" open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} onSubmit={handleAddExpense} />

      {/* Petty Cash Request */}
      <Dialog open={addPcOpen} onOpenChange={setAddPcOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-amber-500" />New Petty Cash Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPettyCash} className="space-y-4 py-2">
            <div>
              <Label>Purpose *</Label>
              <Textarea name="purpose" required placeholder="What is this cash needed for?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹) *</Label>
                <Input name="amount" type="number" min={1} max={50000} step="0.01" required />
              </div>
              <div>
                <Label>Date *</Label>
                <Input name="date" type="date" defaultValue={todayStr()} required />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Store Sale */}
      <Dialog open={addSaleOpen} onOpenChange={setAddSaleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-violet-500" />Record Store Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStoreSale} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹) *</Label>
                <Input name="amount" type="number" min={1} step="0.01" required />
              </div>
              <div>
                <Label>Items Count *</Label>
                <Input name="itemsCount" type="number" min={1} required />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select name="paymentMethod" required>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input name="date" type="date" defaultValue={todayStr()} required />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input name="notes" placeholder="Optional notes…" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-violet-600 hover:bg-violet-700">
              {submitting ? "Saving…" : "Record Sale"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Account */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />Create Finance Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div>
              <Label>Account Name *</Label>
              <Input name="name" required placeholder="e.g. Main Bank Account" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input name="description" placeholder="Optional description" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Category */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5" />Create Finance Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            <div>
              <Label>Category Name *</Label>
              <Input name="name" required placeholder="e.g. Staff Salaries" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Budget (₹)</Label>
              <Input name="budget" type="number" min={0} step="0.01" placeholder="Optional budget cap" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject */}
      <ApproveDialog />
    </div>
  );
}
