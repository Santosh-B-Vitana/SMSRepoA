/**
 * CommunicationHub — Industry-grade, end-to-end communication centre.
 * Channels: SMS · WhatsApp · Email
 * Sections: Compose/Broadcast  · Announcements  · Templates  · Analytics
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Send, MessageSquare, Mail, Bell, Megaphone, FileText,
  BarChart2, Plus, Search, Filter, MoreVertical, Eye,
  Pin, Edit2, Trash2, CheckCircle2, Clock, AlertTriangle,
  Users, GraduationCap, User2, ChevronLeft, ChevronRight,
  Layers, Smartphone, Globe, RefreshCw, Download, X, Check,
  BookOpen, Tag, Variable, Zap, TrendingUp, ArrowUpRight,
} from "lucide-react";
import {
  communicationApi,
  type AnnouncementBasic,
  type AnnouncementFull,
  type MessageBasic,
  type MessageTemplate,
  type CommunicationStats,
  type CreateAnnouncementDto,
  type CreateTemplateDto,
  type BulkSendDto,
  type ChannelType,
  type Priority,
  type TargetAudience,
  type AnnouncementFilters,
} from "@/services/api/communicationApi";

// ─── Constants ──────────────────────────────────────────────────────────────

const CHANNELS: { value: ChannelType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "sms",           label: "SMS",       icon: <Smartphone className="h-4 w-4" />, color: "bg-blue-500" },
  { value: "whatsapp",      label: "WhatsApp",  icon: <MessageSquare className="h-4 w-4" />, color: "bg-green-500" },
  { value: "email",         label: "Email",     icon: <Mail className="h-4 w-4" />, color: "bg-violet-500" },
  { value: "push_notification", label: "Push",  icon: <Bell className="h-4 w-4" />, color: "bg-amber-500" },
];

const AUDIENCES: { value: TargetAudience; label: string; icon: React.ReactNode }[] = [
  { value: "all",              label: "Everyone",        icon: <Globe className="h-4 w-4" /> },
  { value: "students",         label: "Students",        icon: <GraduationCap className="h-4 w-4" /> },
  { value: "parents",          label: "Parents",         icon: <User2 className="h-4 w-4" /> },
  { value: "staff",            label: "Staff",           icon: <Users className="h-4 w-4" /> },
  { value: "specific_class",   label: "Specific Class",  icon: <BookOpen className="h-4 w-4" /> },
  { value: "specific_section", label: "Specific Section",icon: <Layers className="h-4 w-4" /> },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Low",      color: "text-slate-500" },
  { value: "medium", label: "Medium",   color: "text-blue-600" },
  { value: "high",   label: "High",     color: "text-amber-600" },
  { value: "urgent", label: "Urgent",   color: "text-red-600" },
];

const CATEGORIES = ["general","academic","event","holiday","exam","fee","emergency"];

const TEMPLATE_CATEGORIES = [
  "attendance", "fees", "exam", "results", "event",
  "emergency", "general", "reminder", "welcome",
];

// Predefined variable tokens for templates
const TEMPLATE_VARS: Record<ChannelType, string[]> = {
  sms:              ["{{studentName}}", "{{parentName}}", "{{schoolName}}", "{{date}}", "{{amount}}", "{{dueDate}}", "{{className}}"],
  whatsapp:         ["{{studentName}}", "{{parentName}}", "{{schoolName}}", "{{date}}", "{{amount}}", "{{dueDate}}", "{{className}}", "{{link}}"],
  email:            ["{{studentName}}", "{{parentName}}", "{{schoolName}}", "{{date}}", "{{amount}}", "{{dueDate}}", "{{className}}", "{{link}}", "{{signature}}"],
  push_notification:["{{studentName}}", "{{schoolName}}", "{{date}}"],
};

// SMS character limit info
const SMS_LIMIT = 160;

// ─── Helper Components ───────────────────────────────────────────────────────

function ChannelBadge({ type }: { type: ChannelType }) {
  const ch = CHANNELS.find(c => c.value === type);
  const colors: Record<ChannelType, string> = {
    sms: "bg-blue-100 text-blue-700",
    whatsapp: "bg-green-100 text-green-700",
    email: "bg-violet-100 text-violet-700",
    push_notification: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
      {ch?.icon}{ch?.label ?? type}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    low:    "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high:   "bg-amber-100 text-amber-700",
    urgent: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-green-500",
    draft:     "bg-slate-400",
    archived:  "bg-slate-300",
    scheduled: "bg-blue-500",
    sent:      "bg-green-500",
    delivered: "bg-green-600",
    failed:    "bg-red-500",
    queued:    "bg-amber-500",
    bounced:   "bg-orange-500",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
      <span className={`h-2 w-2 rounded-full ${map[status] ?? "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function AudienceChip({ audience }: { audience: TargetAudience }) {
  const a = AUDIENCES.find(x => x.value === audience);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {a?.icon}{a?.label ?? audience}
    </span>
  );
}

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Char counter for SMS ────────────────────────────────────────────────────
function SmsCounter({ text }: { text: string }) {
  const len = text.length;
  const msgs = Math.ceil(len / SMS_LIMIT) || 1;
  const rem = msgs * SMS_LIMIT - len;
  return (
    <p className={`text-xs mt-1 ${len > msgs * SMS_LIMIT - 10 ? "text-amber-600" : "text-muted-foreground"}`}>
      {len} chars · {rem} left · {msgs} SMS message{msgs > 1 ? "s" : ""}
    </p>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Template Preview (with variable substitution) ───────────────────────────
function TemplatePreview({ template, channel }: {
  template: MessageTemplate | null;
  channel: ChannelType;
}) {
  if (!template) return (
    <div className="border rounded-lg p-4 bg-muted/30 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
      Select a template to preview
    </div>
  );
  const sampleVars: Record<string, string> = {
    "{{studentName}}": "Arjun Kumar",
    "{{parentName}}": "Rajesh Kumar",
    "{{schoolName}}": "Vitana School",
    "{{date}}": new Date().toLocaleDateString("en-IN"),
    "{{amount}}": "₹5,000",
    "{{dueDate}}": "30 Apr 2026",
    "{{className}}": "Class 10-A",
    "{{link}}": "https://portal.vitana.in",
    "{{signature}}": "— Vitana School Admin",
  };
  let preview = template.content;
  for (const [k, v] of Object.entries(sampleVars)) {
    preview = preview.replaceAll(k, v);
  }
  return (
    <div className={`border rounded-lg p-4 bg-muted/30 min-h-[120px] text-sm whitespace-pre-wrap ${channel === "whatsapp" ? "font-sans" : channel === "email" ? "font-serif" : "font-mono"}`}>
      {channel === "email" && template.subject && (
        <p className="font-semibold mb-2 text-foreground">Subject: {template.subject}</p>
      )}
      {preview}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  COMPOSE / BROADCAST TAB
// ──────────────────────────────────────────────────────────────────────────────

interface ComposeForm {
  channel: ChannelType;
  audience: TargetAudience;
  targetGroups: string;
  subject: string;
  content: string;
  templateId: string;
  priority: "normal" | "high";
}

function ComposeTab({ selectedTemplate }: { selectedTemplate: MessageTemplate | null }) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [form, setForm] = useState<ComposeForm>({
    channel: "sms",
    audience: "all",
    targetGroups: "",
    subject: "",
    content: "",
    templateId: "",
    priority: "normal",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ successCount: number; failureCount: number; totalRecipients: number } | null>(null);

  // Load templates for the selected channel
  useEffect(() => {
    communicationApi.getTemplates(form.channel)
      .then(setTemplates)
      .catch(() => {});
  }, [form.channel]);

  // When a template is selected from Templates tab, populate the form
  useEffect(() => {
    if (selectedTemplate) {
      setForm(prev => ({
        ...prev,
        channel: selectedTemplate.type as ChannelType,
        templateId: selectedTemplate.id,
        subject: selectedTemplate.subject ?? prev.subject,
        content: selectedTemplate.content,
      }));
    }
  }, [selectedTemplate]);

  function set(k: keyof ComposeForm, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function applyTemplate(id: string) {
    const t = templates.find(t => t.id === id);
    if (!t) return;
    setForm(prev => ({
      ...prev,
      templateId: id,
      subject: t.subject ?? prev.subject,
      content: t.content,
    }));
  }

  async function handleSend() {
    if (!form.content.trim()) {
      toast.error("Message content is required");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const dto: BulkSendDto = {
        targetAudience: form.audience,
        targetGroups: form.targetGroups
          ? form.targetGroups.split(",").map(s => s.trim()).filter(Boolean)
          : undefined,
        subject: form.subject || undefined,
        content: form.content,
        type: form.channel,
        templateId: form.templateId || undefined,
      };
      const res = await communicationApi.bulkSend(dto);
      setResult(res);
      toast.success(`Sent to ${res.successCount} of ${res.totalRecipients} recipients`);
      if (res.failureCount > 0) toast.warning(`${res.failureCount} deliveries failed`);
      // Keep content so admin can re-use or adjust
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const channelInfo = CHANNELS.find(c => c.value === form.channel)!;
  const needsSubject = form.channel === "email";
  const needsGroups = form.audience === "specific_class" || form.audience === "specific_section";
  const filteredTemplates = templates.filter(t => t.type === form.channel);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left: Compose form ── */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />Compose &amp; Broadcast
            </CardTitle>
            <CardDescription>Send a message to your school community via any channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel selector */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Channel</Label>
              <div className="grid grid-cols-4 gap-2">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => { set("channel", ch.value); set("templateId", ""); set("subject", ""); set("content", ""); }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium ${form.channel === ch.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    <span className={`p-1.5 rounded-md text-white ${ch.color}`}>{ch.icon}</span>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template picker */}
            {filteredTemplates.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Use Template (optional)</Label>
                <Select value={form.templateId || "_none_"} onValueChange={v => v === "_none_" ? set("templateId", "") : applyTemplate(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— No template —</SelectItem>
                    {filteredTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-muted-foreground text-xs">· {t.category}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Audience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Audience</Label>
                <Select value={form.audience} onValueChange={v => set("audience", v as TargetAudience)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="flex items-center gap-1.5">{a.icon}{a.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
                <Select value={form.priority} onValueChange={v => set("priority", v as "normal" | "high")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsGroups && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {form.audience === "specific_class" ? "Class names" : "Section names"} (comma-separated)
                </Label>
                <Input
                  placeholder={form.audience === "specific_class" ? "e.g. Class 10, Class 11" : "e.g. 10-A, 10-B"}
                  value={form.targetGroups}
                  onChange={e => set("targetGroups", e.target.value)}
                />
              </div>
            )}

            {needsSubject && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Subject</Label>
                <Input
                  placeholder="Email subject"
                  value={form.subject}
                  onChange={e => set("subject", e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Message
                {form.channel === "sms" && <span className="ml-2 text-muted-foreground">(160 chars/SMS)</span>}
              </Label>
              <Textarea
                rows={form.channel === "email" ? 8 : 4}
                placeholder={
                  form.channel === "sms"
                    ? "Keep it short and clear…"
                    : form.channel === "whatsapp"
                    ? "WhatsApp message — supports *bold*, _italic_, emojis…"
                    : form.channel === "email"
                    ? "Email body — use {{variables}} for personalisation…"
                    : "Notification message…"
                }
                value={form.content}
                onChange={e => set("content", e.target.value)}
                className="resize-none"
              />
              {form.channel === "sms" && <SmsCounter text={form.content} />}
              {form.channel === "whatsapp" && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {form.content.length} chars · Use *bold* _italic_ ~strikethrough~ for formatting
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={sending || !form.content.trim()}
              >
                {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {sending ? "Sending…" : `Send via ${channelInfo.label}`}
              </Button>
              <Button variant="outline" onClick={() => { set("content", ""); set("subject", ""); set("templateId", ""); setResult(null); }}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result banner */}
        {result && (
          <Card className={result.failureCount === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className={`h-5 w-5 ${result.failureCount === 0 ? "text-green-600" : "text-amber-600"}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {result.successCount}/{result.totalRecipients} messages delivered
                </p>
                {result.failureCount > 0 && (
                  <p className="text-xs text-muted-foreground">{result.failureCount} failed — check logs for details</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Right: Channel guide + template preview ── */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{channelInfo.label} Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            {form.channel === "sms" && <>
              <p>• Max 160 chars per segment (GSM-7). Longer texts become multi-part.</p>
              <p>• No media. Keep language plain.</p>
              <p>• Avoid special chars that downgrade to UCS-2 (70 chars/segment).</p>
              <p>• Opt-out: include STOP info for compliance.</p>
            </>}
            {form.channel === "whatsapp" && <>
              <p>• WhatsApp Business API — messages sent via approved template IDs.</p>
              <p>• Outside 24-hr window requires approved HSM templates.</p>
              <p>• Supports bold (*text*), italic (_text_), ~strikethrough~.</p>
              <p>• Max 4096 chars. Media (PDF/image) via separate attachment field.</p>
            </>}
            {form.channel === "email" && <>
              <p>• HTML email via SendGrid / SES provider.</p>
              <p>• Use a meaningful subject for open-rate.</p>
              <p>• Variables like {"{{studentName}}"} are auto-substituted per recipient.</p>
              <p>• Attach school logo via Settings → Email Branding.</p>
            </>}
            {form.channel === "push_notification" && <>
              <p>• Delivered to the Vitana mobile app.</p>
              <p>• Keep title ≤ 60 chars and body ≤ 120 chars.</p>
              <p>• Requires student/parent to have app installed and notifications enabled.</p>
            </>}
          </CardContent>
        </Card>

        {/* Variable reference */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Variable className="h-4 w-4" />Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS[form.channel].map(v => (
                <button
                  key={v}
                  type="button"
                  className="text-xs bg-muted px-2 py-0.5 rounded font-mono hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => set("content", form.content + v)}
                  title="Click to insert"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click a variable to insert it at the end of your message.</p>
          </CardContent>
        </Card>

        {/* Live preview for selected template */}
        {form.templateId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Template Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatePreview
                template={filteredTemplates.find(t => t.id === form.templateId) ?? null}
                channel={form.channel}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  ANNOUNCEMENTS TAB
// ──────────────────────────────────────────────────────────────────────────────

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<AnnouncementBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AnnouncementFilters>({});
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnnouncementFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f: AnnouncementFilters = { ...filters, searchQuery: search || undefined };
      const res = await communicationApi.getAnnouncements(f, page, 15);
      setAnnouncements(res.items ?? []);
      setTotal(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      // Silently fail on background load — user-initiated retries will toast
    } finally {
      setLoading(false);
    }
  }, [filters, search, page]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const a = await communicationApi.getAnnouncementById(id);
      setDetail(a);
    } catch {
      toast.error("Failed to load announcement");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await communicationApi.publishAnnouncement(id);
      toast.success("Announcement published");
      load();
    } catch {
      toast.error("Failed to publish");
    }
  }

  async function handleDelete(id: string) {
    try {
      await communicationApi.deleteAnnouncement(id);
      toast.success("Announcement deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  }

  function setFilter(k: keyof AnnouncementFilters, v: string) {
    setFilters(prev => ({ ...prev, [k]: v || undefined }));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search announcements…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filters.status ?? "_all_"} onValueChange={v => setFilter("status", v === "_all_" ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority ?? "_all_"} onValueChange={v => setFilter("priority", v === "_all_" ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.targetAudience ?? "_all_"} onValueChange={v => setFilter("targetAudience", v === "_all_" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Audiences" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Audiences</SelectItem>
              {AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New Announcement
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <p className="text-sm text-muted-foreground">{total} announcements</p>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-center">Reads</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : announcements.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No announcements found</TableCell></TableRow>
            ) : announcements.map(a => (
              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(a.id)}>
                <TableCell className="pr-0">
                  {a.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                </TableCell>
                <TableCell className="font-medium max-w-[260px] truncate">{a.title}</TableCell>
                <TableCell><AudienceChip audience={a.targetAudience} /></TableCell>
                <TableCell><PriorityBadge priority={a.priority} /></TableCell>
                <TableCell><StatusDot status={a.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {a.publishDate ? new Date(a.publishDate).toLocaleDateString("en-IN") : "—"}
                </TableCell>
                <TableCell className="text-center text-sm">{a.readCount}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetail(a.id)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                      {a.status !== "published" && (
                        <DropdownMenuItem onClick={() => handlePublish(a.id)}><Zap className="h-4 w-4 mr-2" />Publish Now</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={open => { if (!open) { setDetailId(null); setDetail(null); }}}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Announcement Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{detail.title}</h2>
                {detail.isPinned && <Badge variant="secondary"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={detail.priority} />
                <StatusDot status={detail.status} />
                <AudienceChip audience={detail.targetAudience} />
                <Badge variant="outline">{detail.category}</Badge>
              </div>
              <Separator />
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {detail.content}
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{detail.readCount}</p>
                  <p className="text-xs text-muted-foreground">Reads</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{detail.acknowledgedCount}</p>
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{detail.totalTargetCount}</p>
                  <p className="text-xs text-muted-foreground">Total Targeted</p>
                </div>
              </div>
              {detail.status !== "published" && (
                <Button className="w-full" onClick={() => { handlePublish(detail.id); setDetailId(null); }}>
                  <Zap className="h-4 w-4 mr-2" />Publish Announcement
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Announcement?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The announcement will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <CreateAnnouncementDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  );
}

// ── Create Announcement Dialog ──────────────────────────────────────────────

function CreateAnnouncementDialog({
  open, onClose, onCreated,
}: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const empty = (): CreateAnnouncementDto => ({
    title: "",
    content: "",
    targetAudience: "all",
    priority: "medium",
    category: "general",
    publishImmediately: true,
    isPinned: false,
    requiresAcknowledgement: false,
  });

  const [form, setForm] = useState<CreateAnnouncementDto>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(empty()); }, [open]);

  function set<K extends keyof CreateAnnouncementDto>(k: K, v: CreateAnnouncementDto[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      await communicationApi.createAnnouncement(form);
      toast.success("Announcement created");
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Announcement title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Audience *</Label>
              <Select value={form.targetAudience} onValueChange={v => set("targetAudience", v as TargetAudience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority *</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={form.scheduleDate ?? ""}
                onChange={e => { set("scheduleDate", e.target.value || undefined); set("publishImmediately", !e.target.value); }}
              />
            </div>
          </div>
          {(form.targetAudience === "specific_class" || form.targetAudience === "specific_section") && (
            <div>
              <Label>Target Groups (comma-separated)</Label>
              <Input
                placeholder={form.targetAudience === "specific_class" ? "e.g. Class 10, Class 11" : "e.g. 10-A, 10-B"}
                onChange={e => set("targetGroups", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              />
            </div>
          )}
          <div>
            <Label>Content *</Label>
            <Textarea
              rows={6}
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Write your announcement…"
              className="resize-none"
            />
          </div>
          <div>
            <Label>Expiry Date (optional)</Label>
            <Input
              type="datetime-local"
              value={form.expiryDate ?? ""}
              onChange={e => set("expiryDate", e.target.value || undefined)}
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.isPinned} onCheckedChange={v => set("isPinned", v)} />
              <span className="text-sm">Pin announcement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.requiresAcknowledgement} onCheckedChange={v => set("requiresAcknowledgement", v)} />
              <span className="text-sm">Require acknowledgement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.publishImmediately} onCheckedChange={v => set("publishImmediately", v)} />
              <span className="text-sm">Publish immediately</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
            {saving ? "Saving…" : form.publishImmediately ? "Publish" : "Save Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  TEMPLATES TAB
// ──────────────────────────────────────────────────────────────────────────────

function TemplatesTab({ onUseTemplate }: { onUseTemplate: (template: MessageTemplate) => void }) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelType | "_all_">("_all_");
  const [categoryFilter, setCategoryFilter] = useState("_all_");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<MessageTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const ch = channelFilter === "_all_" ? undefined : channelFilter as ChannelType;
      const res = await communicationApi.getTemplates(ch);
      setTemplates(res);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      const res = await communicationApi.seedDefaultTemplates();
      setTemplates(res as MessageTemplate[]);
      toast.success(`${(res as MessageTemplate[]).length} default templates loaded`);
    } catch {
      toast.error("Failed to load default templates");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await communicationApi.deleteTemplate(id);
      toast.success("Template deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete template");
    }
  }

  const filtered = useMemo(() =>
    templates.filter(t =>
      (categoryFilter === "_all_" || t.category === categoryFilter)
    ),
    [templates, categoryFilter]
  );

  // Group by channel for display
  const byChannel = useMemo(() => {
    const map: Record<string, MessageTemplate[]> = {};
    for (const t of filtered) {
      if (!map[t.type]) map[t.type] = [];
      map[t.type].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
          {/* Channel tabs as pills */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {([{ value: "_all_", label: "All" }, ...CHANNELS] as any[]).map((ch: any) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => setChannelFilter(ch.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${channelFilter === ch.value ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {ch.label}
              </button>
            ))}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { setEditTemplate(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading templates…</div>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-amber-500" />
            <p className="font-medium mb-1">Could not load templates</p>
            <p className="text-sm text-muted-foreground mb-4">Check your connection or try again.</p>
            <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 && templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold mb-1">No templates yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Load the built-in starter kit — fee reminders, absent alerts, exam notices, PTM invitations and more — or create your own.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                {seeding ? "Loading…" : "Load Default Templates"}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Create Blank Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">No templates match the current filters.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byChannel).map(([type, tpls]) => {
            const ch = CHANNELS.find(c => c.value === type);
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`p-1.5 rounded-md text-white ${ch?.color ?? "bg-slate-500"}`}>{ch?.icon}</span>
                  <h3 className="font-semibold">{ch?.label ?? type}</h3>
                  <Badge variant="secondary">{tpls.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tpls.map(t => (
                    <Card key={t.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm">{t.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 capitalize">{t.category}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setPreviewTemplate(t)}>
                                <Eye className="h-4 w-4 mr-2" />Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditTemplate(t); setCreateOpen(true); }}>
                                <Edit2 className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(t.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 pb-3">
                        {t.subject && (
                          <p className="text-xs font-medium text-muted-foreground mb-1">Subject: {t.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {t.content}
                        </p>
                        {t.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.variables.map(v => (
                              <span key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{v}</span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <div className="px-4 py-3 border-t bg-muted/30 rounded-b-lg flex gap-2 justify-between items-center">
                        <Button size="sm" className="flex-1" onClick={() => onUseTemplate(t)}>
                          <Zap className="h-3.5 w-3.5 mr-1" />Use This Template
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <TemplateFormDialog
        open={createOpen}
        template={editTemplate}
        onClose={() => { setCreateOpen(false); setEditTemplate(null); }}
        onSaved={load}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={o => !o && setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <ChannelBadge type={previewTemplate.type} />
                <Badge variant="outline">{previewTemplate.category}</Badge>
              </div>
              <TemplatePreview template={previewTemplate} channel={previewTemplate.type} />
              <p className="text-xs text-muted-foreground">Variables shown with sample values for preview.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Template?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the template. Any scheduled messages using it won't be affected.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Template Form Dialog ──────────────────────────────────────────────────────

function TemplateFormDialog({
  open, template, onClose, onSaved,
}: {
  open: boolean;
  template: MessageTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const emptyForm = (): CreateTemplateDto => ({
    name: "",
    type: "sms",
    category: "general",
    subject: "",
    content: "",
    variables: [],
  });

  const [form, setForm] = useState<CreateTemplateDto>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [varInput, setVarInput] = useState("");

  useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          name: template.name,
          type: template.type,
          category: template.category,
          subject: template.subject ?? "",
          content: template.content,
          variables: [...template.variables],
        });
      } else {
        setForm(emptyForm());
      }
      setVarInput("");
    }
  }, [open, template]);

  function set<K extends keyof CreateTemplateDto>(k: K, v: CreateTemplateDto[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function addVar() {
    const v = varInput.trim();
    if (!v) return;
    const token = v.startsWith("{{") ? v : `{{${v}}}`;
    if (!form.variables.includes(token)) {
      set("variables", [...form.variables, token]);
    }
    setVarInput("");
  }

  function insertVar(v: string) {
    set("content", form.content + v);
    if (!form.variables.includes(v)) {
      set("variables", [...form.variables, v]);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("Name and content are required");
      return;
    }
    setSaving(true);
    try {
      if (template) {
        await communicationApi.updateTemplate(template.id, {
          name: form.name,
          subject: form.subject || undefined,
          content: form.content,
          variables: form.variables,
        });
        toast.success("Template updated");
      } else {
        await communicationApi.createTemplate({ ...form, subject: form.subject || undefined });
        toast.success("Template created");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  const suggestedVars = TEMPLATE_VARS[form.type];
  const unusedVars = suggestedVars.filter(v => !form.variables.includes(v));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Fee Reminder SMS" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel — editable only when creating */}
          <div>
            <Label>Channel *</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {CHANNELS.map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  disabled={!!template} // can't change type after creation
                  onClick={() => set("type", ch.value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-xs font-medium ${form.type === ch.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"} ${template ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span className={`p-1.5 rounded-md text-white ${ch.color}`}>{ch.icon}</span>
                  {ch.label}
                </button>
              ))}
            </div>
            {template && <p className="text-xs text-muted-foreground mt-1">Channel cannot be changed after creation.</p>}
          </div>

          {form.type === "email" && (
            <div>
              <Label>Subject</Label>
              <Input value={form.subject ?? ""} onChange={e => set("subject", e.target.value)} placeholder="Email subject" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Content *</Label>
              {form.type === "sms" && <SmsCounter text={form.content} />}
            </div>
            <Textarea
              rows={form.type === "email" ? 10 : 5}
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder={`Write your ${CHANNELS.find(c => c.value === form.type)?.label ?? ""} template…`}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Variable toolkit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Variable className="h-3.5 w-3.5" />Variables</Label>
            {unusedVars.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Suggested — click to insert &amp; track:</p>
                <div className="flex flex-wrap gap-1.5">
                  {unusedVars.map(v => (
                    <button key={v} type="button" className="text-xs bg-muted px-2 py-0.5 rounded font-mono hover:bg-primary/10 hover:text-primary" onClick={() => insertVar(v)}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.variables.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">
                    {v}
                    <button type="button" onClick={() => set("variables", form.variables.filter(x => x !== v))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                className="flex-1 text-sm font-mono h-8"
                placeholder="custom_variable"
                value={varInput}
                onChange={e => setVarInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVar(); }}}
              />
              <Button variant="outline" size="sm" onClick={addVar}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {saving ? "Saving…" : template ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  SENT MESSAGES LOG TAB
// ──────────────────────────────────────────────────────────────────────────────

function SentMessagesTab() {
  const [messages, setMessages] = useState<MessageBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ChannelType | "_all_">("_all_");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<import("@/services/api/communicationApi").MessageFull | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await communicationApi.getMessages(
        {
          type: typeFilter === "_all_" ? undefined : typeFilter as ChannelType,
          searchQuery: search || undefined,
        },
        page, 15
      );
      setMessages(res.items ?? []);
      setTotal(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      // Silently fail on background load
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id: string) {
    setDetailId(id);
    try {
      const d = await communicationApi.getMessageById(id);
      setDetail(d);
    } catch {
      toast.error("Failed to load message detail");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by subject…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {([{ value: "_all_", label: "All" }, ...CHANNELS] as any[]).map((ch: any) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => { setTypeFilter(ch.value); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${typeFilter === ch.value ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {ch.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{total} messages sent</p>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Subject / Content</TableHead>
              <TableHead>From</TableHead>
              <TableHead className="text-center">Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : messages.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No messages found</TableCell></TableRow>
            ) : messages.map(m => (
              <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(m.id)}>
                <TableCell><ChannelBadge type={m.type} /></TableCell>
                <TableCell className="max-w-[220px] truncate font-medium text-sm">{m.subject || "(no subject)"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.fromName ?? "—"}</TableCell>
                <TableCell className="text-center text-sm">{m.recipientCount}</TableCell>
                <TableCell><StatusDot status={m.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.sentAt ? new Date(m.sentAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) { setDetailId(null); setDetail(null); }}}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Message Detail</DialogTitle></DialogHeader>
          {detail ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ChannelBadge type={detail.type} />
                <StatusDot status={detail.status} />
              </div>
              {detail.subject && <div><p className="text-xs text-muted-foreground">Subject</p><p className="font-medium">{detail.subject}</p></div>}
              <div><p className="text-xs text-muted-foreground">From</p><p className="text-sm">{detail.fromName ?? "—"}</p></div>
              {detail.recipients.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recipients ({detail.recipients.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.recipients.slice(0, 10).map(r => (
                      <span key={r.userId} className="text-xs bg-muted px-2 py-0.5 rounded">{r.name}</span>
                    ))}
                    {detail.recipients.length > 10 && (
                      <span className="text-xs text-muted-foreground">+{detail.recipients.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}
              <Separator />
              <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap">{detail.content}</div>
              <div className="text-xs text-muted-foreground">
                Sent: {detail.sentAt ? new Date(detail.sentAt).toLocaleString("en-IN") : "—"}
                {detail.deliveredAt && <> · Delivered: {new Date(detail.deliveredAt).toLocaleString("en-IN")}</>}
              </div>
              {detail.failureReason && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  {detail.failureReason}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  ANALYTICS TAB
// ──────────────────────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days = parseInt(range);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      const s = await communicationApi.getStats(start.toISOString(), end.toISOString());
      setStats(s);
    } catch {
      // Silently fail on background load
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading analytics…</div>;
  if (!stats) return (
    <div className="py-16 text-center">
      <BarChart2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="font-medium mb-1">No analytics data</p>
      <p className="text-sm text-muted-foreground mb-4">Data will appear once messages and announcements are sent.</p>
      <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
    </div>
  );

  const totalChannels = Object.values(stats.messagesByType).reduce((a, b) => a + b, 0);
  const maxCategory = Math.max(...Object.values(stats.announcementsByCategory), 1);

  return (
    <div className="space-y-6">
      {/* Range picker */}
      <div className="flex justify-end">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {[["7", "7 days"], ["30", "30 days"], ["90", "90 days"]].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setRange(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${range === v ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Announcements"
          value={stats.totalAnnouncements}
          sub={`${stats.publishedAnnouncements} published`}
          icon={<Megaphone className="h-5 w-5 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Messages Sent"
          value={stats.totalMessages}
          sub={`${stats.failedMessages} failed`}
          icon={<Send className="h-5 w-5 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Delivery Rate"
          value={`${stats.deliveryRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          color="bg-violet-500"
        />
        <StatCard
          title="Avg Read Rate"
          value={`${stats.avgReadRate.toFixed(1)}%`}
          icon={<Eye className="h-5 w-5 text-white" />}
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages by channel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Messages by Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHANNELS.map(ch => {
              const count = stats.messagesByType[ch.value] ?? 0;
              const pct = totalChannels > 0 ? (count / totalChannels) * 100 : 0;
              return (
                <div key={ch.value}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-sm">{ch.icon}{ch.label}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ch.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {totalChannels === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages in this period</p>}
          </CardContent>
        </Card>

        {/* Announcements by category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Announcements by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.announcementsByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No announcements in this period</p>
            ) : Object.entries(stats.announcementsByCategory).map(([cat, count]) => {
              const pct = (count / maxCategory) * 100;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{cat}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Delivery health summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Delivery Health</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 divide-x text-center">
          <div className="px-4">
            <p className="text-2xl font-bold text-green-600">{stats.sentMessages}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sent</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-bold text-red-600">{stats.failedMessages}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Delivery Rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ██  MAIN EXPORT — CommunicationHub
// ──────────────────────────────────────────────────────────────────────────────

export function CommunicationHub() {
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  // Lazy tab mounting: only mount a tab's content after first visit
  const [activeTab, setActiveTab] = useState("compose");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["compose"]));
  // Template selection for "Use This Template" flow
  const [selectedTemplateToUse, setSelectedTemplateToUse] = useState<MessageTemplate | null>(null);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  }

  function useTemplate(template: MessageTemplate) {
    setSelectedTemplateToUse(template);
    setActiveTab("compose");
    setVisitedTabs(prev => new Set([...prev, "compose"]));
  }

  useEffect(() => {
    communicationApi.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage announcements and broadcast messages via SMS, WhatsApp &amp; Email
          </p>
        </div>
        {/* Quick channel badges */}
        <div className="hidden md:flex items-center gap-2">
          {CHANNELS.map(ch => (
            <span key={ch.value} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${ch.color}`}>
              {ch.icon}{ch.label}
            </span>
          ))}
        </div>
      </div>

      {/* Mini stat strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Announcements" value={stats.totalAnnouncements} sub={`${stats.publishedAnnouncements} active`} icon={<Megaphone className="h-4 w-4 text-white" />} color="bg-blue-500" />
          <StatCard title="Messages Sent" value={stats.totalMessages} icon={<Send className="h-4 w-4 text-white" />} color="bg-green-500" />
          <StatCard title="Delivery Rate" value={`${stats.deliveryRate.toFixed(1)}%`} icon={<TrendingUp className="h-4 w-4 text-white" />} color="bg-violet-500" />
          <StatCard title="Avg Read Rate" value={`${stats.avgReadRate.toFixed(1)}%`} icon={<Eye className="h-4 w-4 text-white" />} color="bg-amber-500" />
        </div>
      )}

      {/* Tabs — lazy mounting: each tab only renders after first activation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="compose" className="flex items-center gap-1.5">
            <Send className="h-4 w-4" />Compose
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" />Announcements
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />Templates
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />Sent Log
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" />Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          {visitedTabs.has("compose") && <ComposeTab selectedTemplate={selectedTemplateToUse} />}
        </TabsContent>
        <TabsContent value="announcements" className="mt-6">
          {visitedTabs.has("announcements") && <AnnouncementsTab />}
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          {visitedTabs.has("templates") && <TemplatesTab onUseTemplate={useTemplate} />}
        </TabsContent>
        <TabsContent value="sent" className="mt-6">
          {visitedTabs.has("sent") && <SentMessagesTab />}
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          {visitedTabs.has("analytics") && <AnalyticsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CommunicationHub;
