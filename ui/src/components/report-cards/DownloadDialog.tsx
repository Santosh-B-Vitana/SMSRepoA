'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TemplateSelector } from './TemplateSelector';
import { Download, FileSpreadsheet, FileText, Globe, FileDown } from 'lucide-react';
import { DOWNLOAD_FORMATS, reportCardDocumentsApi } from '@/services/api/reportCardsApi';
import { toast } from 'sonner';

interface DownloadDialogProps {
  reportCardId?: string;           // single download
  bulkParams?: {                   // bulk download
    academicYear: string;
    term: string;
    classId?: string;
    sectionId?: string;
  };
  studentName?: string;
  defaultTemplate?: string;
  trigger?: React.ReactNode;
  apiBaseUrl?: string;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  PDF:   <FileText className="h-4 w-4 text-red-500" />,
  Excel: <FileSpreadsheet className="h-4 w-4 text-green-600" />,
  HTML:  <Globe className="h-4 w-4 text-blue-500" />,
  CSV:   <FileDown className="h-4 w-4 text-purple-500" />,
};

export function DownloadDialog({
  reportCardId, bulkParams, studentName, defaultTemplate = 'CBSE_Classic', trigger, apiBaseUrl = '/api'
}: DownloadDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('PDF');
  const [templateStyle, setTemplateStyle] = useState(defaultTemplate);
  const [isDownloading, setIsDownloading] = useState(false);

  const isBulk = !!bulkParams;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url: string;
      let filename: string;

      if (isBulk && bulkParams) {
        url = `${apiBaseUrl}${reportCardDocumentsApi.bulkDownloadUrl({ ...bulkParams, format })}`;
        filename = `ReportCards_${bulkParams.academicYear}_${bulkParams.term}.${getExt(format)}`;
      } else if (reportCardId) {
        url = `${apiBaseUrl}${reportCardDocumentsApi.downloadUrl(reportCardId, format, templateStyle)}`;
        filename = `ReportCard_${studentName ?? reportCardId}.${getExt(format)}`;
      } else {
        toast.error('No report card selected for download.');
        return;
      }

      // Fetch with auth token
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      toast.success(`Downloaded ${filename}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Report Card
            {studentName && <Badge variant="secondary" className="ml-1">{studentName}</Badge>}
            {isBulk && <Badge variant="secondary" className="ml-1">Bulk — {bulkParams!.term} {bulkParams!.academicYear}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Choose your preferred format and template style before downloading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Download Format</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DOWNLOAD_FORMATS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all cursor-pointer ${
                    format === f.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <span className="text-base">{f.icon}</span>
                  <span className="font-medium text-xs leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
            {format === 'HTML' && (
              <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                💡 HTML opens in browser — use <strong>File → Print → Save as PDF</strong> for print-quality output with full CSS styling.
              </p>
            )}
          </div>

          <Separator />

          {/* Template selection (only for PDF / HTML) */}
          {(format === 'PDF' || format === 'HTML') && (
            <TemplateSelector value={templateStyle} onChange={setTemplateStyle} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <>Generating...</>
            ) : (
              <>
                {FORMAT_ICONS[format]}
                <span className="ml-2">Download {format}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getExt(format: string) {
  switch (format) {
    case 'PDF':   return 'pdf';
    case 'Excel': return 'xlsx';
    case 'CSV':   return 'csv';
    default:      return 'html';
  }
}

function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem('auth_session');
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch {}
  return localStorage.getItem('authToken');
}
