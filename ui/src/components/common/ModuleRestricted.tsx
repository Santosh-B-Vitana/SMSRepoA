import { Lock, ArrowLeft, Sparkles, Zap, CheckCircle2, Star, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ModuleRestrictedProps {
  moduleName: string;
  moduleLabel?: string;
  /** 'module' = super-admin disabled this module (Pro upgrade UI)
   *  'role'   = staff user's role doesn't have View access */
  restrictedBy?: 'module' | 'role';
}

const MODULE_LABELS: Record<string, string> = {
  students: "Students",
  staff: "Staff",
  attendance: "Attendance",
  fees: "Fees & Finance",
  timetable: "Timetable",
  examinations: "Examinations",
  announcements: "Announcements",
  reports: "Reports",
  documents: "Documents",
  admissions: "Admissions",
  library: "Library",
  transport: "Transport",
  hostel: "Hostel",
  health: "Health",
  payroll: "Payroll",
  communication: "Communication",
  analytics: "Analytics",
  certificates: "Certificates",
  store: "Store",
  wallet: "Wallet",
};

const MODULE_HIGHLIGHTS: Record<string, string[]> = {
  library: ["Manage books & inventory", "Track student borrowing", "Automated overdue reminders"],
  transport: ["Live route tracking", "Driver & vehicle management", "Parent notifications"],
  hostel: ["Room allocation & occupancy", "Warden communication", "Leave & visitor tracking"],
  health: ["Student health records", "Incident management", "Medical history & reports"],
  analytics: ["AI-powered insights", "Attendance & fee trends", "Custom dashboards"],
  communication: ["Bulk SMS & email", "Parent-teacher messaging", "Class broadcasts"],
  wallet: ["Digital fee payments", "Expense tracking", "Instant reconciliation"],
  store: ["POS & inventory", "Product catalogue", "Sales reports"],
  examinations: ["Exam scheduling", "Mark entry & report cards", "Performance analytics"],
  fees: ["Fee structure setup", "Online payments", "Overdue tracking & reminders"],
  timetable: ["Smart timetable builder", "Conflict detection", "Teacher schedules"],
  reports: ["Custom report builder", "Export to PDF & Excel", "Board-ready formats"],
};

export function ModuleRestricted({ moduleName, moduleLabel, restrictedBy = 'module' }: ModuleRestrictedProps) {
  const navigate = useNavigate();
  const label = moduleLabel ?? MODULE_LABELS[moduleName] ?? moduleName;

  // Role-based restriction: simple access-denied card
  if (restrictedBy === 'role') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your current role does not have permission to view the{" "}
            <strong className="text-foreground">{label}</strong> module. Contact your administrator to request access.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const highlights = MODULE_HIGHLIGHTS[moduleName] ?? [
    "Unlock powerful management tools",
    "Streamline school operations",
    "Save time & reduce manual work",
  ];

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        {/* Hero card */}
        <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-50/30 dark:to-blue-950/20 shadow-xl p-8 text-center">
          {/* Decorative glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/10 rounded-full blur-3xl" />
          </div>

          {/* Badge */}
          <Badge className="mb-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1 text-xs font-semibold tracking-wide shadow-sm">
            <Sparkles className="w-3 h-3 mr-1.5" />
            PRO FEATURE
          </Badge>

          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30">
            <Lock className="w-9 h-9 text-white" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight">
            Unlock <span className="text-primary">{label}</span>
          </h1>
          <p className="text-muted-foreground mb-6 leading-relaxed text-sm sm:text-base">
            Supercharge your school with the <strong className="text-foreground">{label}</strong> module.
            Elevate your operations, delight parents, and empower your staff — all in one platform.
          </p>

          {/* Feature highlights */}
          <div className="bg-background/60 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-2.5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              What you'll get
            </p>
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {h}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-semibold shadow-lg shadow-primary/25 gap-2"
              onClick={() => navigate("/settings")}
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </Button>
            <p className="text-xs text-muted-foreground">
              Contact your Vitana administrator to enable this module for your school.
            </p>
          </div>
        </div>

        {/* Back navigation */}
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
