
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ReportCardTemplate } from "./ReportCardTemplate";
import { Student } from "../../services/mockApi";
import { generateProfessionalReportCard } from "@/utils/professionalPdfGenerator";
import { useSchool } from "@/contexts/SchoolContext";

interface Exam {
  id: string;
  name: string;
  class: string;
  subject: string;
  maxMarks: number;
  date: string;
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marks: number;
  grade: string;
}

interface StudentReportCardGeneratorProps {
  students: Student[];
  exams: Exam[];
  results: ExamResult[];
}

export function StudentReportCardGenerator({ students, exams, results }: StudentReportCardGeneratorProps) {
  const { schoolInfo } = useSchool();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [reportCard, setReportCard] = useState<any>(null);
  const { toast } = useToast();

  const generateReportCard = () => {
    if (!selectedStudent || !selectedTerm) {
      toast({
        title: "Error",
        description: "Please select a student and term",
        variant: "destructive"
      });
      return;
    }

    const student = students.find(s => s.id === selectedStudent);
    if (!student) return;

    // Get all exams for this student's class
    const studentExams = exams.filter(exam => exam.class === student.class);
    
    // Get results for this student
    const studentResults = results.filter(result => result.studentId === selectedStudent);

    // Create subjects array with marks
    const subjects = studentExams.map(exam => {
      const result = studentResults.find(r => r.examId === exam.id);
      return {
        name: exam.subject,
        marksObtained: result?.marks || 0,
        totalMarks: exam.maxMarks,
        grade: result?.grade || 'F'
      };
    });

    const totalObtained = subjects.reduce((sum, subject) => sum + subject.marksObtained, 0);
    const totalMarks = subjects.reduce((sum, subject) => sum + subject.totalMarks, 0);
    const percentage = totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0;

    const generatedReportCard = {
      id: `RC${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      section: student.section,
      term: selectedTerm,
      subjects,
      totalMarks,
      totalObtained,
      percentage,
      grade: getGrade(percentage),
      attendance: Math.floor(Math.random() * 20) + 80,
      rank: Math.floor(Math.random() * 10) + 1,
      remarks: percentage >= 85 ? "Excellent performance! Keep it up." : 
              percentage >= 75 ? "Good work. There's room for improvement." :
              "Needs more attention and effort.",
      generatedDate: new Date().toISOString()
    };

    setReportCard(generatedReportCard);
    setShowPreview(true);
  };

  const getGrade = (percentage: number): string => {
    if (percentage >= 95) return "A+";
    if (percentage >= 85) return "A";
    if (percentage >= 75) return "B+";
    if (percentage >= 65) return "B";
    if (percentage >= 55) return "C+";
    if (percentage >= 45) return "C";
    if (percentage >= 35) return "D";
    return "F";
  };

  const downloadReportCard = () => {
    if (reportCard && schoolInfo) {
      const reportData = {
        studentName: reportCard.studentName,
        studentId: reportCard.studentId,
        class: reportCard.class,
        section: reportCard.section,
        academicYear: "2024-25",
        examName: reportCard.term,
        rollNo: students.find(s => s.id === reportCard.studentId)?.rollNo || '',
        subjects: reportCard.subjects.map((s: any) => ({
          name: s.name,
          marks: s.marksObtained,
          maxMarks: s.totalMarks,
          grade: s.grade
        })),
        totalMarks: reportCard.totalMarks,
        totalMaxMarks: reportCard.totalObtained,
        percentage: reportCard.percentage,
        overallGrade: reportCard.grade,
        remarks: reportCard.remarks,
        rank: reportCard.rank,
        attendance: `${reportCard.attendance}%`
      };
      
      generateProfessionalReportCard(schoolInfo, reportData);
      toast({
        title: "Download Started",
        description: `Downloading report card for ${reportCard.studentName}`
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Individual Report Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} (Class {student.class}-{student.section})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term1">Term 1</SelectItem>
                  <SelectItem value="term2">Term 2</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReportCard} className="w-full">
                Generate Report Card
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Results Summary */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Student Exam Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results
                  .filter(result => result.studentId === selectedStudent)
                  .map(result => {
                    const exam = exams.find(e => e.id === result.examId);
                    return (
                      <TableRow key={result.id}>
                        <TableCell>{exam?.subject}</TableCell>
                        <TableCell>{exam?.name}</TableCell>
                        <TableCell>{result.marks}/{exam?.maxMarks}</TableCell>
                        <TableCell>
                          <Badge variant="default">{result.grade}</Badge>
                        </TableCell>
                        <TableCell>{exam ? new Date(exam.date).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {reportCard && (
            <div>
              <ReportCardTemplate reportCard={reportCard} />
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t print:hidden">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button onClick={downloadReportCard}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
