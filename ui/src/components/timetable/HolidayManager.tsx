import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Calendar, Plus, Edit, Trash2, CalendarDays,
  BarChart3, Loader2, ChevronLeft, ChevronRight,
  Sun, TreePine, Flag, Globe, MapPin
} from "lucide-react";
import {
  getHolidays, getHolidayStats, createHoliday, updateHoliday, deleteHoliday,
  HOLIDAY_TYPES, HOLIDAY_TYPE_LABELS,
  type HolidayBasic, type HolidayFull, type HolidayFilters,
  type CreateHolidayDto, type UpdateHolidayDto, type HolidayType
} from "@/services/api/holidayApi";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
  `${CURRENT_YEAR - 1}-${String(CURRENT_YEAR).slice(-2)}`,
  `${CURRENT_YEAR}-${String(CURRENT_YEAR + 1).slice(-2)}`,
  `${CURRENT_YEAR + 1}-${String(CURRENT_YEAR + 2).slice(-2)}`,
];

const TYPE_BADGE_CLASSES: Record<HolidayType, string> = {
  public:   "bg-blue-100 text-blue-800 border-blue-200",
  school:   "bg-green-100 text-green-800 border-green-200",
  optional: "bg-yellow-100 text-yellow-800 border-yellow-200",
  national: "bg-red-100 text-red-800 border-red-200",
  regional: "bg-purple-100 text-purple-800 border-purple-200",
};

const TYPE_ICONS: Record<HolidayType, typeof Sun> = {
  public:   Globe,
  school:   TreePine,
  optional: Sun,
  national: Flag,
  regional: MapPin,
};

