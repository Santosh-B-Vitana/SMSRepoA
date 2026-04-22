import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

interface SaleReceiptData {
  receiptNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
}

const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#0ea5e9',
  text: '#1e293b',
  lightGray: '#f1f5f9'
};

export function generateStoreReceipt(schoolInfo: SchoolInfo, receiptData: SaleReceiptData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Header with school info
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.name, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (schoolInfo.address) {
    doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  if (schoolInfo.phone || schoolInfo.email) {
    const contact = [schoolInfo.phone, schoolInfo.email].filter(Boolean).join(' | ');
    doc.text(contact, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  // Receipt title
  yPos = 55;
  doc.setTextColor(COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STORE RECEIPT', pageWidth / 2, yPos, { align: 'center' });

  // Receipt details
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = pageWidth - 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.receiptNumber, leftCol + 30, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', rightCol - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.date, rightCol - 30, yPos, { align: 'right' });

  if (receiptData.customerName) {
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.customerName, leftCol + 30, yPos);
  }

  if (receiptData.customerPhone) {
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Phone:', leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.customerPhone, leftCol + 30, yPos);
  }

  // Items table
  yPos += 10;
  const tableData = receiptData.items.map(item => [
    item.name,
    item.qty.toString(),
    `₹${item.price.toLocaleString()}`,
    `₹${(item.qty * item.price).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Item Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 }
    }
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY;

  // Total section
  yPos = finalY + 10;
  doc.setFillColor(COLORS.lightGray);
  doc.rect(pageWidth - 90, yPos - 5, 70, 25, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', pageWidth - 85, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.paymentMethod, pageWidth - 25, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary);
  doc.text('TOTAL:', pageWidth - 85, yPos);
  doc.text(`₹${receiptData.total.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 25;
  doc.setTextColor(COLORS.secondary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your purchase!', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, yPos, { align: 'center' });
  
  if (schoolInfo.website) {
    yPos += 5;
    doc.text(schoolInfo.website, pageWidth / 2, yPos, { align: 'center' });
  }

  return doc;
}
