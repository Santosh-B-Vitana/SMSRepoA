/**
 * Industry-Grade ID Card Generator
 * CR80 Standard (ISO/IEC 7810 ID-1): 85.6mm x 53.98mm
 * Follows standard school ID card formats
 */

import jsPDF from 'jspdf';
import { CR80_DIMENSIONS } from './industryGradePrintUtils';

export interface StudentIdData {
  name: string;
  class: string;
  section: string;
  rollNo: string;
  admissionNo: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  photoUrl?: string;
  validUntil: string;
}

export interface StaffIdData {
  name: string;
  designation: string;
  department: string;
  employeeId: string;
  dateOfJoining: string;
  bloodGroup: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  photoUrl?: string;
  validUntil: string;
}

export interface SchoolIdInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  academicYear: string;
}

const ID_COLORS = {
  primary: [0, 51, 102] as [number, number, number],      // Navy Blue
  secondary: [255, 255, 255] as [number, number, number], // White
  accent: [220, 53, 69] as [number, number, number],      // Red
  text: [33, 33, 33] as [number, number, number],         // Dark Gray
  lightBg: [240, 248, 255] as [number, number, number]    // Alice Blue
};

/**
 * Generate Student ID Card PDF (CR80 Standard)
 */
export function generateStudentIdCard(
  schoolInfo: SchoolIdInfo,
  studentData: StudentIdData
): jsPDF {
  // Create PDF with CR80 dimensions in landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CR80_DIMENSIONS.widthMm, CR80_DIMENSIONS.heightMm]
  });
  
  const cardWidth = CR80_DIMENSIONS.widthMm;
  const cardHeight = CR80_DIMENSIONS.heightMm;
  
  // === FRONT SIDE ===
  
  // Background gradient effect
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, 0, cardWidth, 14, 'F');
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name.toUpperCase(), cardWidth / 2, 5, { align: 'center' });
  
  // School address
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.address, cardWidth / 2, 9, { align: 'center' });
  
  // Academic year badge
  doc.setFontSize(4);
  doc.text(schoolInfo.academicYear, cardWidth / 2, 12, { align: 'center' });
  
  // Photo placeholder
  const photoX = 4;
  const photoY = 17;
  const photoWidth = 18;
  const photoHeight = 22;
  
  doc.setFillColor(...ID_COLORS.lightBg);
  doc.setDrawColor(...ID_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoWidth, photoHeight, 'FD');
  
  if (!studentData.photoUrl) {
    doc.setFontSize(4);
    doc.setTextColor(...ID_COLORS.text);
    doc.text('PHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
  }
  
  // Student details
  const detailsX = photoX + photoWidth + 3;
  let detailsY = 18;
  
  doc.setTextColor(...ID_COLORS.text);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text(studentData.name.toUpperCase(), detailsX, detailsY);
  
  detailsY += 4;
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    `Class: ${studentData.class}-${studentData.section}`,
    `Roll No: ${studentData.rollNo}`,
    `Adm. No: ${studentData.admissionNo}`,
    `DOB: ${studentData.dateOfBirth}`,
    `Blood: ${studentData.bloodGroup}`
  ];
  
  details.forEach(detail => {
    doc.text(detail, detailsX, detailsY);
    detailsY += 3;
  });
  
  // QR code placeholder
  const qrSize = 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...ID_COLORS.text);
  doc.setLineWidth(0.2);
  doc.rect(cardWidth - qrSize - 3, 17, qrSize, qrSize, 'FD');
  doc.setFontSize(3);
  doc.text('QR', cardWidth - qrSize / 2 - 3, 22, { align: 'center' });
  
  // Footer with validity
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, cardHeight - 7, cardWidth, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4);
  doc.text(`Valid Until: ${studentData.validUntil}`, 4, cardHeight - 3);
  doc.text(`ID: STU${studentData.admissionNo}`, cardWidth - 4, cardHeight - 3, { align: 'right' });
  
  // === BACK SIDE ===
  doc.addPage([CR80_DIMENSIONS.widthMm, CR80_DIMENSIONS.heightMm], 'landscape');
  
  // Header
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, 0, cardWidth, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('EMERGENCY CONTACT & INSTRUCTIONS', cardWidth / 2, 5, { align: 'center' });
  
  // Parent/Guardian details
  let backY = 12;
  doc.setTextColor(...ID_COLORS.text);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Parent/Guardian:', 4, backY);
  
  doc.setFont('helvetica', 'normal');
  backY += 3;
  doc.text(studentData.guardianName, 4, backY);
  
  backY += 3;
  doc.text(`Phone: ${studentData.guardianPhone}`, 4, backY);
  
  backY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Address:', 4, backY);
  doc.setFont('helvetica', 'normal');
  backY += 3;
  
  const addressLines = doc.splitTextToSize(studentData.address, cardWidth - 10);
  addressLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, 4, backY);
    backY += 2.5;
  });
  
  // Instructions
  backY += 2;
  doc.setFontSize(3.5);
  doc.setFont('helvetica', 'italic');
  const instructions = [
    '• This card must be carried at all times on school premises',
    '• Loss of card must be reported immediately',
    '• Card is non-transferable'
  ];
  
  instructions.forEach(inst => {
    doc.text(inst, 4, backY);
    backY += 2.5;
  });
  
  // Footer
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, cardHeight - 7, cardWidth, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(3.5);
  doc.text(schoolInfo.phone, 4, cardHeight - 3);
  doc.text(schoolInfo.website || schoolInfo.email, cardWidth - 4, cardHeight - 3, { align: 'right' });
  
  return doc;
}

