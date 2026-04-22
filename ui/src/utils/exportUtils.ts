import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename?: string;
  columns: ExportColumn[];
  title?: string;
  includeTimestamp?: boolean;
}

// CSV Export
export function exportToCSV<T>(data: T[], options: ExportOptions): void {
  const { filename = 'export', columns, includeTimestamp = true } = options;
  
  // Create CSV header
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = (item as any)[col.key];
      const formatted = col.format ? col.format(value) : value;
      // Escape quotes and wrap in quotes if contains comma or quotes
      const stringValue = String(formatted ?? '');
      return stringValue.includes(',') || stringValue.includes('"')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    }).join(',');
  }).join('\n');
  
  const csv = `${headers}\n${rows}`;
  
  // Download CSV
  const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyy-MM-dd_HHmmss')}` : '';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Excel Export (using CSV format with .xlsx extension for simplicity)
export function exportToExcel<T>(data: T[], options: ExportOptions): void {
  const { filename = 'export', columns, includeTimestamp = true } = options;
  
  // Create Excel-compatible CSV with UTF-8 BOM
  const headers = columns.map(col => col.label).join('\t');
  const rows = data.map(item => {
    return columns.map(col => {
      const value = (item as any)[col.key];
      return col.format ? col.format(value) : value ?? '';
    }).join('\t');
  }).join('\n');
  
  const csv = `\uFEFF${headers}\n${rows}`;
  
  const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyy-MM-dd_HHmmss')}` : '';
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}${timestamp}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// PDF Export
export function exportToPDF<T>(data: T[], options: ExportOptions): void {
  const { filename = 'export', columns, title = 'Report', includeTimestamp = true } = options;
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30);
  
  // Prepare table data
  const headers = columns.map(col => col.label);
  const rows = data.map(item => {
    return columns.map(col => {
      const value = (item as any)[col.key];
      return col.format ? col.format(value) : String(value ?? '');
    });
  });
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] }
  });
  
  const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyy-MM-dd_HHmmss')}` : '';
  doc.save(`${filename}${timestamp}.pdf`);
}

// Format helpers
export const Formatters = {
  date: (value: any) => value ? format(new Date(value), 'PP') : '',
  datetime: (value: any) => value ? format(new Date(value), 'PPpp') : '',
  currency: (value: any, currency = 'INR') => {
    const num = parseFloat(value);
    return isNaN(num) ? '' : `${currency} ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  boolean: (value: any) => value ? 'Yes' : 'No',
  array: (value: any[]) => Array.isArray(value) ? value.join(', ') : '',
  truncate: (length: number) => (value: any) => {
    const str = String(value ?? '');
    return str.length > length ? `${str.substring(0, length)}...` : str;
  }
};
