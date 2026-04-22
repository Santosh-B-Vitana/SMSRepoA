import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
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
  Package, ShoppingCart, BarChart3, RefreshCw, Plus, Search,
  Trash2, Edit, AlertTriangle, TrendingUp, CheckCircle,
  XCircle, Clock, Minus, ArrowUpRight, Receipt, Layers,
  SlidersHorizontal, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  storeApi,
  StoreStatsDto, StoreItemResponse, StoreOrderResponse,
  InventoryLogResponse, CreateStoreItemDto, UpdateStoreItemDto,
  AdjustStockDto, CreateStoreOrderDto, UpdateOrderStatusDto,
  MarkOrderPaidDto,
} from "@/services/api/storeApi";
import { StorePaymentProcessor } from "./StorePaymentProcessor";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Uniform", "Books", "Stationery", "Sports", "Food", "Other"];
const ALL_CATEGORIES = ["All", ...CATEGORIES];
const PAYMENT_METHODS = ["Cash", "Card", "UPI"];
const ORDER_STATUSES = ["Pending", "Confirmed", "Processing", "Packed", "Delivered", "Cancelled"];
const ADJ_TYPES = ["Purchase", "Return", "Adjustment", "Damage"] as const;
const CUSTOMER_TYPES = ["Student", "Staff", "Parent", "Walk-in"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBadge({ qty, min }: { qty: number; min: number }) {
  if (qty === 0) return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
  if (qty <= min) return <Badge className="text-xs bg-amber-500 text-white">Low: {qty}</Badge>;
  return <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">{qty} in stock</Badge>;
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800 border-amber-300",
    Confirmed: "bg-blue-100 text-blue-800 border-blue-300",
    Processing: "bg-violet-100 text-violet-800 border-violet-300",
    Packed: "bg-cyan-100 text-cyan-800 border-cyan-300",
    Delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
  };
  return <Badge variant="outline" className={cn("text-xs", map[status] ?? "")}>{status}</Badge>;
}

