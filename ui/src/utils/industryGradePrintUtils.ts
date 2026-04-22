/**
 * Industry-Grade Print Utilities
 * Follows CBSE/ICSE/State Board regulations for document printing
 * Ensures single-page output for certificates and proper pagination for multi-page documents
 */

// A4 Paper dimensions in mm
export const A4_DIMENSIONS = {
  width: 210,
  height: 297,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 15,
  marginRight: 15,
  printableWidth: 180,
  printableHeight: 277
};

// CR80 ID Card Standard (ISO/IEC 7810 ID-1)
export const CR80_DIMENSIONS = {
  widthMm: 85.6,
  heightMm: 53.98,
  widthPx: 324, // 3.375" x 96 dpi
  heightPx: 204, // 2.125" x 96 dpi
  cornerRadiusMm: 3.18
};

// CBSE/ICSE Grading Scales
export const CBSE_GRADING_SCALE = [
  { grade: 'A1', minMarks: 91, maxMarks: 100, gradePoint: 10, description: 'Outstanding' },
  { grade: 'A2', minMarks: 81, maxMarks: 90, gradePoint: 9, description: 'Excellent' },
  { grade: 'B1', minMarks: 71, maxMarks: 80, gradePoint: 8, description: 'Very Good' },
  { grade: 'B2', minMarks: 61, maxMarks: 70, gradePoint: 7, description: 'Good' },
  { grade: 'C1', minMarks: 51, maxMarks: 60, gradePoint: 6, description: 'Above Average' },
  { grade: 'C2', minMarks: 41, maxMarks: 50, gradePoint: 5, description: 'Average' },
  { grade: 'D', minMarks: 33, maxMarks: 40, gradePoint: 4, description: 'Below Average' },
  { grade: 'E1', minMarks: 21, maxMarks: 32, gradePoint: 3, description: 'Needs Improvement' },
  { grade: 'E2', minMarks: 0, maxMarks: 20, gradePoint: 2, description: 'Unsatisfactory' }
];

export const ICSE_GRADING_SCALE = [
  { grade: 'A1', minMarks: 95, maxMarks: 100, description: 'Distinction' },
  { grade: 'A2', minMarks: 90, maxMarks: 94, description: 'Distinction' },
  { grade: 'B1', minMarks: 85, maxMarks: 89, description: 'First Class' },
  { grade: 'B2', minMarks: 80, maxMarks: 84, description: 'First Class' },
  { grade: 'C1', minMarks: 70, maxMarks: 79, description: 'Second Class' },
  { grade: 'C2', minMarks: 60, maxMarks: 69, description: 'Second Class' },
  { grade: 'D1', minMarks: 50, maxMarks: 59, description: 'Pass' },
  { grade: 'D2', minMarks: 40, maxMarks: 49, description: 'Pass' },
  { grade: 'E', minMarks: 33, maxMarks: 39, description: 'Eligible for Compartment' },
  { grade: 'F', minMarks: 0, maxMarks: 32, description: 'Fail' }
];

// CCE (Continuous and Comprehensive Evaluation) Grade Points
export const CCE_GRADE_POINTS = [
  { grade: 'A1', gradePoint: 10.0 },
  { grade: 'A2', gradePoint: 9.0 },
  { grade: 'B1', gradePoint: 8.0 },
  { grade: 'B2', gradePoint: 7.0 },
  { grade: 'C1', gradePoint: 6.0 },
  { grade: 'C2', gradePoint: 5.0 },
  { grade: 'D', gradePoint: 4.0 },
  { grade: 'E1', gradePoint: 3.0 },
  { grade: 'E2', gradePoint: 2.0 }
];

// Calculate grade from percentage
export function getGradeFromPercentage(percentage: number, board: 'CBSE' | 'ICSE' = 'CBSE'): string {
  const scale = board === 'CBSE' ? CBSE_GRADING_SCALE : ICSE_GRADING_SCALE;
  for (const gradeInfo of scale) {
    if (percentage >= gradeInfo.minMarks && percentage <= gradeInfo.maxMarks) {
      return gradeInfo.grade;
    }
  }
  return 'F';
}

// Calculate CGPA from grade points
export function calculateCGPA(gradePoints: number[]): number {
  if (gradePoints.length === 0) return 0;
  const sum = gradePoints.reduce((acc, gp) => acc + gp, 0);
  return Math.round((sum / gradePoints.length) * 100) / 100;
}

// Print configuration for single-page documents
export const SINGLE_PAGE_PRINT_CONFIG = `
  @page {
    size: A4 portrait;
    margin: 10mm 15mm 10mm 15mm;
  }
  
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
    }
    
    .print-container {
      width: 180mm;
      max-height: 277mm;
      overflow: hidden;
      page-break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
    }
    
    .no-print {
      display: none !important;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  }
`;

