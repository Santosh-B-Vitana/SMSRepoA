import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface BookIssueReceiptData {
  receiptNumber: string;
  date: string;
  studentName: string;
  studentId: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
}

interface BookReturnReceiptData {
  receiptNumber: string;
  date: string;
  studentName: string;
  studentId: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  returnDate: string;
  fineAmount?: number;
}

const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  text: '#1e293b',
  lightGray: '#f1f5f9'
};

function addHeader(doc: jsPDF, schoolInfo: SchoolInfo, title: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Header background
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (schoolInfo.address) {
    doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  if (schoolInfo.phone || schoolInfo.email) {
    const contact = [schoolInfo.phone, schoolInfo.email].filter(Boolean).join(' | ');
    doc.text(contact, pageWidth / 2, yPos, { align: 'center' });
  }

  // Title
  yPos = 50;
  doc.setTextColor(COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });

  return yPos + 10;
}

function addFooter(doc: jsPDF, schoolInfo: SchoolInfo) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = doc.internal.pageSize.getHeight() - 20;
  
  doc.setTextColor(COLORS.secondary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Please return books on time to avoid fines.', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Library Receipt - Computer Generated', pageWidth / 2, yPos, { align: 'center' });
  
  if (schoolInfo.website) {
    yPos += 4;
    doc.text(schoolInfo.website, pageWidth / 2, yPos, { align: 'center' });
  }
}

export function generateBookIssueReceipt(schoolInfo: SchoolInfo, data: BookIssueReceiptData): jsPDF {
  const doc = new jsPDF();
  let yPos = addHeader(doc, schoolInfo, 'BOOK ISSUE RECEIPT');

  const leftCol = 25;
  doc.setFontSize(10);

  // Receipt details
  yPos += 5;
  const details = [
    ['Receipt Number:', data.receiptNumber],
    ['Issue Date:', data.date],
    ['Student Name:', data.studentName],
    ['Student ID:', data.studentId],
    ['Book Title:', data.bookTitle],
    ['Book ID:', data.bookId],
    ['Due Date:', data.dueDate]
  ];

  doc.setFont('helvetica', 'bold');
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.secondary);
    doc.text(label, leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.text);
    doc.text(value, leftCol + 50, yPos);
    yPos += 8;
  });

  // Important note
  yPos += 10;
  doc.setFillColor(255, 243, 205);
  doc.rect(leftCol - 5, yPos - 5, 160, 25, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.warning);
  doc.text('⚠ IMPORTANT:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);
  yPos += 6;
  doc.text(`Please return this book on or before ${data.dueDate}`, leftCol, yPos);
  yPos += 5;
  doc.text('Late returns will incur a fine of ₹5 per day.', leftCol, yPos);

  addFooter(doc, schoolInfo);
  return doc;
}

export function generateBookReturnReceipt(schoolInfo: SchoolInfo, data: BookReturnReceiptData): jsPDF {
  const doc = new jsPDF();
  let yPos = addHeader(doc, schoolInfo, 'BOOK RETURN RECEIPT');

  const leftCol = 25;
  doc.setFontSize(10);

  // Receipt details
  yPos += 5;
  const details = [
    ['Receipt Number:', data.receiptNumber],
    ['Return Date:', data.date],
    ['Student Name:', data.studentName],
    ['Student ID:', data.studentId],
    ['Book Title:', data.bookTitle],
    ['Book ID:', data.bookId],
    ['Issue Date:', data.issueDate],
    ['Return Date:', data.returnDate]
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.secondary);
    doc.text(label, leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.text);
    doc.text(value, leftCol + 50, yPos);
    yPos += 8;
  });

  // Fine section
  if (data.fineAmount && data.fineAmount > 0) {
    yPos += 5;
    doc.setFillColor(254, 226, 226);
    doc.rect(leftCol - 5, yPos - 5, 160, 25, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.warning);
    doc.text('LATE RETURN FINE:', leftCol, yPos);
    doc.setFontSize(14);
    doc.text(`₹${data.fineAmount.toLocaleString()}`, leftCol + 120, yPos, { align: 'right' });
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.text);
    doc.text('Please pay this fine at the library counter.', leftCol, yPos);
  } else {
    yPos += 5;
    doc.setFillColor(220, 252, 231);
    doc.rect(leftCol - 5, yPos - 5, 160, 15, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.success);
    doc.text('✓ Book returned on time. No fine applicable.', leftCol, yPos);
  }

  addFooter(doc, schoolInfo);
  return doc;
}
