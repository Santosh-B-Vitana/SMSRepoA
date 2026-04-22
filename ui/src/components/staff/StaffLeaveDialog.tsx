import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StaffLeaveManager } from "@/components/communication/StaffLeaveManager";
import { AdminLeaveManagement } from "@/components/communication/AdminLeaveManagement";
import { useAuth } from "@/contexts/AuthContext";

interface StaffLeaveDialogProps {
  staffId: string;
  staffName: string;
  /** When true (admin/super_admin viewing staff list) show the admin approval panel */
  adminView?: boolean;
}

export function StaffLeaveDialog({ staffId, staffName, adminView = false }: StaffLeaveDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Leave
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Leave Management
            </SheetTitle>
            <SheetDescription>
              {isAdmin && adminView
                ? `Review and approve leave requests — all staff`
                : `Leave requests for ${staffName}`}
            </SheetDescription>
          </SheetHeader>

          <div className="pt-4">
            {isAdmin && adminView ? (
              <AdminLeaveManagement />
            ) : (
              <StaffLeaveManager />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