// Print configuration for ID cards (multiple per page)
export const ID_CARD_PRINT_CONFIG = `
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  
  @media print {
    .id-card-grid {
      display: grid;
      grid-template-columns: repeat(2, 85.6mm);
      grid-auto-rows: 53.98mm;
      gap: 5mm;
      justify-content: center;
    }
    
    .id-card {
      width: 85.6mm;
      height: 53.98mm;
      border-radius: 3.18mm;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .no-print {
      display: none !important;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

// Print configuration for report cards
export const REPORT_CARD_PRINT_CONFIG = `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }
  
  @media print {
    html, body {
      font-size: 10pt;
      line-height: 1.3;
    }
    
    .report-card {
      width: 180mm;
      max-height: 273mm;
      page-break-inside: avoid;
    }
    
    table {
      font-size: 9pt;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 2mm;
    }
    
    .no-print {
      display: none !important;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

// CBSE Transfer Certificate mandatory fields (as per CBSE norms)
export const TC_MANDATORY_FIELDS = [
  'Serial No. of Admission Register',
  'Name of the Pupil',
  "Father's Name",
  "Mother's Name",
  'Nationality',
  'Whether belonging to SC/ST/OBC',
  'Date of Birth as per Admission Register',
  'Date of Birth in Words',
  'Class in which first admitted and date',
  'Class in which studying and since when',
  'Whether qualified for promotion to higher class',
  'Month and Year of leaving school',
  'Reason for leaving school',
  'Whether school leaving certificate has been issued before',
  'Number and date of last TC if any',
  'School/Board Examination last taken',
  'Whether failed, if so details',
  'Total working days in the academic session',
  'Total number of days present',
  'Whether NCC/Scout/Guide/JRC',
  'Games played or extra-curricular activities',
  'General Conduct',
  'Date of issue',
  'Signature of Principal with date and seal'
];

// State Board specific fields
export const STATE_BOARD_TC_FIELDS = {
  'UP': ['Caste Certificate Number', 'Income Certificate Number'],
  'MP': ['Samagra ID'],
  'Maharashtra': ['Caste Validity Certificate'],
  'Karnataka': ['SATS ID'],
  'Tamil Nadu': ['EMIS Number']
};

// Document types and their configurations
export const DOCUMENT_CONFIGS = {
  transferCertificate: {
    orientation: 'portrait' as const,
    pageSize: 'A4',
    margins: { top: 15, bottom: 15, left: 20, right: 20 },
    headerHeight: 40,
    footerHeight: 30
  },
  bonafideCertificate: {
    orientation: 'portrait' as const,
    pageSize: 'A4',
    margins: { top: 20, bottom: 20, left: 25, right: 25 },
    headerHeight: 35,
    footerHeight: 25
  },
  reportCard: {
    orientation: 'portrait' as const,
    pageSize: 'A4',
    margins: { top: 12, bottom: 12, left: 15, right: 15 },
    headerHeight: 45,
    footerHeight: 20
  },
  idCard: {
    orientation: 'landscape' as const,
    pageSize: 'CR80',
    margins: { top: 3, bottom: 3, left: 3, right: 3 },
    headerHeight: 12,
    footerHeight: 8
  },
  salaryCertificate: {
    orientation: 'portrait' as const,
    pageSize: 'A4',
    margins: { top: 20, bottom: 20, left: 25, right: 25 },
    headerHeight: 35,
    footerHeight: 25
  },
  experienceCertificate: {
    orientation: 'portrait' as const,
    pageSize: 'A4',
    margins: { top: 20, bottom: 20, left: 25, right: 25 },
    headerHeight: 35,
    footerHeight: 25
  }
};

/**
 * Open print dialog with optimized settings
 */
export function printWithConfig(
  content: string,
  config: {
    title?: string;
    styles?: string;
    orientation?: 'portrait' | 'landscape';
    singlePage?: boolean;
  } = {}
): void {
  const { title = 'Print Document', styles = '', orientation = 'portrait', singlePage = true } = config;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window. Please check popup blocker settings.');
    return;
  }

  const pageStyles = singlePage ? SINGLE_PAGE_PRINT_CONFIG : '';
  const orientationStyle = `@page { size: A4 ${orientation}; }`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${orientationStyle}
          ${pageStyles}
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          .print-wrapper {
            padding: 10mm 15mm;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            border: 1px solid #333;
            padding: 4pt 6pt;
            text-align: left;
            vertical-align: top;
          }
          
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          ${styles}
        </style>
      </head>
      <body>
        <div class="print-wrapper print-container">
          ${content}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

/**
 * Print multiple ID cards on a single page
 */
export function printIdCards(cards: string[], cardsPerPage: number = 8): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const cardHtml = cards.map(card => `
    <div class="id-card">
      ${card}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ID Cards</title>
        <style>
          ${ID_CARD_PRINT_CONFIG}
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          
          .id-card-grid {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-auto-rows: 53.98mm;
            gap: 5mm;
            padding: 10mm;
            justify-content: center;
          }
          
          .id-card {
            width: 85.6mm;
            height: 53.98mm;
            border: 1px solid #000;
            border-radius: 3.18mm;
            overflow: hidden;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="id-card-grid">
          ${cardHtml}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

/**
 * Number to words converter (Indian numbering system)
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowHundred(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }

  function convertBelowThousand(n: number): string {
    if (n < 100) return convertBelowHundred(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertBelowHundred(n % 100) : '');
  }

  let result = '';
  
  // Crores
  if (num >= 10000000) {
    result += convertBelowThousand(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  
  // Lakhs
  if (num >= 100000) {
    result += convertBelowHundred(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  
  // Thousands
  if (num >= 1000) {
    result += convertBelowHundred(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds and below
  if (num > 0) {
    result += convertBelowThousand(num);
  }
  
  return result.trim();
}

/**
 * Format date in DD/MM/YYYY format (Indian standard)
 */
export function formatDateIndian(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date in words
 */
export function formatDateInWords(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'long' });
  const year = d.getFullYear();
  
  const suffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${suffix(day)} ${month}, ${year}`;
}
