'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CreditCard, Download, Edit3, Eye, Palette, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type IdCardPersonType = 'student' | 'staff';

export interface IdCardPersonData {
  name: string;
  id?: string;
  photoUrl?: string;
  // Student
  admissionNumber?: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  parentName?: string;
  parentPhone?: string;
  // Staff
  designation?: string;
  department?: string;
  employeeId?: string;
  phone?: string;
  email?: string;
}

export interface IdCardSchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  website?: string;
}

export interface ProfessionalIdCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personType: IdCardPersonType;
  personData: IdCardPersonData;
  schoolInfo: IdCardSchoolInfo;
}

// ─── Templates ──────────────────────────────────────────────────────────────────

const ID_CARD_TEMPLATES = [
  { value: 'classic_blue',        label: 'Classic Blue',         header: '1565c0', bg: 'f0f4ff', accent: '1565c0', text: 'ffffff' },
  { value: 'gradient_pro',        label: 'Gradient Pro',         header: '7b1fa2', bg: 'faf0ff', accent: '7b1fa2', text: 'ffffff' },
  { value: 'tricolor_official',   label: 'Tri-color Official',   header: '283593', bg: 'fff8e7', accent: 'ff6f00', text: 'ffffff' },
  { value: 'dark_premium',        label: 'Dark Premium',         header: '1a1a2e', bg: 'f8f8f8', accent: 'c9a948', text: 'ffffff' },
  { value: 'minimal_white',       label: 'Minimal White',        header: '2e7d32', bg: 'ffffff', accent: '2e7d32', text: 'ffffff' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export function ProfessionalIdCardDialog({
  open, onOpenChange, personType, personData, schoolInfo
}: ProfessionalIdCardDialogProps) {
  const [templateStyle, setTemplateStyle] = useState('classic_blue');
  const [activeTab, setActiveTab] = useState<'fields' | 'template' | 'preview'>('fields');
  const [fields, setFields] = useState<Record<string, string>>(() => buildInitialFields(personType, personData));
  const template = ID_CARD_TEMPLATES.find(t => t.value === templateStyle) ?? ID_CARD_TEMPLATES[0];

  const setField = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const cardHtml = buildIdCardHtml(personType, fields, schoolInfo, template);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — allow popups and try again.'); return; }
    win.document.write(cardHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([cardHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ID_Card_${(fields.name || 'person').replace(/ /g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded! Open in browser → Print → Save as PDF for a card-quality print.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {personType === 'student' ? 'Student' : 'Staff'} ID Card
            <Badge style={{ background: `#${template.header}`, color: '#ffffff' }} className="text-xs ml-1">
              {template.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edit fields, choose a professional template, preview and print or download.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList className="mx-6 mt-3 mb-1">
            <TabsTrigger value="fields" className="flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />Details
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />Template
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />Preview
            </TabsTrigger>
          </TabsList>

          {/* Fields tab */}
          <TabsContent value="fields" className="px-6 pb-4 space-y-4">
            <IdCardFieldsForm personType={personType} fields={fields} setField={setField} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFields(buildInitialFields(personType, personData))}>Reset</Button>
              <Button onClick={() => setActiveTab('template')}>Next: Choose Template →</Button>
            </div>
          </TabsContent>

          {/* Template tab */}
          <TabsContent value="template" className="px-6 pb-4 space-y-4">
            <Label className="font-semibold text-sm">ID Card Template</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ID_CARD_TEMPLATES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplateStyle(t.value)}
                  className={cn(
                    'rounded-xl border overflow-hidden text-left cursor-pointer transition-all',
                    templateStyle === t.value
                      ? 'ring-2 ring-offset-2 shadow-lg ring-primary'
                      : 'hover:shadow-md hover:ring-1 hover:ring-muted-foreground/30'
                  )}
                >
                  {/* Header swatch */}
                  <div className="h-10 flex items-center justify-between px-2.5" style={{ background: `#${t.header}` }}>
                    <span className="text-[10px] font-bold text-white">{t.label}</span>
                    {templateStyle === t.value && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>
                  {/* Accent stripe */}
                  <div className="h-1" style={{ background: `#${t.accent}` }} />
                  {/* Card body mock */}
                  <div className="p-2 space-y-1" style={{ background: `#${t.bg}` }}>
                    <div className="h-1 rounded-full" style={{ background: `#${t.header}`, width: '70%' }} />
                    <div className="h-1 rounded-full bg-muted" style={{ width: '50%' }} />
                    <div className="h-1 rounded-full bg-muted" style={{ width: '80%' }} />
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveTab('fields')}>← Back</Button>
              <Button onClick={() => setActiveTab('preview')}>
                <Eye className="h-4 w-4 mr-2" />Preview Card
              </Button>
            </div>
          </TabsContent>

          {/* Preview tab */}
          <TabsContent value="preview" className="px-6 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{template.label}</span> template
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('fields')}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />Save HTML
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />Print / PDF
                </Button>
              </div>
            </div>

            {/* Dual card preview — front and back side by side */}
            <div className="border rounded-lg overflow-auto bg-gray-50 p-6 flex justify-center gap-6 flex-wrap">
              <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
                <div dangerouslySetInnerHTML={{ __html: buildIdCardFrontHtml(personType, fields, schoolInfo, template) }} />
              </div>
              <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
                <div dangerouslySetInnerHTML={{ __html: buildIdCardBackHtml(schoolInfo, template) }} />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              💡 Tip: Use <strong>Print / PDF</strong> for card-quality output. Set paper size to A4, 2 cards per page.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fields form ────────────────────────────────────────────────────────────────

function IdCardFieldsForm({ personType, fields, setField }: {
  personType: IdCardPersonType;
  fields: Record<string, string>;
  setField: (k: string, v: string) => void;
}) {
  const F = ({ label, k, placeholder, type = 'text' }: { label: string; k: string; placeholder?: string; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Input type={type} value={fields[k] ?? ''} onChange={e => setField(k, e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity Details</div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Full Name" k="name" />
        {personType === 'student' && <>
          <F label="Admission Number" k="admissionNumber" />
          <F label="Roll Number" k="rollNumber" />
          <F label="Class & Section" k="className" placeholder="X-A" />
          <F label="Date of Birth" k="dateOfBirth" type="date" />
          <F label="Blood Group" k="bloodGroup" placeholder="O+" />
          <F label="Parent / Guardian Name" k="parentName" />
          <F label="Parent Phone" k="parentPhone" />
        </>}
        {personType === 'staff' && <>
          <F label="Employee ID" k="employeeId" />
          <F label="Designation" k="designation" />
          <F label="Department" k="department" />
          <F label="Phone" k="phone" />
          <F label="Email" k="email" />
          <F label="Blood Group" k="bloodGroup" placeholder="O+" />
        </>}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Validity</div>
      <div className="grid grid-cols-2 gap-3">
        <F label="Valid From" k="validFrom" type="date" />
        <F label="Valid Until" k="validUntil" type="date" />
      </div>
    </div>
  );
}

// ─── Initial fields ──────────────────────────────────────────────────────────────

function buildInitialFields(personType: IdCardPersonType, p: IdCardPersonData): Record<string, string> {
  const thisYear = new Date().getFullYear();
  const validUntil = `${thisYear + 1}-03-31`;
  const validFrom = `${thisYear}-04-01`;

  if (personType === 'student') return {
    name: p.name ?? '',
    admissionNumber: p.admissionNumber ?? '',
    rollNumber: p.rollNumber ?? '',
    className: p.className ? `${p.className}${p.section ? '-' + p.section : ''}` : '',
    dateOfBirth: p.dateOfBirth?.split('T')[0] ?? '',
    bloodGroup: p.bloodGroup ?? '',
    parentName: p.parentName ?? '',
    parentPhone: p.parentPhone ?? '',
    photoUrl: p.photoUrl ?? '',
    validFrom,
    validUntil,
  };

  return {
    name: p.name ?? '',
    employeeId: p.employeeId ?? '',
    designation: p.designation ?? '',
    department: p.department ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    bloodGroup: p.bloodGroup ?? '',
    photoUrl: p.photoUrl ?? '',
    validFrom,
    validUntil,
  };
}

// ─── Front card HTML ─────────────────────────────────────────────────────────────

function buildIdCardFrontHtml(
  personType: IdCardPersonType,
  f: Record<string, string>,
  school: IdCardSchoolInfo,
  t: { header: string; bg: string; accent: string; text: string; label: string }
): string {
  const photoSrc = f.photoUrl || '';
  const rows = personType === 'student'
    ? [
        ['Adm. No', f.admissionNumber],
        ['Roll No', f.rollNumber],
        ['Class', f.className],
        ['D.O.B', formatD(f.dateOfBirth)],
        ['Blood Grp', f.bloodGroup],
        ['Parent', f.parentName],
      ].filter(r => r[1])
    : [
        ['Emp. ID', f.employeeId],
        ['Designation', f.designation],
        ['Department', f.department],
        ['Blood Grp', f.bloodGroup],
        ['Phone', f.phone],
      ].filter(r => r[1]);

  return `<div style="width:240px;min-height:340px;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.2);background:#${t.bg};font-family:Inter,Arial,sans-serif;border:1px solid #${t.header}33;">
  <div style="background:#${t.header};padding:12px 10px 8px;text-align:center;">
    ${school.logoUrl ? `<img src="${school.logoUrl}" style="height:32px;margin-bottom:6px;" alt="logo"/>` : `<div style="width:36px;height:36px;background:#ffffff33;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;">${school.name.substring(0,2).toUpperCase()}</div>`}
    <div style="font-size:11px;font-weight:700;color:#fff;line-height:1.2;">${school.name}</div>
    ${school.address ? `<div style="font-size:8px;color:#ffffff99;margin-top:2px;">${school.address}</div>` : ''}
    <div style="background:#${t.accent};height:2px;margin:6px -10px 0;"></div>
    <div style="font-size:9px;font-weight:700;color:#fff;margin-top:5px;letter-spacing:1.5px;text-transform:uppercase;">${personType === 'student' ? 'Student' : 'Staff'} Identity Card</div>
  </div>
  <div style="padding:10px 12px;text-align:center;">
    ${photoSrc
      ? `<img src="${photoSrc}" style="width:70px;height:70px;object-fit:cover;border-radius:50%;border:3px solid #${t.accent};margin-bottom:8px;" alt="Photo"/>`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#${t.header}22;border:3px solid #${t.accent};display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#${t.header};margin-bottom:8px;">${f.name.substring(0,1).toUpperCase()}</div>`
    }
    <div style="font-size:13px;font-weight:700;color:#${t.header};line-height:1.2;">${f.name}</div>
  </div>
  <div style="margin:0 10px 4px;border-top:1px solid #${t.accent}44;padding-top:6px;">
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:9.5px;">
      <span style="color:#888;font-weight:500;">${k}</span>
      <span style="color:#222;font-weight:600;text-align:right;max-width:55%;">${v}</span>
    </div>`).join('')}
  </div>
  <div style="margin:8px 10px 10px;background:#${t.header}0f;border-radius:6px;padding:5px 8px;font-size:8px;color:#${t.header};font-weight:600;text-align:center;">
    Valid: ${formatD(f.validFrom)} — ${formatD(f.validUntil)}
  </div>
</div>`;
}

// ─── Back card HTML ───────────────────────────────────────────────────────────────

function buildIdCardBackHtml(
  school: IdCardSchoolInfo,
  t: { header: string; bg: string; accent: string; text: string }
): string {
  return `<div style="width:240px;min-height:340px;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.2);background:#${t.bg};font-family:Inter,Arial,sans-serif;border:1px solid #${t.header}33;display:flex;flex-direction:column;">
  <div style="background:#${t.header};height:40px;display:flex;align-items:center;justify-content:center;">
    <span style="font-size:10px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;">Contact &amp; Info</span>
  </div>
  <div style="background:#${t.accent};height:2px;"></div>
  <div style="padding:14px 14px 10px;flex:1;display:flex;flex-direction:column;gap:8px;">
    <div style="font-size:11px;font-weight:700;color:#${t.header};border-bottom:1px solid #${t.header}22;padding-bottom:4px;">${school.name}</div>
    ${school.address ? `<div style="font-size:9px;color:#555;line-height:1.4;">${school.address}</div>` : ''}
    ${school.phone ? `<div style="font-size:9px;color:#555;"><b>Phone:</b> ${school.phone}</div>` : ''}
    ${school.email ? `<div style="font-size:9px;color:#555;"><b>Email:</b> ${school.email}</div>` : ''}
    ${school.website ? `<div style="font-size:9px;color:#555;"><b>Web:</b> ${school.website}</div>` : ''}
    <div style="flex:1;"></div>
    <div style="background:#${t.header}10;border-radius:6px;padding:8px;font-size:8px;color:#555;line-height:1.5;border:1px dashed #${t.header}33;">
      <strong style="color:#${t.header};display:block;margin-bottom:3px;">If found, please return to:</strong>
      ${school.name}<br/>
      ${school.address ?? ''}<br/>
      ${school.phone ? `Tel: ${school.phone}` : ''}
    </div>
  </div>
</div>`;
}

// ─── Full print HTML ──────────────────────────────────────────────────────────────

function buildIdCardHtml(
  personType: IdCardPersonType,
  f: Record<string, string>,
  school: IdCardSchoolInfo,
  t: { header: string; bg: string; accent: string; text: string; label: string }
): string {
  const front = buildIdCardFrontHtml(personType, f, school, t);
  const back  = buildIdCardBackHtml(school, t);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>ID Card — ${f.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#f0f0f0; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; font-family:Inter,Arial,sans-serif; }
  .card-wrap { display:flex; gap:24px; flex-wrap:wrap; justify-content:center; }
  .card-label { text-align:center; font-size:10px; color:#666; margin-top:6px; text-transform:uppercase; letter-spacing:.5px; }
  @media print {
    body { background:white; }
    .card-wrap { page-break-after:always; }
  }
</style>
</head>
<body>
<div class="card-wrap">
  <div><div>${front}</div><div class="card-label">Front</div></div>
  <div><div>${back}</div><div class="card-label">Back</div></div>
</div>
</body>
</html>`;
}

function formatD(val?: string): string {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return val; }
}
