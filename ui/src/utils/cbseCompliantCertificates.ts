/**
 * CBSE-Compliant Certificate Generator
 * Generates Transfer Certificates, Bonafide Certificates, and other documents
 * following CBSE/ICSE/State Board regulations
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  numberToWords, 
  formatDateIndian, 
  formatDateInWords,
  DOCUMENT_CONFIGS 
} from './industryGradePrintUtils';

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
  boardType?: 'CBSE' | 'ICSE' | 'STATE';
  state?: string;
  district?: string;
  pincode?: string;
}

export interface TCStudentData {
  // Mandatory fields as per CBSE
  serialNo: string;
  admissionNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  nationality: string;
  category: string; // SC/ST/OBC/General
  dateOfBirth: string;
  dateOfBirthWords?: string;
  classAdmitted: string;
  dateOfAdmission: string;
  classCurrent: string;
  sinceDateInClass?: string;
  qualifiedForPromotion: boolean;
  monthYearOfLeaving: string;
  reasonForLeaving: string;
  previousTCIssued: boolean;
  previousTCDetails?: string;
  lastExamTaken?: string;
  failedDetails?: string;
  workingDays: number;
  daysPresent: number;
  nccScoutGuide?: string;
  gamesActivities?: string;
  conduct: string;
  issueDate: string;
  
  // Optional additional fields
  gender?: string;
  religion?: string;
  bloodGroup?: string;
  aadharNumber?: string;
  classAtLeaving?: string;
  feesPaidUpTo?: string;
  scholarshipDetails?: string;
  remarks?: string;
}

export interface StaffCertificateData {
  certificateNumber: string;
  staffName: string;
  designation: string;
  department: string;
  employeeId: string;
  joiningDate: string;
  relievingDate?: string;
  salary?: number;
  annualSalary?: number;
  purpose?: string;
  conduct?: string;
  responsibilities?: string[];
  issueDate: string;
}

const COLORS = {
  primary: [25, 55, 109] as [number, number, number],    // Deep Blue
  secondary: [139, 69, 19] as [number, number, number],  // Saddle Brown (for official docs)
  accent: [178, 34, 34] as [number, number, number],     // Firebrick
  dark: [20, 20, 20] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  light: [245, 245, 245] as [number, number, number],
  border: [180, 180, 180] as [number, number, number]
};

/**
 * Add decorative certificate border
 */
