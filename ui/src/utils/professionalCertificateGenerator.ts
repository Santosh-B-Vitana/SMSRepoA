import jsPDF from 'jspdf';

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

// Professional color scheme
const COLORS = {
  primary: [41, 98, 255] as [number, number, number],
  secondary: [76, 175, 80] as [number, number, number],
  accent: [255, 152, 0] as [number, number, number],
  dark: [33, 33, 33] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
};

/**
 * Adds professional certificate border decoration
 */
const addCertificateBorder = (doc: jsPDF): void => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Outer border
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  // Inner border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Corner decorations
  const cornerSize = 15;
  doc.setFillColor(...COLORS.accent);
  
  // Top-left
  doc.circle(15, 15, 3, 'F');
  // Top-right
  doc.circle(pageWidth - 15, 15, 3, 'F');
  // Bottom-left
  doc.circle(15, pageHeight - 15, 3, 'F');
  // Bottom-right
  doc.circle(pageWidth - 15, pageHeight - 15, 3, 'F');
};

/**
 * Adds compact school header for certificate
 */
const addCertificateHeader = (doc: jsPDF, schoolInfo: SchoolInfo): number => {
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 25;
  
  // School Name - Compact
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
  
  // School Details - Compact
  yPosition += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.text(`Tel: ${schoolInfo.phone} | Email: ${schoolInfo.email}`, pageWidth / 2, yPosition, { align: 'center' });
  
  if (schoolInfo.affiliationNo) {
    yPosition += 4;
    doc.text(`Affiliation No: ${schoolInfo.affiliationNo}`, pageWidth / 2, yPosition, { align: 'center' });
  }
  
  // Decorative line - Compact
  yPosition += 6;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(30, yPosition, pageWidth - 30, yPosition);
  
  return yPosition + 10;
};

/**
 * Adds compact certificate footer with seal and signatures
 */
const addCertificateFooter = (
  doc: jsPDF, 
  schoolInfo: SchoolInfo,
  issueDate: string
): void => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = pageHeight - 45;
  
  // Issue date - Compact
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Issue: ${issueDate}`, 30, yPosition);
  
  // Signatures - Compact
  yPosition += 12;
  doc.setLineWidth(0.3);
  doc.setDrawColor(...COLORS.border);
  
  // Principal signature
  doc.line(30, yPosition, 80, yPosition);
  doc.setFontSize(7);
  doc.text('Principal', 55, yPosition + 3, { align: 'center' });
  if (schoolInfo.principalName) {
    doc.setFont('helvetica', 'italic');
    doc.text(schoolInfo.principalName, 55, yPosition + 7, { align: 'center' });
  }
  
  // School seal (circle) - Compact
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.circle(pageWidth / 2, yPosition - 3, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL', pageWidth / 2, yPosition - 5, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, yPosition - 1, { align: 'center' });
  
  // Authorized signatory - Compact
  doc.setLineWidth(0.3);
  doc.setDrawColor(...COLORS.border);
  doc.line(pageWidth - 80, yPosition, pageWidth - 30, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', pageWidth - 55, yPosition + 3, { align: 'center' });
  
  // Footer note - Compact
  yPosition += 14;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This is a computer-generated certificate and is valid without signature.',
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
};

/**
 * Generate Bonafide Certificate
 */
export const generateBonafideCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    studentName: string;
    fatherName: string;
    class: string;
    section: string;
    studentId: string;
    academicYear: string;
    purpose: string;
    issueDate: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);
  
  // Certificate title - Compact
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('BONAFIDE CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Certificate body - Compact
  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const bodyText = [
    `This is to certify that ${data.studentName}, son/daughter of ${data.fatherName},`,
    `is a bonafide student of this institution, studying in Class ${data.class}-${data.section}`,
    `during the academic year ${data.academicYear}.`,
    '',
    `Student ID: ${data.studentId}`,
    '',
    `This certificate is issued on the request of the student for the purpose of`,
    `${data.purpose}.`,
    '',
    `The particulars furnished above are correct to the best of my knowledge and belief.`
  ];
  
  bodyText.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 60 });
    yPosition += 6;
  });
  
  addCertificateFooter(doc, schoolInfo, data.issueDate);
  
  return doc.output('dataurlstring');
};

/**
 * Generate Transfer Certificate
 */
export const generateTransferCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    studentName: string;
    fatherName: string;
    motherName: string;
    nationality: string;
    class: string;
    dateOfBirth: string;
    admissionDate: string;
    dateOfLeaving: string;
    classAtLeaving: string;
    conduct: string;
    reasonForLeaving: string;
    issueDate: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);
  
  // Certificate title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TRANSFER CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`TC No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Certificate details in table format
  yPosition += 15;
  doc.setFontSize(11);
  
  const details = [
    ['Student Name', data.studentName],
    ["Father's Name", data.fatherName],
    ["Mother's Name", data.motherName],
    ['Nationality', data.nationality],
    ['Date of Birth', data.dateOfBirth],
    ['Class at Admission', data.class],
    ['Date of Admission', data.admissionDate],
    ['Class at Leaving', data.classAtLeaving],
    ['Date of Leaving', data.dateOfLeaving],
    ['Conduct & Character', data.conduct],
    ['Reason for Leaving', data.reasonForLeaving]
  ];
  
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 30, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 90, yPosition);
    yPosition += 8;
  });
  
  addCertificateFooter(doc, schoolInfo, data.issueDate);
  
  return doc.output('dataurlstring');
};

