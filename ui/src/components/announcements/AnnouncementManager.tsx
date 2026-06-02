import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Plus, Edit, Trash2, Pin, AlertCircle, Users,
  Loader2, ChevronLeft, ChevronRight, Search, Eye,
} from "lucide-react";
import {
  getAnnouncements, getAnnouncementStats, createAnnouncement,
  updateAnnouncement, deleteAnnouncement,
  type AnnouncementBasic, type AnnouncementFilters,
  type CreateAnnouncementDto, type UpdateAnnouncementDto,
  type AnnouncementPriority, type AnnouncementAudience,
} from "@/services/api/announcementApi";

// ═══════════════════════════════════════════════════════════════════════════
// Constants & helpers
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITIES: { value: AnnouncementPriority; label: string }[] = [
  { value: "low",    label: "Low"    },
  { value: "normal", label: "Normal" },
  { value: "high",   label: "High"   },
  { value: "urgent", label: "Urgent" },
];

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: "all",      label: "Everyone"   },
  { value: "students", label: "Students"   },
  { value: "staff",    label: "Staff"      },
  { value: "parents",  label: "Parents"    },
  { value: "class",    label: "Class"      },
  { value: "section",  label: "Section"    },
];

const PRIORITY_BADGE: Record<AnnouncementPriority, string> = {
  low:    "bg-gray-100  text-gray-700  border-gray-200",
  normal: "bg-blue-100  text-blue-700  border-blue-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100   text-red-700   border-red-200",
};

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as AnnouncementPriority;
  return (
    <Badge variant="outline" className={PRIORITY_BADGE[p] ?? ""}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </Badge>
  );
}

