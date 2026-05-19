import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Send, Megaphone, Trash2, CheckCheck, RefreshCw,
  AlertCircle, TrendingUp, Clock, BarChart2, Filter, X, Loader2
} from "lucide-react";
import {
  getSchoolNotifications, getNotificationStats, sendNotification, broadcastNotification,
  adminDeleteNotification, type NotificationItem, type NotificationStats,
  type SendNotificationRequest, type BroadcastNotificationRequest
} from "@/services/api/notificationApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Constants ──────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES = [
  "Fee", "Attendance", "Exam", "Assignment", "Announcement",
  "Message", "General", "Payment", "Transport", "Library",
  "Leave", "Hostel", "Certificate", "System"
];

const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const RECIPIENT_TYPES = ["Student", "Staff", "Parent", "Teacher"];

// ─── Sub-components ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-300",
    High:   "bg-orange-100 text-orange-700 border-orange-300",
    Normal: "bg-blue-100 text-blue-700 border-blue-300",
    Low:    "bg-gray-100 text-gray-600 border-gray-300",
  };
  const cls = variants[priority] ?? variants.Normal;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{priority}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Fee: "bg-yellow-100 text-yellow-700", Attendance: "bg-green-100 text-green-700",
    Exam: "bg-purple-100 text-purple-700", Assignment: "bg-indigo-100 text-indigo-700",
    Announcement: "bg-blue-100 text-blue-700", General: "bg-gray-100 text-gray-700",
    System: "bg-red-100 text-red-700",
  };
  const cls = colors[type] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>{type}</span>;
}