function TypeBadge({ type }: { type: string }) {
  const t = type as HolidayType;
  const Icon = TYPE_ICONS[t] ?? Calendar;
  return (
    <Badge variant="outline" className={`gap-1 ${TYPE_BADGE_CLASSES[t] ?? ""}`}>
      <Icon className="h-3 w-3" />
      {HOLIDAY_TYPE_LABELS[t] ?? type}
    </Badge>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function isUpcoming(startDate: string) {
  return new Date(startDate) >= new Date();
}

// ═══════════════════════════════════════════════════════════════════════════
// Stats Bar
// ═══════════════════════════════════════════════════════════════════════════

function StatsBar({ academicYear }: { academicYear?: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["holiday-stats", academicYear],
    queryFn: () => getHolidayStats(academicYear),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Holidays</div>
          <div className="text-2xl font-bold mt-1">{stats?.totalHolidays ?? 0}</div>
          <div className="text-xs text-muted-foreground">{stats?.totalDaysOff ?? 0} days off total</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming (30 days)</div>
          <div className="text-2xl font-bold mt-1 text-orange-600">{stats?.upcomingCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">
            {stats?.nextHolidayName
              ? `Next: ${stats.nextHolidayName}`
              : "None soon"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">This Month</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{stats?.thisMonthCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">remaining this month</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">By Type</div>
          <div className="text-sm mt-1 space-y-0.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Public</span><span className="font-medium">{stats?.publicHolidays ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">School</span><span className="font-medium">{stats?.schoolHolidays ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Optional</span><span className="font-medium">{stats?.optionalHolidays ?? 0}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Create / Edit Dialog
// ═══════════════════════════════════════════════════════════════════════════

interface HolidayFormProps {
  open: boolean;
  onClose: () => void;
  editing?: HolidayFull | null;
}

function HolidayFormDialog({ open, onClose, editing }: HolidayFormProps) {
  const qc = useQueryClient();
  const isEdit = !!editing;

  const [form, setForm] = useState<{
    name: string; startDate: string; endDate: string;
    type: HolidayType; description: string; academicYear: string;
  }>({
    name:         editing?.name         ?? "",
    startDate:    editing?.startDate    ? editing.startDate.slice(0, 10) : "",
    endDate:      editing?.endDate      ? editing.endDate.slice(0, 10)   : "",
    type:         (editing?.type as HolidayType) ?? "public",
    description:  editing?.description  ?? "",
    academicYear: editing?.academicYear ?? ACADEMIC_YEARS[1],
  });

  const createMut = useMutation({
    mutationFn: (dto: CreateHolidayDto) => createHoliday(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["holiday-stats"] });
      toast.success("Holiday created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (dto: UpdateHolidayDto) => updateHoliday(editing!.id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["holiday-stats"] });
      toast.success("Holiday updated");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = createMut.isPending || updateMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.academicYear) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (isEdit) {
      const dto: UpdateHolidayDto = {
        name:        form.name.trim()   || undefined,
        startDate:   form.startDate     || undefined,
        endDate:     form.endDate       || undefined,
        type:        form.type,
        description: form.description.trim() || undefined,
      };
      updateMut.mutate(dto);
    } else {
      const dto: CreateHolidayDto = {
        name:         form.name.trim(),
        startDate:    form.startDate,
        endDate:      form.endDate || undefined,
        type:         form.type,
        description:  form.description.trim() || undefined,
        academicYear: form.academicYear,
      };
      createMut.mutate(dto);
    }
  }

  const f = (field: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the holiday details." : "Add a new holiday to the school calendar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={e => f("name", e.target.value)}
              placeholder="e.g. Republic Day"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate}
                onChange={e => f("startDate", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate}
                min={form.startDate}
                onChange={e => f("endDate", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={v => f("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{HOLIDAY_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="grid gap-2">
              <Label>Academic Year *</Label>
              <Select value={form.academicYear} onValueChange={v => f("academicYear", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => f("description", e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Holiday Table Tab
// ═══════════════════════════════════════════════════════════════════════════

interface TableTabProps {
  filters: HolidayFilters;
  onEdit: (h: HolidayBasic) => void;
  onDelete: (id: string, name: string) => void;
}

function HolidayTableTab({ filters, onEdit, onDelete }: TableTabProps) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const { data, isLoading, error } = useQuery({
    queryKey: ["holidays", filters, page],
    queryFn: () => getHolidays(filters, page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Failed to load holidays. Please try again.
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holiday</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No holidays found. Add one using the button above.
                </TableCell>
              </TableRow>
            ) : (
              items.map(h => (
                <TableRow key={h.id} className={isUpcoming(h.startDate) ? "" : "opacity-60"}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      {h.name}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(h.startDate)}</TableCell>
                  <TableCell>{h.endDate ? formatDate(h.endDate) : "—"}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {h.durationDays} {h.durationDays === 1 ? "day" : "days"}
                    </span>
                  </TableCell>
                  <TableCell><TypeBadge type={h.type} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.academicYear}</TableCell>
                  <TableCell>
                    {isUpcoming(h.startDate)
                      ? <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">Upcoming</Badge>
                      : <Badge variant="secondary">Past</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(h)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(h.id, h.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {data?.totalCount} holidays total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page} of {data?.totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// By-Type Summary Tab
// ═══════════════════════════════════════════════════════════════════════════

function ByTypeTab({ academicYear }: { academicYear?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {HOLIDAY_TYPES.map(type => (
        <HolidayTypeCard key={type} type={type} academicYear={academicYear} />
      ))}
    </div>
  );
}

function HolidayTypeCard({ type, academicYear }: { type: HolidayType; academicYear?: string }) {
  const { data } = useQuery({
    queryKey: ["holidays", { type, academicYear, isActive: true }, 1],
    queryFn: () => getHolidays({ type, academicYear, isActive: true }, 1, 50),
  });

  const Icon = TYPE_ICONS[type];
  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {HOLIDAY_TYPE_LABELS[type]} Holidays
          <Badge variant="secondary" className="ml-auto">{data?.totalCount ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {type} holidays.</p>
        ) : (
          items.slice(0, 5).map(h => (
            <div key={h.id} className="flex justify-between items-center text-sm">
              <span className="truncate max-w-[60%]">{h.name}</span>
              <span className="text-muted-foreground shrink-0">{formatDate(h.startDate)}</span>
            </div>
          ))
        )}
        {items.length > 5 && (
          <p className="text-xs text-muted-foreground">+{items.length - 5} more</p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HolidayManager() {
  const qc = useQueryClient();

  // Filter state
  const [filterType, setFilterType]   = useState<string>("all");
  const [filterYear, setFilterYear]   = useState<string>(ACADEMIC_YEARS[1]);
  const [filterActive, setFilterActive] = useState<string>("true");

  // Dialog state
  const [formOpen, setFormOpen]         = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["holiday-stats"] });
      toast.success("Holiday deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filters: HolidayFilters = {
    type:         filterType !== "all"    ? filterType as HolidayType : undefined,
    academicYear: filterYear !== "all"    ? filterYear   : undefined,
    isActive:     filterActive !== "all"  ? filterActive === "true" : undefined,
  };

  function handleEdit(h: HolidayBasic) {
    // Fetch full for editing; for now cast to HolidayFull (basic has all we need)
    setEditingHoliday(h as unknown as HolidayFull);
    setFormOpen(true);
  }

  function handleDeleteClick(id: string, name: string) {
    setDeleteTarget({ id, name });
  }

  function handleAddNew() {
    setEditingHoliday(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Holiday Calendar
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage school holidays, public holidays and special events
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Holiday
        </Button>
      </div>

      {/* Stats */}
      <StatsBar academicYear={filterYear !== "all" ? filterYear : undefined} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {HOLIDAY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{HOLIDAY_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {ACADEMIC_YEARS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">Status</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Calendar className="h-4 w-4" />
            All Holidays
          </TabsTrigger>
          <TabsTrigger value="bytype" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            By Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <HolidayTableTab
            filters={filters}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        </TabsContent>

        <TabsContent value="bytype" className="mt-4">
          <ByTypeTab academicYear={filterYear !== "all" ? filterYear : undefined} />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      {formOpen && (
        <HolidayFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingHoliday(null); }}
          editing={editingHoliday}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

