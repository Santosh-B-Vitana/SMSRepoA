
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STEP_ICONS = [User, UserRound, Briefcase, CreditCard, HeartPulse, ShieldCheck];

const DEPARTMENTS = [
  "Mathematics", "Science", "English", "Hindi", "Social Studies",
  "Physics", "Chemistry", "Biology", "Computer Science", "History",
  "Geography", "Physical Education", "Arts", "Music", "Commerce",
  "Accounts", "Administration", "Support Staff", "Library",
] as const;

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
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STAFF_STEP_LABELS.map((label, idx) => {
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
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all min-w-[64px]",
                isActive    && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isActive    && "bg-primary-foreground/20",
                isCompleted && "bg-primary",
                !isActive && !isCompleted && "bg-muted"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
            </button>
            {idx < STAFF_STEPS_COUNT - 1 && (
              <div className={cn(
                "h-0.5 w-4 mx-0.5 rounded transition-colors",
                idx < currentStep ? "bg-primary" : "bg-muted"
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
  const isEditMode = !!staff;

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
        toast.success("Staff member updated successfully");
      } else {
        await staffApi.create(payload as any);
        toast.success("Staff member added successfully");
      }
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to save staff member";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STAFF_STEPS_COUNT) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-4 px-2">
      <Card className="w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="pb-4 sticky top-0 bg-card z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {isEditMode ? "Edit Staff Member" : "Add New Staff Member"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {STAFF_STEPS_COUNT} â€” {STAFF_STEP_LABELS[currentStep]}</span>
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
            <CardContent className="space-y-5 pt-5">

              {stepErrorCount() > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fix {stepErrorCount()} error{stepErrorCount() > 1 ? "s" : ""} before continuing.
                  </AlertDescription>
                </Alert>
              )}

              {/* â”€â”€ STEP 0: Basic Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Core employment details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Ramesh" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Kumar" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="designation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Senior Teacher" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
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
                        <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input type="email" placeholder="ramesh@school.edu" {...field} /></FormControl>
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
                    <FormField control={form.control} name="joiningDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining Date <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="probation">Probation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Address</FormLabel>
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
                  <p className="text-sm text-muted-foreground">Personal and demographic details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dob" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
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
                    <FormField control={form.control} name="religion" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Religion</FormLabel>
                        <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marital Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
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
                  <p className="text-sm text-muted-foreground">Employment and work details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full_time">Full-Time Permanent</SelectItem>
                            <SelectItem value="part_time">Part-Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="guest">Guest Faculty</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="experience" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Experience (years)</FormLabel>
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
                        <FormLabel>Confirmation Date</FormLabel>
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
                        <FormLabel>Annual Leave Days</FormLabel>
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
                        <FormLabel>Working Days</FormLabel>
                        <FormControl><Input placeholder="Monâ€“Sat" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="specialization" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Subjects / Specialization</FormLabel>
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
                  <p className="text-sm text-muted-foreground">Government IDs and bank account details</p>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">Government IDs</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="aadharNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhar Number</FormLabel>
                          <FormControl>
                            <Input placeholder="12 digits" maxLength={12} inputMode="numeric" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="panNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ABCDE1234F" maxLength={10} {...field} style={{ textTransform: "uppercase" }} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="passportNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number</FormLabel>
                          <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline">Bank Details</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="bankName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl><Input placeholder="State Bank of India" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl><Input inputMode="numeric" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ifscCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
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
                      <Badge variant="outline">PF / ESI / UAN</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="pfNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PF Number</FormLabel>
                          <FormControl><Input placeholder="TN/CHE/0123456/001/00001" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="esiNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ESI Number</FormLabel>
                          <FormControl><Input inputMode="numeric" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="uanNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>UAN Number</FormLabel>
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
                  <p className="text-sm text-muted-foreground">Health details and emergency contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
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
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl><Input placeholder="Dust, pollen, etc. (if any)" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="chronicConditions" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Chronic Conditions</FormLabel>
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
                      <Badge variant="outline">Emergency Contact</Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl><Input placeholder="Spouse / Parent name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="9876543210" maxLength={10} inputMode="numeric" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactRelationship" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
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
                  <p className="text-sm text-muted-foreground">Qualifications and compliance verification</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="highestQualification" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highest Qualification</FormLabel>
                        <FormControl><Input placeholder="B.Ed., M.Sc., etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="university" render={({ field }) => (
                      <FormItem>
                        <FormLabel>University / Institution</FormLabel>
                        <FormControl><Input placeholder="Osmania University" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passingYear" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year of Passing</FormLabel>
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
                    <h4 className="text-sm font-semibold">Verification Checklist</h4>
                    {([
                      { name: "backgroundVerified", label: "Background verification completed" },
                      { name: "policeClearance",    label: "Police clearance certificate obtained" },
                      { name: "medicalCheckup",     label: "Pre-employment medical checkup done" },
                      { name: "documentConsent",    label: "Document usage consent obtained" },
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
                    <p className="font-semibold">Staff Summary</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                      <span>Name:</span>
                      <span className="text-foreground font-medium">
                        {form.watch("firstName")} {form.watch("lastName")}
                      </span>
                      <span>Designation:</span>
                      <span className="text-foreground font-medium">{form.watch("designation") || "â€”"}</span>
                      <span>Department:</span>
                      <span className="text-foreground font-medium">{form.watch("department") || "â€”"}</span>
                      <span>Email:</span>
                      <span className="text-foreground font-medium">{form.watch("email") || "â€”"}</span>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>

            {/* â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 sticky bottom-0">
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
                {currentStep < STAFF_STEPS_COUNT - 1 ? (
                  <Button type="button" onClick={handleNext} disabled={submitting}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="min-w-[130px]">
                    {submitting
                      ? "Savingâ€¦"
                      : isEditMode
                      ? "Update Staff Member"
                      : "Add Staff Member"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}

