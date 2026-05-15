import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, ExportColumn } from '@/utils/exportUtils';
import { apiClient } from '@/lib/apiClient';

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  /** When set, CSV export fetches from this API endpoint (auth-aware) instead of using in-memory data */
  apiExportUrl?: string;
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  title,
  variant = 'outline',
  size = 'sm',
  apiExportUrl,
}: ExportButtonProps<T>) {
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    const options = { filename, columns, title };

    if (format === 'csv' && apiExportUrl) {
      // ── Real API export ────────────────────────────────────────────────
      try {
        const response = await apiClient.get(apiExportUrl, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch {
        // fall through to local export on error
        exportToCSV(data, options);
      }
      return;
    }

    switch (format) {
      case 'csv':
        exportToCSV(data, options);
        break;
      case 'excel':
        exportToExcel(data, options);
        break;
      case 'pdf':
        exportToPDF(data, options);
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileType className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
