
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  BookOpen,
  Users,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  admissionSchema,
  STEP_SCHEMAS,
  STEP_LABELS,
  STEPS_COUNT,
  type AdmissionFormData,
} from "@/schemas/admissionSchema";
import { admissionService, type Admission } from "@/services/admissionService";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_ICONS = [User, Phone, BookOpen, Users, ClipboardList];

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"] as const;
const CLASS_OPTIONS = [
  "Nursery", "LKG", "UKG",
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdmissionFormProps {
  admission?: Admission | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Step indicator ────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEP_LABELS.map((label, idx) => {
        const Icon = STEP_ICONS[idx];
        const isActive    = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={idx} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => isEditMode && onStepClick(idx)}
              disabled={!isEditMode && idx > currentStep}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[72px]",
                isActive    && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                isActive    && "bg-primary-foreground/20",
                isCompleted && "bg-primary",
                !isActive && !isCompleted && "bg-muted"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
            </button>
            {idx < STEPS_COUNT - 1 && (
              <div className={cn(
                "h-0.5 w-6 mx-1 rounded transition-colors",
                idx < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdmissionForm({ admission, onClose, onSuccess }: AdmissionFormProps) {
  const { availableYears, currentYear } = useAcademicYear();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep]   = useState(0);
  const [submitting, setSubmitting]     = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{ appNumber: string; studentName: string; academicYear: string } | null>(null);
  const isEditMode = !!admission;

  const form = useForm<AdmissionFormData>({
    resolver:      zodResolver(admissionSchema),
    mode:          "onChange",
    defaultValues: {
      firstName:          admission?.firstName ?? "",
      lastName:           admission?.lastName  ?? "",
      dateOfBirth:        (admission as any)?.dateOfBirth ?? "",
      gender:             (admission?.gender as AdmissionFormData["gender"]) ?? "Male",
      bloodGroup:         undefined,
      aadharNumber:       "",
      nationality:        "Indian",
      religion:           "",
      category:           undefined,
      email:              "",
      phone:              (admission as any)?.phone ?? "",
      address:            admission?.address ?? "",
      city:               (admission as any)?.city ?? "",
      state:              (admission as any)?.state ?? "",
      pincode:            (admission as any)?.pincode ?? "",
      classAppliedFor:    admission?.appliedClass ?? "",
      academicYearId:     admission?.academicYear ?? currentYear?.name ?? "",
      previousSchool:     admission?.previousSchool ?? "",
      previousClass:      (admission as any)?.previousClass ?? "",
      previousPercentage: "",
      transferCertificateNo: "",
      fatherName:         (admission as any)?.fatherName ?? "",
      fatherOccupation:   "",
      fatherPhone:        "",
      motherName:         (admission as any)?.motherName ?? "",
      motherOccupation:   "",
      motherPhone:        "",
      guardianPhone:      (admission as any)?.guardianPhone ?? "",
      annualIncome:       "",
      hasSpecialNeeds:    false,
      specialNeedsDetails: "",
      extracurricular:    "",
      medicalConditions:  "",
      remarks:            "",
    },
  });

  const { formState: { errors } } = form;

  // Sync academic year from context when it loads (context reads from localStorage)
  useEffect(() => {
    if (currentYear?.name && !form.getValues('academicYearId')) {
      form.setValue('academicYearId', currentYear.name, { shouldValidate: false });
    }
  }, [currentYear?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepErrorCount = () => {
    const stepKeys = Object.keys((STEP_SCHEMAS[currentStep] as any).shape ?? {});
    return stepKeys.filter((k) => k in errors).length;
  };

  const handleNext = async () => {
    const stepKeys = Object.keys((STEP_SCHEMAS[currentStep] as any).shape ?? {}) as (keyof AdmissionFormData)[];
    const valid    = await form.trigger(stepKeys);
    if (valid) setCurrentStep((s) => Math.min(s + 1, STEPS_COUNT - 1));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSaveStep = async () => {
    if (!admission) return;
    const stepKeys = Object.keys((STEP_SCHEMAS[currentStep] as any).shape ?? {}) as (keyof AdmissionFormData)[];
    const valid    = await form.trigger(stepKeys);
    if (!valid) return;
    setSubmitting(true);
    try {
      const values  = form.getValues();
      const partial = Object.fromEntries(stepKeys.map((k) => [k, values[k]]));
      await admissionService.updateAdmission(admission.id, partial as any);
      toast.success(`${STEP_LABELS[currentStep]} saved`);
    } catch {
      toast.error("Save failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: AdmissionFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        firstName:       data.firstName,
        lastName:        data.lastName,
        dateOfBirth:     data.dateOfBirth,
        gender:          data.gender,
        bloodGroup:      data.bloodGroup,
        category:        data.category,
        aadharNumber:    data.aadharNumber,
        nationality:     data.nationality,
        religion:        data.religion,
        email:           data.email,
        phone:           data.phone,
        address:         data.address,
        city:            data.city,
        state:           data.state,
        pincode:         data.pincode,
        appliedClass:    data.classAppliedFor,
        academicYear:    data.academicYearId ?? "",
        previousSchool:  data.previousSchool,
        previousClass:   data.previousClass,
        previousMarks:   data.previousPercentage ? Number(data.previousPercentage) : undefined,
        guardianName:    data.fatherName,
        guardianRelation: "Father",
        guardianPhone:   data.fatherPhone?.trim() || data.guardianPhone?.trim() || data.phone?.trim() || "",
        fatherName:      data.fatherName,
        motherName:      data.motherName,
        remarks:         data.remarks,
      };
      if (isEditMode) {
        await admissionService.updateAdmission(admission!.id, payload as any);
        setSubmittedInfo({
          appNumber: admission!.applicationNumber,
          studentName: `${data.firstName} ${data.lastName}`,
          academicYear: data.academicYearId,
        });
      } else {
        const result = await admissionService.createAdmission(payload as any);
        // Invalidate the admissions list immediately so it refreshes when the dialog closes
        queryClient.invalidateQueries({ queryKey: ['admissions'] });
        queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
        const appNumber = result.applicationNumber || (result as any).ApplicationNumber || '';
        setSubmittedInfo({
          appNumber,
          studentName: `${data.firstName} ${data.lastName}`,
          academicYear: data.academicYearId,
        });
      }
      setShowSuccessDialog(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Submission failed.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS_COUNT) * 100;

  if (showSuccessDialog && submittedInfo) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-14 space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">
              {isEditMode ? "Application Updated!" : "Application Submitted!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "The application has been saved successfully."
                : "Application received and is pending review."}
            </p>
          </div>
          <div className="w-full max-w-sm bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Application No.</span>
              <span className="font-mono font-semibold text-primary">
                {submittedInfo.appNumber || <span className="text-muted-foreground italic text-xs">Generating…</span>}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Student Name</span>
              <span className="font-medium">{submittedInfo.studentName}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Academic Year</span>
              <span className="font-medium">{submittedInfo.academicYear}</span>
            </div>
          </div>
          <Button onClick={onSuccess} size="lg" className="min-w-[160px]">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {isEditMode ? "Edit Application" : "New Admission Application"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS_COUNT} — {STEP_LABELS[currentStep]}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <StepIndicator
          currentStep={currentStep}
          isEditMode={isEditMode}
          onStepClick={setCurrentStep}
        />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-5">

            {stepErrorCount() > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Fix {stepErrorCount()} error{stepErrorCount() > 1 ? "s" : ""} before continuing.
                </AlertDescription>
              </Alert>
            )}

            {/* ── STEP 0: Student Info ──────────────────────────────── */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Basic student identification details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Rahul" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Sharma" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BLOOD_GROUP_OPTIONS.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (RTE / Reservation)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="aadharNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit Aadhar" maxLength={12} inputMode="numeric" {...field} />
                      </FormControl>
                      <FormDescription>12 digits, no spaces</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl><Input placeholder="Indian" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── STEP 1: Contact ────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Student contact and address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                      </FormControl>
                      <FormDescription>10-digit Indian mobile</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Textarea placeholder="House/Flat No, Street, Colony" rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Hyderabad" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pincode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="500001" maxLength={6} inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── STEP 2: Academic ──────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Class applied for and academic background</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="classAppliedFor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Applied For <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLASS_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="academicYearId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableYears.map((y) => (
                            <SelectItem key={y.id} value={y.name}>
                              {y.name}{y.isCurrent ? " (Current)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="previousSchool" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School</FormLabel>
                      <FormControl><Input placeholder="Previous school name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="previousClass" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Class</FormLabel>
                      <FormControl><Input placeholder="e.g. Class 5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="previousPercentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous % Marks</FormLabel>
                      <FormControl><Input placeholder="85.5" inputMode="decimal" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transferCertificateNo" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Transfer Certificate No.</FormLabel>
                      <FormControl><Input placeholder="TC number (if applicable)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── STEP 3: Parents ───────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Father, mother and guardian details</p>
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Father</Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fatherName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Suresh Kumar" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl><Input placeholder="Software Engineer" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Mother</Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="motherName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother's Name</FormLabel>
                        <FormControl><Input placeholder="Priya Kumar" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="motherOccupation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl><Input placeholder="Homemaker / Teacher" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="motherPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="annualIncome" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Family Income (₹)</FormLabel>
                        <FormControl><Input placeholder="600000" inputMode="numeric" {...field} /></FormControl>
                        <FormDescription>Required for EWS/RTE concession</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Additional ────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Special needs, health and extra-curricular</p>

                <FormField control={form.control} name="hasSpecialNeeds" render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Student has special educational needs (CWSN)</FormLabel>
                      <FormDescription>Check if special accommodations are required</FormDescription>
                    </div>
                  </FormItem>
                )} />

                {form.watch("hasSpecialNeeds") && (
                  <FormField control={form.control} name="specialNeedsDetails" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Needs Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe requirements and accommodations" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="medicalConditions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions / Allergies</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Known medical conditions, allergies, or medications" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="extracurricular" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extra-Curricular Activities</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Sports, arts, music, etc." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="remarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any other information" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Review summary */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                  <p className="font-semibold">Application Summary</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                    <span>Name:</span>
                    <span className="text-foreground font-medium">
                      {form.watch("firstName")} {form.watch("lastName")}
                    </span>
                    <span>Class:</span>
                    <span className="text-foreground font-medium">{form.watch("classAppliedFor") || "—"}</span>
                    <span>Gender:</span>
                    <span className="text-foreground font-medium">{form.watch("gender") || "—"}</span>
                    <span>Father:</span>
                    <span className="text-foreground font-medium">{form.watch("fatherName") || "—"}</span>
                    <span>Phone:</span>
                    <span className="text-foreground font-medium">{form.watch("phone") || "—"}</span>
                  </div>
                </div>
              </div>
            )}

          </CardContent>

          {/* ── Navigation ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onClose : handleBack}
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {currentStep === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              {isEditMode && (
                <Button type="button" variant="secondary" onClick={handleSaveStep} disabled={submitting}>
                  {submitting ? "Saving…" : "Save Step"}
                </Button>
              )}
              {currentStep < STEPS_COUNT - 1 ? (
                <Button type="button" onClick={handleNext} disabled={submitting}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="min-w-[130px]">
                  {submitting ? "Submitting…" : isEditMode ? "Update Application" : "Submit Application"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
