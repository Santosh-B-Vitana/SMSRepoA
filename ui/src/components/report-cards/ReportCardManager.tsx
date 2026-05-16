'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  FileText, BarChart3, Layers, Download, Edit3, Trash2,
  Send, RefreshCw, Search, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { reportCardDocumentsApi, type ReportCardDocumentDto } from '@/services/api/reportCardsApi';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { ReportCardGenerator } from './ReportCardGenerator';
import { ReportCardEditor } from './ReportCardEditor';
import { DownloadDialog } from './DownloadDialog';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5092/api';

export function ReportCardManager() {
  const queryClient = useQueryClient();
  const { academicYear } = useAcademicYear();

  // List filters
  const [page, setPage] = useState(1);
  const [termFilter, setTermFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Data
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['report-cards', page, termFilter, statusFilter, academicYear],
    queryFn: () =>
      reportCardDocumentsApi.list({
        page,
        pageSize: 25,
        academicYear: academicYear ?? undefined,
        term: termFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['report-cards-stats', academicYear, termFilter],
    queryFn: () => reportCardDocumentsApi.getStats(academicYear ?? undefined, termFilter || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportCardDocumentsApi.delete(id),
    onSuccess: () => {
      toast.success('Report card deleted.');
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
    },
    onError: () => toast.error('Delete failed.'),
  });

  const distributeMutation = useMutation({
    mutationFn: (id: string) => reportCardDocumentsApi.markDistributed(id),
    onSuccess: () => {
      toast.success('Marked as distributed.');
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
    },
  });

  const handleDelete = (rc: ReportCardDocumentDto) => {
    if (!window.confirm(`Delete report card for ${rc.studentName}? This cannot be undone.`)) return;
    deleteMutation.mutate(rc.id);
  };

  const filteredItems = (listData?.items ?? []).filter(rc =>
    !search.trim() ||
    rc.studentName.toLowerCase().includes(search.toLowerCase()) ||
    (rc.admissionNo ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const TERMS = ['Term 1', 'Term 2', 'Annual', 'Mid-Term', 'Pre-Board', 'Board'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Report Cards & Certificates
        </h1>
        <p className="text-muted-foreground text-sm">
          Professional CBSE, ICSE, State Board & International school documents — 5 premium templates, multi-format downloads.
        </p>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Generated', value: stats.totalGenerated,   color: 'text-blue-600'  },
            { label: 'Distributed', value: stats.totalDistributed, color: 'text-green-600' },
            { label: 'Draft', value: stats.totalDraft,          color: 'text-amber-600' },
            { label: 'Passed', value: stats.totalPassed,        color: 'text-emerald-600'},
            { label: 'Failed', value: stats.totalFailed,        color: 'text-red-600'   },
            { label: 'Avg %', value: `${(stats.classAveragePercentage ?? 0).toFixed(1)}%`, color: 'text-purple-600' },
          ].map(s => (
            <Card key={s.label} className="py-2">
              <CardContent className="flex flex-col items-center p-2">
                <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="list">
        <TabsList className="mb-2">
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />List
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />Generate
          </TabsTrigger>
          <TabsTrigger value="bulk-download" className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />Bulk Download
          </TabsTrigger>
        </TabsList>

        {/* ── List tab ──────────────────────────────── */}
        <TabsContent value="list">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={termFilter || 'all'} onValueChange={v => { setTermFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Generated">Generated</SelectItem>
                <SelectItem value="Distributed">Distributed</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Loading report cards...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No report cards found. Use the <strong>Generate</strong> tab to create some.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(rc => (
                      <TableRow key={rc.id} className="text-sm">
                        <TableCell>
                          <div className="font-medium">{rc.studentName}</div>
                          {rc.admissionNo && (
                            <div className="text-xs text-muted-foreground">{rc.admissionNo}</div>
                          )}
                          {rc.isEdited && (
                            <Badge variant="outline" className="text-[9px] px-1 text-amber-600 border-amber-400 mt-0.5">
                              Corrected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{rc.className} {rc.sectionName}</TableCell>
                        <TableCell className="text-xs">{rc.term}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{rc.boardType}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm">
                          {rc.percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm">{rc.overallGrade ?? '—'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] ${
                              rc.resultStatus?.toLowerCase() === 'pass'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                : rc.resultStatus?.toLowerCase() === 'fail'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                            }`}
                          >
                            {rc.resultStatus ?? 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={rc.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <DownloadDialog
                              reportCardId={rc.id}
                              studentName={rc.studentName}
                              defaultTemplate={rc.templateStyle}
                              apiBaseUrl={API_BASE}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                            <ReportCardEditor
                              reportCard={rc}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                            {rc.status !== 'Distributed' && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                title="Mark as Distributed"
                                onClick={() => distributeMutation.mutate(rc.id)}
                                disabled={distributeMutation.isPending}
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(rc)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            {listData && listData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>Page {listData.page} of {listData.totalPages} ({listData.totalCount} total)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= listData.totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Generate tab ──────────────────────────── */}
        <TabsContent value="generate">
          <ReportCardGenerator />
        </TabsContent>

        {/* ── Bulk Download tab ─────────────────────── */}
        <TabsContent value="bulk-download">
          <BulkDownloadPanel academicYear={academicYear ?? ''} apiBaseUrl={API_BASE} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge helper
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    Distributed: { label: 'Distributed', className: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    Generated:   { label: 'Generated',   className: 'bg-blue-100 text-blue-700',   icon: <FileText className="h-3 w-3" /> },
    Draft:       { label: 'Draft',        className: 'bg-gray-100 text-gray-600',   icon: <Clock className="h-3 w-3" /> },
  };
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600', icon: <AlertCircle className="h-3 w-3" /> };
  return (
    <Badge className={`text-[10px] flex items-center gap-0.5 w-fit mx-auto ${s.className}`}>
      {s.icon}{s.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Download panel
// ─────────────────────────────────────────────────────────────────────────────
function BulkDownloadPanel({ academicYear, apiBaseUrl }: { academicYear: string; apiBaseUrl: string }) {
  const [term, setTerm] = useState('Annual');

  const TERMS = ['Term 1', 'Term 2', 'Annual', 'Mid-Term', 'Pre-Board', 'Board'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="h-4 w-4" />
          Bulk Download — Entire Class or Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Academic Year</span>
            <div className="h-9 px-3 rounded-md border flex items-center text-sm font-medium">{academicYear}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Term</span>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <p className="text-xs text-muted-foreground">
          Use the download button below to get all generated report cards for this year/term.
          Choose <strong>Excel</strong> for a formatted workbook with summary + subject detail sheets,
          or <strong>HTML</strong> for a print-ready multi-page document.
        </p>

        <DownloadDialog
          bulkParams={{ academicYear, term }}
          apiBaseUrl={apiBaseUrl}
          trigger={
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download All Report Cards ({term} {academicYear})
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
