import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Merge, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StudentMergingDialogProps {
  onMerge?: (primaryId: string, duplicateId: string) => Promise<void>;
}

export function StudentMergingDialog({ onMerge }: StudentMergingDialogProps) {
  const [open, setOpen] = useState(false);
  const [primaryStudentId, setPrimaryStudentId] = useState("");
  const [duplicateStudentId, setDuplicateStudentId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMerge = async () => {
    if (!primaryStudentId || !duplicateStudentId) {
      toast.error("Please enter both student IDs");
      return;
    }

    if (primaryStudentId === duplicateStudentId) {
      toast.error("Cannot merge a student with itself");
      return;
    }

    try {
      setLoading(true);
      await onMerge?.(primaryStudentId, duplicateStudentId);
      toast.success("Students merged successfully");
      setOpen(false);
      setPrimaryStudentId("");
      setDuplicateStudentId("");
    } catch (error) {
      toast.error("Failed to merge students");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Merge className="mr-2 h-4 w-4" />
          Merge Duplicate Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Student Records</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will merge duplicate student records. The primary student's data will be kept,
            and all records from the duplicate will be transferred.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="primary">Primary Student ID</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primary"
                      placeholder="Enter primary student ID"
                      value={primaryStudentId}
                      onChange={(e) => setPrimaryStudentId(e.target.value)}
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    This student's record will be kept
                  </p>
                </div>

                <div>
                  <Label htmlFor="duplicate">Duplicate Student ID</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="duplicate"
                      placeholder="Enter duplicate student ID"
                      value={duplicateStudentId}
                      onChange={(e) => setDuplicateStudentId(e.target.value)}
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    This student's record will be merged and deleted
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h4 className="font-medium">What will be merged:</h4>
            <div className="grid gap-2">
              <Badge variant="secondary">Attendance Records</Badge>
              <Badge variant="secondary">Fee Payments</Badge>
              <Badge variant="secondary">Exam Results</Badge>
              <Badge variant="secondary">Library Records</Badge>
              <Badge variant="secondary">Health Records</Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={loading}>
            {loading ? "Merging..." : "Merge Students"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
