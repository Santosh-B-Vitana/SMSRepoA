import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileText, Users, UserCheck, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

// Parse backend error strings: "[ADM-001] message" or "Row 3: message" → { rowRef, detail }
function parseImportError(msg: string): { rowRef: string; detail: string } {
  const bracketMatch = msg.match(/^\[([^\]]+)\]\s*(.*)/s);
  if (bracketMatch) return { rowRef: bracketMatch[1], detail: bracketMatch[2].trim() };
  const rowMatch = msg.match(/^Row\s+(\d+):\s*(.*)/is);
  if (rowMatch) return { rowRef: `Row ${rowMatch[1]}`, detail: rowMatch[2].trim() };
  return { rowRef: 'File error', detail: msg.trim() };
}

interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

async function downloadTemplateFromApi(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function uploadCsvToApi(url: string, file: File): Promise<BulkOperationResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Backend wraps in ApiResponseWrapper: { data: BulkOperationResult }
  return response.data?.data ?? response.data;
}

// ─── Single entity import panel ──────────────────────────────────────────────

interface ImportPanelProps {
  entityLabel: string;
  templateUrl: string;
  importUrl: string;
  templateFilename: string;
  requiredCols: string;
}

function ImportPanel({ entityLabel, templateUrl, importUrl, templateFilename, requiredCols }: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadTemplateFromApi(templateUrl, templateFilename);
      toast.success(`${entityLabel} template downloaded`);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await uploadCsvToApi(importUrl, file);
      setResult(res);
      if (res.failureCount === 0) {
        toast.success(`${res.successCount} ${entityLabel.toLowerCase()}(s) imported successfully`);
      } else {
        toast.warning(`Imported ${res.successCount}, failed ${res.failureCount}`);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Import failed';
      toast.error(msg);
      setResult({ successCount: 0, failureCount: 0, errors: [msg] });
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Step 1: Download Template */}
      <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
          1
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm mb-1">Download the CSV template</p>
          <p className="text-xs text-muted-foreground mb-3">
            Required columns: <span className="font-mono">{requiredCols}</span>
          </p>
          <Button variant="outline" size="sm" onClick={handleTemplateDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download {entityLabel} Template
          </Button>
        </div>
      </div>

      {/* Step 2: Upload & Import */}
      <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
          2
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-medium text-sm mb-1">Fill in and upload your CSV</p>
            <p className="text-xs text-muted-foreground mb-3">
              Max 500 rows per file. Duplicate employee IDs or emails are skipped with an error note.
            </p>
          </div>
          <input
            ref={inputRef}
            id={`${entityLabel}-file`}
            type="file"
            accept=".csv"
            className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            onChange={handleFileChange}
          />
          {file && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{file.name}</span>
                <span className="text-muted-foreground text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button onClick={clearFile} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Button onClick={handleImport} disabled={!file || importing} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {importing ? `Importing ${entityLabel}s…` : `Import ${entityLabel}s`}
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg text-center bg-green-50 dark:bg-green-950/20">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{result.successCount}</p>
              <p className="text-xs text-muted-foreground">Imported</p>
            </div>
            <div className="p-3 border rounded-lg text-center bg-red-50 dark:bg-red-950/20">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{result.failureCount}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>

          {/* Success / partial-success banner */}
          {result.failureCount === 0 && result.successCount > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                All {result.successCount} records imported successfully.
              </AlertDescription>
            </Alert>
          )}
          {result.failureCount > 0 && result.successCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {result.successCount} imported. {result.failureCount} row{result.failureCount !== 1 ? 's were' : ' was'} skipped — fix the issues below and re-upload.
              </AlertDescription>
            </Alert>
          )}

          {/* Row-by-row error list */}
          {result.errors.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30 max-h-52 overflow-y-auto space-y-1.5">
              {result.errors.slice(0, 30).map((err, i) => {
                const { rowRef, detail } = parseImportError(err);
                return (
                  <div key={i} className="text-xs flex gap-2 items-start">
                    <Badge
                      variant={rowRef === 'File error' ? 'destructive' : 'secondary'}
                      className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-mono"
                    >
                      {rowRef}
                    </Badge>
                    <span>{detail}</span>
                  </div>
                );
              })}
              {result.errors.length > 30 && (
                <p className="text-xs text-muted-foreground italic pt-1">
                  … and {result.errors.length - 30} more issues. Fix and re-upload.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DataImportManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Import</h2>
        <p className="text-muted-foreground">
          Bulk-register students and staff by uploading a CSV file. Download the template, fill it in, and upload.
        </p>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Bulk Import
              </CardTitle>
              <CardDescription>
                Register multiple students at once. The template includes an example row showing every supported column.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportPanel
                entityLabel="Student"
                templateUrl="/Students/bulk-import/template"
                importUrl="/Students/bulk-import/csv"
                templateFilename="student_import_template.csv"
                requiredCols="FirstName, LastName, DateOfBirth, Gender, Class, GuardianName, GuardianPhone"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Staff Bulk Import
              </CardTitle>
              <CardDescription>
                Register multiple staff members at once. The template includes an example row showing every supported column.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportPanel
                entityLabel="Staff"
                templateUrl="/Staff/bulk-import/template"
                importUrl="/Staff/bulk-import/csv"
                templateFilename="staff_import_template.csv"
                requiredCols="EmployeeId, FirstName, LastName, Email, Designation, Department, JoiningDate"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}