function addCertificateBorder(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Outer border
  doc.setDrawColor(...COLORS.secondary);
  doc.setLineWidth(2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  
  // Inner border
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  
  // Decorative corners
  const cornerSize = 8;
  doc.setFillColor(...COLORS.secondary);
  
  // Top-left
  doc.circle(12, 12, 2, 'F');
  doc.line(12, 12, 12 + cornerSize, 12);
  doc.line(12, 12, 12, 12 + cornerSize);
  
  // Top-right
  doc.circle(pageWidth - 12, 12, 2, 'F');
  doc.line(pageWidth - 12, 12, pageWidth - 12 - cornerSize, 12);
  doc.line(pageWidth - 12, 12, pageWidth - 12, 12 + cornerSize);
  
  // Bottom-left
  doc.circle(12, pageHeight - 12, 2, 'F');
  doc.line(12, pageHeight - 12, 12 + cornerSize, pageHeight - 12);
  doc.line(12, pageHeight - 12, 12, pageHeight - 12 - cornerSize);
  
  // Bottom-right
  doc.circle(pageWidth - 12, pageHeight - 12, 2, 'F');
  doc.line(pageWidth - 12, pageHeight - 12, pageWidth - 12 - cornerSize, pageHeight - 12);
  doc.line(pageWidth - 12, pageHeight - 12, pageWidth - 12, pageHeight - 12 - cornerSize);
}

/**
 * Add school header
 */
function addSchoolHeader(doc: jsPDF, schoolInfo: SchoolInfo): number {
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;
  
  // School name
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  
  // Address
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' });
  
  // Contact info
  yPos += 4;
  doc.setFontSize(8);
  const contactLine = `Tel: ${schoolInfo.phone} | Email: ${schoolInfo.email}`;
  doc.text(contactLine, pageWidth / 2, yPos, { align: 'center' });
  
  // Affiliation details
  if (schoolInfo.affiliationNo || schoolInfo.schoolCode) {
    yPos += 4;
    const affiliationLine = [
      schoolInfo.affiliationNo ? `Affiliation No: ${schoolInfo.affiliationNo}` : '',
      schoolInfo.schoolCode ? `School Code: ${schoolInfo.schoolCode}` : ''
    ].filter(Boolean).join(' | ');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(affiliationLine, pageWidth / 2, yPos, { align: 'center' });
  }
  
  // Divider line
  yPos += 4;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(25, yPos, pageWidth - 25, yPos);
  
  return yPos + 6;
}

/**
 * Generate CBSE-Compliant Transfer Certificate
 */
export function generateCBSETransferCertificate(
  schoolInfo: SchoolInfo,
  studentData: TCStudentData
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const config = DOCUMENT_CONFIGS.transferCertificate;
  
  addCertificateBorder(doc);
  let yPos = addSchoolHeader(doc, schoolInfo);
  
  // Certificate Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TRANSFER CERTIFICATE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`TC No: ${studentData.serialNo}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  
  // TC Details Table - All mandatory CBSE fields
  const tcDetails = [
    ['1.', 'Serial No. of Admission Register', studentData.admissionNo],
    ['2.', 'Name of the Pupil (in Full)', studentData.name.toUpperCase()],
    ['3.', "Father's Name", studentData.fatherName],
    ['4.', "Mother's Name", studentData.motherName],
    ['5.', 'Nationality', studentData.nationality || 'Indian'],
    ['6.', 'Whether belonging to SC/ST/OBC', studentData.category],
    ['7.', 'Date of Birth (as per Admission Register)', formatDateIndian(studentData.dateOfBirth)],
    ['8.', 'Date of Birth (in Words)', studentData.dateOfBirthWords || formatDateInWords(studentData.dateOfBirth)],
    ['9.', 'Class in which first admitted and date', `${studentData.classAdmitted} on ${formatDateIndian(studentData.dateOfAdmission)}`],
    ['10.', 'Class in which studying and since when', `${studentData.classCurrent}${studentData.sinceDateInClass ? ` since ${studentData.sinceDateInClass}` : ''}`],
    ['11.', 'Whether qualified for promotion to higher class', studentData.qualifiedForPromotion ? 'Yes, Qualified' : 'No'],
    ['12.', 'Month and Year of leaving school', studentData.monthYearOfLeaving],
    ['13.', 'Reason for leaving school', studentData.reasonForLeaving],
    ['14.', 'Whether school leaving certificate has been issued before', studentData.previousTCIssued ? 'Yes' : 'No'],
    ['15.', 'Number and date of last TC, if any', studentData.previousTCDetails || 'N/A'],
    ['16.', 'School/Board Examination last taken', studentData.lastExamTaken || 'N/A'],
    ['17.', 'Whether failed, if so details', studentData.failedDetails || 'N/A'],
    ['18.', 'Total working days in the academic session', studentData.workingDays.toString()],
    ['19.', 'Total number of days present', studentData.daysPresent.toString()],
    ['20.', 'Whether NCC/Scout/Guide/JRC', studentData.nccScoutGuide || 'N/A'],
    ['21.', 'Games played or extra-curricular activities', studentData.gamesActivities || 'N/A'],
    ['22.', 'General Conduct', studentData.conduct.toUpperCase()],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: tcDetails,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      lineColor: COLORS.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 75, fontStyle: 'bold' },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 18, right: 18 },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.2
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 6;
  
  // Additional remarks if any
  if (studentData.remarks) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Remarks: ${studentData.remarks}`, 20, yPos);
    yPos += 6;
  }
  
  // Date and Signature section
  yPos = Math.max(yPos, 250);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Issue: ${formatDateIndian(studentData.issueDate)}`, 20, yPos);
  
  // Signatures
  yPos += 10;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  
  // Checked by
  doc.line(20, yPos, 55, yPos);
  doc.setFontSize(7);
  doc.text('Checked By', 37.5, yPos + 3, { align: 'center' });
  
  // School Seal
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth / 2, yPos - 5, 10);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL', pageWidth / 2, yPos - 7, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, yPos - 3, { align: 'center' });
  
  // Principal
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 55, yPos, pageWidth - 20, yPos);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Principal', pageWidth - 37.5, yPos + 3, { align: 'center' });
  if (schoolInfo.principalName) {
    doc.setFont('helvetica', 'italic');
    doc.text(schoolInfo.principalName, pageWidth - 37.5, yPos + 7, { align: 'center' });
  }
  
  // Footer note
  yPos += 15;
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Note: This Transfer Certificate is issued in accordance with CBSE guidelines. Any alteration will render it invalid.',
    pageWidth / 2, yPos, { align: 'center' }
  );
  
  return doc;
}

/**
 * Generate Bonafide Certificate
 */
