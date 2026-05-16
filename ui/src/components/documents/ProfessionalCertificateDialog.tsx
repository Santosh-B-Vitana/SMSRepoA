'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Download, Edit3, Eye, FileText, Globe, Palette, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CertificateType =
  | 'bonafide'
  | 'conduct'
  | 'character'
  | 'transfer'
  | 'experience'
  | 'salary';

export interface CertificateSchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  affiliationNo?: string;
  principalName?: string;
  principalDesignation?: string;
}

export interface CertificatePersonData {
  // Student fields
  studentName?: string;
  admissionNumber?: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  nationality?: string;
  religion?: string;
  category?: string;
  bloodGroup?: string;
  gender?: string;
  academicYear?: string;
  // Staff fields
  staffName?: string;
  designation?: string;
  department?: string;
  employeeId?: string;
  joiningDate?: string;
  relievingDate?: string;
  grossSalary?: string;
  bankName?: string;
  accountNumber?: string;
}

export interface ProfessionalCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certType: CertificateType;
  personData: CertificatePersonData;
  schoolInfo: CertificateSchoolInfo;
  defaultBoardType?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const BOARD_TYPES = [
  { value: 'CBSE',       label: 'CBSE',  affiliation: 'Affiliated to Central Board of Secondary Education, New Delhi' },
  { value: 'ICSE',       label: 'ICSE',  affiliation: 'Affiliated to Council for the Indian School Certificate Examinations, New Delhi' },
  { value: 'ISC',        label: 'ISC',   affiliation: 'Affiliated to Council for the Indian School Certificate Examinations, New Delhi' },
  { value: 'StateBoard', label: 'State Board', affiliation: 'Affiliated to State Board of Secondary Education' },
  { value: 'IGCSE',      label: 'IGCSE', affiliation: 'Affiliated to Cambridge Assessment International Education (CAIE)' },
  { value: 'IB',         label: 'IB',    affiliation: 'International Baccalaureate (IB) World School' },
  { value: 'Custom',     label: 'Custom / Unaffiliated', affiliation: '' },
];

const TEMPLATE_STYLES = [
  { value: 'CBSE_Classic',     label: 'CBSE Classic',      desc: 'Maroon & navy, formal double-border',      bg: '800020', accent: '1a237e', fg: 'ffffff' },
  { value: 'CBSE_Modern',      label: 'CBSE Modern',       desc: 'Blue gradient, clean contemporary',         bg: '1565c0', accent: '0288d1', fg: 'ffffff' },
  { value: 'ICSE_Standard',    label: 'ICSE Standard',     desc: 'Dark green & gold, ICSE elegance',          bg: '1b5e20', accent: 'b8860b', fg: 'ffffff' },
  { value: 'StateBoard_Elite', label: 'State Board Elite', desc: 'Saffron & blue, government official style', bg: '283593', accent: 'ff6f00', fg: 'ffffff' },
  { value: 'Modern_Premium',   label: 'Modern Premium',    desc: 'Deep purple, premium corporate finish',     bg: '4a148c', accent: '7b1fa2', fg: 'ffffff' },
];

const CERT_LABELS: Record<CertificateType, string> = {
  bonafide:   'Bonafide Certificate',
  conduct:    'Conduct Certificate',
  character:  'Character Certificate',
  transfer:   'Transfer Certificate',
  experience: 'Experience Certificate',
  salary:     'Salary Certificate',
};

const CONDUCT_OPTIONS = ['Outstanding', 'Excellent', 'Very Good', 'Good', 'Satisfactory'];

// ─── Component ──────────────────────────────────────────────────────────────────

