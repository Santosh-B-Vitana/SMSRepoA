import { useEffect, useState, useCallback } from 'react';
import { Shield, ShieldAlert, Plus, Pencil, Trash2, ChevronDown, AlertTriangle, CheckCircle2, Clock, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getDisciplineRecords,
  createDisciplineRecord,
  updateDisciplineRecord,
  deleteDisciplineRecord,
  type DisciplineRecord,
  type DisciplineSummary,
  type DisciplineListResponse,
  type CreateDisciplineRequest,
  type UpdateDisciplineRequest,
  type DisciplineIncidentType,
  type DisciplineSeverity,
  type DisciplineStatus,
  type ParentNotificationStatus,
} from '@/services/api/disciplineApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const INCIDENT_TYPES: { value: DisciplineIncidentType; label: string }[] = [
  { value: 'warning', label: 'Warning' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'detention', label: 'Detention' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'physical_altercation', label: 'Physical Altercation' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'academic_dishonesty', label: 'Academic Dishonesty' },
  { value: 'absenteeism', label: 'Absenteeism' },
  { value: 'disruption', label: 'Disruption' },
  { value: 'behaviour_concern', label: 'Behaviour Concern' },
  { value: 'positive_recognition', label: 'Positive Recognition' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: DisciplineSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
  { value: 'commendation', label: 'Commendation' },
];

const STATUSES: { value: DisciplineStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'appealed', label: 'Appealed' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed' },
];

