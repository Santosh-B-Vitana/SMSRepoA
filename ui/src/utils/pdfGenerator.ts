import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  affiliationNo: string;
  schoolCode: string;
}

interface FeeReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  studentId: string;
  class: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: string;
}

export const generateFeeReceipt = (
  schoolInfo: SchoolInfo,
  receiptData: FeeReceiptData
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header - School Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name, pageWidth / 2, 20, { align: 'center' });
  
  // School Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.address, pageWidth / 2, 28, { align: 'center' });
  doc.text(
    `Phone: ${schoolInfo.phone} | Email: ${schoolInfo.email}`,
    pageWidth / 2,
    34,
    { align: 'center' }
  );
  doc.text(
    `Affiliation No: ${schoolInfo.affiliationNo} | School Code: ${schoolInfo.schoolCode}`,
    pageWidth / 2,
    40,
    { align: 'center' }
  );
  
  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(15, 45, pageWidth - 15, 45);
  
  // Receipt Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE PAYMENT RECEIPT', pageWidth / 2, 55, { align: 'center' });
  
  // Receipt No and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${receiptData.receiptNo}`, 15, 65);
  doc.text(`Date: ${receiptData.date}`, pageWidth - 15, 65, { align: 'right' });
  
  // Student Details Table
  autoTable(doc, {
    startY: 75,
    head: [['Student Details', '']],
    body: [
      ['Student Name', receiptData.studentName],
      ['Student ID', receiptData.studentId],
      ['Class', receiptData.class],
      ['Academic Year', receiptData.academicYear],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' }
    }
  });
  
  // Fee Details Table
  const lastY = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: lastY,
    head: [['Fee Details', '']],
    body: [
      ['Total Fee Amount', `₹${receiptData.totalAmount.toLocaleString()}`],
      ['Amount Paid', `₹${receiptData.paidAmount.toLocaleString()}`],
      ['Outstanding Amount', `₹${receiptData.outstandingAmount.toLocaleString()}`],
      ...(receiptData.paymentMethod ? [['Payment Method', receiptData.paymentMethod.toUpperCase()]] : []),
      ...(receiptData.transactionId ? [['Transaction ID', receiptData.transactionId]] : []),
      ...(receiptData.paymentDate ? [['Payment Date', receiptData.paymentDate]] : []),
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' }
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt. No signature required.', pageWidth / 2, finalY, { align: 'center' });
  doc.text(`For any queries, contact ${schoolInfo.phone}`, pageWidth / 2, finalY + 5, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 10, { align: 'center' });
  
  // Save the PDF
  doc.save(`Receipt_${receiptData.studentName}_${receiptData.date}.pdf`);
};

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
}

export const generateReportCard = (
  schoolInfo: SchoolInfo,
  reportData: ReportCardData
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.address, pageWidth / 2, 28, { align: 'center' });
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ACADEMIC REPORT CARD', pageWidth / 2, 42, { align: 'center' });
  
  // Student Info
  autoTable(doc, {
    startY: 50,
    body: [
      ['Student Name:', reportData.studentName, 'Student ID:', reportData.studentId],
      ['Class:', `${reportData.class}-${reportData.section}`, 'Roll No:', reportData.rollNo],
      ['Academic Year:', reportData.academicYear, 'Exam:', reportData.examName],
    ],
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 'auto' }
    }
  });
  
  // Marks Table
  const marksTableData = reportData.subjects.map(subject => [
    subject.name,
    subject.maxMarks.toString(),
    subject.marks.toString(),
    subject.grade
  ]);
  
  const lastY = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: lastY,
    head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade']],
    body: marksTableData,
    foot: [[
      'TOTAL',
      reportData.totalMaxMarks.toString(),
      reportData.totalMarks.toString(),
      reportData.overallGrade
    ]],
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94], fontStyle: 'bold' },
    footStyles: { fillColor: [231, 76, 60], fontStyle: 'bold', fontSize: 11 }
  });
  
  // Summary
  const summaryY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Percentage: ${reportData.percentage.toFixed(2)}%`, 15, summaryY);
  doc.text(`Overall Grade: ${reportData.overallGrade}`, pageWidth / 2, summaryY);
  
  // Remarks
  if (reportData.remarks) {
    doc.setFontSize(10);
    doc.text('Remarks:', 15, summaryY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(reportData.remarks, 15, summaryY + 16, { maxWidth: pageWidth - 30 });
  }
  
  // Footer
  const footerY = doc.internal.pageSize.height - 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('_____________________', 15, footerY);
  doc.text('Class Teacher', 15, footerY + 5);
  
  doc.text('_____________________', pageWidth / 2 - 20, footerY);
  doc.text('Principal', pageWidth / 2 - 10, footerY + 5);
  
  doc.text('_____________________', pageWidth - 50, footerY);
  doc.text('Parent Signature', pageWidth - 45, footerY + 5);
  
  // Save
  doc.save(`ReportCard_${reportData.studentName}_${reportData.examName}.pdf`);
};