/**
 * Generate Staff ID Card PDF (CR80 Standard)
 */
export function generateStaffIdCard(
  schoolInfo: SchoolIdInfo,
  staffData: StaffIdData
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CR80_DIMENSIONS.widthMm, CR80_DIMENSIONS.heightMm]
  });
  
  const cardWidth = CR80_DIMENSIONS.widthMm;
  const cardHeight = CR80_DIMENSIONS.heightMm;
  
  // === FRONT SIDE ===
  
  // Header with school branding
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, 0, cardWidth, 14, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name.toUpperCase(), cardWidth / 2, 5, { align: 'center' });
  
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolInfo.address, cardWidth / 2, 9, { align: 'center' });
  
  // Staff badge
  doc.setFillColor(...ID_COLORS.accent);
  doc.roundedRect(cardWidth / 2 - 8, 10, 16, 4, 1, 1, 'F');
  doc.setFontSize(4);
  doc.setFont('helvetica', 'bold');
  doc.text('STAFF', cardWidth / 2, 12.5, { align: 'center' });
  
  // Photo placeholder
  const photoX = 4;
  const photoY = 17;
  const photoWidth = 18;
  const photoHeight = 22;
  
  doc.setFillColor(...ID_COLORS.lightBg);
  doc.setDrawColor(...ID_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoWidth, photoHeight, 'FD');
  
  if (!staffData.photoUrl) {
    doc.setFontSize(4);
    doc.setTextColor(...ID_COLORS.text);
    doc.text('PHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
  }
  
  // Staff details
  const detailsX = photoX + photoWidth + 3;
  let detailsY = 18;
  
  doc.setTextColor(...ID_COLORS.text);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text(staffData.name.toUpperCase(), detailsX, detailsY);
  
  detailsY += 4;
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    staffData.designation,
    `Dept: ${staffData.department}`,
    `ID: ${staffData.employeeId}`,
    `Blood: ${staffData.bloodGroup}`
  ];
  
  details.forEach(detail => {
    doc.text(detail, detailsX, detailsY);
    detailsY += 3;
  });
  
  // QR code placeholder
  const qrSize = 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...ID_COLORS.text);
  doc.setLineWidth(0.2);
  doc.rect(cardWidth - qrSize - 3, 17, qrSize, qrSize, 'FD');
  doc.setFontSize(3);
  doc.text('QR', cardWidth - qrSize / 2 - 3, 22, { align: 'center' });
  
  // Footer with validity
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, cardHeight - 7, cardWidth, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4);
  doc.text(`Valid Until: ${staffData.validUntil}`, 4, cardHeight - 3);
  doc.text(`EMP${staffData.employeeId}`, cardWidth - 4, cardHeight - 3, { align: 'right' });
  
  // === BACK SIDE ===
  doc.addPage([CR80_DIMENSIONS.widthMm, CR80_DIMENSIONS.heightMm], 'landscape');
  
  // Header
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, 0, cardWidth, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTACT INFORMATION', cardWidth / 2, 5, { align: 'center' });
  
  // Contact details
  let backY = 12;
  doc.setTextColor(...ID_COLORS.text);
  doc.setFontSize(4.5);
  
  const contactInfo = [
    `Phone: ${staffData.phone}`,
    `Email: ${staffData.email}`,
    `Emergency: ${staffData.emergencyContact}`
  ];
  
  contactInfo.forEach(info => {
    doc.text(info, 4, backY);
    backY += 3;
  });
  
  backY += 1;
  doc.setFont('helvetica', 'bold');
  doc.text('Address:', 4, backY);
  doc.setFont('helvetica', 'normal');
  backY += 3;
  
  const addressLines = doc.splitTextToSize(staffData.address, cardWidth - 10);
  addressLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, 4, backY);
    backY += 2.5;
  });
  
  // Instructions
  backY += 2;
  doc.setFontSize(3.5);
  doc.setFont('helvetica', 'italic');
  const instructions = [
    '• This card must be carried at all times',
    '• Loss must be reported to HR immediately',
    '• Card is non-transferable'
  ];
  
  instructions.forEach(inst => {
    doc.text(inst, 4, backY);
    backY += 2.5;
  });
  
  // Footer
  doc.setFillColor(...ID_COLORS.primary);
  doc.rect(0, cardHeight - 7, cardWidth, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(3.5);
  doc.text(schoolInfo.phone, 4, cardHeight - 3);
  doc.text(schoolInfo.website || schoolInfo.email, cardWidth - 4, cardHeight - 3, { align: 'right' });
  
  return doc;
}

