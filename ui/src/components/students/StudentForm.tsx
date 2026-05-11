import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Student, studentApi } from "@/services/api/studentApi";
import { academicApi, ClassResponse, AcademicYearResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { toast } from "sonner";
import { DOCUMENT_TYPES } from "./StudentDocumentUpload";
import {
  Upload, Trash2, FileText, X, ChevronLeft, ChevronRight,
  User, GraduationCap, Users, CreditCard, BookOpen, Heart, CheckCircle2, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentFormProps {
  student?: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

const STEPS = [
  { label: "Personal",       icon: User },
  { label: "Enrollment",     icon: GraduationCap },
  { label: "Contact",        icon: Users },
  { label: "Identification", icon: CreditCard },
  { label: "Academic",       icon: BookOpen },
  { label: "Health",         icon: Heart },
  { label: "Documents",      icon: FileText },
] as const;

const STEPS_COUNT = STEPS.length;

function StepIndicator({ currentStep, isEditMode, onStepClick }: {
  currentStep: number; isEditMode: boolean; onStepClick: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {STEPS.map(({ label, icon: Icon }, idx) => {
        const isActive    = idx === currentStep;
        const isCompleted = idx < currentStep;
        const canClick    = isEditMode || idx <= currentStep;
        return (
          <div key={idx} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => canClick && onStepClick(idx)}
              disabled={!canClick}
              className={[
                "flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl transition-all duration-200 min-w-[64px]",
                isActive    ? "bg-white/20 text-white shadow-sm" : "",
                isCompleted ? "bg-white/10 text-white/80 cursor-pointer hover:bg-white/20" : "",
                !isActive && !isCompleted ? "text-white/40 cursor-default" : "",
                canClick && !isActive ? "cursor-pointer" : "",
              ].join(" ")}
            >
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                isActive    ? "bg-white/30" : "",
                isCompleted ? "bg-white/80" : "",
                !isActive && !isCompleted ? "bg-white/10" : "",
              ].join(" ")}>
                {isCompleted
                  ? <CheckCircle2 className="h-4 w-4 text-primary" />
                  : <Icon className="h-3.5 w-3.5" />
                }
              </div>
              <span className="text-[9px] font-semibold leading-tight text-center tracking-wide uppercase">{label}</span>
            </button>
            {idx < STEPS_COUNT - 1 && (
              <div className={[
                "h-0.5 w-3 rounded-full transition-colors duration-300 mx-0.5",
                idx < currentStep ? "bg-white/60" : "bg-white/20",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-4 border-b">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function StudentForm({ student, onClose, onSuccess }: StudentFormProps) {
  const isEditMode = !!student;
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { currentYear: globalCurrentYear, availableYears: globalYears } = useAcademicYear();

  const [formData, setFormData] = useState({
    name: student?.name || "",
    preferredName: student?.preferredName || "",
    admissionNumber: student?.admissionNumber || "",
    class: student?.class || "",
    section: student?.section || "",
    rollNumber: student?.rollNumber || "",
    dateOfBirth: toDateInput(student?.dateOfBirth),
    placeOfBirth: student?.placeOfBirth || "",
    gender: student?.gender || "",
    nationality: student?.nationality || "",
    status: student?.status || "active",
    admissionDate: toDateInput(student?.admissionDate),
    aadharNumber: student?.aadharNumber || "",
    panNumber: student?.panNumber || "",
    passportNumber: student?.passportNumber || "",
    visaType: student?.visaType || "",
    visaExpiry: student?.visaExpiry || "",
    address: student?.address || "",
    permanentAddress: student?.permanentAddress || "",
    primaryPhone: student?.primaryPhone || "",
    secondaryPhone: student?.secondaryPhone || "",
    email: student?.email || "",
    guardianName: student?.guardianName || "",
    guardianPhone: student?.guardianPhone || "",
    guardianOccupation: student?.guardians?.[0]?.occupation || "",
    guardianEmail: student?.guardians?.[0]?.email || "",
    guardianAadhar: student?.guardians?.[0]?.aadharNumber || "",
    guardianPan: student?.guardians?.[0]?.panNumber || "",
    previousSchool: student?.previousSchool || "",
    previousClass: student?.previousClass || "",
    transferReason: student?.transferReason || "",
    category: student?.category || "General",
    bloodGroup: student?.bloodGroup || "",
    allergies: student?.allergies || "",
    chronicConditions: student?.chronicConditions || "",
    medications: student?.medications || "",
    emergencyContact: student?.emergencyContact || "",
    emergencyPhone: student?.emergencyPhone || "",
    doctorName: student?.doctorName || "",
    doctorPhone: student?.doctorPhone || "",
    photoConsent: student?.photoConsent || false,
    mediaConsent: student?.mediaConsent || false,
    medicalConsent: student?.medicalConsent || false,
    languageProficiency: student?.languageProficiency?.join(", ") || "",
    specialNeeds: student?.specialNeeds || "",
    transportRequired: student?.transportRequired || false,
    hostelRequired: student?.hostelRequired || false,
    siblings: student?.siblingIds ? JSON.parse(student.siblingIds) : [] as string[],
  });

  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photoUrl || null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  // Default to current academic year name; populated once global context loads
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(globalCurrentYear?.name ?? "");

  interface PendingDoc { docType: string; file: File; }
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    studentApi.list({ pageSize: 1000 }).then(r => {
      const all = r.students || [];
      setAllStudents((student ? all.filter(s => s.id !== student.id) : all) as Student[]);
    }).catch(() => {});
    academicApi.listClasses(1, 500).then(r => setAllClasses(r.classes || [])).catch(() => {});
    academicApi.listAcademicYears(1, 50).then(r => {
      const years = r.academicYears || [];
      setAcademicYears(years);
      // Auto-select the current/active year if not already set
      setSelectedAcademicYear(prev => {
        if (prev) return prev;
        const active = years.find(y => y.isCurrent || y.status === "active");
        return active?.name ?? (years[0]?.name ?? "");
      });
    }).catch(() => {});
  }, []);

  // Sync with global context when it loads
  useEffect(() => {
    if (globalCurrentYear && !selectedAcademicYear) {
      setSelectedAcademicYear(globalCurrentYear.name);
    }
  }, [globalCurrentYear]);

  // Classes are school-wide (not year-specific in DB) — always show all.
  // The academic year selector here records which year the student is enrolling in.
  const filteredClasses = allClasses;

  // Use standard (grade number like "10") falling back to name; filter out blanks
  const getStandard = (c: ClassResponse) => (c.standard || c.name || "").trim();
  const getSection  = (c: ClassResponse) => (c.section || "").trim();

  const availableStandards = Array.from(
    new Set(filteredClasses.map(getStandard).filter(Boolean))
  ).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, "")) || 0;
    const bNum = parseInt(b.replace(/\D/g, "")) || 0;
    return aNum !== bNum ? aNum - bNum : a.localeCompare(b);
  });

  const availableSections = formData.class
    ? Array.from(new Set(
        filteredClasses
          .filter(c => getStandard(c) === formData.class)
          .map(getSection)
          .filter(Boolean)
      )).sort()
    : [];

  const handleAddPendingDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingDocType) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB per document.", variant: "destructive" });
      return;
    }
    setPendingDocs(prev => [...prev, { docType: pendingDocType, file }]);
    setPendingDocType("");
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        preferredName: formData.preferredName || undefined,
        admissionNumber: formData.admissionNumber || undefined,
        class: formData.class,
        section: formData.section,
        rollNumber: formData.rollNumber || undefined,
        dateOfBirth: formData.dateOfBirth,
        placeOfBirth: formData.placeOfBirth || undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        status: formData.status,
        admissionDate: formData.admissionDate,
        address: formData.address,
        permanentAddress: formData.permanentAddress || undefined,
        primaryPhone: formData.primaryPhone || undefined,
        secondaryPhone: formData.secondaryPhone || undefined,
        email: formData.email || undefined,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail || undefined,
        previousSchool: formData.previousSchool || undefined,
        previousClass: formData.previousClass || undefined,
        transferReason: formData.transferReason || undefined,
        category: formData.category,
        aadharNumber: formData.aadharNumber || undefined,
        panNumber: formData.panNumber || undefined,
        passportNumber: formData.passportNumber || undefined,
        visaType: formData.visaType || undefined,
        visaExpiry: formData.visaExpiry || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        allergies: formData.allergies || undefined,
        chronicConditions: formData.chronicConditions || undefined,
        medications: formData.medications || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        doctorName: formData.doctorName || undefined,
        doctorPhone: formData.doctorPhone || undefined,
        photoConsent: formData.photoConsent,
        mediaConsent: formData.mediaConsent,
        medicalConsent: formData.medicalConsent,
        languageProficiency: formData.languageProficiency || undefined,
        specialNeeds: formData.specialNeeds || undefined,
        transportRequired: formData.transportRequired,
        hostelRequired: formData.hostelRequired,
        // siblingIds legacy field intentionally omitted — siblings saved via relationship API after creation
      };

      if (student) {
        await studentApi.update(student.id, payload as never);
        // Sync siblings via relationship API (bidirectional)
        if (formData.siblings.length > 0) {
          await Promise.allSettled(
            formData.siblings.map(sibId => studentApi.addSibling(student.id, sibId))
          );
        }
        for (const pd of pendingDocs) {
          await studentApi.uploadDocument(student.id, pd.docType, pd.file).catch(() => {});
        }
        toast.success("Student updated — changes saved successfully.");
      } else {
        const created = await studentApi.create(payload as never);
        // Link siblings via relationship API after student is created
        if (created?.id && formData.siblings.length > 0) {
          await Promise.allSettled(
            formData.siblings.map(sibId => studentApi.addSibling(created.id, sibId))
          );
        }
        if (created?.id && pendingDocs.length > 0) {
          for (const pd of pendingDocs) {
            await studentApi.uploadDocument(created.id, pd.docType, pd.file).catch(() => {});
          }
        }
        toast.success(`Student added successfully${pendingDocs.length > 0 ? ` with ${pendingDocs.length} document(s)` : ""}.`);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : "Failed to save student.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS_COUNT) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <div className="space-y-5">
          <SectionHeader icon={User} title="Personal Information" subtitle="Basic identity details of the student" />
          <div className="flex items-center gap-5 p-4 bg-muted/40 rounded-xl border border-dashed">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
                {photoPreview
                  ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground opacity-40" /></div>
                }
              </div>
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setPhotoFile(file);
                  if (file) { const r = new FileReader(); r.onload = () => setPhotoPreview(r.result as string); r.readAsDataURL(file); }
                }}
              />
            </div>
            <div>
              <p className="font-medium text-sm">Student Photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click the camera icon to upload. JPG or PNG, max 5 MB.</p>
              {photoPreview && <button type="button" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="text-xs text-destructive mt-1 hover:underline">Remove photo</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" required><Input value={formData.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Arjun Kumar" /></Field>
            <Field label="Preferred Name"><Input value={formData.preferredName} onChange={e => set({ preferredName: e.target.value })} placeholder="Nickname or short name" /></Field>
            <Field label="Date of Birth" required><Input type="date" value={formData.dateOfBirth} onChange={e => set({ dateOfBirth: e.target.value })} /></Field>
            <Field label="Place of Birth"><Input value={formData.placeOfBirth} onChange={e => set({ placeOfBirth: e.target.value })} placeholder="City, State" /></Field>
            <Field label="Gender">
              <Select value={formData.gender} onValueChange={v => set({ gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nationality">
              <Select value={formData.nationality || ""} onValueChange={v => set({ nationality: v })}>
                <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
                <SelectContent>
                  {[
                    "Indian","Afghan","American","Australian","Bahraini",
                    "Bangladeshi","Belgian","Bhutanese","Brazilian","British",
                    "Cambodian","Canadian","Chinese","Dutch","Emirati",
                    "Ethiopian","Filipino","French","German","Ghanaian",
                    "Greek","Indonesian","Iranian","Iraqi","Irish",
                    "Israeli","Italian","Japanese","Jordanian","Kazakh",
                    "Kenyan","Korean","Kuwaiti","Lebanese","Malaysian",
                    "Maldivian","Mauritian","Mexican","Mongolian","Moroccan",
                    "Myanmar","Nepalese","New Zealander","Nigerian","Norwegian",
                    "Omani","Pakistani","Palestinian","Polish","Portuguese",
                    "Qatari","Romanian","Russian","Saudi Arabian","Singaporean",
                    "South African","Spanish","Sri Lankan","Swedish","Swiss",
                    "Syrian","Taiwanese","Thai","Turkish","Ukrainian",
                    "Vietnamese","Yemeni","Zimbabwean","Others",
                  ].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={formData.status} onValueChange={v => set({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-5">
          <SectionHeader icon={GraduationCap} title="Enrollment Details" subtitle="Class assignment and admission information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Admission Number"><Input value={formData.admissionNumber} onChange={e => set({ admissionNumber: e.target.value })} placeholder="e.g. ADM-2024-001" /></Field>
            <Field label="Admission Date" required><Input type="date" value={formData.admissionDate} onChange={e => set({ admissionDate: e.target.value })} /></Field>
            <Field label="Enrollment Year" required>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger><SelectValue placeholder={globalCurrentYear?.name ?? "Select year"} /></SelectTrigger>
                <SelectContent>
                  {(academicYears.length > 0 ? academicYears : globalYears).map(ay => (
                    <SelectItem key={ay.id} value={ay.name}>{ay.name}{ay.isCurrent || ay.status === "active" ? " (Current)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class" required>
              <Select
                value={formData.class || ""}
                onValueChange={v => set({ class: v, section: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={allClasses.length === 0 ? "Loading classes…" : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStandards.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {allClasses.length === 0 ? "Loading…" : "No classes configured"}
                    </div>
                  ) : (
                    availableStandards.map(s => (
                      <SelectItem key={s} value={s}>Class {s}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Section" required>
              <Select
                value={formData.section || ""}
                onValueChange={v => set({ section: v })}
                disabled={!formData.class || availableSections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.class ? "Select class first" : availableSections.length === 0 ? "No sections found" : "Select section"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map(s => (
                    <SelectItem key={s} value={s}>Section {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Roll Number" required><Input value={formData.rollNumber} onChange={e => set({ rollNumber: e.target.value })} placeholder="e.g. 12" /></Field>
            <Field label="Category" required>
              <Select value={formData.category} onValueChange={v => set({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="OBC">OBC</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="ST">ST</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-6">
          <SectionHeader icon={Users} title="Contact & Guardian" subtitle="Address, contact numbers and parent/guardian details" />
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Contact</p>
            <Field label="Current / Local Address" required><Textarea rows={2} value={formData.address} onChange={e => set({ address: e.target.value })} placeholder="House no., Street, City, State, PIN" /></Field>
            <Field label="Permanent Address"><Textarea rows={2} value={formData.permanentAddress} onChange={e => set({ permanentAddress: e.target.value })} placeholder="If different from above" /></Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Primary Phone"><Input type="tel" value={formData.primaryPhone} onChange={e => set({ primaryPhone: e.target.value })} placeholder="10-digit mobile" /></Field>
              <Field label="Secondary Phone"><Input type="tel" value={formData.secondaryPhone} onChange={e => set({ secondaryPhone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={formData.email} onChange={e => set({ email: e.target.value })} placeholder="student@email.com" /></Field>
            </div>
          </div>
          <div className="border-t pt-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parent / Guardian</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Guardian Name" required><Input value={formData.guardianName} onChange={e => set({ guardianName: e.target.value })} /></Field>
              <Field label="Guardian Phone" required><Input type="tel" value={formData.guardianPhone} onChange={e => set({ guardianPhone: e.target.value })} /></Field>
              <div className="md:col-span-2">
                <Field label="Guardian Email (Parent Portal Login) *" required>
                  <Input
                    type="email"
                    value={formData.guardianEmail}
                    onChange={e => set({ guardianEmail: e.target.value })}
                    placeholder="parent@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This email will be used as the parent&apos;s login username for the Parent Portal.
                  </p>
                </Field>
              </div>
              <Field label="Occupation"><Input value={formData.guardianOccupation} onChange={e => set({ guardianOccupation: e.target.value })} /></Field>
              <Field label="Guardian Aadhar"><Input value={formData.guardianAadhar} onChange={e => set({ guardianAadhar: e.target.value })} placeholder="XXXX-XXXX-XXXX" maxLength={14} /></Field>
              <Field label="Guardian PAN"><Input value={formData.guardianPan} onChange={e => set({ guardianPan: e.target.value })} placeholder="ABCDE1234F" maxLength={10} /></Field>
            </div>
          </div>
          <div className="border-t pt-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Siblings in School</p>
            <Select value="" onValueChange={v => { if (v && !formData.siblings.includes(v)) set({ siblings: [...formData.siblings, v] }); }}>
              <SelectTrigger><SelectValue placeholder="Link a sibling studying here" /></SelectTrigger>
              <SelectContent>
                {(allStudents as any[]).filter((s: any) => !formData.siblings.includes(s.id)).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — Class {s.class}-{s.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.siblings.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.siblings.map(sid => {
                  const sib = (allStudents as any[]).find((s: any) => s.id === sid);
                  return sib ? (
                    <Badge key={sid} variant="secondary" className="flex items-center gap-1.5 pr-1.5 py-1">
                      {sib.name} · {sib.class}-{sib.section}
                      <button type="button" onClick={() => set({ siblings: formData.siblings.filter(id => id !== sid) })} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-5">
          <SectionHeader icon={CreditCard} title="Identification Documents" subtitle="Government-issued IDs and travel documents" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Aadhar Number"><Input value={formData.aadharNumber} onChange={e => set({ aadharNumber: e.target.value })} placeholder="XXXX-XXXX-XXXX" maxLength={14} /></Field>
            <Field label="PAN Number"><Input value={formData.panNumber} onChange={e => set({ panNumber: e.target.value })} placeholder="ABCDE1234F" maxLength={10} /></Field>
            <Field label="Passport Number"><Input value={formData.passportNumber} onChange={e => set({ passportNumber: e.target.value })} /></Field>
            <Field label="Visa Type"><Input value={formData.visaType} onChange={e => set({ visaType: e.target.value })} placeholder="e.g. Student Visa" /></Field>
            <Field label="Visa Expiry Date"><Input type="date" value={formData.visaExpiry} onChange={e => set({ visaExpiry: e.target.value })} /></Field>
          </div>
        </div>
      );

      case 4: return (
        <div className="space-y-5">
          <SectionHeader icon={BookOpen} title="Academic Background" subtitle="Previous education and special requirements" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Previous School"><Input value={formData.previousSchool} onChange={e => set({ previousSchool: e.target.value })} /></Field>
            <Field label="Previous Class / Grade"><Input value={formData.previousClass} onChange={e => set({ previousClass: e.target.value })} /></Field>
            <Field label="Transfer Reason" className="md:col-span-2"><Textarea rows={2} value={formData.transferReason} onChange={e => set({ transferReason: e.target.value })} /></Field>
            <Field label="Language Proficiency"><Input value={formData.languageProficiency} onChange={e => set({ languageProficiency: e.target.value })} placeholder="English, Hindi, Tamil (comma-separated)" /></Field>
            <Field label="Special Educational Needs"><Input value={formData.specialNeeds} onChange={e => set({ specialNeeds: e.target.value })} placeholder="e.g. Dyslexia, Visual impairment" /></Field>
          </div>
          <div className="flex flex-wrap gap-6 pt-4 border-t">
            {([
              { key: "transportRequired" as const, label: "Transport Required", desc: "School bus / van needed" },
              { key: "hostelRequired" as const, label: "Hostel Required", desc: "Boarding accommodation needed" },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox checked={formData[key] as boolean} onCheckedChange={c => set({ [key]: c as boolean })} />
                <div>
                  <span className="font-medium text-sm">{label}</span>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      );

      case 5: return (
        <div className="space-y-5">
          <SectionHeader icon={Heart} title="Health & Consent" subtitle="Medical information and parental permissions" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Blood Group">
              <Select value={formData.bloodGroup} onValueChange={v => set({ bloodGroup: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Allergies"><Input value={formData.allergies} onChange={e => set({ allergies: e.target.value })} placeholder="e.g. Peanuts, Dust" /></Field>
            <Field label="Chronic Conditions"><Input value={formData.chronicConditions} onChange={e => set({ chronicConditions: e.target.value })} placeholder="e.g. Asthma, Diabetes" /></Field>
            <Field label="Regular Medications"><Input value={formData.medications} onChange={e => set({ medications: e.target.value })} /></Field>
            <Field label="Emergency Contact Name"><Input value={formData.emergencyContact} onChange={e => set({ emergencyContact: e.target.value })} /></Field>
            <Field label="Emergency Contact Phone"><Input type="tel" value={formData.emergencyPhone} onChange={e => set({ emergencyPhone: e.target.value })} /></Field>
            <Field label="Family Doctor"><Input value={formData.doctorName} onChange={e => set({ doctorName: e.target.value })} /></Field>
            <Field label="Doctor Phone"><Input type="tel" value={formData.doctorPhone} onChange={e => set({ doctorPhone: e.target.value })} /></Field>
          </div>
          <div className="border-t pt-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Parental Consent</p>
            {([
              { key: "photoConsent" as const,   label: "Photo / Video Consent",       desc: "Allow use of photos for school records and events" },
              { key: "mediaConsent" as const,    label: "Media Consent",               desc: "Allow publication on social media or school website" },
              { key: "medicalConsent" as const,  label: "Medical Emergency Consent",   desc: "Allow school to seek emergency medical treatment" },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox checked={formData[key] as boolean} onCheckedChange={c => set({ [key]: c as boolean })} className="mt-0.5" />
                <div>
                  <span className="font-medium text-sm">{label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      );

      case 6: return (
        <div className="space-y-5">
          <SectionHeader icon={FileText} title="Admission Documents" subtitle="Attach required documents — uploaded automatically on save" />
          <div className="p-4 rounded-xl bg-muted/40 border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required Documents</p>
            {DOCUMENT_TYPES.filter(t => t.required).map(t => {
              const done = pendingDocs.some(d => d.docType === t.value);
              return (
                <div key={t.value} className="flex items-center gap-2 text-sm">
                  <div className={cn("h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                    done ? "bg-green-500 text-white" : "border-2 border-amber-400 text-amber-500")}>
                    {done ? "✓" : ""}
                  </div>
                  <span className={done ? "text-green-700 font-medium" : "text-muted-foreground"}>{t.label}</span>
                  {done && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Attached</Badge>}
                </div>
              );
            })}
          </div>

          {pendingDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attached ({pendingDocs.length})</p>
              {pendingDocs.map((pd, idx) => {
                const label = DOCUMENT_TYPES.find(t => t.value === pd.docType)?.label ?? pd.docType;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pd.file.name}</p>
                        <p className="text-xs text-muted-foreground">{label} · {(pd.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDocs(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Document</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Document Type">
                <Select value={pendingDocType} onValueChange={setPendingDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}{t.required && <span className="ml-1 text-amber-600 text-xs">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="File (PDF / JPG / PNG, max 10 MB)">
                <Button type="button" variant="outline" className="w-full" disabled={!pendingDocType} onClick={() => docFileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Browse File
                </Button>
                <input ref={docFileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleAddPendingDoc} />
              </Field>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-4 px-2"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">{isEditMode ? "Edit Student" : "New Student Admission"}</h2>
              <p className="text-primary-foreground/70 text-sm mt-0.5">
                Step {currentStep + 1} of {STEPS_COUNT} — {STEPS[currentStep].label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/20 [&>div]:bg-white mb-3" />
          <StepIndicator currentStep={currentStep} isEditMode={isEditMode} onStepClick={setCurrentStep} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => currentStep === 0 ? onClose() : setCurrentStep(s => s - 1)}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: STEPS_COUNT }).map((_, i) => (
              <div key={i} className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-3 bg-primary/50" : "w-3 bg-muted-foreground/20"
              )} />
            ))}
          </div>

          {currentStep < STEPS_COUNT - 1 ? (
            <Button type="button" onClick={() => setCurrentStep(s => s + 1)} className="gap-2">
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading} className="gap-2 min-w-[120px]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Saving…
                </span>
              ) : (
                <><CheckCircle2 className="h-4 w-4" />{isEditMode ? "Update" : "Add Student"}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