export function ProfessionalCertificateDialog({
  open, onOpenChange, certType, personData, schoolInfo, defaultBoardType = 'CBSE'
}: ProfessionalCertificateDialogProps) {
  const [boardType, setBoardType] = useState(defaultBoardType);
  const [templateStyle, setTemplateStyle] = useState('CBSE_Classic');
  const [editReason, setEditReason] = useState('');
  const [activeTab, setActiveTab] = useState<'fields' | 'template' | 'preview'>('fields');

  // Editable fields — pre-filled from personData
  const [fields, setFields] = useState<Record<string, string>>(() => buildInitialFields(certType, personData));

  const previewRef = useRef<HTMLIFrameElement>(null);

  const setField = (key: string, value: string) => setFields(f => ({ ...f, [key]: value }));

  const template = TEMPLATE_STYLES.find(t => t.value === templateStyle) ?? TEMPLATE_STYLES[0];
  const boardAffiliation = BOARD_TYPES.find(b => b.value === boardType)?.affiliation ?? '';

  const certificateHtml = buildCertificateHtml(certType, fields, schoolInfo, boardType, boardAffiliation, templateStyle, template);

  const handlePreview = () => {
    setActiveTab('preview');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — allow popups and try again.'); return; }
    win.document.write(certificateHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([certificateHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = `${CERT_LABELS[certType].replace(/ /g, '_')}_${(fields.studentName || fields.staffName || 'document').replace(/ /g, '_')}.html`;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded! Open in browser → File → Print → Save as PDF for print-quality output.');
  };

  const hasEditReason = editReason.trim().length > 0;
  const fieldsWereModified = JSON.stringify(fields) !== JSON.stringify(buildInitialFields(certType, personData));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {CERT_LABELS[certType]}
            <Badge variant="secondary" className="ml-1 text-xs">{boardType}</Badge>
            <Badge style={{ background: `#${template.bg}`, color: `#${template.fg}` }} className="text-xs ml-0.5">
              {template.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edit any field, choose a board-appropriate template, then preview or download.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="flex-1">
          <TabsList className="mx-6 mt-3 mb-1">
            <TabsTrigger value="fields" className="flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />Certificate Details
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />Template & Format
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />Preview
            </TabsTrigger>
          </TabsList>

          {/* ── Fields tab ─────────────────────────────────────────── */}
          <TabsContent value="fields" className="px-6 pb-4 space-y-4">
            <CertificateFieldsForm certType={certType} fields={fields} setField={setField} />

            {/* Edit reason — only required if they actually changed something */}
            {fieldsWereModified && (
              <div className="space-y-1.5 mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <Label className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Correction Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Why was this field changed? (e.g., 'Father name was misspelled — corrected from Rajesh to Rakesh')"
                  rows={2}
                  className="text-sm resize-none border-amber-300"
                />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Required when you modify any field. This is recorded in the audit trail.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFields(buildInitialFields(certType, personData))}>
                Reset Fields
              </Button>
              <Button onClick={() => setActiveTab('template')}>
                Next: Choose Template →
              </Button>
            </div>
          </TabsContent>

          {/* ── Template tab ───────────────────────────────────────── */}
          <TabsContent value="template" className="px-6 pb-4 space-y-5">
            {/* Board type */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Board / Affiliation</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {BOARD_TYPES.map(b => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBoardType(b.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-all cursor-pointer',
                      boardType === b.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary font-semibold'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    {boardType === b.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    <span className="truncate">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Template style */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Certificate Template</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {TEMPLATE_STYLES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTemplateStyle(t.value)}
                    className={cn(
                      'rounded-xl border overflow-hidden text-left transition-all cursor-pointer group',
                      templateStyle === t.value
                        ? 'ring-2 ring-offset-2 shadow-lg'
                        : 'hover:shadow-md hover:ring-1 hover:ring-muted-foreground/30'
                    )}
                    style={{ ringColor: `#${t.bg}` }}
                  >
                    {/* Color swatch header */}
                    <div
                      className="h-10 flex items-center justify-between px-3 relative"
                      style={{ background: `#${t.bg}` }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: `#${t.fg}` }}>
                        {t.label}
                      </span>
                      {templateStyle === t.value && (
                        <CheckCircle2 className="h-4 w-4" style={{ color: `#${t.fg}` }} />
                      )}
                    </div>
                    {/* Accent stripe */}
                    <div className="h-1.5" style={{ background: `#${t.accent}` }} />
                    {/* Mini mock layout */}
                    <div className="p-2 space-y-1 bg-white dark:bg-card">
                      <div className="h-1 rounded-full" style={{ background: `#${t.bg}`, width: '70%' }} />
                      <div className="h-1 rounded-full bg-muted" style={{ width: '90%' }} />
                      <div className="h-1 rounded-full bg-muted" style={{ width: '80%' }} />
                      <div className="h-1 rounded-full bg-muted" style={{ width: '60%' }} />
                    </div>
                    <div className="px-2 pb-2 bg-white dark:bg-card">
                      <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveTab('fields')}>← Back</Button>
              <Button onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />Preview Certificate
              </Button>
            </div>
          </TabsContent>

          {/* ── Preview tab ────────────────────────────────────────── */}
          <TabsContent value="preview" className="px-6 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{CERT_LABELS[certType]}</span>
                •
                <span>{template.label}</span>
                •
                <span>{boardType}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('fields')}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit Fields
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
                  <Globe className="h-3.5 w-3.5 mr-1.5" />Save HTML
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />Print / Save PDF
                </Button>
              </div>
            </div>

            {fieldsWereModified && !hasEditReason && (
              <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-200">
                You modified certificate fields without providing a correction reason. Go to the <strong>Certificate Details</strong> tab to add one before printing.
              </div>
            )}

            {/* Certificate preview in iframe-like scrollable container */}
            <div className="border rounded-lg overflow-hidden shadow-md bg-white" style={{ minHeight: 600 }}>
              <div
                style={{ transform: 'scale(0.78)', transformOrigin: 'top left', width: '128%', background: 'white' }}
                dangerouslySetInnerHTML={{ __html: certificateHtml }}
              />
            </div>

            <p className="text-xs text-center text-muted-foreground">
              💡 Use <strong>Print / Save PDF</strong> for high-quality print output. The HTML download preserves full CSS styling.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field Forms ────────────────────────────────────────────────────────────────

function CertificateFieldsForm({
  certType, fields, setField
}: {
  certType: CertificateType;
  fields: Record<string, string>;
  setField: (k: string, v: string) => void;
}) {
  const F = ({ label, k, placeholder, type = 'text', required = false }: {
    label: string; k: string; placeholder?: string; type?: string; required?: boolean;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <Input
        type={type}
        value={fields[k] ?? ''}
        onChange={e => setField(k, e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );

  const TA = ({ label, k, placeholder }: { label: string; k: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Textarea
        value={fields[k] ?? ''}
        onChange={e => setField(k, e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="text-sm resize-none"
      />
    </div>
  );

  const SEL = ({ label, k, options }: { label: string; k: string; options: string[] }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={fields[k] ?? options[0]} onValueChange={v => setField(k, v)}>
        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  if (certType === 'bonafide') return (
    <div className="space-y-4">
      <SectionHeader title="Certificate Meta" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Certificate Number" k="certNumber" placeholder="BC2024001" required />
        <F label="Issue Date" k="issueDate" type="date" required />
        <F label="Purpose" k="purpose" placeholder="Higher Education / Employment / Visa" />
        <F label="Academic Year" k="academicYear" placeholder="2024-25" />
      </div>
      <SectionHeader title="Student Details" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Student Full Name" k="studentName" required />
        <F label="Admission Number" k="admissionNumber" />
        <F label="Roll Number" k="rollNumber" />
        <F label="Class & Section" k="className" placeholder="X-A" />
        <F label="Date of Birth" k="dateOfBirth" type="date" />
        <SEL label="Gender" k="gender" options={['Male', 'Female', 'Other']} />
        <F label="Father's Name" k="fatherName" />
        <F label="Mother's Name" k="motherName" />
        <F label="Nationality" k="nationality" placeholder="Indian" />
        <SEL label="Category" k="category" options={['General', 'OBC', 'SC', 'ST', 'EWS', 'Other']} />
        <F label="Blood Group" k="bloodGroup" placeholder="O+, A-, B+..." />
        <F label="Religion" k="religion" />
      </div>
      <SectionHeader title="Issuing Authority" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Principal / Head of Institution" k="principalName" />
        <F label="Designation" k="principalDesignation" placeholder="Principal" />
      </div>
      <TA label="Additional Remarks (optional)" k="remarks" placeholder="Any additional notes..." />
    </div>
  );

  if (certType === 'conduct' || certType === 'character') return (
    <div className="space-y-4">
      <SectionHeader title="Certificate Meta" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Certificate Number" k="certNumber" required />
        <F label="Issue Date" k="issueDate" type="date" required />
        <F label="Academic Year" k="academicYear" placeholder="2024-25" />
      </div>
      <SectionHeader title="Student Details" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Student Full Name" k="studentName" required />
        <F label="Class & Section" k="className" placeholder="X-A" />
        <F label="Admission Number" k="admissionNumber" />
        <SEL label="Conduct / Character" k="conduct" options={CONDUCT_OPTIONS} />
        <F label="Period of Study (from)" k="studyFrom" placeholder="June 2020" />
        <F label="Period of Study (to)" k="studyTo" placeholder="March 2024" />
      </div>
      <SectionHeader title="Issuing Authority" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Principal / Head of Institution" k="principalName" />
        <F label="Designation" k="principalDesignation" placeholder="Principal" />
      </div>
      <TA label="Additional Remarks" k="remarks" placeholder="Any additional notes..." />
    </div>
  );

  if (certType === 'transfer') return (
    <div className="space-y-4">
      <SectionHeader title="Certificate Meta" />
      <div className="grid grid-cols-2 gap-3">
        <F label="TC Number" k="certNumber" required />
        <F label="Issue Date" k="issueDate" type="date" required />
        <F label="Academic Year" k="academicYear" placeholder="2024-25" />
      </div>
      <SectionHeader title="Student Details" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Student Full Name" k="studentName" required />
        <F label="Admission Number" k="admissionNumber" />
        <F label="Class Last Studied" k="className" placeholder="X-A" />
        <F label="Date of Birth" k="dateOfBirth" type="date" />
        <F label="Father's Name" k="fatherName" />
        <F label="Mother's Name" k="motherName" />
        <F label="Date of Admission" k="admissionDate" type="date" />
        <F label="Date of Leaving" k="leavingDate" type="date" />
        <F label="Reason for Leaving" k="reasonLeaving" placeholder="Higher Studies / Transfer / Other" />
        <SEL label="Conduct" k="conduct" options={CONDUCT_OPTIONS} />
        <F label="Last Fee Paid Month" k="feeMonth" placeholder="March 2024" />
        <SEL label="Eligibility for Readmission" k="eligibility" options={['Yes', 'No']} />
      </div>
      <SectionHeader title="Issuing Authority" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Principal / Head of Institution" k="principalName" />
        <F label="Designation" k="principalDesignation" placeholder="Principal" />
      </div>
      <TA label="Remarks" k="remarks" placeholder="Any other remarks..." />
    </div>
  );

  if (certType === 'experience') return (
    <div className="space-y-4">
      <SectionHeader title="Certificate Meta" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Certificate Number" k="certNumber" required />
        <F label="Issue Date" k="issueDate" type="date" required />
      </div>
      <SectionHeader title="Staff Details" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Staff Full Name" k="staffName" required />
        <F label="Employee ID" k="employeeId" />
        <F label="Designation" k="designation" required />
        <F label="Department" k="department" />
        <F label="Date of Joining" k="joiningDate" type="date" required />
        <F label="Date of Relieving / Last Working Day" k="relievingDate" type="date" />
        <F label="Total Years of Service" k="yearsOfService" placeholder="5 years 3 months" />
        <SEL label="Nature of Departure" k="departure" options={['Resigned', 'Retired', 'Transferred', 'Contract Ended', 'Still Serving']} />
      </div>
      <SectionHeader title="Issuing Authority" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Principal / Head of Institution" k="principalName" />
        <F label="Designation" k="principalDesignation" placeholder="Principal" />
      </div>
      <TA label="Remarks / Performance Note" k="remarks" placeholder="e.g., Served with dedication and diligence..." />
    </div>
  );

  if (certType === 'salary') return (
    <div className="space-y-4">
      <SectionHeader title="Certificate Meta" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Certificate Number" k="certNumber" required />
        <F label="Issue Date" k="issueDate" type="date" required />
        <F label="Purpose" k="purpose" placeholder="Bank Loan / Visa / Personal" />
      </div>
      <SectionHeader title="Staff Details" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Staff Full Name" k="staffName" required />
        <F label="Employee ID" k="employeeId" />
        <F label="Designation" k="designation" required />
        <F label="Department" k="department" />
        <F label="Date of Joining" k="joiningDate" type="date" />
        <F label="Gross Monthly Salary (₹)" k="grossSalary" placeholder="e.g., 45,000" />
        <F label="Net Monthly Salary (₹)" k="netSalary" placeholder="e.g., 40,500" />
        <F label="PAN Number (optional)" k="panNumber" />
        <F label="Bank Name" k="bankName" placeholder="State Bank of India" />
        <F label="Account Number (last 4 digits)" k="accountLastFour" placeholder="XXXX1234" />
      </div>
      <SectionHeader title="Issuing Authority" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Principal / Head of Institution" k="principalName" />
        <F label="Designation" k="principalDesignation" placeholder="Principal" />
      </div>
      <TA label="Additional Notes" k="remarks" placeholder="Any additional notes..." />
    </div>
  );

  return null;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Initial fields builder ──────────────────────────────────────────────────────

function buildInitialFields(certType: CertificateType, p: CertificatePersonData): Record<string, string> {
  const today = new Date().toISOString().split('T')[0];
  const autoNum = Date.now().toString().slice(-6);

  const base = {
    issueDate: today,
    academicYear: p.academicYear ?? '',
    principalName: '',
    principalDesignation: 'Principal',
  };

  if (certType === 'bonafide') return {
    ...base, certNumber: `BC${autoNum}`,
    purpose: 'Higher Education',
    studentName: p.studentName ?? '',
    admissionNumber: p.admissionNumber ?? '',
    rollNumber: p.rollNumber ?? '',
    className: p.className ? `${p.className}${p.section ? '-' + p.section : ''}` : '',
    dateOfBirth: p.dateOfBirth ?? '',
    gender: p.gender ?? 'Male',
    fatherName: p.fatherName ?? '',
    motherName: p.motherName ?? '',
    nationality: p.nationality ?? 'Indian',
    category: p.category ?? 'General',
    bloodGroup: p.bloodGroup ?? '',
    religion: p.religion ?? '',
    remarks: '',
  };

  if (certType === 'conduct' || certType === 'character') return {
    ...base, certNumber: certType === 'conduct' ? `CC${autoNum}` : `CHC${autoNum}`,
    studentName: p.studentName ?? '',
    className: p.className ? `${p.className}${p.section ? '-' + p.section : ''}` : '',
    admissionNumber: p.admissionNumber ?? '',
    conduct: 'Excellent',
    studyFrom: '',
    studyTo: '',
    remarks: '',
  };

  if (certType === 'transfer') return {
    ...base, certNumber: `TC${autoNum}`,
    studentName: p.studentName ?? '',
    admissionNumber: p.admissionNumber ?? '',
    className: p.className ? `${p.className}${p.section ? '-' + p.section : ''}` : '',
    dateOfBirth: p.dateOfBirth ?? '',
    fatherName: p.fatherName ?? '',
    motherName: p.motherName ?? '',
    admissionDate: '',
    leavingDate: today,
    reasonLeaving: 'Higher Studies',
    conduct: 'Excellent',
    feeMonth: '',
    eligibility: 'Yes',
    remarks: '',
  };

  if (certType === 'experience') return {
    ...base, certNumber: `EXP${autoNum}`,
    staffName: p.staffName ?? '',
    employeeId: p.employeeId ?? '',
    designation: p.designation ?? '',
    department: p.department ?? '',
    joiningDate: p.joiningDate ?? '',
    relievingDate: p.relievingDate ?? '',
    yearsOfService: '',
    departure: 'Resigned',
    remarks: '',
  };

  if (certType === 'salary') return {
    ...base, certNumber: `SAL${autoNum}`,
    purpose: 'Bank Loan',
    staffName: p.staffName ?? '',
    employeeId: p.employeeId ?? '',
    designation: p.designation ?? '',
    department: p.department ?? '',
    joiningDate: p.joiningDate ?? '',
    grossSalary: p.grossSalary ?? '',
    netSalary: '',
    panNumber: '',
    bankName: p.bankName ?? '',
    accountLastFour: '',
    remarks: '',
  };

  return base;
}

// ─── HTML Certificate Renderer ──────────────────────────────────────────────────

function buildCertificateHtml(
  certType: CertificateType,
  f: Record<string, string>,
  school: CertificateSchoolInfo,
  boardType: string,
  boardAffiliation: string,
  templateStyle: string,
  t: { bg: string; accent: string; fg: string; label: string }
): string {
  const body = buildCertificateBody(certType, f, school, t);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${CERT_LABELS[certType]} — ${f.studentName || f.staffName || ''}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter', Arial, sans-serif; background:#f5f5f0; min-height:100vh; display:flex; align-items:flex-start; justify-content:center; padding:20px; }
  .cert-page { width:794px; min-height:1123px; background:#fff; position:relative; box-shadow:0 4px 24px rgba(0,0,0,.15); }
  .outer-border { position:absolute; inset:8px; border:3px solid #${t.bg}; pointer-events:none; z-index:10; }
  .inner-border { position:absolute; inset:14px; border:1px solid #${t.accent}44; pointer-events:none; z-index:10; }
  .cert-header { background:#${t.bg}; color:#${t.fg}; padding:20px 32px 16px; }
  .school-name { font-family:'Crimson Pro', Georgia, serif; font-size:26px; font-weight:700; letter-spacing:.5px; }
  .school-sub { font-size:11px; opacity:.85; margin-top:2px; }
  .school-meta { font-size:10px; opacity:.75; margin-top:4px; }
  .accent-bar { height:5px; background:linear-gradient(90deg,#${t.accent},#${t.bg}88); }
  .cert-type-bar { background:#${t.accent}18; border-top:2px solid #${t.accent}55; border-bottom:2px solid #${t.accent}55; text-align:center; padding:10px; }
  .cert-type-title { font-family:'Crimson Pro', Georgia, serif; font-size:22px; font-weight:700; color:#${t.bg}; letter-spacing:2px; text-transform:uppercase; }
  .cert-number { font-size:11px; color:#555; margin-top:3px; }
  .cert-body { padding:28px 36px; }
  .opening { font-size:13px; color:#333; line-height:1.7; margin-bottom:18px; }
  .field-table { width:100%; border-collapse:collapse; margin:14px 0; }
  .field-table tr td { padding:6px 10px; font-size:12px; vertical-align:top; }
  .field-table tr td:first-child { font-weight:600; color:#${t.bg}; width:38%; border-right:1px solid #${t.bg}22; }
  .field-table tr:nth-child(even) td { background:#${t.bg}08; }
  .closing { font-size:13px; color:#333; line-height:1.7; margin:18px 0; }
  .signature-row { display:flex; justify-content:space-between; align-items:flex-end; margin-top:40px; padding:0 10px; }
  .sig-block { text-align:center; min-width:160px; }
  .sig-line { border-top:1px solid #${t.bg}; padding-top:6px; font-size:11px; font-weight:600; color:#${t.bg}; }
  .sig-sub { font-size:10px; color:#666; margin-top:2px; }
  .cert-footer { border-top:1px solid #${t.bg}22; padding:8px 32px; display:flex; justify-content:space-between; background:#${t.bg}06; margin-top:auto; }
  .footer-text { font-size:9px; color:#888; }
  .watermark { position:absolute; bottom:80px; left:50%; transform:translateX(-50%) rotate(-25deg); font-family:'Crimson Pro',serif; font-size:80px; font-weight:700; color:#${t.bg}07; white-space:nowrap; pointer-events:none; z-index:0; }
  .content-wrap { position:relative; z-index:1; }
  @media print { body { background:white; padding:0; } .cert-page { box-shadow:none; } }
</style>
</head>
<body>
<div class="cert-page">
  <div class="outer-border"></div>
  <div class="inner-border"></div>
  <div class="watermark">${school.name}</div>
  <div class="content-wrap">
    <div class="cert-header">
      <div style="display:flex;align-items:center;gap:16px;">
        ${school.logoUrl ? `<img src="${school.logoUrl}" style="height:52px;width:52px;object-fit:contain;background:#ffffff44;border-radius:6px;padding:3px;" alt="Logo"/>` : `<div style="height:52px;width:52px;background:#${t.fg}22;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;font-family:'Crimson Pro',serif;">${school.name.substring(0,2).toUpperCase()}</div>`}
        <div>
          <div class="school-name">${school.name}</div>
          <div class="school-sub">${boardAffiliation}</div>
          <div class="school-meta">${[school.address, school.phone, school.email].filter(Boolean).join(' | ')}</div>
        </div>
      </div>
    </div>
    <div class="accent-bar"></div>
    <div class="cert-type-bar">
      <div class="cert-type-title">${CERT_LABELS[certType]}</div>
      <div class="cert-number">Certificate No: ${f.certNumber || '—'} &nbsp;|&nbsp; Date: ${formatDate(f.issueDate)}</div>
    </div>
    <div class="cert-body">
      ${body}
    </div>
    <div class="cert-footer">
      <span class="footer-text">Generated by School Management System • ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
      <span class="footer-text">${school.name} • ${CERT_LABELS[certType]} • ${boardType}</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

function buildCertificateBody(
  certType: CertificateType,
  f: Record<string, string>,
  school: CertificateSchoolInfo,
  t: { bg: string; accent: string; fg: string }
): string {
  const principalName = f.principalName || school.principalName || 'The Principal';
  const principalDes  = f.principalDesignation || school.principalDesignation || 'Principal';

  const sig = `
    <div class="signature-row">
      <div class="sig-block">
        <div style="height:40px;"></div>
        <div class="sig-line">Class Teacher</div>
        <div class="sig-sub">Signature & Stamp</div>
      </div>
      <div class="sig-block">
        <div style="height:40px;"></div>
        <div class="sig-line">${principalName}</div>
        <div class="sig-sub">${principalDes} — ${school.name}</div>
      </div>
    </div>`;

  if (certType === 'bonafide') {
    const pronoun = f.gender === 'Female' ? 'She' : 'He';
    return `
    <p class="opening">This is to certify that <strong>${f.studentName || '____________________'}</strong>,
    ${f.gender === 'Female' ? 'daughter' : 'son'} of <strong>${f.fatherName || '____________________'}</strong>
    ${f.motherName ? `and <strong>${f.motherName}</strong>` : ''}, is / was a <em>bona fide</em> student of this institution.</p>

    <table class="field-table">
      <tr><td>Admission Number</td><td>${f.admissionNumber || '—'}</td></tr>
      <tr><td>Roll Number</td><td>${f.rollNumber || '—'}</td></tr>
      <tr><td>Class &amp; Section</td><td>${f.className || '—'}</td></tr>
      <tr><td>Academic Year</td><td>${f.academicYear || '—'}</td></tr>
      <tr><td>Date of Birth</td><td>${formatDate(f.dateOfBirth)}</td></tr>
      <tr><td>Nationality</td><td>${f.nationality || 'Indian'}</td></tr>
      <tr><td>Religion</td><td>${f.religion || '—'}</td></tr>
      <tr><td>Category</td><td>${f.category || '—'}</td></tr>
      <tr><td>Blood Group</td><td>${f.bloodGroup || '—'}</td></tr>
    </table>

    <p class="closing">This certificate is issued for the purpose of <strong>${f.purpose || 'Higher Education'}</strong>.
    ${pronoun} bears good character and conduct. ${f.remarks ? `<br/><em>${f.remarks}</em>` : ''}</p>
    ${sig}`;
  }

  if (certType === 'conduct') {
    return `
    <p class="opening">This is to certify that <strong>${f.studentName || '____________________'}</strong>,
    bearing Admission No. <strong>${f.admissionNumber || '—'}</strong>, was a student of Class <strong>${f.className || '—'}</strong>
    in this institution during the academic year <strong>${f.academicYear || '—'}</strong>.</p>
    <p class="opening" style="margin-top:10px;">
    ${f.studyFrom && f.studyTo ? `${f.gender === 'Female' ? 'She' : 'He'} studied at this institution from <strong>${f.studyFrom}</strong> to <strong>${f.studyTo}</strong>.` : ''}
    During the entire period of association, ${f.gender === 'Female' ? 'her' : 'his'} conduct and character was found to be <strong style="font-size:15px;color:#${t.bg};">${f.conduct || 'Excellent'}</strong>.</p>
    ${f.remarks ? `<p class="closing"><em>${f.remarks}</em></p>` : ''}
    <p class="closing" style="margin-top:14px;">We wish ${f.gender === 'Female' ? 'her' : 'him'} all the best in future endeavours.</p>
    ${sig}`;
  }

  if (certType === 'character') {
    return `
    <p class="opening">To Whomsoever It May Concern</p>
    <p class="opening" style="margin-top:12px;">This is to certify that <strong>${f.studentName || '____________________'}</strong>,
    bearing Admission No. <strong>${f.admissionNumber || '—'}</strong>, was a student of Class <strong>${f.className || '—'}</strong>
    during the academic year <strong>${f.academicYear || '—'}</strong>.</p>
    <p class="opening" style="margin-top:10px;">
    ${f.studyFrom && f.studyTo ? `${f.gender === 'Female' ? 'She' : 'He'} was a student of this institution from <strong>${f.studyFrom}</strong> to <strong>${f.studyTo}</strong>. ` : ''}
    During ${f.gender === 'Female' ? 'her' : 'his'} stay, ${f.gender === 'Female' ? 'she' : 'he'} was found to be of <strong style="color:#${t.bg};">${f.conduct || 'Excellent'}</strong> character and behaviour.
    ${f.gender === 'Female' ? 'She' : 'He'} was a diligent student, respectful to teachers and seniors, and maintained the discipline of the institution.</p>
    ${f.remarks ? `<p class="closing"><em>${f.remarks}</em></p>` : ''}
    <p class="closing" style="margin-top:14px;">This certificate is being issued on request as per the records available with the school.</p>
    ${sig}`;
  }

  if (certType === 'transfer') {
    return `
    <p class="opening">This is to certify that <strong>${f.studentName || '____________________'}</strong>,
    ${f.gender === 'Female' ? 'daughter' : 'son'} of <strong>${f.fatherName || '—'}</strong>
    ${f.motherName ? `and <strong>${f.motherName}</strong>` : ''}, has studied in this institution.
    The following are the details as per school records:</p>

    <table class="field-table">
      <tr><td>Admission Number</td><td>${f.admissionNumber || '—'}</td></tr>
      <tr><td>Date of Birth</td><td>${formatDate(f.dateOfBirth)}</td></tr>
      <tr><td>Class Last Studied</td><td>${f.className || '—'}</td></tr>
      <tr><td>Academic Year</td><td>${f.academicYear || '—'}</td></tr>
      <tr><td>Date of Admission</td><td>${formatDate(f.admissionDate)}</td></tr>
      <tr><td>Date of Leaving</td><td>${formatDate(f.leavingDate)}</td></tr>
      <tr><td>Reason for Leaving</td><td>${f.reasonLeaving || '—'}</td></tr>
      <tr><td>Conduct</td><td><strong>${f.conduct || 'Excellent'}</strong></td></tr>
      <tr><td>Last Fee Paid Month</td><td>${f.feeMonth || '—'}</td></tr>
      <tr><td>Eligible for Readmission</td><td>${f.eligibility || 'Yes'}</td></tr>
    </table>

    ${f.remarks ? `<p class="closing"><em>${f.remarks}</em></p>` : ''}
    ${sig}`;
  }

  if (certType === 'experience') {
    return `
    <p class="opening">To Whomsoever It May Concern</p>
    <p class="opening" style="margin-top:12px;">This is to certify that <strong>${f.staffName || '____________________'}</strong>
    ${f.employeeId ? `(Employee ID: <strong>${f.employeeId}</strong>)` : ''}
    has served / is serving as <strong>${f.designation || '—'}</strong> in the <strong>${f.department || 'Teaching'}</strong> department
    of <strong>${school.name}</strong>.</p>

    <table class="field-table">
      <tr><td>Name</td><td>${f.staffName || '—'}</td></tr>
      <tr><td>Designation</td><td>${f.designation || '—'}</td></tr>
      <tr><td>Department</td><td>${f.department || '—'}</td></tr>
      <tr><td>Date of Joining</td><td>${formatDate(f.joiningDate)}</td></tr>
      ${f.relievingDate ? `<tr><td>Last Working Date</td><td>${formatDate(f.relievingDate)}</td></tr>` : ''}
      ${f.yearsOfService ? `<tr><td>Period of Service</td><td>${f.yearsOfService}</td></tr>` : ''}
      <tr><td>Nature of Departure</td><td>${f.departure || '—'}</td></tr>
    </table>

    <p class="closing">${f.remarks || `During ${f.gender === 'Female' ? 'her' : 'their'} tenure, ${f.staffName || 'the staff member'} demonstrated dedication, professionalism, and commitment to the institution.`}</p>
    <p class="closing" style="margin-top:10px;">This certificate is issued on request for whatever lawful purpose it may serve.</p>
    ${sig}`;
  }

  if (certType === 'salary') {
    return `
    <p class="opening">To Whomsoever It May Concern</p>
    <p class="opening" style="margin-top:12px;">This is to certify that <strong>${f.staffName || '____________________'}</strong>
    ${f.employeeId ? `(Employee ID: <strong>${f.employeeId}</strong>)` : ''}
    is working as <strong>${f.designation || '—'}</strong>
    ${f.department ? `in the <strong>${f.department}</strong> department` : ''}
    at <strong>${school.name}</strong>
    ${f.joiningDate ? ` since <strong>${formatDate(f.joiningDate)}</strong>` : ''}.
    ${f.purpose ? `This certificate is issued for the purpose of <strong>${f.purpose}</strong>.` : ''}</p>

    <table class="field-table">
      <tr><td>Employee Name</td><td>${f.staffName || '—'}</td></tr>
      <tr><td>Designation</td><td>${f.designation || '—'}</td></tr>
      <tr><td>Department</td><td>${f.department || '—'}</td></tr>
      ${f.grossSalary ? `<tr><td>Gross Monthly Salary</td><td><strong>₹ ${f.grossSalary}</strong></td></tr>` : ''}
      ${f.netSalary ? `<tr><td>Net Monthly Salary</td><td><strong>₹ ${f.netSalary}</strong></td></tr>` : ''}
      ${f.bankName ? `<tr><td>Salary Credited To</td><td>${f.bankName}${f.accountLastFour ? ` (A/c ending ${f.accountLastFour})` : ''}</td></tr>` : ''}
      ${f.panNumber ? `<tr><td>PAN Number</td><td>${f.panNumber}</td></tr>` : ''}
    </table>

    ${f.remarks ? `<p class="closing"><em>${f.remarks}</em></p>` : ''}
    ${sig}`;
  }

  return '<p>Certificate content unavailable.</p>';
}

function formatDate(val?: string): string {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return val;
  }
}
