
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
import { generateProfessionalReportCard } from "@/utils/professionalPdfGenerator";
import { useSchool } from "@/contexts/SchoolContext";

interface Subject {
  name: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
}

interface ReportCard {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  term: string;
  subjects: Subject[];
  totalMarks: number;
  totalObtained: number;
  percentage: number;
  grade: string;
  attendance: number;
  rank: number;
  remarks: string;
  generatedDate: string;
}

const mockStudents: Student[] = [
  { id: "STU001", name: "Alice Johnson", rollNo: "001", class: "10", section: "A" },
  { id: "STU002", name: "David Chen", rollNo: "002", class: "10", section: "A" },
  { id: "STU003", name: "Emma Wilson", rollNo: "003", class: "9", section: "B" },
];

const mockSubjects = [
  "Mathematics", "English", "Science", "Social Studies", "Computer Science"
];

export function ReportCardGenerator() {
  const { schoolInfo } = useSchool();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateReportCards = async () => {
    if (!selectedClass || !selectedSection || !selectedTerm) {
      toast({
        title: "Error",
        description: "Please select class, section, and term",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const filteredStudents = mockStudents.filter(
        student => student.class === selectedClass && student.section === selectedSection
      );

      const newReportCards = filteredStudents.map((student, index) => {
        const subjects: Subject[] = mockSubjects.map(subject => {
          const marksObtained = Math.floor(Math.random() * 40) + 60; // 60-100
          return {
            name: subject,
            marksObtained,
            totalMarks: 100,
            grade: getGrade(marksObtained)
          };
        });

        const totalObtained = subjects.reduce((sum, subject) => sum + subject.marksObtained, 0);
        const totalMarks = subjects.length * 100;
        const percentage = (totalObtained / totalMarks) * 100;

        return {
          id: `RC${Date.now()}_${index}`,
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
          attendance: Math.floor(Math.random() * 20) + 80, // 80-100%
          rank: index + 1,
          remarks: percentage >= 85 ? "Excellent performance! Keep it up." : 
                  percentage >= 75 ? "Good work. There's room for improvement." :
                  "Needs more attention and effort.",
          generatedDate: new Date().toISOString()
        };
      });

      setReportCards(prev => [...newReportCards, ...prev]);
      setLoading(false);

      toast({
        title: "Success",
        description: `Generated ${newReportCards.length} report cards successfully`
      });
    }, 2000);
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

  const previewReportCard = (reportCard: ReportCard) => {
    setSelectedReportCard(reportCard);
    setShowPreview(true);
  };

  const downloadReportCard = (reportCard: ReportCard) => {
    if (!schoolInfo) return;
    
    const reportData = {
      studentName: reportCard.studentName,
      studentId: reportCard.studentId,
      class: reportCard.class,
      section: reportCard.section,
      academicYear: "2024-25",
      examName: reportCard.term,
      rollNo: mockStudents.find(s => s.id === reportCard.studentId)?.rollNo || '',
      subjects: reportCard.subjects.map(s => ({
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
  };

  const downloadAllReportCards = () => {
    if (reportCards.length === 0) {
      toast({
        title: "No Report Cards",
        description: "Please generate report cards first",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Download Started",
      description: `Downloading ${reportCards.length} report cards as ZIP file`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>Class {i+1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map(section => (
                    <SelectItem key={section} value={section}>Section {section}</SelectItem>
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
              <Button 
                onClick={generateReportCards} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Generating..." : "Generate Report Cards"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Report Cards</CardTitle>
          <div className="flex gap-2">
            <Button onClick={downloadAllReportCards} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All (ZIP)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportCards.map((reportCard) => (
                <TableRow key={reportCard.id}>
                  <TableCell className="font-medium">{reportCard.studentName}</TableCell>
                  <TableCell>{reportCard.class}-{reportCard.section}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{reportCard.term}</Badge>
                  </TableCell>
                  <TableCell>{reportCard.percentage.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant="default">{reportCard.grade}</Badge>
                  </TableCell>
                  <TableCell>#{reportCard.rank}</TableCell>
                  <TableCell>
                    {new Date(reportCard.generatedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => previewReportCard(reportCard)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReportCard(reportCard)}
                      >
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {selectedReportCard && (
            <div>
              <ReportCardTemplate reportCard={selectedReportCard} />
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t print:hidden">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
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
