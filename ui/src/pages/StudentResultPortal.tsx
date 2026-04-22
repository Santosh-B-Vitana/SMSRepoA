import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  GraduationCap, 
  Download, 
  TrendingUp, 
  Award,
  FileText,
  BarChart3,
  CheckCircle,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { generateProfessionalReportCard } from "@/utils/professionalPdfGenerator";
import { useSchool } from "@/contexts/SchoolContext";

interface SubjectResult {
  subject: string;
  marks: number;
  maxMarks: number;
  grade: string;
}

interface ExamResult {
  examId: string;
  examName: string;
  examType: string;
  date: string;
  subjects: SubjectResult[];
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  rank?: number;
  totalStudents?: number;
  remarks?: string;
  published: boolean;
}

export default function StudentResultPortal() {
  const { schoolInfo } = useSchool();
  const [searchId, setSearchId] = useState("");
  const [selectedYear, setSelectedYear] = useState("2024-25");
  const [studentData, setStudentData] = useState<any>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data
  const academicYears = ["2024-25", "2023-24", "2022-23"];

  const mockResults: ExamResult[] = [
    {
      examId: "EX001",
      examName: "Mid Term Examination",
      examType: "Midterm",
      date: "2024-09-15",
      subjects: [
        { subject: "Mathematics", marks: 85, maxMarks: 100, grade: "A" },
        { subject: "English", marks: 78, maxMarks: 100, grade: "B+" },
        { subject: "Science", marks: 92, maxMarks: 100, grade: "A+" },
        { subject: "Social Studies", marks: 88, maxMarks: 100, grade: "A" },
      ],
      totalMarks: 343,
      totalMaxMarks: 400,
      percentage: 85.75,
      overallGrade: "A",
      rank: 5,
      totalStudents: 45,
      remarks: "Excellent performance. Keep up the good work!",
      published: true
    },
    {
      examId: "EX002",
      examName: "Final Examination",
      examType: "Final",
      date: "2024-03-20",
      subjects: [
        { subject: "Mathematics", marks: 90, maxMarks: 100, grade: "A+" },
        { subject: "English", marks: 82, maxMarks: 100, grade: "A" },
        { subject: "Science", marks: 88, maxMarks: 100, grade: "A" },
        { subject: "Social Studies", marks: 85, maxMarks: 100, grade: "A" },
      ],
      totalMarks: 345,
      totalMaxMarks: 400,
      percentage: 86.25,
      overallGrade: "A",
      rank: 3,
      totalStudents: 45,
      remarks: "Outstanding improvement in Mathematics!",
      published: true
    }
  ];

  const searchResults = () => {
    if (!searchId) {
      toast.error("Please enter Student ID or Roll Number");
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setStudentData({
        id: "STU001",
        rollNo: "001",
        name: "Aarav Gupta",
        class: "Class 10",
        section: "A",
        academicYear: selectedYear
      });
      setResults(mockResults);
      setLoading(false);
      toast.success("Results loaded successfully");
    }, 1000);
  };

  const downloadReportCard = (result: ExamResult) => {
    if (!studentData || !schoolInfo) return;

    const reportData = {
      studentName: studentData.name,
      studentId: studentData.id,
      class: studentData.class,
      section: studentData.section,
      academicYear: studentData.academicYear,
      examName: result.examName,
      rollNo: studentData.rollNo,
      subjects: result.subjects.map(s => ({
        name: s.subject,
        marks: s.marks,
        maxMarks: s.maxMarks,
        grade: s.grade
      })),
      totalMarks: result.totalMarks,
      totalMaxMarks: result.totalMaxMarks,
      percentage: result.percentage,
      overallGrade: result.overallGrade,
      remarks: result.remarks
    };

    generateProfessionalReportCard(schoolInfo, reportData);
    toast.success("Report card downloaded successfully");
  };

  const getBestSubject = () => {
    if (results.length === 0) return null;
    const latestResult = results[0];
    const best = latestResult.subjects.reduce((prev, current) => 
      current.marks > prev.marks ? current : prev
    );
    return best;
  };

  const getAveragePercentage = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.percentage, 0);
    return (total / results.length).toFixed(2);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Student Result Portal
          </h1>
          <p className="text-muted-foreground">View and download your examination results</p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Student ID / Roll Number</Label>
              <Input
                placeholder="Enter your Student ID or Roll Number"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchResults()}
              />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={searchResults} disabled={loading} size="lg">
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Loading..." : "View Results"}
          </Button>
        </CardContent>
      </Card>

      {/* Student Info */}
      {studentData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{studentData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roll No</p>
                  <p className="font-medium">{studentData.rollNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{studentData.class}-{studentData.section}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Academic Year</p>
                  <p className="font-medium">{studentData.academicYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Percentage</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{getAveragePercentage()}%</div>
                <p className="text-xs text-muted-foreground mt-1">Across all exams</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {getBestSubject()?.subject || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getBestSubject()?.marks} / {getBestSubject()?.maxMarks} marks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Exams Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{results.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Published results</p>
              </CardContent>
            </Card>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.examId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {result.examName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.examType} • {new Date(result.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button onClick={() => downloadReportCard(result)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Report Card
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Performance */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Marks</p>
                      <p className="text-lg font-bold">{result.totalMarks}/{result.totalMaxMarks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Percentage</p>
                      <p className="text-lg font-bold text-green-600">{result.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grade</p>
                      <Badge variant="default" className="text-lg px-3 py-1">{result.overallGrade}</Badge>
                    </div>
                    {result.rank && (
                      <div>
                        <p className="text-sm text-muted-foreground">Class Rank</p>
                        <p className="text-lg font-bold text-blue-600">{result.rank}/{result.totalStudents}</p>
                      </div>
                    )}
                  </div>

                  {/* Subject-wise Results */}
                  <div>
                    <h4 className="font-medium mb-2">Subject-wise Performance</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Marks Obtained</TableHead>
                          <TableHead>Maximum Marks</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.subjects.map((subject) => (
                          <TableRow key={subject.subject}>
                            <TableCell className="font-medium">{subject.subject}</TableCell>
                            <TableCell>{subject.marks}</TableCell>
                            <TableCell>{subject.maxMarks}</TableCell>
                            <TableCell>{((subject.marks / subject.maxMarks) * 100).toFixed(1)}%</TableCell>
                            <TableCell>
                              <Badge variant={
                                subject.grade.startsWith('A') ? 'default' :
                                subject.grade.startsWith('B') ? 'secondary' : 'outline'
                              }>
                                {subject.grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Remarks */}
                  {result.remarks && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Teacher's Remarks:</strong> {result.remarks}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!studentData && (
        <Card className="py-12">
          <CardContent className="text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Enter Your Details to View Results</h3>
            <p className="text-muted-foreground">
              Enter your Student ID or Roll Number above to access your examination results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
