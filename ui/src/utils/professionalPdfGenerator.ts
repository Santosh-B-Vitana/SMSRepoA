import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  affiliationNo?: string;
  schoolCode?: string;
  logoUrl?: string;
  websiteUrl?: string;
  principalName?: string;
}

interface FeeReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  studentId: string;
  class: string;
  section?: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: string;
  feeType?: string;
  rollNo?: string;
}

interface ReportCardData {
  studentName: string;
  studentId: string;
  class: string;
  section: string;
  academicYear: string;
  examName: string;
  rollNo: string;
  subjects: Array<{
    name: string;
    marks: number;
    maxMarks: number;
    grade: string;
  }>;
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  remarks?: string;
  rank?: number;
  attendance?: string;
}

// Professional color scheme
const COLORS = {
  primary: [41, 98, 255] as [number, number, number],      // Professional Blue
  secondary: [76, 175, 80] as [number, number, number],    // Success Green  
  accent: [255, 152, 0] as [number, number, number],       // Accent Orange
  dark: [33, 33, 33] as [number, number, number],          // Dark Gray
  light: [245, 245, 245] as [number, number, number],      // Light Gray
  border: [200, 200, 200] as [number, number, number],     // Border Gray
};

/**
 * Adds a compact professional header with school logo and information
 */
const addProfessionalHeader = (
  doc: jsPDF,
  schoolInfo: SchoolInfo,
  title: string
): number => {
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 12;

  // Compact header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // School Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name, pageWidth / 2, yPosition, { align: 'center' });

  // School Details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  yPosition += 5;
  doc.text(schoolInfo.address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  const contactLine = `Phone: ${schoolInfo.phone} | Email: ${schoolInfo.email}`;
  doc.text(contactLine, pageWidth / 2, yPosition, { align: 'center' });

  if (schoolInfo.affiliationNo || schoolInfo.schoolCode) {
    yPosition += 4;
    const affiliation = schoolInfo.affiliationNo 
      ? `Affiliation No: ${schoolInfo.affiliationNo}` 
      : '';
    const code = schoolInfo.schoolCode 
      ? `School Code: ${schoolInfo.schoolCode}` 
      : '';
    const affiliationLine = [affiliation, code].filter(Boolean).join(' | ');
    doc.text(affiliationLine, pageWidth / 2, yPosition, { align: 'center' });
  }

  // Document Title - compact
  doc.setFillColor(...COLORS.light);
  doc.rect(0, 34, pageWidth, 10, 'F');
  
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 41, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, 46, pageWidth - 15, 46);

  return 52; // Return starting Y position for content
};

/**
 * Adds a compact professional footer with signatures and metadata
 */
const addProfessionalFooter = (
  doc: jsPDF,
  schoolInfo: SchoolInfo,
  showSignatures: boolean = true
): void => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = pageHeight - 30;

  if (showSignatures) {
    // Compact signature section
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    
    // Left signature - Prepared by
    doc.line(20, yPosition, 65, yPosition);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared By', 42.5, yPosition + 3, { align: 'center' });
    
    // Center signature - Principal
    doc.line((pageWidth / 2) - 22.5, yPosition, (pageWidth / 2) + 22.5, yPosition);
    doc.text(schoolInfo.principalName || 'Principal', pageWidth / 2, yPosition + 3, { align: 'center' });
    
    // Right signature - Office Seal
    doc.line(pageWidth - 65, yPosition, pageWidth - 20, yPosition);
    doc.text('Office Seal', pageWidth - 42.5, yPosition + 3, { align: 'center' });
    
    yPosition += 8;
  }

  // Compact footer bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  
  const footerText = 'This is a computer-generated document and does not require a signature.';
  doc.text(footerText, pageWidth / 2, pageHeight - 9, { align: 'center' });
  
  const timestamp = `Generated on: ${new Date().toLocaleString('en-IN', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  })}`;
  doc.text(timestamp, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  if (schoolInfo.websiteUrl) {
    doc.setFontSize(6);
    doc.text(schoolInfo.websiteUrl, pageWidth / 2, pageHeight - 2, { align: 'center' });
  }
};

/**
 * Generate a professional fee receipt PDF
 */
