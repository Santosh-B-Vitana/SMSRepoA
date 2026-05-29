/**
 * HallTicketsDialog
 *
 * Opens when the user clicks "Hall Tickets" on an exam card.
 * Shows all enrolled students with their assigned hall ticket numbers.
 * Supports:
 *  - Individual PDF download per student (with per-row loading state)
 *  - "Download All" button to bulk-download the combined PDF
 *  - Real-time search by name, roll no, or hall ticket no
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Download, Loader2, Search, Ticket, Users, FileDown, RefreshCw,
} from 'lucide-react';
import {
  getHallTicketStudents, downloadSingleHallTicket, downloadHallTickets,
  type HallTicketStudentDto, type ExamSetupBasicDto,
} from '@/services/api/examSetupApi';

interface HallTicketsDialogProps {
  exam: ExamSetupBasicDto | null;
  onClose: () => void;
}

export function HallTicketsDialog({ exam, onClose }: HallTicketsDialogProps) {
  const { toast } = useToast();

  const [students, setStudents] = useState<HallTicketStudentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  // Track which enrollmentIds are currently downloading
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  // ── Load students ─────────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    if (!exam) return;
    setLoading(true);
    try {
      const data = await getHallTicketStudents(exam.id);
      setStudents(data);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [exam, toast]);

  useEffect(() => {
    if (exam) {
      setStudents([]);
      setSearch('');
      loadStudents();
    }
  }, [exam, loadStudents]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.hallTicketNo.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q)
    );
  });

  // ── Individual download ───────────────────────────────────────────────────
  const handleDownloadOne = async (student: HallTicketStudentDto) => {
    if (!exam) return;
    setDownloading(prev => new Set(prev).add(student.enrollmentId));
    try {
      await downloadSingleHallTicket(exam.id, student.enrollmentId, student.studentName);
      toast({
        title: 'Downloaded',
        description: `Hall ticket for ${student.studentName} saved.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: `Failed to download hall ticket for ${student.studentName}.`,
        variant: 'destructive',
      });
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(student.enrollmentId);
        return next;
      });
    }
  };

  // ── Download all ──────────────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    if (!exam) return;
    setDownloadingAll(true);
    toast({
      title: 'Generating…',
      description: `Preparing all ${students.length} hall tickets as one PDF.`,
    });
    try {
      await downloadHallTickets(exam.id, exam.name);
      toast({ title: 'Downloaded', description: 'All hall tickets PDF saved to your device.' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate hall tickets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  if (!exam) return null;

  return (
    <Dialog open={!!exam} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Ticket className="h-5 w-5 text-indigo-600" />
                Hall Tickets
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exam.name} · {exam.className}
                {exam.sectionName ? ` · ${exam.sectionName}` : ''} · {exam.academicYear}
              </p>
            </div>
            {students.length > 0 && (
              <Badge variant="secondary" className="shrink-0 text-xs gap-1 px-2 py-1">
                <Users className="h-3 w-3" />
                {students.length} student{students.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b bg-muted/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search by name, roll no, hall ticket no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={loadStudents}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleDownloadAll}
            disabled={loading || students.length === 0 || downloadingAll}
          >
            {downloadingAll
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5" />}
            Download All ({students.length})
          </Button>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading students…</span>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No students enrolled</p>
              <p className="text-xs">
                No active students found for this class/section.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Search className="h-7 w-7 opacity-30" />
              <p className="text-sm">No students match your search.</p>
              <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear Search</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Hall Ticket No</TableHead>
                  <TableHead className="text-xs">Student Name</TableHead>
                  <TableHead className="text-xs">Roll No</TableHead>
                  <TableHead className="text-xs">Admission No</TableHead>
                  <TableHead className="w-28 text-right text-xs">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student, idx) => {
                  const isDownloading = downloading.has(student.enrollmentId);
                  return (
                    <TableRow
                      key={student.enrollmentId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-indigo-700 border-indigo-200 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:bg-indigo-950/30"
                        >
                          {student.hallTicketNo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {student.rollNo}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.admissionNo}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          onClick={() => handleDownloadOne(student)}
                          disabled={isDownloading}
                          title={`Download hall ticket for ${student.studentName}`}
                        >
                          {isDownloading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!loading && students.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {search
                ? `Showing ${filtered.length} of ${students.length} students`
                : `${students.length} student${students.length !== 1 ? 's' : ''} enrolled`}
            </p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
