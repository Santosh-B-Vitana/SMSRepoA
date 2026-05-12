/**
 * MarksEntryGrid
 * A full-featured marks entry table for a single subject within an exam setup.
 *
 * Features:
 *  - One row per enrolled student with Theory / Practical / Internal / Total columns
 *  - Absent toggle that zeros marks and prevents entry
 *  - Inline validation against maximum marks
 *  - Auto-computed total per row
 *  - Bulk save to the backend with success/error summary
 *  - Read-only mode when subject is locked (grades already finalized)
 *
 * Usage:
 *   <MarksEntryGrid examSetupId="..." examSetupSubjectId="..." />
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Lock, AlertCircle, CheckCircle2, Download, Users } from 'lucide-react';
import {
  getMarksEntrySheet, saveBulkMarks,
  type MarksEntrySheetDto, type StudentMarksRowDto, type SingleStudentMarksDto,
} from '@/services/api/examSetupApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RowState extends StudentMarksRowDto {
  theoryInput: string;
  practicalInput: string;
  internalInput: string;
  touched: boolean;
  validationError?: string;
}

interface MarksEntryGridProps {
  examSetupId: string;
  examSetupSubjectId: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMarks(val: string): number | undefined {
  if (val.trim() === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function computeTotal(row: RowState): number {
  const t = parseMarks(row.theoryInput) ?? 0;
  const p = parseMarks(row.practicalInput) ?? 0;
  const i = parseMarks(row.internalInput) ?? 0;
  return t + p + i;
}

function validateRow(row: RowState, sheet: MarksEntrySheetDto): string | undefined {
  if (row.isAbsent) return undefined;
  const t = parseMarks(row.theoryInput);
  const p = parseMarks(row.practicalInput);
  const i = parseMarks(row.internalInput);
  if (sheet.maxTheoryMarks > 0 && t !== undefined && t > sheet.maxTheoryMarks)
    return `Theory marks exceed maximum (${sheet.maxTheoryMarks})`;
  if (sheet.maxPracticalMarks > 0 && p !== undefined && p > sheet.maxPracticalMarks)
    return `Practical marks exceed maximum (${sheet.maxPracticalMarks})`;
  if (sheet.maxInternalMarks > 0 && i !== undefined && i > sheet.maxInternalMarks)
    return `Internal marks exceed maximum (${sheet.maxInternalMarks})`;
  return undefined;
}

function initRow(sr: StudentMarksRowDto): RowState {
  return {
    ...sr,
    theoryInput: sr.theoryMarks !== undefined ? String(sr.theoryMarks) : '',
    practicalInput: sr.practicalMarks !== undefined ? String(sr.practicalMarks) : '',
    internalInput: sr.internalMarks !== undefined ? String(sr.internalMarks) : '',
    touched: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarksEntryGrid({
  examSetupId,
  examSetupSubjectId,
  readOnly = false,
  onSaved,
}: MarksEntryGridProps) {
  const { toast } = useToast();
  const [sheet, setSheet] = useState<MarksEntrySheetDto | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<{ success: number; failed: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // ─── Load sheet ─────────────────────────────────────────────────────────────

  const loadSheet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarksEntrySheet(examSetupId, examSetupSubjectId);
      setSheet(data);
      // `rows` is the canonical field; fall back to `students` for backward compat
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowsArray: StudentMarksRowDto[] = data.rows ?? (data as any).students ?? [];
      setRows(rowsArray.map(initRow));
      setLastSaveResult(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load marks entry sheet.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [examSetupId, examSetupSubjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSheet(); }, [loadSheet]);

  // ─── Cell edit helpers ───────────────────────────────────────────────────────

  const updateRow = (
    studentId: string,
    field: 'theoryInput' | 'practicalInput' | 'internalInput' | 'isAbsent' | 'remarks',
    value: string | boolean,
  ) => {
    setRows(prev => prev.map(r => {
      if (r.studentId !== studentId) return r;
      const updated: RowState = { ...r, [field]: value, touched: true };
      if (field === 'isAbsent' && value === true) {
        updated.theoryInput = '';
        updated.practicalInput = '';
        updated.internalInput = '';
      }
      updated.validationError = sheet ? validateRow(updated, sheet) : undefined;
      return updated;
    }));
  };

  // ─── Keyboard navigation (Enter moves to next row same column) ───────────────

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    col: 'theoryInput' | 'practicalInput' | 'internalInput',
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = tableRef.current?.querySelectorAll<HTMLInputElement>(
        `[data-col="${col}"]`
      )[rowIndex + 1];
      nextInput?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = tableRef.current?.querySelectorAll<HTMLInputElement>(
        `[data-col="${col}"]`
      )[rowIndex - 1];
      prevInput?.focus();
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!sheet) return;

    // Validate all
    const validated = rows.map(r => ({ ...r, validationError: validateRow(r, sheet) }));
    setRows(validated);
    if (validated.some(r => r.validationError)) {
      toast({ title: 'Validation Errors', description: 'Please fix the highlighted errors before saving.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const entries: SingleStudentMarksDto[] = rows.map(r => ({
        studentId: r.studentId,
        theoryMarks: r.isAbsent ? undefined : parseMarks(r.theoryInput),
        practicalMarks: r.isAbsent ? undefined : parseMarks(r.practicalInput),
        internalMarks: r.isAbsent ? undefined : parseMarks(r.internalInput),
        isAbsent: r.isAbsent,
        remarks: r.remarks ?? '',
      }));

      const result = await saveBulkMarks(examSetupId, examSetupSubjectId, {
        examSetupId,
        examSetupSubjectId,
        entries,
      });

      setLastSaveResult({ success: result.successCount, failed: result.failureCount });
      setRows(prev => prev.map(r => ({ ...r, touched: false })));

      if (result.failureCount === 0) {
        toast({ title: 'Marks Saved', description: `${result.successCount} student records saved successfully.` });
      } else {
        toast({
          title: 'Partial Save',
          description: `${result.successCount} saved, ${result.failureCount} failed. ${result.errors.join('; ')}`,
          variant: 'destructive',
        });
      }
      onSaved?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to save marks.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── CSV Export ──────────────────────────────────────────────────────────────

  const exportCsv = () => {
    if (!sheet) return;
    const headers = ['Roll No', 'Student Name', 'Theory', 'Practical', 'Internal', 'Total', 'Absent', 'Grade', 'Remarks'];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([
        r.rollNumber ?? '',
        `"${r.studentName}"`,
        r.theoryInput,
        r.practicalInput,
        r.internalInput,
        computeTotal(r),
        r.isAbsent ? 'Yes' : 'No',
        r.grade ?? '',
        `"${r.remarks ?? ''}"`,
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${sheet.subjectName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const isLocked = readOnly || sheet?.status === 'locked';
  const hasErrors = rows.some(r => !!r.validationError);
  const hasTouched = rows.some(r => r.touched);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!sheet) return null;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-muted-foreground">No students enrolled</p>
        <p className="text-sm text-muted-foreground mt-1">
          No students are enrolled in this class for the selected academic year.
          <br />Please check Academic Setup → Enrollments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">{sheet.subjectName}</h3>
          <p className="text-xs text-muted-foreground">
            Max: Theory {sheet.maxTheoryMarks} / Practical {sheet.maxPracticalMarks} / Internal {sheet.maxInternalMarks} · Passing: {sheet.passingMarks}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLocked && (
            <Badge variant="secondary" className="flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200">
              <Lock className="h-3 w-3" />
              Locked — Grades Finalized
            </Badge>
          )}
          {lastSaveResult && !hasErrors && (
            <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {lastSaveResult.success} saved
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
          {!isLocked && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasTouched}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save Marks
            </Button>
          )}
        </div>
      </div>

      {/* Validation error summary */}
      {hasErrors && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Validation Errors</p>
            {rows.filter(r => r.validationError).map(r => (
              <p key={r.studentId} className="text-xs">{r.studentName}: {r.validationError}</p>
            ))}
          </div>
        </div>
      )}

      {/* Marks table */}
      <div className="rounded-lg border overflow-auto">
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px]">Roll No</TableHead>
              <TableHead>Student Name</TableHead>
              {sheet.maxTheoryMarks > 0 && <TableHead className="w-[110px]">Theory<br /><span className="text-xs font-normal text-muted-foreground">/{sheet.maxTheoryMarks}</span></TableHead>}
              {sheet.maxPracticalMarks > 0 && <TableHead className="w-[110px]">Practical<br /><span className="text-xs font-normal text-muted-foreground">/{sheet.maxPracticalMarks}</span></TableHead>}
              {sheet.maxInternalMarks > 0 && <TableHead className="w-[110px]">Internal<br /><span className="text-xs font-normal text-muted-foreground">/{sheet.maxInternalMarks}</span></TableHead>}
              <TableHead className="w-[80px]">Total<br /><span className="text-xs font-normal text-muted-foreground">/{sheet.maxTotalMarks}</span></TableHead>
              <TableHead className="w-[70px] text-center">Absent</TableHead>
              <TableHead className="w-[70px]">Grade</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow
                key={row.studentId}
                className={`${row.isAbsent ? 'opacity-50 bg-muted/20' : ''} ${row.validationError ? 'bg-destructive/5' : ''}`}
              >
                <TableCell className="text-muted-foreground text-sm">{row.rollNumber ?? '—'}</TableCell>
                <TableCell className="font-medium text-sm">{row.studentName}</TableCell>

                {sheet.maxTheoryMarks > 0 && (
                  <TableCell>
                    {isLocked ? (
                      <span className="text-sm">{row.theoryMarks ?? '—'}</span>
                    ) : (
                      <Input
                        type="number" min={0} max={sheet.maxTheoryMarks}
                        className={`h-8 text-sm w-20 ${row.validationError && row.validationError.includes('Theory') ? 'border-destructive' : ''}`}
                        value={row.theoryInput}
                        disabled={row.isAbsent}
                        data-col="theoryInput"
                        onChange={e => updateRow(row.studentId, 'theoryInput', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, 'theoryInput')}
                      />
                    )}
                  </TableCell>
                )}

                {sheet.maxPracticalMarks > 0 && (
                  <TableCell>
                    {isLocked ? (
                      <span className="text-sm">{row.practicalMarks ?? '—'}</span>
                    ) : (
                      <Input
                        type="number" min={0} max={sheet.maxPracticalMarks}
                        className={`h-8 text-sm w-20 ${row.validationError && row.validationError.includes('Practical') ? 'border-destructive' : ''}`}
                        value={row.practicalInput}
                        disabled={row.isAbsent}
                        data-col="practicalInput"
                        onChange={e => updateRow(row.studentId, 'practicalInput', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, 'practicalInput')}
                      />
                    )}
                  </TableCell>
                )}

                {sheet.maxInternalMarks > 0 && (
                  <TableCell>
                    {isLocked ? (
                      <span className="text-sm">{row.internalMarks ?? '—'}</span>
                    ) : (
                      <Input
                        type="number" min={0} max={sheet.maxInternalMarks}
                        className={`h-8 text-sm w-20 ${row.validationError && row.validationError.includes('Internal') ? 'border-destructive' : ''}`}
                        value={row.internalInput}
                        disabled={row.isAbsent}
                        data-col="internalInput"
                        onChange={e => updateRow(row.studentId, 'internalInput', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, rowIdx, 'internalInput')}
                      />
                    )}
                  </TableCell>
                )}

                {/* Auto-computed total */}
                <TableCell>
                  <span className={`text-sm font-medium ${row.isAbsent ? '' : computeTotal(row) < sheet.passingMarks && computeTotal(row) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {row.isAbsent ? 'AB' : computeTotal(row) || '—'}
                  </span>
                </TableCell>

                {/* Absent checkbox */}
                <TableCell className="text-center">
                  <Checkbox
                    checked={row.isAbsent}
                    disabled={isLocked}
                    onCheckedChange={v => updateRow(row.studentId, 'isAbsent', Boolean(v))}
                  />
                </TableCell>

                {/* Grade — read-only (set by finalize) */}
                <TableCell>
                  {row.grade ? (
                    <Badge variant="outline" className="text-xs font-semibold">{row.grade}</Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>

                {/* Remarks */}
                <TableCell>
                  {isLocked ? (
                    <span className="text-xs text-muted-foreground">{row.remarks ?? ''}</span>
                  ) : (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Optional"
                      value={row.remarks ?? ''}
                      onChange={e => updateRow(row.studentId, 'remarks', e.target.value)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {rows.length} students · {rows.filter(r => !r.isAbsent && computeTotal(r) > 0).length} marks entered · {rows.filter(r => r.isAbsent).length} absent
      </p>
    </div>
  );
}
