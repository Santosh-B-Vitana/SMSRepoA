import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import Papa from 'papaparse';

interface ImportedMark {
  rollNo: string;
  studentName: string;
  [subject: string]: string | number;
}

interface BulkMarksImportProps {
  onImportComplete: (data: ImportedMark[]) => void;
  subjects: string[];
}

export function BulkMarksImport({ onImportComplete, subjects }: BulkMarksImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedMark[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    // Create CSV template
    const headers = ['rollNo', 'studentName', ...subjects];
    const sampleData = [
      ['001', 'Sample Student 1', ...subjects.map(() => '0')],
      ['002', 'Sample Student 2', ...subjects.map(() => '0')],
      ['003', 'Sample Student 3', ...subjects.map(() => '0')],
    ];

    const csv = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marks_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      setErrors([]);
      setPreviewData([]);
    }
  };

  const validateData = (data: any[]): { valid: boolean; errors: string[] } => {
    const validationErrors: string[] = [];

    if (data.length === 0) {
      validationErrors.push("File is empty");
      return { valid: false, errors: validationErrors };
    }

    // Check required columns
    const firstRow = data[0];
    if (!firstRow.rollNo) validationErrors.push("Missing 'rollNo' column");
    if (!firstRow.studentName) validationErrors.push("Missing 'studentName' column");

    // Check subject columns
    subjects.forEach(subject => {
      if (!(subject in firstRow)) {
        validationErrors.push(`Missing subject column: ${subject}`);
      }
    });

    // Validate marks
    data.forEach((row, index) => {
      subjects.forEach(subject => {
        const marks = parseFloat(row[subject]);
        if (isNaN(marks)) {
          validationErrors.push(`Row ${index + 1}: Invalid marks for ${subject}`);
        } else if (marks < 0 || marks > 100) {
          validationErrors.push(`Row ${index + 1}: Marks for ${subject} must be between 0-100`);
        }
      });
    });

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors
    };
  };

  const processFile = () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ImportedMark[];
        
        const validation = validateData(data);
        
        if (!validation.valid) {
          setErrors(validation.errors);
          setIsProcessing(false);
          toast.error(`Found ${validation.errors.length} validation error(s)`);
          return;
        }

        setPreviewData(data);
        setErrors([]);
        setIsProcessing(false);
        toast.success(`Successfully processed ${data.length} student records`);
      },
      error: (error) => {
        setErrors([`File parsing error: ${error.message}`]);
        setIsProcessing(false);
        toast.error("Failed to parse CSV file");
      }
    });
  };

  const confirmImport = () => {
    if (previewData.length === 0) {
      toast.error("No data to import");
      return;
    }

    onImportComplete(previewData);
    toast.success(`Imported marks for ${previewData.length} students`);
    
    // Reset
    setFile(null);
    setPreviewData([]);
    setErrors([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Marks Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Import student marks in bulk using a CSV file. Download the template first to ensure correct format.
          </AlertDescription>
        </Alert>

        {/* Download Template */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label>Upload CSV File</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            <Button 
              onClick={processFile} 
              disabled={!file || isProcessing}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isProcessing ? "Processing..." : "Process File"}
            </Button>
          </div>
          {file && (
            <p className="text-xs text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Validation Errors:</div>
              <ul className="list-disc list-inside text-xs space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="font-medium">...and {errors.length - 10} more errors</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {previewData.length > 0 && (
          <div className="space-y-2">
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Successfully validated {previewData.length} student records. Review below and click Import to proceed.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 bg-muted/50 max-h-60 overflow-y-auto">
              <h4 className="font-medium mb-2">Preview (First 5 records):</h4>
              <div className="space-y-2 text-xs">
                {previewData.slice(0, 5).map((record, index) => (
                  <div key={index} className="p-2 bg-background rounded border">
                    <div className="font-medium">{record.rollNo} - {record.studentName}</div>
                    <div className="text-muted-foreground">
                      {subjects.map(subject => (
                        <span key={subject} className="mr-3">
                          {subject}: {record[subject]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {previewData.length > 5 && (
                  <p className="text-muted-foreground">...and {previewData.length - 5} more records</p>
                )}
              </div>
            </div>

            <Button onClick={confirmImport} className="w-full" size="lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              Import {previewData.length} Student Records
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-xs space-y-1">
          <h4 className="font-medium">Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Download the CSV template</li>
            <li>Fill in student roll numbers, names, and marks for each subject</li>
            <li>Save the file and upload it here</li>
            <li>Click "Process File" to validate the data</li>
            <li>Review the preview and click "Import" to complete</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