const PARENT_NOTIFICATION_STATUSES: { value: ParentNotificationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'notified', label: 'Notified' },
  { value: 'not_required', label: 'Not Required' },
];

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: DisciplineSeverity }) {
  const styles: Record<DisciplineSeverity, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
    commendation: 'bg-green-100 text-green-800 border-green-200',
  };
  const labels: Record<DisciplineSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
    commendation: 'Commendation',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[severity]}`}>
      {labels[severity]}
    </span>
  );
}

function StatusBadge({ status }: { status: DisciplineStatus }) {
  const styles: Record<DisciplineStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    under_review: 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    appealed: 'bg-blue-100 text-blue-800 border-blue-200',
    escalated: 'bg-red-100 text-red-800 border-red-200',
    closed: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const labels: Record<DisciplineStatus, string> = {
    open: 'Open',
    under_review: 'Under Review',
    resolved: 'Resolved',
    appealed: 'Appealed',
    escalated: 'Escalated',
    closed: 'Closed',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyForm() {
  return {
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentType: 'warning' as DisciplineIncidentType,
    severity: 'low' as DisciplineSeverity,
    title: '',
    description: '',
    actionTaken: '',
    status: 'open' as DisciplineStatus,
    reportedByName: '',
    parentNotificationStatus: 'pending' as ParentNotificationStatus,
    suspensionDays: 0,
    notes: '',
    resolutionNotes: '',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  isAdmin: boolean;
}

export function DisciplineTab({ studentId, isAdmin }: Props) {
  const [data, setData] = useState<DisciplineListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [filterStatus, setFilterStatus] = useState<DisciplineStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<DisciplineSeverity | 'all'>('all');
  const [filterType, setFilterType] = useState<DisciplineIncidentType | 'all'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DisciplineRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDisciplineRecords({
        studentId,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        incidentType: filterType !== 'all' ? filterType : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch {
      setError('Failed to load discipline records.');
    } finally {
      setLoading(false);
    }
  }, [studentId, filterStatus, filterSeverity, filterType, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditingRecord(null);
    setForm(emptyForm());
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(record: DisciplineRecord) {
    setEditingRecord(record);
    setForm({
      incidentDate: record.incidentDate.slice(0, 10),
      incidentType: record.incidentType,
      severity: record.severity,
      title: record.title,
      description: record.description ?? '',
      actionTaken: record.actionTaken ?? '',
      status: record.status,
      reportedByName: record.reportedByName ?? '',
      parentNotificationStatus: record.parentNotificationStatus,
      suspensionDays: record.suspensionDays,
      notes: record.notes ?? '',
      resolutionNotes: record.resolutionNotes ?? '',
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editingRecord) {
        const payload: UpdateDisciplineRequest = {
          incidentDate: form.incidentDate,
          incidentType: form.incidentType,
          severity: form.severity,
          title: form.title,
          description: form.description || undefined,
          actionTaken: form.actionTaken || undefined,
          status: form.status,
          reportedByName: form.reportedByName || undefined,
          parentNotificationStatus: form.parentNotificationStatus,
          suspensionDays: form.suspensionDays,
          notes: form.notes || undefined,
          resolutionNotes: form.resolutionNotes || undefined,
        };
        await updateDisciplineRecord(editingRecord.id, payload);
      } else {
        const payload: CreateDisciplineRequest = {
          studentId,
          incidentDate: form.incidentDate,
          incidentType: form.incidentType,
          severity: form.severity,
          title: form.title,
          description: form.description || undefined,
          actionTaken: form.actionTaken || undefined,
          status: form.status,
          reportedByName: form.reportedByName || undefined,
          parentNotificationStatus: form.parentNotificationStatus,
          suspensionDays: form.suspensionDays,
          notes: form.notes || undefined,
        };
        await createDisciplineRecord(payload);
      }
      setDialogOpen(false);
      void fetchData();
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDisciplineRecord(deleteId);
      setDeleteId(null);
      void fetchData();
    } catch {
      // keep dialog open so user sees the issue
    } finally {
      setDeleting(false);
    }
  }

  const summary = data?.summary;
  const records = data?.records ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard icon={<ShieldAlert className="h-4 w-4 text-slate-500" />} label="Total" value={summary.totalIncidents} />
          <StatCard icon={<Clock className="h-4 w-4 text-yellow-500" />} label="Open" value={summary.openIncidents} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} label="Resolved" value={summary.resolvedIncidents} />
          <StatCard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="High Severity" value={summary.highSeverityCount} />
          <StatCard icon={<Star className="h-4 w-4 text-green-500" />} label="Recognitions" value={summary.positiveRecognitions} />
          <StatCard icon={<Shield className="h-4 w-4 text-orange-500" />} label="Suspension Days" value={summary.suspensionDays} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />} label="Parents Notified" value={summary.parentNotifiedCount} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              Discipline Records
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Incident
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as DisciplineStatus | 'all'); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={(v) => { setFilterSeverity(v as DisciplineSeverity | 'all'); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(v) => { setFilterType(v as DisciplineIncidentType | 'all'); setPage(1); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Incident Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="flex justify-center py-10 text-sm text-muted-foreground">Loading...</div>
          )}

          {!loading && error && (
            <div className="text-center py-10 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Shield className="h-10 w-10 opacity-30" />
              <p className="text-sm">No discipline records found.</p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={openCreate} className="mt-2 gap-1">
                  <Plus className="h-4 w-4" /> Add First Record
                </Button>
              )}
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Parent</TableHead>
                      {isAdmin && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(rec.incidentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{rec.title}</div>
                          {rec.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{rec.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {INCIDENT_TYPES.find(t => t.value === rec.incidentType)?.label ?? rec.incidentType}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={rec.severity} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={rec.status} />
                        </TableCell>
                        <TableCell className="text-xs">{rec.reportedByName ?? '—'}</TableCell>
                        <TableCell>
                          <ParentBadge status={rec.parentNotificationStatus} />
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(rec)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteId(rec.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages} ({totalCount} records)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Discipline Record' : 'Add Discipline Record'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Incident Date *</Label>
              <Input type="date" value={form.incidentDate} onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Incident Type *</Label>
              <Select value={form.incidentType} onValueChange={v => setForm(f => ({ ...f, incidentType: v as DisciplineIncidentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severity *</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as DisciplineSeverity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as DisciplineStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief incident title" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the incident" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Action Taken</Label>
              <Textarea rows={2} value={form.actionTaken} onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))} placeholder="What action was taken?" />
            </div>
            <div className="space-y-1">
              <Label>Reported By</Label>
              <Input value={form.reportedByName} onChange={e => setForm(f => ({ ...f, reportedByName: e.target.value }))} placeholder="Staff name" />
            </div>
            <div className="space-y-1">
              <Label>Parent Notification</Label>
              <Select value={form.parentNotificationStatus} onValueChange={v => setForm(f => ({ ...f, parentNotificationStatus: v as ParentNotificationStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARENT_NOTIFICATION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(form.incidentType === 'suspension') && (
              <div className="space-y-1">
                <Label>Suspension Days</Label>
                <Input type="number" min={0} value={form.suspensionDays} onChange={e => setForm(f => ({ ...f, suspensionDays: parseInt(e.target.value) || 0 }))} />
              </div>
            )}
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
            </div>
            {editingRecord && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Resolution Notes</Label>
                <Textarea rows={2} value={form.resolutionNotes} onChange={e => setForm(f => ({ ...f, resolutionNotes: e.target.value }))} placeholder="How was this resolved?" />
              </div>
            )}
          </div>

          {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Discipline Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this record? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center flex flex-col items-center gap-1">
      {icon}
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ParentBadge({ status }: { status: ParentNotificationStatus }) {
  if (status === 'notified') return <Badge variant="default" className="text-xs">Notified</Badge>;
  if (status === 'not_required') return <Badge variant="secondary" className="text-xs">N/A</Badge>;
  return <Badge variant="outline" className="text-xs">Pending</Badge>;
}
