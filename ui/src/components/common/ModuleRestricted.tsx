import { Lock, ArrowLeft, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ModuleRestrictedProps {
  moduleName: string;
  moduleLabel?: string;
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

export function ModuleRestricted({ moduleName, moduleLabel }: ModuleRestrictedProps) {
  const navigate = useNavigate();
  const label = moduleLabel ?? MODULE_LABELS[moduleName] ?? moduleName;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-6 dark:bg-amber-950/30 dark:border-amber-800">
          <Lock className="w-9 h-9 text-amber-500" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {label} is not available
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          The <strong>{label}</strong> module is not enabled for your school in your
          current subscription plan. Please contact your system administrator to
          activate this feature.
        </p>

        {/* Contact prompt */}
        <div className="bg-muted/40 border rounded-xl p-4 mb-6 text-sm text-left space-y-2">
          <p className="font-medium text-foreground">How to get access:</p>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>Contact your school's system administrator</li>
            <li>Request the <strong>{label}</strong> module to be enabled</li>
            <li>Or upgrade your school's subscription plan</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/admin-dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
