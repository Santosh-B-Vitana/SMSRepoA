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
import { Upload, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { importFromCSV, ImportColumn, ImportResult } from '@/utils/importUtils';

interface ImportButtonProps<T> {
  columns: ImportColumn[];
  onImport: (data: T[]) => Promise<void>;
  templateData?: Partial<T>[];
  templateFilename?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function ImportButton<T>({
  columns,
  onImport,
  templateData = [],
  templateFilename = 'import_template',
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
      const importResult = await importFromCSV<T>(file, { columns });
      setResult(importResult);

      if (importResult.success && importResult.data.length > 0) {
        await onImport(importResult.data);
      }
    } catch (error) {
      setResult({
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Import failed. Please try again.' }],
        stats: { total: 0, successful: 0, failed: 0 }
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
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

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import data. Download the template for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Download Template</p>
                <p className="text-xs text-muted-foreground">
                  Get the CSV template with correct column headers
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
                {importing ? 'Importing...' : 'Select CSV File'}
              </Button>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Processing file...
                </p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-2xl font-bold">{result.stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center bg-green-50 dark:bg-green-950">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.stats.successful}
                    </p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center bg-red-50 dark:bg-red-950">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {result.stats.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                {/* Success Message */}
                {result.success && (
                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      Successfully imported {result.stats.successful} records
                    </AlertDescription>
                  </Alert>
                )}

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {result.errors.length} error(s) found during import
                      </AlertDescription>
                    </Alert>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/50">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-semibold">Row {error.row}:</span>{' '}
                          {error.field && <span className="text-muted-foreground">{error.field} - </span>}
                          {error.message}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground italic">
                          ... and {result.errors.length - 10} more errors
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
