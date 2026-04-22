import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImportButton } from "@/components/common/ImportButton";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet } from "lucide-react";

interface BulkMarksImportDialogProps {
  examId: string;
  examName: string;
  onImport: (marks: any[]) => void;
}

export function BulkMarksImportDialog({ examId, examName, onImport }: BulkMarksImportDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleImport = async (data: any[]) => {
    onImport(data);
    setOpen(false);
    toast({
      title: "Success",
      description: `Imported marks for ${data.length} students`
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import Marks
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Marks - {examName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Import Instructions
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Download the template CSV file</li>
              <li>• Fill in student marks for each subject</li>
              <li>• Upload the completed CSV file</li>
              <li>• Review and confirm the import</li>
            </ul>
          </div>

          <ImportButton
            columns={[
              { key: 'studentId', label: 'Student ID', required: true },
              { key: 'studentName', label: 'Student Name', required: true },
              { key: 'rollNo', label: 'Roll No', required: true },
              { key: 'mathematics', label: 'Mathematics', required: false },
              { key: 'science', label: 'Science', required: false },
              { key: 'english', label: 'English', required: false },
              { key: 'hindi', label: 'Hindi', required: false },
              { key: 'socialScience', label: 'Social Science', required: false },
            ]}
            onImport={handleImport}
            templateFilename={`marks_import_${examId}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
