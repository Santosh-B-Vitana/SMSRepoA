import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, ExportColumn } from '@/utils/exportUtils';

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  title,
  variant = 'outline',
  size = 'sm'
}: ExportButtonProps<T>) {
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const options = { filename, columns, title };
    
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