function PaymentBadge({ status }: { status?: string }) {
  if (status === "Paid") return <Badge className="text-xs bg-emerald-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
  if (status === "Refunded") return <Badge variant="outline" className="text-xs text-orange-600"><XCircle className="h-3 w-3 mr-1" />Refunded</Badge>;
  return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-muted-foreground text-xs">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

interface CartItem {
  item: StoreItemResponse;
  qty: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function StoreManager() {
  const visitedTabs = useRef(new Set<string>(["dashboard"]));

  // ─── Stats
  const [stats, setStats] = useState<StoreStatsDto | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ─── POS
  const [posSearch, setPosSearch] = useState("");
  const [posCategory, setPosCategory] = useState("All");
  const [posItems, setPosItems] = useState<StoreItemResponse[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState("Student");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [checkoutOrder, setCheckoutOrder] = useState<StoreOrderResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ─── Inventory
  const [invItems, setInvItems] = useState<StoreItemResponse[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invLoading, setInvLoading] = useState(false);

  // ─── Orders
  const [orders, setOrders] = useState<StoreOrderResponse[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatus, setOrdersStatus] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrderResponse | null>(null);
  const [invLogs, setInvLogs] = useState<InventoryLogResponse[]>([]);
  const [invLogsItem, setInvLogsItem] = useState<StoreItemResponse | null>(null);

  // ─── Dialogs
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<StoreItemResponse | null>(null);
  const [adjustItem, setAdjustItem] = useState<StoreItemResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // ─── Cart calculations
  const cartSubtotal = cart.reduce((s, ci) => s + ci.qty * ci.item.price, 0);
  const finalTotal = Math.max(0, cartSubtotal - globalDiscount);
  const cartCount = cart.reduce((s, ci) => s + ci.qty, 0);

  // ─── Loaders ──────────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await storeApi.getStats()); }
    catch { toast.error("Failed to load store stats"); }
    finally { setStatsLoading(false); }
  }, []);

  const loadPosItems = useCallback(async () => {
    setPosLoading(true);
    try {
      const r = await storeApi.getItems({
        pageSize: 100,
        category: posCategory === "All" ? undefined : posCategory,
        searchTerm: posSearch || undefined,
      });
      setPosItems(r.items.filter(i => i.isActive && i.isAvailable));
    } catch { toast.error("Failed to load items"); }
    finally { setPosLoading(false); }
  }, [posCategory, posSearch]);

  const loadInventory = useCallback(async (page = 1) => {
    setInvLoading(true);
    try {
      const r = await storeApi.getItems({
        page, pageSize: 20,
        category: invCategory || undefined,
        searchTerm: invSearch || undefined,
      });
      setInvItems(r.items);
      setInvTotal(r.totalCount);
      setInvPage(page);
    } catch { toast.error("Failed to load inventory"); }
    finally { setInvLoading(false); }
  }, [invCategory, invSearch]);

  const loadOrders = useCallback(async (page = 1) => {
    setOrdersLoading(true);
    try {
      const r = await storeApi.getOrders({
        page, pageSize: 20,
        status: ordersStatus || undefined,
      });
      setOrders(r.items);
      setOrdersTotal(r.totalCount);
      setOrdersPage(page);
    } catch { toast.error("Failed to load orders"); }
    finally { setOrdersLoading(false); }
  }, [ordersStatus]);

  const loadInvLogs = useCallback(async (itemId: string) => {
    try {
      const r = await storeApi.getInventoryLogs(itemId, { pageSize: 30 });
      setInvLogs(r.items);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadStats(); loadPosItems(); }, []);

  const handleTabChange = (tab: string) => {
    visitedTabs.current.add(tab);
    if (tab === "inventory" && invItems.length === 0) loadInventory();
    if (tab === "orders" && orders.length === 0) loadOrders();
  };

  // ─── POS Handlers ─────────────────────────────────────────────────────────────

  const addToCart = (item: StoreItemResponse) => {
    const existing = cart.find(ci => ci.item.id === item.id);
    const currentQty = existing?.qty ?? 0;
    if (currentQty >= item.stockQuantity) { toast.error(`Only ${item.stockQuantity} in stock`); return; }
    setCart(existing
      ? cart.map(ci => ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci)
      : [...cart, { item, qty: 1 }]
    );
  };

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(ci => ci.item.id !== itemId)); return; }
    const ci = cart.find(c => c.item.id === itemId);
    if (ci && qty > ci.item.stockQuantity) { toast.error("Exceeds stock"); return; }
    setCart(cart.map(ci => ci.item.id === itemId ? { ...ci, qty } : ci));
  };

  const handleCheckout = () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!customerName.trim()) { toast.error("Enter customer name"); return; }
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = (order: StoreOrderResponse) => {
    setCheckoutOrder(order);
    setCart([]);
    setCustomerName("");
    setPaymentRef("");
    setGlobalDiscount(0);
    setPaymentMethod("Cash");
    loadStats();
    if (visitedTabs.current.has("inventory")) loadInventory(invPage);
  };

  // ─── Inventory Handlers ────────────────────────────────────────────────────────

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    setSubmitting(true);
    try {
      const dto: CreateStoreItemDto = {
        name: get("name"),
        itemCode: get("itemCode") || undefined,
        description: get("description") || undefined,
        category: get("category"),
        price: parseFloat(get("price")),
        stockQuantity: parseInt(get("stockQuantity")),
        minStockLevel: parseInt(get("minStockLevel")),
        unit: get("unit") || undefined,
      };
      await storeApi.createItem(dto);
      toast.success("Item added to store");
      setAddItemOpen(false);
      loadInventory(1);
      loadPosItems();
      loadStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to add item");
    } finally { setSubmitting(false); }
  };

  const handleEditItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    setSubmitting(true);
    try {
      const dto: UpdateStoreItemDto = {
        name: get("name"),
        description: get("description") || undefined,
        price: parseFloat(get("price")),
        stockQuantity: parseInt(get("stockQuantity")),
        minStockLevel: parseInt(get("minStockLevel")),
        isAvailable: (f.elements.namedItem("isAvailable") as HTMLInputElement).checked,
        isActive: true,
      };
      await storeApi.updateItem(editItem.id, dto);
      toast.success("Item updated");
      setEditItem(null);
      loadInventory(invPage);
      loadPosItems();
      loadStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Update failed");
    } finally { setSubmitting(false); }
  };

  const handleAdjustStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustItem) return;
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;
    const txType = get("transactionType") as AdjustStockDto["transactionType"];
    const rawQty = parseInt(get("quantity"));
    const qty = (txType === "Damage" || txType === "Adjustment") && rawQty > 0 ? -rawQty : rawQty;
    setSubmitting(true);
    try {
      const dto: AdjustStockDto = { transactionType: txType, quantity: qty, remarks: get("remarks") || undefined };
      const updated = await storeApi.adjustStock(adjustItem.id, dto);
      toast.success(`Stock updated to ${updated.stockQuantity}`);
      setAdjustItem(null);
      setInvItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      loadStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Stock adjustment failed");
    } finally { setSubmitting(false); }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await storeApi.deleteItem(id);
      toast.success("Item removed from store");
      loadInventory(invPage);
      loadStats();
    } catch { toast.error("Delete failed"); }
  };

  // ─── Order Handlers ────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const dto: UpdateOrderStatusDto = { status };
      const updated = await storeApi.updateOrderStatus(orderId, dto);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      toast.success(`Order ${status}`);
      loadStats();
    } catch { toast.error("Status update failed"); }
  };

  const handleMarkPaid = async (orderId: string) => {
    const method = window.prompt("Payment method (Cash/Card/UPI):", "Cash");
    if (!method) return;
    try {
      const dto: MarkOrderPaidDto = { paymentMethod: method };
      const updated = await storeApi.markOrderPaid(orderId, dto);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      toast.success("Order marked as paid");
      loadStats();
    } catch { toast.error("Failed to mark as paid"); }
  };

  // ─── Category Color Map ────────────────────────────────────────────────────────

  const catColors: Record<string, string> = {
    Uniform: "bg-blue-100 text-blue-700",
    Books: "bg-amber-100 text-amber-700",
    Stationery: "bg-violet-100 text-violet-700",
    Sports: "bg-emerald-100 text-emerald-700",
    Food: "bg-orange-100 text-orange-700",
    Other: "bg-slate-100 text-slate-700",
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />School Store
          </h1>
          <p className="text-sm text-muted-foreground">Manage inventory, run POS sales, track orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Button size="sm" onClick={() => setAddItemOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" />POS
            {cartCount > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500 text-white text-xs px-1.5 py-0.5 leading-none">{cartCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">
            Orders
            {stats && stats.pendingOrders > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5 leading-none">{stats.pendingOrders}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ══════════════════════ DASHBOARD ══════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {statsLoading ? (
            <div className="text-center py-20 text-muted-foreground">Loading…</div>
          ) : !stats ? (
            <div className="text-center py-20 text-muted-foreground">No store data yet</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Today's Revenue", value: fmt(stats.todayRevenue), icon: TrendingUp, color: "bg-emerald-500", sub: `${stats.todayOrders} orders` },
                  { label: "This Month", value: fmt(stats.thisMonthRevenue), icon: BarChart3, color: "bg-blue-500", sub: "Month to date" },
                  { label: "Pending Orders", value: stats.pendingOrders.toString(), icon: Clock, color: "bg-amber-500", sub: "Awaiting action" },
                  { label: "Low Stock", value: stats.lowStockItems.toString(), icon: AlertTriangle, color: "bg-orange-500", sub: `${stats.outOfStockItems} out of stock` },
                  { label: "Active Items", value: stats.activeItems.toString(), icon: Package, color: "bg-violet-500", sub: `${stats.totalItems} total` },
                ].map(kpi => (
                  <Card key={kpi.label}>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                        <div className={cn("rounded-full p-1.5", kpi.color)}><kpi.icon className="h-3.5 w-3.5 text-white" /></div>
                      </div>
                      <p className="text-xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by category */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
                  <CardContent>
                    {Object.keys(stats.revenueByCategory).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No sales yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={Object.entries(stats.revenueByCategory).map(([cat, rev]) => ({ cat, rev }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="cat" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="rev" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Low stock alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.lowStockAlerts.length === 0 ? (
                      <div className="text-center py-8 text-emerald-600 text-sm font-medium">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />All stock levels are healthy
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {stats.lowStockAlerts.map(item => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category} · {item.itemCode ?? "—"}</p>
                            </div>
                            <StockBadge qty={item.stockQuantity} min={item.minStockLevel} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════ POS ══════════════════════ */}
        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* ─── Item Browser ───────────────────────────── */}
            <div className="space-y-4">
              {/* Search + category tabs */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or item code…"
                    value={posSearch}
                    onChange={e => setPosSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") loadPosItems(); }}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ALL_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setPosCategory(cat); }}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                        posCategory === cat
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border hover:border-foreground"
                      )}
                    >{cat}</button>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={loadPosItems}>
                    <Search className="h-3.5 w-3.5 mr-1" />Search
                  </Button>
                </div>
              </div>

              {/* Item grid */}
              {posLoading ? (
                <div className="text-center py-16 text-muted-foreground">Loading items…</div>
              ) : posItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No items found</p>
                  <Button variant="link" onClick={() => setAddItemOpen(true)}>Add items to the store</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {posItems.map(item => {
                    const inCart = cart.find(ci => ci.item.id === item.id);
                    const outOfStock = item.stockQuantity === 0;
                    return (
                      <button
                        key={item.id}
                        disabled={outOfStock}
                        onClick={() => addToCart(item)}
                        className={cn(
                          "relative rounded-xl border p-3 text-left transition-all group",
                          outOfStock
                            ? "opacity-50 cursor-not-allowed bg-muted/30"
                            : "hover:border-primary hover:shadow-md cursor-pointer bg-card",
                          inCart && "border-primary bg-primary/5"
                        )}
                      >
                        {inCart && (
                          <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center font-bold">
                            {inCart.qty}
                          </span>
                        )}
                        <div className={cn("rounded-lg p-2 mb-2 text-center text-xl", catColors[item.category] ?? catColors["Other"])}>
                          {item.category === "Uniform" ? "👕" : item.category === "Books" ? "📚" : item.category === "Stationery" ? "✏️" : item.category === "Sports" ? "⚽" : item.category === "Food" ? "🍱" : "📦"}
                        </div>
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</p>
                        {item.itemCode && <p className="text-xs text-muted-foreground mt-0.5">{item.itemCode}</p>}
                        <p className="text-base font-bold text-primary mt-1">{fmt(item.price)}</p>
                        <StockBadge qty={item.stockQuantity} min={item.minStockLevel} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Cart ────────────────────────────────────── */}
            <div className="border rounded-xl bg-card flex flex-col h-fit sticky top-4">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />Cart
                  {cartCount > 0 && <Badge>{cartCount} items</Badge>}
                </h2>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-500 h-7 px-2" onClick={() => setCart([])}>Clear</Button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Click items to add to cart
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto max-h-[340px] divide-y">
                    {cart.map(ci => (
                      <div key={ci.item.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ci.item.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(ci.item.price)} each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(ci.item.id, ci.qty - 1)}><Minus className="h-3 w-3" /></Button>
                          <span className="w-7 text-center text-sm font-semibold">{ci.qty}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(ci.item.id, ci.qty + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <div className="text-sm font-semibold w-16 text-right">{fmt(ci.qty * ci.item.price)}</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => updateQty(ci.item.id, 0)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-3 border-t space-y-3">
                    {/* Discount */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0">Discount (₹)</Label>
                      <Input
                        type="number" min={0} max={cartSubtotal} value={globalDiscount || ""}
                        onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="h-7 text-sm"
                        placeholder="0"
                      />
                    </div>

                    {/* Total */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(cartSubtotal)}</span>
                    </div>
                    {globalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount</span>
                        <span>−{fmt(globalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span className="text-primary">{fmt(finalTotal)}</span>
                    </div>
                  </div>

                  {/* Customer + Payment */}
                  <div className="px-4 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input
                        placeholder="Name *"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input
                        placeholder="Name *"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Checkout Button - Opens Payment Processor */}
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={cart.length === 0}
                      onClick={handleCheckout}
                    >
                      <Receipt className="h-4 w-4 mr-2" />Proceed to Payment · {fmt(finalTotal)}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Processor Dialog */}
          <StorePaymentProcessor
            open={paymentDialogOpen}
            onClose={() => setPaymentDialogOpen(false)}
            cartItems={cart.map(ci => ({
              itemId: ci.item.id,
              itemName: ci.item.name,
              quantity: ci.qty,
              unitPrice: ci.item.price,
              totalPrice: ci.qty * ci.item.price,
            }))}
            subtotal={cartSubtotal}
            discount={globalDiscount}
            finalAmount={finalTotal}
            customerType={customerType}
            customerName={customerName}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </TabsContent>

        {/* ══════════════════════ INVENTORY ══════════════════════ */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search items…"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") loadInventory(1); }}
              />
            </div>
            <Select value={invCategory || "all"} onValueChange={v => setInvCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadInventory(1)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />Filter
            </Button>
            <Button onClick={() => setAddItemOpen(true)} className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />Add Item
            </Button>
          </div>

          <Card>
            {invLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No items found. <button className="underline text-primary" onClick={() => setAddItemOpen(true)}>Add your first item</button>
                      </TableCell>
                    </TableRow>
                  ) : invItems.map(item => (
                    <TableRow key={item.id} className={cn(!item.isActive && "opacity-50")}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.itemCode && <div className="text-xs text-muted-foreground">{item.itemCode}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", catColors[item.category] ?? "")}>{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmt(item.price)}</TableCell>
                      <TableCell className="text-right">
                        <StockBadge qty={item.stockQuantity} min={item.minStockLevel} />
                      </TableCell>
                      <TableCell>
                        {item.isAvailable
                          ? <Badge className="text-xs bg-emerald-100 text-emerald-700" variant="outline">Available</Badge>
                          : <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditItem(item)}>
                            <Edit className="h-3 w-3 mr-1" />Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setAdjustItem(item)}>
                            <Layers className="h-3 w-3 mr-1" />Stock
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => { setInvLogsItem(item); loadInvLogs(item.id); }}
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Pagination page={invPage} total={invTotal} pageSize={20} onChange={loadInventory} />
        </TabsContent>

        {/* ══════════════════════ ORDERS ══════════════════════ */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={ordersStatus || "all"} onValueChange={v => setOrdersStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadOrders(1)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />Filter
            </Button>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadOrders(ordersPage)}>
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
          </div>

          <Card>
            {ordersLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No orders found</TableCell>
                    </TableRow>
                  ) : orders.map(order => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedOrder(order); }}>
                      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{order.customerName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{order.customerType}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(order.orderDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(order.finalAmount)}</TableCell>
                      <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                      <TableCell><PaymentBadge status={order.paymentStatus} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <Select value={order.status} onValueChange={v => handleUpdateStatus(order.id, v)}>
                            <SelectTrigger className="h-7 w-30 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                          </Select>
                          {order.paymentStatus !== "Paid" && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-emerald-50" onClick={() => handleMarkPaid(order.id)}>
                              <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Pagination page={ordersPage} total={ordersTotal} pageSize={20} onChange={loadOrders} />
        </TabsContent>

        {/* ══════════════════════ REPORTS ══════════════════════ */}
        <TabsContent value="reports" className="space-y-6 mt-4">
          {!stats ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />Loading report data…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-emerald-600">{fmt(stats.totalRevenue)}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{stats.totalOrders}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Avg. Order Value</p><p className="text-2xl font-bold">{stats.totalOrders > 0 ? fmt(stats.totalRevenue / stats.totalOrders) : "—"}</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(stats.revenueByCategory).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={Object.entries(stats.revenueByCategory).map(([cat, rev]) => ({ cat, rev }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="rev" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Inventory Health</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Total Items", value: stats.totalItems, color: "text-foreground" },
                      { label: "Available", value: stats.activeItems, color: "text-emerald-600" },
                      { label: "Low Stock", value: stats.lowStockItems, color: "text-amber-600" },
                      { label: "Out of Stock", value: stats.outOfStockItems, color: "text-red-600" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg border p-4 text-center">
                        <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ══════════════════════ DIALOGS ══════════════════════ */}

      {/* Add Item */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Store Item</DialogTitle></DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name *</Label><Input name="name" required placeholder="e.g. School Uniform Shirt" /></div>
              <div><Label>Item Code</Label><Input name="itemCode" placeholder="SKU-001" /></div>
              <div>
                <Label>Category *</Label>
                <Select name="category" required>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (₹) *</Label><Input name="price" type="number" min={0} step="0.01" required /></div>
              <div>
                <Label>Unit</Label>
                <Select name="unit">
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{["Piece", "Set", "Kg", "Liter"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Stock Qty *</Label><Input name="stockQuantity" type="number" min={0} defaultValue={0} required /></div>
              <div><Label>Min Stock Level</Label><Input name="minStockLevel" type="number" min={0} defaultValue={5} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea name="description" rows={2} placeholder="Optional description…" /></div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Adding…" : "Add Item"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Edit Item</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={handleEditItem} className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Name *</Label><Input name="name" required defaultValue={editItem.name} /></div>
                <div><Label>Price (₹) *</Label><Input name="price" type="number" min={0} step="0.01" required defaultValue={editItem.price} /></div>
                <div><Label>Stock Qty</Label><Input name="stockQuantity" type="number" min={0} required defaultValue={editItem.stockQuantity} /></div>
                <div><Label>Min Stock Level</Label><Input name="minStockLevel" type="number" min={0} defaultValue={editItem.minStockLevel} /></div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" name="isAvailable" id="isAvailable" defaultChecked={editItem.isAvailable} className="h-4 w-4" />
                  <Label htmlFor="isAvailable">Show in Store</Label>
                </div>
                <div className="col-span-2"><Label>Description</Label><Textarea name="description" rows={2} defaultValue={editItem.description ?? ""} /></div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Saving…" : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Stock */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Adjust Stock</DialogTitle></DialogHeader>
          {adjustItem && (
            <form onSubmit={handleAdjustStock} className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{adjustItem.name}</p>
                  <p className="text-xs text-muted-foreground">{adjustItem.category}</p>
                </div>
                <StockBadge qty={adjustItem.stockQuantity} min={adjustItem.minStockLevel} />
              </div>
              <div>
                <Label>Transaction Type *</Label>
                <Select name="transactionType" required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ADJ_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Purchase/Return adds stock · Damage/Adjustment deducts stock</p>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input name="quantity" type="number" min={1} required placeholder="Enter quantity" />
              </div>
              <div>
                <Label>Remarks</Label>
                <Input name="remarks" placeholder="Optional notes…" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Adjusting…" : "Apply Adjustment"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Customer</p><p className="font-medium">{selectedOrder.customerName ?? "—"} ({selectedOrder.customerType})</p></div>
                <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{fmtDate(selectedOrder.orderDate)}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><OrderStatusBadge status={selectedOrder.status} /></div>
                <div><p className="text-muted-foreground text-xs">Payment</p><PaymentBadge status={selectedOrder.paymentStatus} /></div>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Item</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items ?? []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.itemName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-sm space-y-1">
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{fmt(selectedOrder.discountAmount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span><span>{fmt(selectedOrder.finalAmount)}</span>
                </div>
              </div>
              <DialogFooter>
                {selectedOrder.paymentStatus !== "Paid" && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleMarkPaid(selectedOrder.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />Mark as Paid
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Logs */}
      <Dialog open={!!invLogsItem} onOpenChange={() => setInvLogsItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Stock History — {invLogsItem?.name}</DialogTitle></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {invLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No history yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>Date</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {invLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs",
                          log.transactionType === "Sale" ? "border-red-300 text-red-700" :
                          log.transactionType === "Purchase" ? "border-emerald-300 text-emerald-700" :
                          log.transactionType === "Return" ? "border-blue-300 text-blue-700" :
                          "border-orange-300 text-orange-700"
                        )}>{log.transactionType}</Badge>
                      </TableCell>
                      <TableCell className={cn("font-semibold text-sm", log.quantity > 0 ? "text-emerald-600" : "text-red-600")}>
                        {log.quantity > 0 ? "+" : ""}{log.quantity}
                      </TableCell>
                      <TableCell className="text-sm">{log.quantityBefore}</TableCell>
                      <TableCell className="text-sm font-medium">{log.quantityAfter}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Success */}
      <Dialog open={!!checkoutOrder} onOpenChange={() => setCheckoutOrder(null)}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4 pb-2">
            <div className="rounded-full bg-emerald-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Sale Complete!</h2>
            <p className="text-muted-foreground text-sm mt-1">Order #{checkoutOrder?.orderNumber}</p>
            <div className="mt-4 rounded-xl border p-4 text-left space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{checkoutOrder?.customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{checkoutOrder?.items?.length ?? 0}</span></div>
              <div className="flex justify-between font-bold text-base border-t mt-2 pt-2"><span>Total Paid</span><span className="text-emerald-600">{fmt(checkoutOrder?.finalAmount ?? 0)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutOrder(null)}>New Sale</Button>
            <Button className="flex-1" onClick={() => { toast.success("Receipt feature coming soon"); setCheckoutOrder(null); }}>
              <Download className="h-4 w-4 mr-2" />Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
