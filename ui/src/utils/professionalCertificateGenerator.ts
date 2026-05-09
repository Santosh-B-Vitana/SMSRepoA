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
    motherName?: string;
    class: string;
    section: string;
    studentId: string;          // admissionNumber
    rollNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    religion?: string;
    category?: string;
    caste?: string;
    bloodGroup?: string;
    academicYear: string;
    purpose: string;
    issueDate: string;
    principalName?: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);

  // Certificate title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('BONAFIDE CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Certificate No: ${data.certificateNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;
  doc.setFontSize(10);

  const bodyLine1 = `This is to certify that ${data.studentName}, ` +
    `Son/Daughter of ${data.fatherName}` +
    (data.motherName ? ` and ${data.motherName}` : '') +
    `, is a bonafide student of this institution.`;

  const wrapped1 = doc.splitTextToSize(bodyLine1, pageWidth - 60);
  doc.text(wrapped1, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += wrapped1.length * 6 + 4;

  // Student details table
  const leftX = 30;
  const midX  = pageWidth / 2 + 5;
  const colW  = pageWidth / 2 - 35;
  const rowH  = 7;

  const tableRows: [string, string, string, string][] = [
    ['Admission No', data.studentId,     'Academic Year', data.academicYear],
    ['Class / Sec.',  `${data.class}${data.section ? ' – ' + data.section : ''}`, 'Roll No.', data.rollNumber ?? '—'],
  ];
  if (data.dateOfBirth)
    tableRows.push(['Date of Birth', data.dateOfBirth, 'Nationality', data.nationality ?? 'Indian']);
  if (data.religion || data.category)
    tableRows.push(['Religion', data.religion ?? '—', 'Category', data.category ?? (data.caste ?? '—')]);
  if (data.bloodGroup)
    tableRows.push(['Blood Group', data.bloodGroup, 'Purpose', data.purpose]);

  tableRows.forEach((row, i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [240, 245, 255] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(leftX, yPosition - 4, pageWidth - 60, rowH, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.rect(leftX, yPosition - 4, pageWidth - 60, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(row[0] + ':', leftX + 2, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], leftX + 30, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text(row[2] + ':', midX, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(row[3], midX + 28, yPosition);
    yPosition += rowH;
  });

  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const line2 = `He/She bears a good moral character and is regular in attendance. This certificate is issued ` +
    `on his/her request for the purpose of ${data.purpose}.`;
  const wrapped2 = doc.splitTextToSize(line2, pageWidth - 60);
  doc.text(wrapped2, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += wrapped2.length * 6 + 4;

  doc.text('We wish him/her all success in his/her future endeavours.', pageWidth / 2, yPosition, { align: 'center' });

  const principal = data.principalName ?? schoolInfo.principalName;
  addCertificateFooter(doc, { ...schoolInfo, principalName: principal ?? schoolInfo.principalName }, data.issueDate);

  return doc.output('dataurlstring');
};

/**
 * Generate Transfer Certificate — full Indian mandatory fields
 */
export const generateTransferCertificate = (
  schoolInfo: SchoolInfo,
  data: {
    certificateNumber: string;
    studentName: string;
    fatherName: string;
    motherName?: string;
    nationality?: string;
    religion?: string;
    category?: string;
    caste?: string;
    class: string;
    section?: string;
    dateOfBirth: string;
    admissionDate: string;
    classAtAdmission?: string;
    academicYear: string;
    dateOfLeaving: string;
    classAtLeaving: string;
    workingDays?: number;
    presentDays?: number;
    lastAnnualExamResult?: string;
    qualifiedForPromotion?: boolean;
    qualifiedToClass?: string;
    failedInLastClass?: boolean;
    detainedInSameClass?: boolean;
    feesDueCleared?: boolean;
    ncc?: string;
    scouts?: string;
    sports?: string;
    games?: string;
    conduct: string;
    reasonForLeaving: string;
    additionalRemarks?: string;
    issueDate: string;
    principalName?: string;
    admissionNumber?: string;
  }
): string => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  addCertificateBorder(doc);
  let yPosition = addCertificateHeader(doc, schoolInfo);

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TRANSFER CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`TC No: ${data.certificateNumber}     Date of Issue: ${data.issueDate}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;

  const att = (data.workingDays && data.presentDays)
    ? `${data.presentDays} / ${data.workingDays}`
    : '—';

  const promoText =
    data.qualifiedForPromotion === undefined ? '—' :
    data.qualifiedForPromotion ? `Yes — to ${data.qualifiedToClass ?? 'next class'}` : 'No';

  const details: [string, string][] = [
    ['1. Name of Student',            data.studentName],
    ["2. Father's Name",              data.fatherName],
    ["3. Mother's Name",              data.motherName ?? '—'],
    ['4. Nationality',                data.nationality ?? 'Indian'],
    ['5. Religion',                   data.religion ?? '—'],
    ['6. Category / Caste',           data.category ? `${data.category}${data.caste ? ' / ' + data.caste : ''}` : '—'],
    ['7. Date of Birth',              data.dateOfBirth],
    ['8. Admission No.',              data.admissionNumber ?? '—'],
    ['9. Class at Admission',         data.classAtAdmission ?? '—'],
    ['10. Date of Admission',         data.admissionDate],
    ['11. Academic Year',             data.academicYear],
    ['12. Class at Leaving',          `${data.classAtLeaving}${data.section ? ' – ' + data.section : ''}`],
    ['13. Date of Leaving',           data.dateOfLeaving],
    ['14. Reason for Leaving',        data.reasonForLeaving],
    ['15. Attendance (Present/Total)', att],
    ['16. Failed in any class?',      data.failedInLastClass ? 'Yes' : 'No'],
    ['17. Last Annual Exam Result',   data.lastAnnualExamResult ?? '—'],
    ['18. Qualified for promotion?',  promoText],
    ['19. Detained in same class?',   data.detainedInSameClass ? 'Yes' : 'No'],
    ['20. NCC / NSS',                 data.ncc ?? '—'],
    ['21. Scouts / Guides',           data.scouts ?? '—'],
    ['22. Games / Sports',            data.sports ?? data.games ?? '—'],
    ['23. Fees / Dues cleared?',      data.feesDueCleared === undefined ? '—' : data.feesDueCleared ? 'Yes' : 'No'],
    ['24. Character & Conduct',       data.conduct],
  ];
  if (data.additionalRemarks)
    details.push(['25. Remarks', data.additionalRemarks]);

  const leftX = 25;
  const valX  = 115;
  const rowH  = 6.5;

  details.forEach(([label, value], i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [245, 248, 255] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(leftX, yPosition - 4, pageWidth - 50, rowH, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.rect(leftX, yPosition - 4, pageWidth - 50, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, leftX + 2, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, valX, yPosition);
    yPosition += rowH;
  });

  yPosition += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const certLine = 'Certified that the above particulars have been verified from school records and are correct.';
  const wrappedCert = doc.splitTextToSize(certLine, pageWidth - 60);
  doc.text(wrappedCert, pageWidth / 2, yPosition, { align: 'center' });

  const principal = data.principalName ?? schoolInfo.principalName;
  addCertificateFooter(doc, { ...schoolInfo, principalName: principal ?? schoolInfo.principalName }, data.issueDate);

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