export function generateBonafideCertificate(
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    studentName: string;
    fatherName: string;
    className: string;
    section: string;
    studentId: string;
    academicYear: string;
    purpose: string;
    issueDate: string;
    dateOfBirth?: string;
  }
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPos = addSchoolHeader(doc, schoolInfo);
  
  // Certificate Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('BONAFIDE CERTIFICATE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Certificate body
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  
  const bodyText = `This is to certify that ${data.studentName.toUpperCase()}, son/daughter of ${data.fatherName}, ` +
    `is a bonafide student of this institution. He/She is currently studying in Class ${data.className}-${data.section} ` +
    `during the academic year ${data.academicYear}.`;
  
  const splitText = doc.splitTextToSize(bodyText, pageWidth - 50);
  doc.text(splitText, 25, yPos);
  
  yPos += splitText.length * 6 + 10;
  
  // Student details table
  autoTable(doc, {
    startY: yPos,
    head: [['Student Details', '']],
    body: [
      ['Student Name', data.studentName.toUpperCase()],
      ["Father's Name", data.fatherName],
      ['Class', `${data.className}-${data.section}`],
      ['Student ID/Admission No', data.studentId],
      ['Academic Year', data.academicYear],
      ...(data.dateOfBirth ? [['Date of Birth', formatDateIndian(data.dateOfBirth)]] : [])
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { 
      fillColor: COLORS.primary, 
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: COLORS.light },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 35, right: 35 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Purpose
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`This certificate is issued on the request of the student for the purpose of ${data.purpose}.`, 25, yPos, {
    maxWidth: pageWidth - 50
  });
  
  yPos += 12;
  doc.text('To the best of my knowledge and belief, the particulars furnished above are correct.', 25, yPos, {
    maxWidth: pageWidth - 50
  });
  
  // Signatures
  yPos = 230;
  
  doc.setFontSize(8);
  doc.text(`Date of Issue: ${formatDateIndian(data.issueDate)}`, 25, yPos);
  
  yPos += 15;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  
  // Class Teacher
  doc.line(25, yPos, 65, yPos);
  doc.setFontSize(7);
  doc.text('Class Teacher', 45, yPos + 4, { align: 'center' });
  
  // School Seal
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth / 2, yPos - 6, 12);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL', pageWidth / 2, yPos - 8, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, yPos - 4, { align: 'center' });
  
  // Principal
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 65, yPos, pageWidth - 25, yPos);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Principal', pageWidth - 45, yPos + 4, { align: 'center' });
  if (schoolInfo.principalName) {
    doc.setFont('helvetica', 'italic');
    doc.text(schoolInfo.principalName, pageWidth - 45, yPos + 8, { align: 'center' });
  }
  
  // Footer
  yPos = 275;
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This is a computer-generated certificate. Any alteration will render it invalid.',
    pageWidth / 2, yPos, { align: 'center' }
  );
  
  return doc;
}

/**
 * Generate Salary Certificate for Staff
 */
export function generateStaffSalaryCertificate(
  schoolInfo: SchoolInfo,
  data: StaffCertificateData
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPos = addSchoolHeader(doc, schoolInfo);
  
  // Certificate Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SALARY CERTIFICATE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // TO WHOM IT MAY CONCERN
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // Certificate body
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  
  const bodyText = `This is to certify that ${data.staffName.toUpperCase()} is currently employed with ` +
    `${schoolInfo.name} as ${data.designation} in the ${data.department} Department since ${formatDateIndian(data.joiningDate)}.`;
  
  const splitText = doc.splitTextToSize(bodyText, pageWidth - 50);
  doc.text(splitText, 25, yPos);
  
  yPos += splitText.length * 5 + 10;
  
  // Employee details table
  autoTable(doc, {
    startY: yPos,
    head: [['Employment Details', '']],
    body: [
      ['Employee Name', data.staffName.toUpperCase()],
      ['Employee ID', data.employeeId],
      ['Designation', data.designation],
      ['Department', data.department],
      ['Date of Joining', formatDateIndian(data.joiningDate)],
      ...(data.salary ? [['Monthly Gross Salary', `₹ ${data.salary.toLocaleString('en-IN')}`]] : []),
      ...(data.annualSalary ? [['Annual Gross Salary', `₹ ${data.annualSalary.toLocaleString('en-IN')}`]] : [])
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { 
      fillColor: COLORS.primary, 
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: COLORS.light },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 35, right: 35 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Amount in words
  if (data.annualSalary) {
    doc.setFontSize(9);
    doc.setFont('times', 'italic');
    doc.text(`(Rupees ${numberToWords(data.annualSalary)} Only per annum)`, 35, yPos);
    yPos += 8;
  }
  
  // Purpose
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`This certificate is issued on the request of the employee for ${data.purpose || 'official purposes'}.`, 25, yPos, {
    maxWidth: pageWidth - 50
  });
  
  // Signatures
  yPos = 230;
  
  doc.setFontSize(8);
  doc.text(`Date of Issue: ${formatDateIndian(data.issueDate)}`, 25, yPos);
  
  yPos += 15;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  
  // HR Manager
  doc.line(25, yPos, 65, yPos);
  doc.setFontSize(7);
  doc.text('HR Manager', 45, yPos + 4, { align: 'center' });
  
  // School Seal
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth / 2, yPos - 6, 12);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL', pageWidth / 2, yPos - 8, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, yPos - 4, { align: 'center' });
  
  // Principal
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 65, yPos, pageWidth - 25, yPos);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Principal / Director', pageWidth - 45, yPos + 4, { align: 'center' });
  
  // Footer
  yPos = 275;
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This is a computer-generated certificate. Any alteration will render it invalid.',
    pageWidth / 2, yPos, { align: 'center' }
  );
  
  return doc;
}

