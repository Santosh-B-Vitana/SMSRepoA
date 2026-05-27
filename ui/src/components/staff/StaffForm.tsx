
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  User,
  UserRound,
  Briefcase,
  CreditCard,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  staffSchema,
  STAFF_STEP_SCHEMAS,
  STAFF_STEP_LABELS,
  STAFF_STEPS_COUNT,
  type StaffFormData,
} from "@/schemas/staffSchema";
import { staffApi, type Staff } from "@/services/api/staffApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STEP_ICONS = [User, UserRound, Briefcase, CreditCard, HeartPulse, ShieldCheck];

const DEPARTMENTS = [
  "Mathematics", "Science", "English", "Hindi", "Social Studies",
  "Physics", "Chemistry", "Biology", "Computer Science", "History",
  "Geography", "Physical Education", "Arts", "Music", "Commerce",
  "Accounts", "Administration", "Support Staff", "Library",
] as const;

// Designations that directly map to system roles (must match backend roleMap keys exactly)
const DESIGNATIONS = [
  "Teacher",
  "Class Teacher",
  "Head of Department",
  "Principal",
  "Vice Principal",
  "Librarian",
  "Accountant",
  "HR Manager",
  "Transport Manager",
  "Hostel Warden",
  "Admissions Officer",
  "Counselor",
  "Receptionist",
  "Front Desk Officer",
  "Support Staff",
] as const;