/**
 * Generate Conduct Certificate
 */
export const generateConductCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    studentName: string;
    fatherName: string;
    class: string;
    academicYear: string;
    conduct: string;
    issueDate: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);
  
  // Certificate title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('CONDUCT CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Certificate body
  yPosition += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const bodyText = [
    `This is to certify that ${data.studentName}, son/daughter of ${data.fatherName},`,
    `was a student of this institution in Class ${data.class} during the academic year`,
    `${data.academicYear}.`,
    '',
    `During his/her stay in this institution, his/her conduct and character were found to be`,
    `${data.conduct.toUpperCase()}.`,
    '',
    `This certificate is issued on the request of the student.`
  ];
  
  bodyText.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 60 });
    yPosition += 7;
  });
  
  addCertificateFooter(doc, schoolInfo, data.issueDate);
  
  return doc.output('dataurlstring');
};

/**
 * Generate Experience Certificate (for staff)
 */
export const generateExperienceCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    staffName: string;
    designation: string;
    department: string;
    joiningDate: string;
    relievingDate: string;
    conduct: string;
    issueDate: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);
  
  // Certificate title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('EXPERIENCE CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Certificate body
  yPosition += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const bodyText = [
    `This is to certify that ${data.staffName} worked with ${schoolInfo.name}`,
    `as ${data.designation} in the ${data.department} department`,
    `from ${data.joiningDate} to ${data.relievingDate}.`,
    '',
    `During the tenure with us, ${data.staffName.split(' ')[0]} demonstrated excellent`,
    `professional skills and dedication. His/Her conduct was ${data.conduct}.`,
    '',
    `We wish ${data.staffName.split(' ')[0]} all the best in future endeavors.`
  ];
  
  bodyText.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 60 });
    yPosition += 7;
  });
  
  addCertificateFooter(doc, schoolInfo, data.issueDate);
  
  return doc.output('dataurlstring');
};

/**
 * Generate Salary Certificate (for staff)
 */
export const generateSalaryCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    staffName: string;
    designation: string;
    department: string;
    monthlySalary: number;
    annualSalary: number;
    purpose: string;
    issueDate: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);
  
  // Certificate title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SALARY CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Certificate body
  yPosition += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const bodyText = [
    `This is to certify that ${data.staffName} is currently employed with`,
    `${schoolInfo.name} as ${data.designation} in the ${data.department} department.`,
    '',
    `Current Compensation Details:`,
    `Monthly Gross Salary: ₹ ${data.monthlySalary.toLocaleString('en-IN')}`,
    `Annual Gross Salary: ₹ ${data.annualSalary.toLocaleString('en-IN')}`,
    '',
    `This certificate is issued on the request of the employee for ${data.purpose}.`
  ];
  
  bodyText.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 60 });
    yPosition += 7;
  });
  
  addCertificateFooter(doc, schoolInfo, data.issueDate);
  
  return doc.output('dataurlstring');
};
