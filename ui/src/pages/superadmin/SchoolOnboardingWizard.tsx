import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, GraduationCap, User, ShieldCheck, Rocket,
  CheckCircle2, ArrowLeft, ArrowRight, Eye, EyeOff,
  RefreshCw, Copy, Check, ChevronDown, ChevronUp,
  Users, CalendarDays, CreditCard, Clock, BookOpen,
  Megaphone, BarChart2, FolderOpen, ClipboardList,
  Library, Bus, Home, Heart, Wallet, MessageSquare,
  TrendingUp, Award, ShoppingBag, FileText, Sparkles,
  School, Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as superAdminApi from "@/services/api/superAdminApi";
import type { OnboardSchoolResult } from "@/services/api/superAdminApi";
import { boardApi } from "@/services/api/boardApi";
import type { BoardConfigurationResponse } from "@/services/api/boardApi";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardData {
  school: {
    name: string;
    schoolCode: string;
    schoolType: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
  };
  year: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  };
  admin: {
    username: string;
    email: string;
    password: string;
    autoGenerate: boolean;
  };
  modules: Record<string, boolean>;
  boards: {
    selected: string[];       // boardConfigurationId[]
    defaultBoardId: string;   // which one is the default
    names: Record<string, string>; // id → display name for review
  };
}

// ─── Module definitions ───────────────────────────────────────────────────────

const ALL_MODULES = [
  { key: "students",       label: "Students",        icon: GraduationCap,   desc: "Enrollment, profiles & records",       defaultOn: true  },
  { key: "staff",          label: "Staff",           icon: Users,           desc: "Staff management & roles",             defaultOn: true  },
  { key: "attendance",     label: "Attendance",      icon: CalendarDays,    desc: "Daily attendance & reports",           defaultOn: true  },
  { key: "fees",           label: "Fees",            icon: CreditCard,      desc: "Fee collection & receipts",            defaultOn: true  },
  { key: "timetable",      label: "Timetable",       icon: Clock,           desc: "Class scheduling & timetables",        defaultOn: true  },
  { key: "examinations",   label: "Examinations",    icon: FileText,        desc: "Exams, marks & report cards",          defaultOn: true  },
  { key: "announcements",  label: "Announcements",   icon: Megaphone,       desc: "Notices & school circulars",           defaultOn: true  },
  { key: "reports",        label: "Reports",         icon: BarChart2,       desc: "Analytics & export reports",           defaultOn: true  },
  { key: "documents",      label: "Documents",       icon: FolderOpen,      desc: "Document storage & management",        defaultOn: true  },
  { key: "admissions",     label: "Admissions",      icon: ClipboardList,   desc: "New student admissions & enquiries",   defaultOn: true  },
  { key: "library",        label: "Library",         icon: Library,         desc: "Catalog, issue & return tracking",     defaultOn: true  },
  { key: "transport",      label: "Transport",       icon: Bus,             desc: "Bus routes & transport fees",          defaultOn: false },
  { key: "hostel",         label: "Hostel",          icon: Home,            desc: "Hostel rooms & mess management",       defaultOn: false },
  { key: "health",         label: "Health",          icon: Heart,           desc: "Student health & medical records",     defaultOn: true  },
  { key: "payroll",        label: "Payroll",         icon: Wallet,          desc: "Salary, PF/ESI & payslips",           defaultOn: true  },
  { key: "communication",  label: "Communication",   icon: MessageSquare,   desc: "SMS, emails & parent messaging",       defaultOn: true  },
  { key: "analytics",      label: "Analytics",       icon: TrendingUp,      desc: "Advanced dashboards & insights",       defaultOn: true  },
  { key: "certificates",   label: "Certificates",    icon: Award,           desc: "Certificates & achievements",          defaultOn: true  },
  { key: "store",          label: "Store",           icon: ShoppingBag,     desc: "School canteen & store management",   defaultOn: false },
  { key: "wallet",         label: "Wallet",          icon: BookOpen,        desc: "Student digital wallet & prepaid",     defaultOn: false },
];

const DEFAULT_MODULES: Record<string, boolean> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.defaultOn])
);

// ─── Utility helpers ─────────────────────────────────────────────────────────

function generateSchoolCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const code = words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
  const suffix = Math.floor(100 + Math.random() * 900);
  return code ? `${code}${suffix}` : `SCH${suffix}`;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const parts = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)];
  // fill to 12 chars
  const all = upper + lower + digits + special;
  while (parts.length < 12) parts.push(pick(all));
  return parts.sort(() => Math.random() - 0.5).join("");
}

function suggestAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  return {
    name: `${startYear}-${endYear}`,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
  };
}

const yearSuggestion = suggestAcademicYear();

const INITIAL_DATA: WizardData = {
  school: { name: "", schoolCode: "", schoolType: "independent", address: "", phone: "", email: "", logo: "" },
  year: { name: yearSuggestion.name, startDate: yearSuggestion.startDate, endDate: yearSuggestion.endDate, isCurrent: true },
  admin: { username: "", email: "", password: generatePassword(), autoGenerate: true },
  modules: { ...DEFAULT_MODULES },
  boards: { selected: [], defaultBoardId: "", names: {} },
};

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "School Profile", icon: Building2 },
  { id: 2, label: "Academic Year",  icon: CalendarDays },
  { id: 3, label: "Admin Account",  icon: User },
  { id: 4, label: "Modules",        icon: ShieldCheck },
  { id: 5, label: "Boards",         icon: BookOpen },
  { id: 6, label: "Review & Launch",icon: Rocket },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchoolOnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<OnboardSchoolResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [existingSchools, setExistingSchools] = useState<superAdminApi.SchoolListItem[]>([]);

  // Load existing schools once on mount for duplicate / onboarded detection
  useEffect(() => {
    superAdminApi.getAllSchools()
      .then(setExistingSchools)
      .catch(() => {/* non-critical */});
  }, []);

  // Derived helpers from existing schools
  const codeUpper = data.school.schoolCode.trim().toUpperCase();
  const matchingSchool = codeUpper ? existingSchools.find((s) => s.schoolCode.toUpperCase() === codeUpper) : undefined;
  const codeAlreadyExists = !!matchingSchool;
  const codeIsOnboarded  = !!matchingSchool?.isOnboarded;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const patchSchool = (patch: Partial<WizardData["school"]>) =>
    setData((d) => ({ ...d, school: { ...d.school, ...patch } }));

  const patchYear = (patch: Partial<WizardData["year"]>) =>
    setData((d) => ({ ...d, year: { ...d.year, ...patch } }));

  const patchAdmin = (patch: Partial<WizardData["admin"]>) =>
    setData((d) => ({ ...d, admin: { ...d.admin, ...patch } }));

  const toggleModule = (key: string) =>
    setData((d) => ({ ...d, modules: { ...d.modules, [key]: !d.modules[key] } }));

  const patchBoards = (patch: Partial<WizardData["boards"]>) =>
    setData((d) => ({ ...d, boards: { ...d.boards, ...patch } }));

  const clearError = (key: string) =>
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep = useCallback((s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!data.school.name.trim())       errs.name = "School name is required";
      if (!data.school.schoolCode.trim()) errs.schoolCode = "School code is required";
      if (!/^[A-Z0-9]{3,20}$/i.test(data.school.schoolCode.trim()))
        errs.schoolCode = "Code must be 3-20 alphanumeric characters";
      else if (codeIsOnboarded)
        errs.schoolCode = "This school has already been fully onboarded — cannot run setup again";
      else if (codeAlreadyExists)
        errs.schoolCode = "This school code is already in use — choose a different one";
      if (data.school.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.school.email))
        errs.email = "Enter a valid email address";
    }

    if (s === 2) {
      if (!data.year.name.trim()) errs.yearName = "Academic year name is required";
      if (!data.year.startDate)   errs.startDate = "Start date is required";
      if (!data.year.endDate)     errs.endDate = "End date is required";
      if (data.year.startDate && data.year.endDate && data.year.startDate >= data.year.endDate)
        errs.endDate = "End date must be after start date";
    }

    if (s === 3) {
      if (!data.admin.username.trim()) errs.username = "Admin name is required";
      if (!data.admin.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.admin.email))
        errs.adminEmail = "Enter a valid email address";
      if (!data.admin.password || data.admin.password.length < 8)
        errs.password = "Password must be at least 8 characters";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [data]);

  const goNext = () => { if (validateStep(step)) setStep((s) => s + 1); };
  const goBack = () => { setErrors({}); setStep((s) => s - 1); };

  // ── Launch ────────────────────────────────────────────────────────────────

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      // Compute only non-default module overrides
      const overrides: Record<string, boolean> = {};
      for (const m of ALL_MODULES) {
        if (data.modules[m.key] !== m.defaultOn) overrides[m.key] = data.modules[m.key];
      }

      const res = await superAdminApi.onboardSchool({
        name: data.school.name.trim(),
        schoolCode: data.school.schoolCode.trim().toUpperCase(),
        address: data.school.address.trim() || undefined,
        phone: data.school.phone.trim() || undefined,
        email: data.school.email.trim() || undefined,
        logo: data.school.logo.trim() || undefined,
        academicYearName: data.year.name.trim(),
        academicYearStart: data.year.startDate,
        academicYearEnd: data.year.endDate,
        academicYearIsCurrent: data.year.isCurrent,
        adminUsername: data.admin.username.trim(),
        adminEmail: data.admin.email.trim(),
        adminPassword: data.admin.password,
        moduleOverrides: Object.keys(overrides).length ? overrides : undefined,
        boardConfigurationIds: data.boards.selected.length ? data.boards.selected : undefined,
        defaultBoardConfigurationId: data.boards.defaultBoardId || (data.boards.selected[0] ?? undefined),
      });

      setResult(res);
      toast.success(`${res.schoolName} launched successfully!`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to onboard school. Please try again.";
      if (status === 409) {
        // Duplicate school code — go back to step 1 and highlight the field
        setStep(1);
        setErrors({ schoolCode: "This school code is already taken — please choose a different one" });
        // Refresh schools list so the live duplicate/onboarded detection updates
        superAdminApi.getAllSchools().then(setExistingSchools).catch(() => {});
        toast.error("School code already in use. Please choose a unique code.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLaunching(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
              <div className="flex justify-center mb-3">
                <div className="bg-white/20 rounded-full p-4">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">School Launched!</CardTitle>
              <CardDescription className="text-green-100 text-base">
                {result.schoolName} is ready to go
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* School details */}
              <div className="grid grid-cols-2 gap-4">
                <DetailCard label="School Name" value={result.schoolName} />
                <DetailCard label="School Code" value={result.schoolCode} />
              </div>

              {/* Credentials */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Login Credentials — Save these securely!
                </div>
                <CopyRow
                  label="Email"
                  value={result.adminEmail}
                  copyId="email"
                  copied={copied}
                  onCopy={copyToClipboard}
                />
                <CopyRow
                  label="Password"
                  value={data.admin.password}
                  copyId="password"
                  copied={copied}
                  onCopy={copyToClipboard}
                  masked={!showPassword}
                />
                <button
                  className="text-xs text-amber-600 underline"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"} password
                </button>
              </div>

              {/* Academic Year */}
              <DetailCard
                label="Academic Year"
                value={`${result.academicYearName}${result.enabledModules.length ? ` · ${result.enabledModules.length} modules enabled` : ""}`}
              />

              {/* Enabled modules */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Enabled Modules</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.enabledModules.map((m) => (
                    <Badge key={m} variant="secondary" className="capitalize text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => navigate("/superadmin/schools")}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Back to Schools
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResult(null);
                    setStep(1);
                    setData({
                      ...INITIAL_DATA,
                      school: { ...INITIAL_DATA.school },
                      admin: { ...INITIAL_DATA.admin, password: generatePassword() },
                    });
                  }}
                >
                  <School className="h-4 w-4 mr-2" />
                  Onboard Another School
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Wizard Layout ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin/schools")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-indigo-600" />
              School Onboarding Wizard
            </h1>
            <p className="text-sm text-muted-foreground">Set up a new school from start to finish</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <StepIndicator current={step} steps={STEPS} />

        <div className="mt-8">
          {step === 1 && (
            <StepSchoolProfile
              data={data.school}
              errors={errors}
              codeAlreadyExists={codeAlreadyExists}
              codeIsOnboarded={codeIsOnboarded}
              onChange={patchSchool}
              onClearError={clearError}
            />
          )}
          {step === 2 && (
            <StepAcademicYear
              data={data.year}
              errors={errors}
              onChange={patchYear}
              onClearError={clearError}
            />
          )}
          {step === 3 && (
            <StepAdminAccount
              data={data.admin}
              errors={errors}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onChange={patchAdmin}
              onClearError={clearError}
              onRegenPassword={() => patchAdmin({ password: generatePassword() })}
            />
          )}
          {step === 4 && (
            <StepModules
              modules={data.modules}
              onToggle={toggleModule}
            />
          )}
          {step === 5 && (
            <StepBoards
              boards={data.boards}
              onChange={patchBoards}
            />
          )}
          {step === 6 && (
            <StepReview
              data={data}
              launching={launching}
              onLaunch={handleLaunch}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 1 || launching}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < 6 ? (
            <Button
              onClick={goNext}
              disabled={step === 1 && codeAlreadyExists}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={launching}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white min-w-[160px]"
            >
              {launching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Launch School
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: number; steps: typeof STEPS }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  done  && "bg-indigo-600 text-white",
                  active && "bg-indigo-600 text-white ring-4 ring-indigo-200",
                  !done && !active && "bg-gray-200 text-gray-500"
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium hidden sm:block",
                active && "text-indigo-600",
                done   && "text-indigo-400",
                !done && !active && "text-gray-400"
              )}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-1 mb-5 transition-colors duration-300",
                s.id < current ? "bg-indigo-600" : "bg-gray-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: School Profile ───────────────────────────────────────────────────

function StepSchoolProfile({
  data, errors, codeAlreadyExists, codeIsOnboarded, onChange, onClearError,
}: {
  data: WizardData["school"];
  errors: Record<string, string>;
  codeAlreadyExists: boolean;
  codeIsOnboarded: boolean;
  onChange: (patch: Partial<WizardData["school"]>) => void;
  onClearError: (k: string) => void;
}) {
  const handleNameBlur = () => {
    if (data.name && !data.schoolCode) {
      onChange({ schoolCode: generateSchoolCode(data.name) });
    }
  };

  return (
    <WizardCard title="School Profile" description="Tell us about your school">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <FieldLabel required>School Name</FieldLabel>
          <Input
            placeholder="e.g. Green Valley Public School"
            value={data.name}
            onChange={(e) => { onChange({ name: e.target.value }); onClearError("name"); }}
            onBlur={handleNameBlur}
            className={errors.name ? "border-red-400" : ""}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </div>

        <div>
          <FieldLabel required>School Code</FieldLabel>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. GVPS001"
              value={data.schoolCode}
              onChange={(e) => { onChange({ schoolCode: e.target.value.toUpperCase() }); onClearError("schoolCode"); }}
              className={cn("font-mono", (errors.schoolCode || codeAlreadyExists) ? "border-red-400" : "")}
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              title="Auto-generate code from school name"
              onClick={() => onChange({ schoolCode: generateSchoolCode(data.name || "SCH") })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {errors.schoolCode
            ? <FieldError>{errors.schoolCode}</FieldError>
            : codeIsOnboarded
              ? <FieldError>🚫 This school has already been fully onboarded — setup cannot be re-run</FieldError>
              : codeAlreadyExists
                ? <FieldError>⚠️ This school code is already taken — please choose a different one</FieldError>
                : <p className="text-xs text-muted-foreground mt-1">Unique identifier — cannot be changed later</p>
          }
        </div>

        <div>
          <FieldLabel>School Type</FieldLabel>
          <Select value={data.schoolType} onValueChange={(v) => onChange({ schoolType: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="independent">Independent School</SelectItem>
              <SelectItem value="chain">Chain / Group HQ</SelectItem>
              <SelectItem value="branch">Branch of existing chain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel>Official Phone</FieldLabel>
          <Input
            placeholder="+91 98765 43210"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>Official Email</FieldLabel>
          <Input
            type="email"
            placeholder="principal@school.edu"
            value={data.email}
            onChange={(e) => { onChange({ email: e.target.value }); onClearError("email"); }}
            className={errors.email ? "border-red-400" : ""}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Address</FieldLabel>
          <Textarea
            placeholder="Street, City, State, PIN / ZIP"
            rows={2}
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Logo URL</FieldLabel>
          <Input
            placeholder="https://yourschool.com/logo.png (optional)"
            value={data.logo}
            onChange={(e) => onChange({ logo: e.target.value })}
          />
        </div>
      </div>
    </WizardCard>
  );
}

// ─── Step 2: Academic Year ────────────────────────────────────────────────────

function StepAcademicYear({
  data, errors, onChange, onClearError,
}: {
  data: WizardData["year"];
  errors: Record<string, string>;
  onChange: (patch: Partial<WizardData["year"]>) => void;
  onClearError: (k: string) => void;
}) {
  return (
    <WizardCard title="Academic Year" description="Set the first academic year for this school">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <FieldLabel required>Year Name</FieldLabel>
          <Input
            placeholder="e.g. 2026-2027"
            value={data.name}
            onChange={(e) => { onChange({ name: e.target.value }); onClearError("yearName"); }}
            className={errors.yearName ? "border-red-400" : ""}
          />
          {errors.yearName && <FieldError>{errors.yearName}</FieldError>}
          <p className="text-xs text-muted-foreground mt-1">
            Auto-suggested based on today's date. Edit if needed.
          </p>
        </div>

        <div>
          <FieldLabel required>Start Date</FieldLabel>
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => { onChange({ startDate: e.target.value }); onClearError("startDate"); }}
            className={errors.startDate ? "border-red-400" : ""}
          />
          {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
        </div>

        <div>
          <FieldLabel required>End Date</FieldLabel>
          <Input
            type="date"
            value={data.endDate}
            onChange={(e) => { onChange({ endDate: e.target.value }); onClearError("endDate"); }}
            className={errors.endDate ? "border-red-400" : ""}
          />
          {errors.endDate && <FieldError>{errors.endDate}</FieldError>}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <Switch
              checked={data.isCurrent}
              onCheckedChange={(v) => onChange({ isCurrent: v })}
              id="isCurrent"
            />
            <Label htmlFor="isCurrent" className="cursor-pointer">
              <span className="font-medium">Mark as current academic year</span>
              <p className="text-xs text-muted-foreground">
                This year will be auto-selected for attendance, exams and reports
              </p>
            </Label>
          </div>
        </div>
      </div>
    </WizardCard>
  );
}

// ─── Step 3: Admin Account ────────────────────────────────────────────────────

function StepAdminAccount({
  data, errors, showPassword, setShowPassword, onChange, onClearError, onRegenPassword,
}: {
  data: WizardData["admin"];
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onChange: (patch: Partial<WizardData["admin"]>) => void;
  onClearError: (k: string) => void;
  onRegenPassword: () => void;
}) {
  const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];
    return { score, label: labels[score] || "Weak", color: colors[score] || "bg-red-500" };
  };

  const strength = passwordStrength(data.password);

  return (
    <WizardCard title="Admin Account" description="Create the school's administrator login">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Admin Name / Username</FieldLabel>
          <Input
            placeholder="e.g. john.doe or Principal Name"
            value={data.username}
            onChange={(e) => { onChange({ username: e.target.value }); onClearError("username"); }}
            className={errors.username ? "border-red-400" : ""}
          />
          {errors.username && <FieldError>{errors.username}</FieldError>}
        </div>

        <div>
          <FieldLabel required>Admin Email</FieldLabel>
          <Input
            type="email"
            placeholder="admin@school.edu"
            value={data.email}
            onChange={(e) => { onChange({ email: e.target.value }); onClearError("adminEmail"); }}
            className={errors.adminEmail ? "border-red-400" : ""}
          />
          {errors.adminEmail && <FieldError>{errors.adminEmail}</FieldError>}
          <p className="text-xs text-muted-foreground mt-1">Used to log in to the school portal</p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <FieldLabel required>Password</FieldLabel>
            <div className="flex items-center gap-2">
              <Switch
                checked={data.autoGenerate}
                onCheckedChange={(v) => {
                  onChange({ autoGenerate: v });
                  if (v) onRegenPassword();
                }}
                id="autoGen"
              />
              <Label htmlFor="autoGen" className="text-xs cursor-pointer">Auto-generate</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={data.password}
                readOnly={data.autoGenerate}
                onChange={(e) => { if (!data.autoGenerate) { onChange({ password: e.target.value }); onClearError("password"); } }}
                className={cn("pr-10 font-mono", errors.password ? "border-red-400" : "", data.autoGenerate ? "bg-muted" : "")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {data.autoGenerate && (
              <Button variant="outline" size="icon" onClick={onRegenPassword} title="Generate new password">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          {errors.password && <FieldError>{errors.password}</FieldError>}

          {/* Password strength */}
          {data.password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= strength.score ? strength.color : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{strength.label} password</p>
            </div>
          )}

          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Share these credentials securely with the school administrator
          </p>
        </div>
      </div>
    </WizardCard>
  );
}

// ─── Step 4: Modules ──────────────────────────────────────────────────────────

function StepModules({
  modules, onToggle,
}: {
  modules: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const enabledCount = Object.values(modules).filter(Boolean).length;

  return (
    <WizardCard
      title="Module Permissions"
      description={`Choose which features to activate for this school · ${enabledCount} of ${ALL_MODULES.length} enabled`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_MODULES.map((m) => {
          const Icon = m.icon;
          const enabled = modules[m.key] ?? m.defaultOn;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onToggle(m.key)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                enabled
                  ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-60"
              )}
            >
              <div className={cn(
                "rounded-md p-1.5 mt-0.5 shrink-0",
                enabled ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-500"
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium", enabled ? "text-indigo-900" : "text-gray-500")}>
                    {m.label}
                  </span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => onToggle(m.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-2 scale-75"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        You can change module permissions at any time from the School Management panel.
      </p>
    </WizardCard>
  );
}

// ─── Step 5: Boards ──────────────────────────────────────────────────────────

function StepBoards({
  boards, onChange,
}: {
  boards: WizardData["boards"];
  onChange: (patch: Partial<WizardData["boards"]>) => void;
}) {
  const [allBoards, setAllBoards] = useState<BoardConfigurationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    boardApi.getAllBoards()
      .then((res) => setAllBoards(res.boards.filter((b) => b.isActive)))
      .catch(() => {/* non-critical — boards can be set up later */})
      .finally(() => setLoading(false));
  }, []);

  const toggleBoard = (id: string, name: string) => {
    const isSelected = boards.selected.includes(id);
    const newSelected = isSelected
      ? boards.selected.filter((s) => s !== id)
      : [...boards.selected, id];

    const newNames = { ...boards.names };
    if (isSelected) delete newNames[id]; else newNames[id] = name;

    // If we removed the current default, pick the first remaining or clear
    const newDefault = isSelected && boards.defaultBoardId === id
      ? (newSelected[0] ?? "")
      : (boards.defaultBoardId || (newSelected[0] ?? ""));

    onChange({ selected: newSelected, defaultBoardId: newDefault, names: newNames });
  };

  const setDefault = (id: string) => {
    if (!boards.selected.includes(id)) return;
    onChange({ defaultBoardId: id });
  };

  return (
    <WizardCard
      title="Boards & Curriculum"
      description="Select the boards/curricula this school follows. You can add or change these later."
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading available boards…
        </div>
      ) : allBoards.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No boards found. You can configure boards after onboarding from the Board Settings page.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allBoards.map((board) => {
              const isSelected = boards.selected.includes(board.id);
              const isDefault  = boards.defaultBoardId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => toggleBoard(board.id, board.name)}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-4 transition-all",
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-border bg-card hover:border-indigo-200 hover:bg-indigo-50/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{board.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {board.code}{board.boardLevel ? ` · ${board.boardLevel}` : ""}
                      </p>
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        title={isDefault ? "Default board" : "Set as default"}
                        onClick={(e) => { e.stopPropagation(); setDefault(board.id); }}
                        className={cn(
                          "shrink-0 rounded-full p-1 transition-colors",
                          isDefault
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-muted-foreground/40 hover:text-amber-400"
                        )}
                      >
                        <Star className={cn("h-4 w-4", isDefault && "fill-amber-400")} />
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {boards.selected.length > 0 && (
            <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800 flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>{allBoards.find((b) => b.id === boards.defaultBoardId)?.name ?? "—"}</strong>
                {" "}is set as the default board. Click the star on any selected board to change it.
              </span>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Boards can be skipped and configured later under Academic Settings.
          </p>
        </>
      )}
    </WizardCard>
  );
}

// ─── Step 6: Review & Launch ──────────────────────────────────────────────────

function StepReview({
  data, launching, onLaunch,
}: {
  data: WizardData;
  launching: boolean;
  onLaunch: () => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (s: string) => setOpenSection((v) => (v === s ? null : s));
  const enabledModules = ALL_MODULES.filter((m) => data.modules[m.key] ?? m.defaultOn);

  return (
    <WizardCard title="Review & Launch" description="Everything looks good? Let's go!">
      <div className="space-y-3">
        <ReviewSection
          id="school"
          title="School Profile"
          icon={Building2}
          open={openSection === "school"}
          onToggle={() => toggle("school")}
        >
          <ReviewRow label="Name"   value={data.school.name} />
          <ReviewRow label="Code"   value={data.school.schoolCode.toUpperCase()} mono />
          <ReviewRow label="Type"   value={data.school.schoolType} />
          {data.school.phone   && <ReviewRow label="Phone"   value={data.school.phone} />}
          {data.school.email   && <ReviewRow label="Email"   value={data.school.email} />}
          {data.school.address && <ReviewRow label="Address" value={data.school.address} />}
        </ReviewSection>

        <ReviewSection
          id="year"
          title="Academic Year"
          icon={CalendarDays}
          open={openSection === "year"}
          onToggle={() => toggle("year")}
        >
          <ReviewRow label="Year"    value={data.year.name} />
          <ReviewRow label="Start"   value={data.year.startDate} />
          <ReviewRow label="End"     value={data.year.endDate} />
          <ReviewRow label="Current" value={data.year.isCurrent ? "Yes" : "No"} />
        </ReviewSection>

        <ReviewSection
          id="admin"
          title="Admin Account"
          icon={User}
          open={openSection === "admin"}
          onToggle={() => toggle("admin")}
        >
          <ReviewRow label="Username" value={data.admin.username} />
          <ReviewRow label="Email"    value={data.admin.email} />
          <ReviewRow label="Password" value="••••••••••••" />
        </ReviewSection>

        <ReviewSection
          id="modules"
          title={`Modules (${enabledModules.length} enabled)`}
          icon={ShieldCheck}
          open={openSection === "modules"}
          onToggle={() => toggle("modules")}
        >
          <div className="flex flex-wrap gap-1.5 pt-1">
            {enabledModules.map((m) => (
              <Badge key={m.key} variant="secondary" className="capitalize text-xs gap-1">
                <m.icon className="h-3 w-3" />
                {m.label}
              </Badge>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection
          id="boards"
          title={data.boards.selected.length > 0 ? `Boards (${data.boards.selected.length} selected)` : "Boards (none — can configure later)"}
          icon={BookOpen}
          open={openSection === "boards"}
          onToggle={() => toggle("boards")}
        >
          {data.boards.selected.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No boards selected. You can configure boards after onboarding.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.boards.selected.map((id) => (
                <Badge
                  key={id}
                  variant={id === data.boards.defaultBoardId ? "default" : "secondary"}
                  className="text-xs gap-1"
                >
                  {id === data.boards.defaultBoardId && <Star className="h-3 w-3 fill-current" />}
                  {data.boards.names[id] ?? id}
                </Badge>
              ))}
            </div>
          )}
        </ReviewSection>
      </div>

      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm text-green-800">
          <strong>Ready to launch!</strong> Clicking "Launch School" will create the school,
          set up the academic year, enable selected modules, and create the admin account
          — all in one step.
        </p>
      </div>
    </WizardCard>
  );
}

// ─── Review section accordion ─────────────────────────────────────────────────

function ReviewSection({
  id, title, icon: Icon, open, onToggle, children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-sm">
          <Icon className="h-4 w-4 text-indigo-600" />
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 border-t bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );
}

// ─── Success screen helpers ───────────────────────────────────────────────────

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function CopyRow({
  label, value, copyId, copied, onCopy, masked,
}: {
  label: string;
  value: string;
  copyId: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  masked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-amber-700 w-16 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-sm text-amber-900 truncate">
        {masked ? "••••••••••••" : value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-amber-700 hover:text-amber-900 shrink-0"
        onClick={() => onCopy(value, copyId)}
      >
        {copied === copyId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function WizardCard({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-sm font-medium mb-1.5 block">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-500 mt-1">{children}</p>;
}