// When a department is selected, suggest a default designation
const DEPT_TO_DESIGNATION: Record<string, string> = {
  "Mathematics":        "Teacher",
  "Science":            "Teacher",
  "English":            "Teacher",
  "Hindi":              "Teacher",
  "Social Studies":     "Teacher",
  "Physics":            "Teacher",
  "Chemistry":          "Teacher",
  "Biology":            "Teacher",
  "Computer Science":   "Teacher",
  "History":            "Teacher",
  "Geography":          "Teacher",
  "Physical Education": "Teacher",
  "Arts":               "Teacher",
  "Music":              "Teacher",
  "Commerce":           "Teacher",
  "Accounts":           "Accountant",
  "Library":            "Librarian",
  "Support Staff":      "Support Staff",
  "Administration":     "",   // user picks themselves
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StaffFormProps {
  staff?: Staff | null;
  onClose: () => void;
  onSuccess: () => void;
}

// â”€â”€ Step Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StepIndicator({
  currentStep,
  isEditMode,
  onStepClick,
}: {
  currentStep: number;
  isEditMode: boolean;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {STAFF_STEP_LABELS.map((label, idx) => {
        const Icon = STEP_ICONS[idx];
        const isActive    = idx === currentStep;
        const isCompleted = idx < currentStep;
        const canClick    = isEditMode || idx <= currentStep;
        return (
          <div key={idx} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => canClick && onStepClick(idx)}
              disabled={!canClick}
              className={cn(
                "flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl transition-all duration-200 min-w-[68px]",
                isActive    && "bg-white/20 text-white shadow-sm",
                isCompleted && "bg-white/10 text-white/80 cursor-pointer hover:bg-white/20",
                !isActive && !isCompleted && "text-white/40 cursor-default",
                canClick && !isActive && "cursor-pointer"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                isActive    && "bg-white/30",
                isCompleted && "bg-white/80",
                !isActive && !isCompleted && "bg-white/10"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-[9px] font-semibold leading-tight text-center tracking-wide uppercase">{label}</span>
            </button>
            {idx < STAFF_STEPS_COUNT - 1 && (
              <div className={cn(
                "h-0.5 w-3 mx-0.5 rounded-full transition-colors duration-300",
                idx < currentStep ? "bg-white/60" : "bg-white/20"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function StaffForm({ staff, onClose, onSuccess }: StaffFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const isEditMode = !!staff;
  const { t } = useLanguage();
  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(staff?.profilePhoto ?? null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Children management (edit mode only)
  const [linkedChildren, setLinkedChildren] = useState<StudentBasic[]>([]);
  const [childSearch, setChildSearch]       = useState("");
  const [childResults, setChildResults]     = useState<StudentBasic[]>([]);
  const [childSearching, setChildSearching] = useState(false);
  const [linkingChildId, setLinkingChildId] = useState<string | null>(null);

  const form = useForm<StaffFormData>({
    resolver:      zodResolver(staffSchema),
    mode:          "onChange",
    defaultValues: {
      firstName:          staff?.firstName ?? "",
      lastName:           staff?.lastName  ?? "",
      designation:        staff?.designation ?? "",
      department:         staff?.department ?? "",
      email:              staff?.email ?? "",
      phone:              staff?.phone ?? "",
      joiningDate:        staff?.joiningDate ?? "",
      subjects:           [],
      status:             (staff?.status as StaffFormData["status"]) ?? "active",
      address:            staff?.address ?? "",
      dob:                staff?.dateOfBirth ?? "",
      gender:             undefined,
      nationality:        "Indian",
      religion:           "",
      maritalStatus:      undefined,
      experience:         staff?.experience ?? undefined,
      confirmationDate:   "",
      employmentType:     undefined,
      workingDays:        "",
      leaveEntitlement:   undefined,
      salary:             undefined,
      specialization:     "",
      reportingToId:      "",
      classes:            [],
      aadharNumber:       "",
      panNumber:          "",
      passportNumber:     "",
      licenseNumber:      "",
      permanentAddress:   "",
      city:               "",
      state:              "",
      pincode:            "",
      bankName:           "",
      bankAccountNumber:  "",
      ifscCode:           "",
      pfNumber:           "",
      esiNumber:          "",
      uanNumber:          "",
      bloodGroup:         undefined,
      allergies:          "",
      chronicConditions:  "",
      emergencyContactName:         "",
      emergencyContactPhone:        "",
      emergencyContactRelationship: "",
      doctorName:         "",
      doctorPhone:        "",
      highestQualification: staff?.qualification ?? "",
      university:         "",
      passingYear:        undefined,
      backgroundVerified: false,
      policeClearance:    false,
      medicalCheckup:     false,
      documentConsent:    false,
    },
  });

  const { formState: { errors } } = form;

  // Auto-suggest designation when department changes (add mode only)
  const watchedDepartment = useWatch({ control: form.control, name: "department" });
  useEffect(() => {
    if (isEditMode) return;
    const suggested = DEPT_TO_DESIGNATION[watchedDepartment ?? ""];
    if (suggested) form.setValue("designation", suggested, { shouldValidate: false });
  }, [watchedDepartment, isEditMode]);

  // Load children when in edit mode
  useEffect(() => {
    if (!isEditMode || !staff?.id) return;
    staffApi.getChildren(staff.id)
      .then(children => setLinkedChildren(children.map(c => ({
        id: c.id,
        name: c.name || "",
        class: c.class || "",
        section: c.section || "",
        admissionNumber: c.admissionNumber || "",
        status: c.status || "active",
      } as StudentBasic))))
      .catch(() => setLinkedChildren([]));
  }, [isEditMode, staff?.id]);

  const searchStudentsForChild = async (query: string) => {
    if (!query.trim()) { setChildResults([]); return; }
    setChildSearching(true);
    try {
      const res = await studentApi.list({ search: query, pageSize: 10 });
      setChildResults(res.students || []);
    } catch {
      setChildResults([]);
    } finally {
      setChildSearching(false);
    }
  };

  const handleLinkChild = async (student: StudentBasic) => {
    if (!staff?.id) return;
    setLinkingChildId(student.id);
    try {
      await studentApi.setGuardianStaff(student.id, staff.id);
      setLinkedChildren(prev => [...prev, student]);
      setChildResults(prev => prev.filter(s => s.id !== student.id));
      toast.success(`${student.name} linked as staff's child`);
    } catch {
      toast.error("Failed to link student");
    } finally {
      setLinkingChildId(null);
    }
  };

  const handleUnlinkChild = async (student: StudentBasic) => {
    setLinkingChildId(student.id);
    try {
      await studentApi.setGuardianStaff(student.id, null);
      setLinkedChildren(prev => prev.filter(s => s.id !== student.id));
      toast.success(`${student.name} unlinked`);
    } catch {
      toast.error("Failed to unlink student");
    } finally {
      setLinkingChildId(null);
    }
  };

  const stepErrorCount = () => {
    const stepKeys = Object.keys((STAFF_STEP_SCHEMAS[currentStep] as any).shape ?? {});
    return stepKeys.filter((k) => k in errors).length;
  };

  const handleNext = async () => {
    const stepKeys = Object.keys((STAFF_STEP_SCHEMAS[currentStep] as any).shape ?? {}) as (keyof StaffFormData)[];
    const valid    = await form.trigger(stepKeys);
    if (valid) setCurrentStep((s) => Math.min(s + 1, STAFF_STEPS_COUNT - 1));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: StaffFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        firstName:            data.firstName,
        lastName:             data.lastName,
        designation:          data.designation,
        department:           data.department,
        email:                data.email,
        phone:                data.phone,
        joiningDate:          data.joiningDate,
        gender:               data.gender ?? "Male",
        dateOfBirth:          data.dob ?? new Date().toISOString().split("T")[0],
        status:               data.status,
        address:              data.address,
        qualification:        data.highestQualification,
        experience:           data.experience,
        aadharNumber:         data.aadharNumber,
        panNumber:            data.panNumber,
        passportNumber:       data.passportNumber,
        employmentType:       data.employmentType,
        subjects:             data.subjects?.join(","),
        bankAccountNumber:    data.bankAccountNumber,
        ifscCode:             data.ifscCode,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        salary:               data.salary,
        pfNumber:             data.pfNumber,
        esiNumber:            data.esiNumber,
        uanNumber:            data.uanNumber,
        bloodGroup:           data.bloodGroup,
      };

      if (isEditMode) {
        await staffApi.update(staff!.id, payload as any);
        if (photoFile) {
          try { await staffApi.uploadPhoto(staff!.id, photoFile); } catch { /* non-fatal */ }
        }
        setSuccessMessage(`${data.firstName} ${data.lastName} has been updated successfully`);
        setShowSuccessDialog(true);
      } else {
        const created = await staffApi.create(payload as any);
        if (photoFile && created?.id) {
          try { await staffApi.uploadPhoto(created.id, photoFile); } catch { /* non-fatal */ }
        }
        setSuccessMessage(`${data.firstName} ${data.lastName} has been added successfully as ${data.designation}`);
        setShowSuccessDialog(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to save staff member";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STAFF_STEPS_COUNT) * 100;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-4 px-2">
      <div className="w-full max-w-3xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">
                {isEditMode ? t('staffForm.editTitle') : t('staffForm.addTitle')}
              </h2>
              <p className="text-primary-foreground/70 text-sm mt-0.5">
                {t('staffForm.stepOf')} {currentStep + 1} {t('staffForm.of')} {STAFF_STEPS_COUNT} — {STAFF_STEP_LABELS[currentStep]}
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
          <StepIndicator
            currentStep={currentStep}
            isEditMode={isEditMode}
            onStepClick={setCurrentStep}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {stepErrorCount() > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fix {stepErrorCount()} {t('staffForm.errorsBefore')}
                  </AlertDescription>
                </Alert>
              )}

              {/* â”€â”€ STEP 0: Basic Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t('staffForm.coreDetails')}</p>

                  {/* Photo upload */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div
                      className="relative w-28 h-28 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/40 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/60 transition-colors"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Camera className="h-8 w-8" />
                          <span className="text-xs">Photo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {photoPreview ? "Change Photo" : "Upload Photo"}
                      </Button>
                      {photoPreview && (
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                          <X className="h-3.5 w-3.5 mr-1" />Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setPhotoFile(f);
                        const reader = new FileReader();
                        reader.onloadend = () => setPhotoPreview(reader.result as string);
                        reader.readAsDataURL(f);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Optional — JPG/PNG, max 5 MB</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.firstName')} <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Ramesh" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.lastName')} <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Kumar" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="designation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.designation')} <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DESIGNATIONS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines the system role assigned on account creation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.department')} <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.email')} <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input type="email" placeholder="ramesh@school.edu" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.mobile')} <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                        </FormControl>
                        <FormDescription>10-digit Indian mobile</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="joiningDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.joiningDate')} <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.status')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">{t('staffForm.active')}</SelectItem>
                            <SelectItem value="inactive">{t('staffForm.inactive')}</SelectItem>
                            <SelectItem value="on_leave">{t('staffForm.onLeave')}</SelectItem>
                            <SelectItem value="probation">{t('staffForm.probation')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('staffForm.currentAddress')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder="House No, Street, Colony, City" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* â”€â”€ STEP 1: Personal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t('staffForm.personalDetails')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dob" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.dateOfBirth')}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.gender')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">{t('staffForm.male')}</SelectItem>
                            <SelectItem value="Female">{t('staffForm.female')}</SelectItem>
                            <SelectItem value="Other">{t('staffForm.other')}</SelectItem>
                            <SelectItem value="Prefer not to say">{t('staffForm.preferNotToSay')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nationality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.nationality')}</FormLabel>
                        <FormControl><Input placeholder="Indian" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="religion" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.religion')}</FormLabel>
                        <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.maritalStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Single">{t('staffForm.single')}</SelectItem>
                            <SelectItem value="Married">{t('staffForm.married')}</SelectItem>
                            <SelectItem value="Divorced">{t('staffForm.divorced')}</SelectItem>
                            <SelectItem value="Widowed">{t('staffForm.widowed')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 2: Professional â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t('staffForm.employmentDetails')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.employmentType')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="permanent">{t('staffForm.permanent')}</SelectItem>
                            <SelectItem value="contract">{t('staffForm.contract')}</SelectItem>
                            <SelectItem value="temporary">{t('staffForm.temporary')}</SelectItem>
                            <SelectItem value="probation">{t('staffForm.probation')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="experience" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.experience')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="5"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmationDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.confirmationDate')}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="salary" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Salary (â‚¹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30000"
                            inputMode="numeric"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="leaveEntitlement" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.annualLeaveDays')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="24"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workingDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.workingDays')}</FormLabel>
                        <FormControl><Input placeholder="Monâ€“Sat" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="specialization" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t('staffForm.specialization')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Physics, Chemistry (comma separated)" {...field} />
                        </FormControl>
                        <FormDescription>Separate multiple subjects with commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 3: ID & Banking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">{t('staffForm.idBankDetails')}</p>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">{t('staffForm.govtIds')}</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="aadharNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.aadharNumber')}</FormLabel>
                          <FormControl>
                            <Input placeholder="12 digits" maxLength={12} inputMode="numeric" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="panNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.panNumber')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              {...field}
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                              style={{ textTransform: "uppercase" }}
                            />
                          </FormControl>
                          <FormDescription>Format: ABCDE1234F</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="passportNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.passportNumber')}</FormLabel>
                          <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">{t('staffForm.bankDetails')}</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="bankName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.bankName')}</FormLabel>
                          <FormControl><Input placeholder="State Bank of India" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.accountNumber')}</FormLabel>
                          <FormControl><Input inputMode="numeric" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ifscCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.ifscCode')}</FormLabel>
                          <FormControl>
                            <Input placeholder="SBIN0001234" maxLength={11} {...field} style={{ textTransform: "uppercase" }} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">{t('staffForm.pfEsiUan')}</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="pfNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.pfNumber')}</FormLabel>
                          <FormControl><Input placeholder="TN/CHE/0123456/001/00001" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="esiNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.esiNumber')}</FormLabel>
                          <FormControl><Input inputMode="numeric" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="uanNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.uanNumber')}</FormLabel>
                          <FormControl><Input inputMode="numeric" maxLength={12} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 4: Medical â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t('staffForm.healthEmergency')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.bloodGroup')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BLOOD_GROUPS.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="allergies" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.knownAllergies')}</FormLabel>
                        <FormControl><Input placeholder="Dust, pollen, etc. (if any)" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="chronicConditions" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t('staffForm.chronicConditions')}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Diabetes, hypertension, etc. (if any)" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">{t('staffForm.emergencyContact')}</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.contactName')}</FormLabel>
                          <FormControl><Input placeholder="Spouse / Parent name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.contactMobile')}</FormLabel>
                          <FormControl>
                            <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactRelationship" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('staffForm.relationship')}</FormLabel>
                          <FormControl><Input placeholder="Spouse, Parent, etc." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 5: Compliance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">{t('staffForm.qualifications')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="highestQualification" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.highestQualification')}</FormLabel>
                        <FormControl><Input placeholder="B.Ed., M.Sc., etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="university" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.university')}</FormLabel>
                        <FormControl><Input placeholder="Osmania University" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passingYear" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('staffForm.yearOfPassing')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2010"
                            min={1950}
                            max={new Date().getFullYear()}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">{t('staffForm.verificationChecklist')}</h4>
                    {([
                      { name: "backgroundVerified", label: t('staffForm.bgVerified') },
                      { name: "policeClearance",    label: t('staffForm.policeClearance') },
                      { name: "medicalCheckup",     label: t('staffForm.medicalCheckup') },
                      { name: "documentConsent",    label: t('staffForm.documentConsent') },
                    ] as const).map(({ name, label }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">{label}</FormLabel>
                          </div>
                        </FormItem>
                      )} />
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                    <p className="font-semibold">{t('staffForm.staffSummary')}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                      <span>{t('staffForm.nameSummary')}</span>
                      <span className="text-foreground font-medium">
                        {form.watch("firstName")} {form.watch("lastName")}
                      </span>
                      <span>{t('staffForm.designationSummary')}</span>
                      <span className="text-foreground font-medium">{form.watch("designation") || "â€”"}</span>
                      <span>{t('staffForm.departmentSummary')}</span>
                      <span className="text-foreground font-medium">{form.watch("department") || "â€”"}</span>
                      <span>{t('staffForm.emailSummary')}</span>
                      <span className="text-foreground font-medium">{form.watch("email") || "â€”"}</span>

                  {/* Children â€” edit mode only */}
                  {isEditMode && (
                    <div className="space-y-3">
                      <Separator />
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Badge variant="outline">{t('staffForm.staffChildren')}</Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Link enrolled students who are children of this staff member. This enables staff-child fee concessions.
                      </p>

                      {linkedChildren.length > 0 && (
                        <div className="space-y-2">
                          {linkedChildren.map(child => (
                            <div key={child.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                              <div>
                                <p className="text-sm font-medium">{child.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Class {child.class}{child.section ? ` - ${child.section}` : ""}
                                  {child.admissionNumber ? ` · ${child.admissionNumber}` : ""}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive text-xs"
                                disabled={linkingChildId === child.id}
                                onClick={() => handleUnlinkChild(child)}
                              >
                                {linkingChildId === child.id ? "…" : t('staffForm.unlink')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('staffForm.searchStudent')}</label>
                        <Input
                          placeholder="Type student name…"
                          value={childSearch}
                          onChange={e => {
                            setChildSearch(e.target.value);
                            searchStudentsForChild(e.target.value);
                          }}
                          className="text-sm"
                        />
                        {childSearching && <p className="text-xs text-muted-foreground">Searchingâ€¦</p>}
                        {childResults.length > 0 && (
                          <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                            {childResults
                              .filter(s => !linkedChildren.find(lc => lc.id === s.id))
                              .map(s => (
                                <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent text-sm">
                                  <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">Class {s.class}{s.section ? ` - ${s.section}` : ""}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    disabled={linkingChildId === s.id}
                                    onClick={() => { handleLinkChild(s); setChildSearch(""); setChildResults([]); }}
                                  >
                                    {linkingChildId === s.id ? "Linking…" : t('staffForm.linkAsChild')}
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={submitting}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {currentStep === 0 ? t('common.cancel') : t('common.back')}
              </Button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: STAFF_STEPS_COUNT }).map((_, i) => (
                  <div key={i} className={[
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-3 bg-primary/50" : "w-3 bg-muted-foreground/20",
                  ].join(" ")} />
                ))}
              </div>

              <div className="flex gap-2">
                {currentStep < STAFF_STEPS_COUNT - 1 ? (
                  <Button type="button" onClick={handleNext} disabled={submitting} className="gap-2">
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="min-w-[140px] gap-2">
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {t('staffForm.saving')}
                      </span>
                    ) : isEditMode ? t('staffForm.updateStaff') : t('staffForm.addStaff')}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>

    {/* Success Dialog */}
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              {t('staffForm.successTitle')}
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-foreground">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => {
                setShowSuccessDialog(false);
                onSuccess();
              }}
            >
              {t('staffForm.done')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

