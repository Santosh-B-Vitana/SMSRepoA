import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle2, Download, Info } from 'lucide-react';
import { importFromCSV, ImportColumn, ImportResult } from '@/utils/importUtils';
import { apiClient } from '@/lib/apiClient';

interface ImportButtonProps<T> {
  columns: ImportColumn[];
  onImport: (data: T[]) => Promise<void>;
  templateData?: Partial<T>[];
  templateFilename?: string;
  /** When set, fetch the template from this API endpoint (auth-aware) instead of generating locally */
  apiTemplateUrl?: string;
  /** When set, POST the CSV file to this API endpoint instead of parsing locally */
  apiImportUrl?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

// ── Parse the row reference and detail out of a backend error string ─────────
// Handles formats:  [ADM-001] some error
//                   [Row 3] some error
//                   Row 3: some error
function parseImportError(msg: string): { rowRef: string; detail: string } {
  const bracketMatch = msg.match(/^\[([^\]]+)\]\s*(.*)/s);
  if (bracketMatch) return { rowRef: bracketMatch[1], detail: bracketMatch[2].trim() };
  const rowMatch = msg.match(/^Row\s+(\d+):\s*(.*)/is);
  if (rowMatch) return { rowRef: `Row ${rowMatch[1]}`, detail: rowMatch[2].trim() };
  return { rowRef: 'File', detail: msg.trim() };
}

// Determine if an error string contains a suggestion hint
function hasSuggestion(detail: string): boolean {
  return /suggestion|try|e\.g\.|example|use:|accepted:/i.test(detail);
}

export function ImportButton<T>({
  columns,
  onImport,
  templateData = [],
  templateFilename = 'import_template',
  apiTemplateUrl,
  apiImportUrl,
  variant = 'outline',
  size = 'sm'
}: ImportButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult<T> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      if (apiImportUrl) {
        // ── Real API upload ──────────────────────────────────────────────
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(apiImportUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const bulk = response.data?.data ?? response.data;
        // Map BulkOperationResult → ImportResult, extracting row refs from error strings
        const mappedResult: ImportResult<T> = {
          success: bulk.failureCount === 0,
          data: [],
          errors: (bulk.errors as string[]).map((msg: string) => {
            const { rowRef, detail } = parseImportError(msg);
            return { row: 0, rowRef, message: detail };
          }),
          stats: {
            total: (bulk.successCount ?? 0) + (bulk.failureCount ?? 0),
            successful: bulk.successCount ?? 0,
            failed: bulk.failureCount ?? 0,
          },
        };
        setResult(mappedResult);
        if ((bulk.successCount ?? 0) > 0) {
          await onImport([]);
        }
      } else {
        // ── Local CSV parse (legacy) ─────────────────────────────────────
        const importResult = await importFromCSV<T>(file, { columns });
        setResult(importResult);
        if (importResult.success && importResult.data.length > 0) {
          await onImport(importResult.data);
        }
      }
    } catch (error: any) {
      // Surface the most specific error available
      const respData = error?.response?.data;
      const msg =
        respData?.detail ??          // inner SQL detail (e.g. truncation)
        respData?.message ??
        error?.message ??
        'Import failed. Please try again.';
      const detail = respData?.detail ? ` — ${respData.detail}` : '';
      setResult({
        success: false,
        data: [],
        errors: [{ row: 0, rowRef: 'File error', message: `${msg}${detail}` }],
        stats: { total: 0, successful: 0, failed: 0 }
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    if (apiTemplateUrl) {
      try {
        const response = await apiClient.get(apiTemplateUrl, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${templateFilename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch {
        // ignore
      }
      return;
    }
    const headers = columns.map(col => col.label).join(',');
    const sampleRows = templateData.length > 0
      ? templateData.map(row =>
          columns.map(col => (row as any)[col.key] || '').join(',')
        ).join('\n')
      : '';
    const csv = `${headers}\n${sampleRows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${templateFilename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const partialSuccess = result && result.stats.successful > 0 && result.stats.failed > 0;

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import data. Download the template for the exact column format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Download Template</p>
                <p className="text-xs text-muted-foreground">
                  Includes all supported columns and an example row
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={importing}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing…' : 'Select CSV File'}
              </Button>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">Processing file…</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-2xl font-bold">{result.stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total rows</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center bg-green-50 dark:bg-green-950">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.stats.successful}
                    </p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center bg-red-50 dark:bg-red-950">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {result.stats.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>

                {/* Success banner */}
                {result.success && result.stats.successful > 0 && (
                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      All {result.stats.successful} records imported successfully.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Partial success banner */}
                {partialSuccess && (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      {result.stats.successful} records imported successfully.{' '}
                      {result.stats.failed} row{result.stats.failed !== 1 ? 's were' : ' was'} skipped — see details below.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error list */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    {!partialSuccess && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {result.stats.successful === 0
                            ? 'No records were imported. Fix the issues below and try again.'
                            : `${result.errors.length} issue${result.errors.length !== 1 ? 's' : ''} found — those rows were skipped.`
                          }
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-lg p-3 bg-muted/30">
                      {result.errors.slice(0, 20).map((error, index) => {
                        const ref = (error as any).rowRef ?? (error.row > 0 ? `Row ${error.row}` : 'File error');
                        const isSuggestion = hasSuggestion(error.message);
                        return (
                          <div key={index} className="text-xs flex gap-2 items-start">
                            <Badge
                              variant={ref === 'File error' ? 'destructive' : 'secondary'}
                              className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-mono"
                            >
                              {ref}
                            </Badge>
                            <span className={isSuggestion ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}>
                              {error.message}
                            </span>
                          </div>
                        );
                      })}
                      {result.errors.length > 20 && (
                        <p className="text-xs text-muted-foreground italic pt-1">
                          … and {result.errors.length - 20} more issues. Fix and re-upload to import remaining rows.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
