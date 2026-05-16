/**
 * StudentDetainDialog — simple confirmation dialog for detaining a student in the same class.
 *
 * Behaviour:
 *  - Student remains ACTIVE — NOT deactivated
 *  - Student stays in the same class/section for the next academic year
 *  - No document generation — just a reason + optional remarks
 *  - Calls processDropout with dropoutType: 'detain'
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Student, studentApi, StudentExitResponse } from "@/services/api/studentApi";

interface Props {
  student: Student;
  open: boolean;
  onClose: () => void;
  onComplete: (result: StudentExitResponse) => void;
}

export function StudentDetainDialog({ student, open, onClose, onComplete }: Props) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  // Reset state on open
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose();
      // Delay reset so animation finishes
      setTimeout(() => {
        setReason("");
        setRemarks("");
        setSubmitting(false);
        setDone(false);
        setResultMessage("");
      }, 300);
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await studentApi.processDropout(student.id, {
        dropoutType: "detain",
        reason: reason || undefined,
        remarks: remarks || undefined,
        feeClearanceConfirmed: false,
        documentsToGenerate: [],
      });
      setResultMessage(res.message);
      setDone(true);
      toast({ title: "Student Detained", description: res.message });
      onComplete(res);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Action failed. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detain in Same Class</DialogTitle>
          <DialogDescription>
            The student will remain active and continue in the same class for
            the next academic year.
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-5">
            {/* Student info */}
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <School className="h-4 w-4 text-primary" />
                <span className="font-semibold">Detention Details</span>
              </div>
              <p>
                <span className="font-medium">Student: </span>
                {student.name}
              </p>
              <p>
                <span className="font-medium">Current Class: </span>
                {student.class ?? "—"}
                {student.section ? ` – ${student.section}` : ""}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                The student will <strong>not</strong> be deactivated. They will
                stay enrolled in{" "}
                <strong>
                  {student.class ?? "this class"}
                  {student.section ? ` – ${student.section}` : ""}
                </strong>{" "}
                for the next academic year.
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm">Reason for Detention (optional)</Label>
              <Input
                placeholder="e.g. Failed final examinations"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Internal remarks */}
            <div className="space-y-1.5">
              <Label className="text-sm">Internal Remarks (not printed)</Label>
              <Input
                placeholder="Optional admin notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm Detention
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950 p-4">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-green-800 dark:text-green-200">
                  {resultMessage}
                </p>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  Student remains active and will continue in the same class.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