export const generateProfessionalFeeReceipt = (
  schoolInfo: SchoolInfo,
  receiptData: FeeReceiptData
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add header
  let yPosition = addProfessionalHeader(doc, schoolInfo, 'FEE PAYMENT RECEIPT');

  // Receipt metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  
  yPosition += 3;
  doc.text(`Receipt No: ${receiptData.receiptNo}`, 15, yPosition);
  doc.text(`Date: ${receiptData.date}`, pageWidth - 15, yPosition, { align: 'right' });

  yPosition += 7;

  // Student Details Table - Compact
  autoTable(doc, {
    startY: yPosition,
    head: [['Student Information', '']],
    body: [
      ['Student Name', receiptData.studentName],
      ['Student ID', receiptData.studentId],
      ['Class', receiptData.section ? `${receiptData.class} - ${receiptData.section}` : receiptData.class],
      ...(receiptData.rollNo ? [['Roll Number', receiptData.rollNo]] : []),
      ['Academic Year', receiptData.academicYear],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: COLORS.light },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 },
  });

  // Payment Details Table - Compact
  yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : yPosition + 5;
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Payment Details', '']],
    body: [
      ...(receiptData.feeType ? [['Fee Type', receiptData.feeType]] : []),
      ['Total Fee Amount', `₹ ${receiptData.totalAmount.toLocaleString('en-IN')}`],
      ['Amount Paid', `₹ ${receiptData.paidAmount.toLocaleString('en-IN')}`],
      ['Outstanding Balance', `₹ ${receiptData.outstandingAmount.toLocaleString('en-IN')}`],
      ...(receiptData.paymentMethod ? [['Payment Method', receiptData.paymentMethod.toUpperCase()]] : []),
      ...(receiptData.transactionId ? [['Transaction ID', receiptData.transactionId]] : []),
      ...(receiptData.paymentDate ? [['Payment Date', receiptData.paymentDate]] : []),
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: COLORS.light },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 },
  });

  // Amount in words - Compact
  yPosition = (doc as any).lastAutoTable.finalY + 5;
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(15, yPosition, pageWidth - 30, 10, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Amount Paid (in words):', 20, yPosition + 4);
  
  doc.setFont('helvetica', 'normal');
  const amountInWords = numberToWords(receiptData.paidAmount);
  doc.text(`${amountInWords} Rupees Only`, 70, yPosition + 4);

  // Add footer
  addProfessionalFooter(doc, schoolInfo, true);

  // Return the PDF document for external handling
  return doc;
};

/**
 * Generate a professional report card PDF
 */
export const generateProfessionalReportCard = (
  schoolInfo: SchoolInfo,
  reportData: ReportCardData
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add header
  let yPosition = addProfessionalHeader(doc, schoolInfo, 'ACADEMIC REPORT CARD');

  yPosition += 5;

  // Student Information - Compact
  autoTable(doc, {
    startY: yPosition,
    body: [
      ['Student Name:', reportData.studentName, 'Student ID:', reportData.studentId],
      ['Class:', `${reportData.class} - ${reportData.section}`, 'Roll No:', reportData.rollNo],
      ['Academic Year:', reportData.academicYear, 'Examination:', reportData.examName],
      ...(reportData.attendance ? [['Attendance:', reportData.attendance, 'Rank:', reportData.rank?.toString() || 'N/A']] : []),
    ],
    theme: 'plain',
    bodyStyles: {
      fontSize: 8,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, textColor: COLORS.dark },
      1: { cellWidth: 45 },
      2: { fontStyle: 'bold', cellWidth: 25, textColor: COLORS.dark },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 },
  });

  // Subject Marks Table - Compact
  yPosition = (doc as any).lastAutoTable.finalY + 5;
  
  const marksTableData = reportData.subjects.map(subject => [
    subject.name,
    subject.maxMarks.toString(),
    subject.marks.toString(),
    subject.grade,
    `${((subject.marks / subject.maxMarks) * 100).toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade', 'Percentage']],
    body: marksTableData,
    foot: [[
      'TOTAL',
      reportData.totalMaxMarks.toString(),
      reportData.totalMarks.toString(),
      reportData.overallGrade,
      `${reportData.percentage.toFixed(2)}%`
    ]],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    footStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 },
  });

  // Performance Summary - Compact
  yPosition = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(15, yPosition, pageWidth - 30, 12, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Performance Summary', pageWidth / 2, yPosition + 4, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text(`Total: ${reportData.percentage.toFixed(2)}%`, 20, yPosition + 9);
  doc.text(`Grade: ${reportData.overallGrade}`, pageWidth / 2, yPosition + 9, { align: 'center' });
  if (reportData.rank) {
    doc.text(`Rank: ${reportData.rank}`, pageWidth - 20, yPosition + 9, { align: 'right' });
  }

  // Teacher's Remarks - Compact
  if (reportData.remarks) {
    yPosition += 17;
    
    doc.setFillColor(255, 252, 240);
    doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text("Teacher's Remarks:", 20, yPosition + 6);
    
    doc.setFont('helvetica', 'normal');
    const splitRemarks = doc.splitTextToSize(reportData.remarks, pageWidth - 40);
    doc.text(splitRemarks, 20, yPosition + 12);
  }

  // Add footer with signatures
  addProfessionalFooter(doc, schoolInfo, true);

  // Return the PDF document for external handling
  return doc;
};

/**
 * Convert number to words (Indian numbering system)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim();
}
