import { FeeRecord, PaymentTransaction } from '@/services/feeService';

/**
 * Export fee records to CSV format
 */
export function exportFeeRecordsToCSV(records: FeeRecord[]): void {
  const headers = [
    'Student ID',
    'Student Name',
    'Class',
    'Total Amount',
    'Paid Amount',
    'Pending Amount',
    'Due Date',
    'Status',
    'Last Payment Date',
    'Academic Year'
  ];

  const rows = records.map(record => [
    record.studentId,
    record.studentName,
    record.class,
    record.totalAmount.toString(),
    record.paidAmount.toString(),
    record.pendingAmount.toString(),
    record.dueDate,
    record.status,
    record.lastPaymentDate || 'N/A',
    record.academicYear
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, 'fee-records.csv', 'text/csv');
}

/**
 * Export transactions to CSV format
 */
export function exportTransactionsToCSV(transactions: PaymentTransaction[]): void {
  const headers = [
    'Transaction ID',
    'Student ID',
    'Student Name',
    'Amount',
    'Method',
    'Status',
    'Timestamp',
    'Gateway Reference',
    'Academic Year'
  ];

  const rows = transactions.map(txn => [
    txn.id,
    txn.studentId,
    txn.studentName || 'N/A',
    txn.amount.toString(),
    txn.method,
    txn.status,
    new Date(txn.timestamp).toLocaleString(),
    txn.gatewayRef,
    txn.academicYear
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, 'payment-transactions.csv', 'text/csv');
}

/**
 * Export fee records to Excel format (HTML table that Excel can open)
 */
export function exportFeeRecordsToExcel(records: FeeRecord[]): void {
  const table = `
    <table>
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Class</th>
          <th>Total Amount</th>
          <th>Paid Amount</th>
          <th>Pending Amount</th>
          <th>Due Date</th>
          <th>Status</th>
          <th>Last Payment Date</th>
          <th>Academic Year</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(record => `
          <tr>
            <td>${record.studentId}</td>
            <td>${record.studentName}</td>
            <td>${record.class}</td>
            <td>${record.totalAmount}</td>
            <td>${record.paidAmount}</td>
            <td>${record.pendingAmount}</td>
            <td>${record.dueDate}</td>
            <td>${record.status}</td>
            <td>${record.lastPaymentDate || 'N/A'}</td>
            <td>${record.academicYear}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>${table}</body>
    </html>
  `;

  downloadFile(htmlContent, 'fee-records.xls', 'application/vnd.ms-excel');
}

/**
 * Export summary report to CSV
 */
export function exportSummaryReport(data: {
  totalPending: number;
  overdueCount: number;
  monthlyCollection: number;
  onlinePaymentPercentage: number;
  recordsByClass: Record<string, number>;
  recordsByStatus: Record<string, number>;
}): void {
  const csvContent = [
    'Summary Report',
    '',
    'Overall Statistics',
    `Total Pending Fees,₹${data.totalPending.toLocaleString()}`,
    `Overdue Accounts,${data.overdueCount}`,
    `Monthly Collection,₹${data.monthlyCollection.toLocaleString()}`,
    `Online Payment Percentage,${data.onlinePaymentPercentage}%`,
    '',
    'Records by Class',
    ...Object.entries(data.recordsByClass).map(([cls, count]) => `${cls},${count}`),
    '',
    'Records by Status',
    ...Object.entries(data.recordsByStatus).map(([status, count]) => `${status},${count}`)
  ].join('\n');

  downloadFile(csvContent, 'fee-summary-report.csv', 'text/csv');
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