function AudienceBadge({ audience }: { audience: string }) {
  const label = AUDIENCES.find(a => a.value === audience)?.label ?? audience;
  return (
    <Badge variant="secondary" className="capitalize">
      <Users className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════
// Form state
// ═══════════════════════════════════════════════════════════════════════════

interface FormState {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  isPinned: boolean;
  isActive: boolean;
  expiryDate: string;
  attachmentUrl: string;
}

const emptyForm = (): FormState => ({
  title: "",
  content: "",
  priority: "normal",
  targetAudience: "all",
  isPinned: false,
  isActive: true,
  expiryDate: "",
  attachmentUrl: "",
});

function formFromAnnouncement(a: AnnouncementBasic): FormState {
  return {
    title:          a.title,
    content:        a.content,
    priority:       a.priority,
    targetAudience: a.targetAudience,
    isPinned:       a.isPinned,
    isActive:       a.isActive,
    expiryDate:     a.expiryDate ? a.expiryDate.slice(0, 16) : "",
    attachmentUrl:  a.attachmentUrl ?? "",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Detail Dialog
// ═══════════════════════════════════════════════════════════════════════════

function DetailDialog({
  announcement,
  open,
  onClose,
}: {
  announcement: AnnouncementBasic | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  if (!announcement) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {announcement.isPinned && <Pin className="h-4 w-4 text-orange-500" />}
            {announcement.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={announcement.priority} />
            <AudienceBadge audience={announcement.targetAudience} />
            {!announcement.isActive && (
              <Badge variant="outline" className="bg-gray-100 text-gray-500">{t('common.inactive')}</Badge>
            )}
            {announcement.isExpired && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">{t('announcements.expired')}</Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {announcement.content}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground border-t pt-3">
            <span>Published: {fmtDate(announcement.publishedDate)}</span>
            <span>Expires: {fmtDate(announcement.expiryDate)}</span>
            <span>Recipients: {announcement.totalRecipients}</span>
            <span>Read: {announcement.readCount} / Unread: {announcement.unreadCount}</span>
          </div>
          {announcement.attachmentUrl && (
            <a
              href={announcement.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {t('announcements.viewAttachment')}
            </a>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Create / Edit Dialog
// ═══════════════════════════════════════════════════════════════════════════

interface FormDialogProps {
  open: boolean;
  editing: AnnouncementBasic | null;
  onClose: () => void;
  onSaved: () => void;
}

function FormDialog({ open, editing, onClose, onSaved }: FormDialogProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>(emptyForm);

  // Reset when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setForm(editing ? formFromAnnouncement(editing) : emptyForm());
    } else {
      onClose();
    }
  };

  const set = (k: keyof FormState, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const createMut = useMutation({
    mutationFn: (dto: CreateAnnouncementDto) => createAnnouncement(dto),
    onSuccess: () => { toast.success("Announcement created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (dto: UpdateAnnouncementDto) => updateAnnouncement(editing!.id, dto),
    onSuccess: () => { toast.success("Announcement updated"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isBusy = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    const expiryDate = form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined;

    if (editing) {
      const dto: UpdateAnnouncementDto = {
        title:          form.title.trim(),
        content:        form.content.trim(),
        priority:       form.priority,
        targetAudience: form.targetAudience,
        isPinned:       form.isPinned,
        isActive:       form.isActive,
        expiryDate,
        attachmentUrl:  form.attachmentUrl.trim() || undefined,
      };
      updateMut.mutate(dto);
    } else {
      const dto: CreateAnnouncementDto = {
        title:           form.title.trim(),
        content:         form.content.trim(),
        priority:        form.priority,
        targetAudience:  form.targetAudience,
        isPinned:        form.isPinned,
        expiryDate,
        attachmentUrl:   form.attachmentUrl.trim() || undefined,
      };
      createMut.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t('announcements.editAnnouncement') : t('announcements.newAnnouncement')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t('announcements.announcementTitle')} <span className="text-red-500">*</span></Label>
            <Input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Announcement title (3–200 chars)"
              maxLength={200}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('announcements.content')} <span className="text-red-500">*</span></Label>
            <Textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Announcement content (10–5000 chars)"
              rows={5}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{form.content.length}/5000</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('announcements.priority')}</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v as AnnouncementPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('announcements.targetAudience')}</Label>
              <Select value={form.targetAudience} onValueChange={v => set("targetAudience", v as AnnouncementAudience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('announcements.expiryDate')}</Label>
              <Input
                type="datetime-local"
                value={form.expiryDate}
                onChange={e => set("expiryDate", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('announcements.attachmentUrl')}</Label>
              <Input
                value={form.attachmentUrl}
                onChange={e => set("attachmentUrl", e.target.value)}
                placeholder="https://..."
                maxLength={500}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="pinned"
                checked={form.isPinned}
                onCheckedChange={v => set("isPinned", v)}
              />
              <Label htmlFor="pinned">{t('announcements.pinned')}</Label>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={form.isActive}
                  onCheckedChange={v => set("isActive", v)}
                />
                <Label htmlFor="active">{t('common.active')}</Label>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isBusy}>
            {isBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? t('announcements.saveChanges') : t('announcements.createAnnouncement')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

export function AnnouncementManager() {
  const qc = useQueryClient();
  const { t } = useLanguage();

  // Filters & pagination
  const [search, setSearch]               = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAudience, setFilterAudience] = useState<string>("all");
  const [filterActive, setFilterActive]   = useState<string>("all");
  const [page, setPage]                   = useState(1);
  const PAGE_SIZE                         = 15;

  // Dialogs
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<AnnouncementBasic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementBasic | null>(null);
  const [viewTarget, setViewTarget]     = useState<AnnouncementBasic | null>(null);

  // Build filters
  const filters: AnnouncementFilters = {
    ...(search.trim()                  ? { search: search.trim() }                               : {}),
    ...(filterPriority !== "all"       ? { priority: filterPriority as AnnouncementPriority }   : {}),
    ...(filterAudience !== "all"       ? { targetAudience: filterAudience as AnnouncementAudience } : {}),
    ...(filterActive   === "active"    ? { isActive: true  }                                     : {}),
    ...(filterActive   === "inactive"  ? { isActive: false }                                     : {}),
  };

  const announcementsQ = useQuery({
    queryKey: ["announcements", filters, page],
    queryFn:  () => getAnnouncements(filters, page, PAGE_SIZE),
  });

  const statsQ = useQuery({
    queryKey: ["announcements-stats"],
    queryFn:  getAnnouncementStats,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-stats"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["announcements"] });
    qc.invalidateQueries({ queryKey: ["announcements-stats"] });
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (a: AnnouncementBasic) => {
    setEditing(a);
    setShowForm(true);
  };

  const paginatedData    = announcementsQ.data;
  const stats            = statsQ.data;
  const totalPages       = paginatedData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('announcements.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('announcements.manageDesc')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('announcements.newAnnouncement')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.total')}</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalAnnouncements ?? "—"}</p>
              </div>
              <Megaphone className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.active')}</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats?.activeAnnouncements ?? "—"}</p>
              </div>
              <Megaphone className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('announcements.pinned')}</p>
                <p className="text-3xl font-bold mt-1 text-orange-600">{stats?.pinnedAnnouncements ?? "—"}</p>
              </div>
              <Pin className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('announcements.urgent')}</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{stats?.urgentAnnouncements ?? "—"}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-xs">{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('announcements.searchPlaceholder')}
                  className="pl-8"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('announcements.priority')}</Label>
              <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('announcements.all')}</SelectItem>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('announcements.audience')}</Label>
              <Select value={filterAudience} onValueChange={v => { setFilterAudience(v); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('announcements.all')}</SelectItem>
                  {AUDIENCES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('common.status')}</Label>
              <Select value={filterActive} onValueChange={v => { setFilterActive(v); setPage(1); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('announcements.all')}</SelectItem>
                  <SelectItem value="active">{t('announcements.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(search || filterPriority !== "all" || filterAudience !== "all" || filterActive !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch(""); setFilterPriority("all");
                  setFilterAudience("all"); setFilterActive("all"); setPage(1);
                }}
              >
                {t('announcements.clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Announcements
            {paginatedData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({paginatedData.totalCount} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {announcementsQ.isLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('common.loading')}
            </div>
          ) : announcementsQ.isError ? (
            <div className="flex items-center justify-center h-40 text-red-500 gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('announcements.loadError')}
            </div>
          ) : !paginatedData?.items.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Megaphone className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('announcements.noAnnouncements')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t('announcements.titleCol')}</TableHead>
                  <TableHead>{t('announcements.priority')}</TableHead>
                  <TableHead>{t('announcements.audience')}</TableHead>
                  <TableHead>{t('announcements.publishedCol')}</TableHead>
                  <TableHead>{t('announcements.expiresCol')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.items.map(a => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="pr-0">
                      {a.isPinned && <Pin className="h-3.5 w-3.5 text-orange-500" />}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setViewTarget(a)}
                        className="font-medium text-sm hover:underline text-left max-w-[260px] truncate block"
                      >
                        {a.title}
                      </button>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]">
                        {a.content}
                      </span>
                    </TableCell>
                    <TableCell><PriorityBadge priority={a.priority} /></TableCell>
                    <TableCell><AudienceBadge audience={a.targetAudience} /></TableCell>
                    <TableCell className="text-sm">{fmtDate(a.publishedDate)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(a.expiryDate)}</TableCell>
                    <TableCell>
                      {a.isExpired ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('announcements.expired')}</Badge>
                      ) : a.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('announcements.active')}</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">{t('common.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setViewTarget(a)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => handleEdit(a)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(a)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <FormDialog
        open={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {/* Detail View Dialog */}
      <DetailDialog
        announcement={viewTarget}
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('announcements.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" {t('announcements.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