/**
 * Generate multiple ID cards for batch printing (4 cards per A4 page)
 */
export function generateBatchIdCards(
  schoolInfo: SchoolIdInfo,
  cards: Array<{ type: 'student' | 'staff'; data: StudentIdData | StaffIdData }>
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // CR80 card dimensions
  const cardWidth = CR80_DIMENSIONS.widthMm;
  const cardHeight = CR80_DIMENSIONS.heightMm;
  
  // Calculate positions for 2x4 grid (2 columns, 4 rows)
  const marginX = (pageWidth - cardWidth * 2 - 10) / 2;
  const marginY = 15;
  const gapX = 10;
  const gapY = 8;
  
  let cardIndex = 0;
  
  cards.forEach((card, index) => {
    const col = cardIndex % 2;
    const row = Math.floor(cardIndex / 2) % 4;
    
    if (cardIndex > 0 && cardIndex % 8 === 0) {
      doc.addPage();
    }
    
    const x = marginX + col * (cardWidth + gapX);
    const y = marginY + row * (cardHeight + gapY);
    
    // Draw card border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
    
    // Draw card content (simplified for batch)
    doc.setFillColor(0, 51, 102);
    doc.rect(x, y, cardWidth, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolInfo.name, x + cardWidth / 2, y + 4, { align: 'center' });
    
    doc.setFontSize(3);
    doc.setFont('helvetica', 'normal');
    doc.text(schoolInfo.academicYear, x + cardWidth / 2, y + 8, { align: 'center' });
    
    // Person details
    doc.setTextColor(33, 33, 33);
    const personData = card.data;
    
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(personData.name.toUpperCase(), x + 4, y + 16);
    
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    
    if (card.type === 'student') {
      const student = personData as StudentIdData;
      doc.text(`Class: ${student.class}-${student.section}`, x + 4, y + 20);
      doc.text(`Roll: ${student.rollNo}`, x + 4, y + 24);
    } else {
      const staff = personData as StaffIdData;
      doc.text(staff.designation, x + 4, y + 20);
      doc.text(`ID: ${staff.employeeId}`, x + 4, y + 24);
    }
    
    // Photo placeholder
    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(0, 51, 102);
    doc.rect(x + cardWidth - 18, y + 12, 14, 17, 'FD');
    doc.setFontSize(3);
    doc.text('PHOTO', x + cardWidth - 11, y + 21, { align: 'center' });
    
    // Footer
    doc.setFillColor(0, 51, 102);
    doc.rect(x, y + cardHeight - 6, cardWidth, 6, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(3);
    doc.text(`Valid: ${personData.validUntil}`, x + 2, y + cardHeight - 2);
    
    cardIndex++;
  });
  
  return doc;
}
