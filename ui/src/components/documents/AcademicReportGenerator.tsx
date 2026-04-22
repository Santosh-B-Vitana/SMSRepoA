
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AcademicReport {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  term: string;
  subjects: {
    name: string;
    marks: number;
    maxMarks: number;
    grade: string;
  }[];
  attendance: number;
  remarks: string;
  generatedAt: string;
}

export function AcademicReportGenerator() {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [reports, setReports] = useState<AcademicReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const mockStudents = [
    { id: "STU001", name: "Alice Johnson", class: "10" },
    { id: "STU002", name: "David Chen", class: "10" },
    { id: "STU003", name: "Emma Wilson", class: "9" }
  ];

  const mockSubjects = [
    "Mathematics", "English", "Science", "History", "Geography"
  ];

  const generateReport = async () => {
    if (!selectedStudent || !selectedTerm) {
      toast({
        title: "Error",
        description: "Please select student and term",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Mock report generation
    setTimeout(() => {
      const student = mockStudents.find(s => s.id === selectedStudent);
      const newReport: AcademicReport = {
        id: `RPT${Date.now()}`,
        studentId: selectedStudent,
        studentName: student?.name || "",
        class: student?.class || "",
        term: selectedTerm,
        subjects: mockSubjects.map(subject => ({
          name: subject,
          marks: Math.floor(Math.random() * 40) + 60, // 60-100
          maxMarks: 100,
          grade: ["A+", "A", "B+", "B"][Math.floor(Math.random() * 4)]
        })),
        attendance: Math.floor(Math.random() * 20) + 80, // 80-100%
        remarks: "Good performance overall. Keep up the excellent work!",
        generatedAt: new Date().toISOString()
      };

      setReports(prev => [newReport, ...prev]);
      setLoading(false);
      
      toast({
        title: "Success",
        description: "Academic report generated successfully"
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Academic Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - Class {student.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">Class 9</SelectItem>
                  <SelectItem value="10">Class 10</SelectItem>
                  <SelectItem value="11">Class 11</SelectItem>
                  <SelectItem value="12">Class 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term1">Term 1 (April-September)</SelectItem>
                  <SelectItem value="term2">Term 2 (October-March)</SelectItem>
                  <SelectItem value="annual">Annual Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={generateReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.studentName}</TableCell>
                  <TableCell>{report.class}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.term}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