function StatsBar({ stats }: { stats: NotificationStats | undefined }) {
  const { t } = useLanguage();
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: t('notifications.statTotalSent'), value: stats.total, icon: Bell, color: "text-blue-600" },
        { label: t('notifications.statUnread'), value: stats.unread, icon: AlertCircle, color: "text-orange-500" },
        { label: t('notifications.statReadRate'), value: `${stats.readRate.toFixed(1)}%`, icon: TrendingUp, color: "text-green-600" },
        { label: t('notifications.statLast24h'), value: stats.sentLast24Hours, icon: Clock, color: "text-purple-600" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Send Dialog ─────────────────────────────────────────────────────────────

interface SendDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function SendDialog({ open, onOpenChange }: SendDialogProps) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState<SendNotificationRequest>({
    recipientId: "", recipientType: "Staff", type: "General",
    title: "", content: "", priority: "Normal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      toast.success(t('notifications.sendSuccess'));
      qc.invalidateQueries({ queryKey: ["school-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-stats"] });
      onOpenChange(false);
      setForm({ recipientId: "", recipientType: "Staff", type: "General", title: "", content: "", priority: "Normal" });
      setErrors({});
    },
    onError: (e: Error) => toast.error(e.message ?? t('notifications.sendError')),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.recipientId.trim()) e.recipientId = t('notifications.validRecipientRequired');
    if (!form.title.trim() || form.title.length < 2) e.title = t('notifications.validTitleMin');
    if (form.title.length > 200) e.title = t('notifications.validTitleMax');
    if (!form.content.trim()) e.content = t('notifications.validContentRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) sendMutation.mutate(form); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t('notifications.sendTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('notifications.recipientIdLabel')}</Label>
            <Input value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} placeholder={t('notifications.recipientIdPlaceholder')} />
            {errors.recipientId && <p className="text-xs text-red-500 mt-1">{errors.recipientId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recipient Type</Label>
              <Select value={form.recipientType} onValueChange={v => setForm(f => ({ ...f, recipientType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECIPIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('common.type')}</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NOTIFICATION_TYPES.map(typ => <SelectItem key={typ} value={typ}>{typ}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t('common.priority')}</Label>
            <Select value={form.priority ?? "Normal"} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
              <Label>{t('notifications.titleLabel')}</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('notifications.titlePlaceholder')} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label>{t('notifications.contentLabel')}</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder={t('notifications.contentPlaceholder')} />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={sendMutation.isPending}>
            {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('notifications.sendBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Broadcast Dialog ─────────────────────────────────────────────────────────

interface BroadcastDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function BroadcastDialog({ open, onOpenChange }: BroadcastDialogProps) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState<BroadcastNotificationRequest & { mode: "role" | "ids" }>({
    mode: "role", recipientRole: "Staff", recipientType: "Staff",
    type: "Announcement", title: "", content: "", priority: "Normal",
  });
  const [idsText, setIdsText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const broadcastMutation = useMutation({
    mutationFn: broadcastNotification,
    onSuccess: (data) => {
      toast.success(t('notifications.broadcastSuccess').replace('{n}', String(data.sent)));
      qc.invalidateQueries({ queryKey: ["school-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-stats"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message ?? t('notifications.broadcastError')),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim() || form.title.length < 2) e.title = t('notifications.validTitleMin');
    if (!form.content.trim()) e.content = t('notifications.validContentRequired');
    if (form.mode === "ids" && !idsText.trim()) e.ids = t('notifications.validAtLeastOneId');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: BroadcastNotificationRequest = {
      recipientType: form.recipientType,
      type: form.type,
      title: form.title,
      content: form.content,
      priority: form.priority,
    };
    if (form.mode === "role") {
      payload.recipientRole = form.recipientRole;
    } else {
      payload.recipientIds = idsText.split("\n").map(s => s.trim()).filter(Boolean);
    }
    broadcastMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t('notifications.broadcastTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["role", "ids"] as const).map(m => (
              <Button key={m} size="sm" variant={form.mode === m ? "default" : "outline"}
                onClick={() => setForm(f => ({ ...f, mode: m }))}>
                {m === "role" ? t('notifications.byRole') : t('notifications.byIds')}
              </Button>
            ))}
          </div>
          {form.mode === "role" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('common.role')}</Label>
                <Select value={form.recipientRole ?? "Staff"} onValueChange={v => setForm(f => ({ ...f, recipientRole: v, recipientType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECIPIENT_TYPES.map(rtyp => <SelectItem key={rtyp} value={rtyp}>{rtyp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.type')}</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTIFICATION_TYPES.map(typ => <SelectItem key={typ} value={typ}>{typ}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <Label>{t('notifications.recipientIdsLabel')}</Label>
              <Textarea value={idsText} onChange={e => setIdsText(e.target.value)} rows={3} placeholder={t('notifications.recipientIdsPlaceholder')} />
              {errors.ids && <p className="text-xs text-red-500 mt-1">{errors.ids}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('common.priority')}</Label>
              <Select value={form.priority ?? "Normal"} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('notifications.recipientTypeLabel')}</Label>
              <Select value={form.recipientType} onValueChange={v => setForm(f => ({ ...f, recipientType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECIPIENT_TYPES.map(rtyp => <SelectItem key={rtyp} value={rtyp}>{rtyp}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t('notifications.titleLabel')}</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('notifications.titlePlaceholder')} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
              <Label>{t('notifications.contentLabel')}</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder={t('notifications.messagePlaceholder')} />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={broadcastMutation.isPending}>
            {broadcastMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('notifications.broadcastBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({ n, onDelete }: { n: NotificationItem; onDelete: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start justify-between gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-sm truncate max-w-xs">{n.title}</span>
          <TypeBadge type={n.type} />
          <PriorityBadge priority={n.priority} />
          {!n.isRead && <span className="inline-block h-2 w-2 rounded-full bg-blue-500" title="Unread" />}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{t('notifications.to')} {n.recipientType}</span>
          {n.senderName && <span>{t('notifications.from')} {n.senderName}</span>}
          <span>{new Date(n.createdAt).toLocaleString()}</span>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive flex-shrink-0"
        onClick={() => onDelete(n.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Type breakdown chart (simple bars) ──────────────────────────────────────

function TypeBreakdown({ stats }: { stats: NotificationStats }) {
  const entries = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);
  return (
    <div className="space-y-2">
      {entries.map(([type, count]) => (
        <div key={type} className="flex items-center gap-3">
          <span className="w-24 text-sm text-right text-muted-foreground">{type}</span>
          <div className="flex-1 bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-sm font-medium text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Notifications() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sendOpen, setSendOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["notification-stats"],
    queryFn: getNotificationStats,
  });

  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: ["school-notifications", page, typeFilter, priorityFilter],
    queryFn: () => getSchoolNotifications({
      page, pageSize: 20,
      type: typeFilter || undefined,
      priority: priorityFilter || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteNotification,
    onSuccess: () => {
      toast.success(t('notifications.deleteSuccess'));
      qc.invalidateQueries({ queryKey: ["school-notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-stats"] });
    },
    onError: () => toast.error(t('notifications.deleteError')),
  });

  const clearFilters = () => { setTypeFilter(""); setPriorityFilter(""); setPage(1); };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" /> {t('nav.notifications')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('notifications.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSendOpen(true)} variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" /> {t('common.send')}
          </Button>
          <Button onClick={() => setBroadcastOpen(true)} size="sm">
            <Megaphone className="h-4 w-4 mr-2" /> {t('common.broadcast')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{t('notifications.tabAll')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('notifications.tabAnalytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t('common.allTypes')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allTypes')}</SelectItem>
                {NOTIFICATION_TYPES.map(typ => <SelectItem key={typ} value={typ}>{typ}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t('common.allPriorities')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allPriorities')}</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {(typeFilter || priorityFilter) && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notifications...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{t('notifications.loadError')}</p>
            </div>
          ) : !listData?.notifications?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listData.notifications.map(n => (
                <NotificationRow key={n.id} n={n} onDelete={id => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {listData && listData.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {listData.page} of {listData.totalPages} &bull; {listData.total} total
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
                <Button size="sm" variant="outline" disabled={page >= listData.totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {stats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" /> {t('notifications.byType')}</CardTitle></CardHeader>
                <CardContent><TypeBreakdown stats={stats} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" /> {t('notifications.byPriority')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byPriority).map(([p, count]) => (
                      <div key={p} className="flex items-center justify-between">
                        <PriorityBadge priority={p} />
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCheck className="h-4 w-4 text-green-500" /> {t('notifications.readEngagement')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('common.total')}</span>
                      <span className="font-semibold">{stats.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('notifications.read')}</span>
                      <span className="font-semibold text-green-600">{stats.read}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('notifications.unread')}</span>
                      <span className="font-semibold text-orange-500">{stats.unread}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">{t('notifications.statReadRate')}</span>
                      <span className="font-bold">{stats.readRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('notifications.last24h')}</span>
                      <span className="font-semibold">{stats.sentLast24Hours}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('notifications.last7Days')}</span>
                      <span className="font-semibold">{stats.sentLast7Days}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('notifications.loadingAnalytics')}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SendDialog open={sendOpen} onOpenChange={setSendOpen} />
      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
    </div>
  );
}