/**
 * Generate Experience Certificate for Staff
 */
export function generateStaffExperienceCertificate(
  schoolInfo: SchoolInfo,
  data: StaffCertificateData
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPos = addSchoolHeader(doc, schoolInfo);
  
  // Certificate Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('EXPERIENCE CERTIFICATE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // TO WHOM IT MAY CONCERN
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // Certificate body
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  
  const employmentPeriod = data.relievingDate 
    ? `from ${formatDateIndian(data.joiningDate)} to ${formatDateIndian(data.relievingDate)}`
    : `since ${formatDateIndian(data.joiningDate)}`;
  
  const bodyText = `This is to certify that ${data.staffName.toUpperCase()} was employed with ${schoolInfo.name} ` +
    `as ${data.designation} in the ${data.department} Department ${employmentPeriod}.`;
  
  const splitText = doc.splitTextToSize(bodyText, pageWidth - 50);
  doc.text(splitText, 25, yPos);
  
  yPos += splitText.length * 5 + 10;
  
  // Employee details table
  autoTable(doc, {
    startY: yPos,
    head: [['Employment Details', '']],
    body: [
      ['Employee Name', data.staffName.toUpperCase()],
      ['Employee ID', data.employeeId],
      ['Designation', data.designation],
      ['Department', data.department],
      ['Date of Joining', formatDateIndian(data.joiningDate)],
      ...(data.relievingDate ? [['Date of Relieving', formatDateIndian(data.relievingDate)]] : []),
      ['Conduct & Character', (data.conduct || 'Good').toUpperCase()]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { 
      fillColor: COLORS.primary, 
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: COLORS.light },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 35, right: 35 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Responsibilities if provided
  if (data.responsibilities && data.responsibilities.length > 0) {
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('Key Responsibilities:', 25, yPos);
    yPos += 5;
    
    data.responsibilities.forEach((resp, index) => {
      doc.text(`• ${resp}`, 30, yPos);
      yPos += 4;
    });
    yPos += 5;
  }
  
  // Closing remarks
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  const closingText = `During the tenure, ${data.staffName.split(' ')[0]} demonstrated excellent professional skills ` +
    `and dedication. We wish all the best in future endeavors.`;
  const closingSplit = doc.splitTextToSize(closingText, pageWidth - 50);
  doc.text(closingSplit, 25, yPos);
  
  // Signatures
  yPos = 230;
  
  doc.setFontSize(8);
  doc.text(`Date of Issue: ${formatDateIndian(data.issueDate)}`, 25, yPos);
  
  yPos += 15;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  
  // HR Manager
  doc.line(25, yPos, 65, yPos);
  doc.setFontSize(7);
  doc.text('HR Manager', 45, yPos + 4, { align: 'center' });
  
  // School Seal
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth / 2, yPos - 6, 12);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL', pageWidth / 2, yPos - 8, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, yPos - 4, { align: 'center' });
  
  // Principal
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 65, yPos, pageWidth - 25, yPos);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Principal / Director', pageWidth - 45, yPos + 4, { align: 'center' });
  
  // Footer
  yPos = 275;
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This is a computer-generated certificate. Any alteration will render it invalid.',
    pageWidth / 2, yPos, { align: 'center' }
  );
  
  return doc;
}
