import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  Save, 
  Download,
  CheckCircle,
  AlertCircle,
  Upload,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import examinationApi from "@/services/api/examinationApi";
import { studentApi } from "@/services/api/studentApi";
import { useSchoolContext, getAcademicYearsArray } from "@/hooks/useSchoolContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExamSession {
  id: string;
  class: string;
  subject: string;
  name: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'results_published';
  date: string;
  totalMarks: number;
  passingMarks: number;
  studentCount?: number;
}

interface StudentResult {
  id: string;
  name: string;
  rollNumber: string;
  marks: number;
  grade: string;
}

export default function ImprovedExamManagementPanel() {
  const { academicYear: defaultYear } = useSchoolContext();
  const [academicYear, setAcademicYear] = useState(defaultYear || "2025-26");
  const [selectedClass, setSelectedClass] = useState("");
  
  // Auto-loaded from API based on class selection
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamSession | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [publishPreview, setPublishPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("select");

  const classes = ["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6","Class 7","Class 8","Class 9","Class 10"];
  const academicYears = getAcademicYearsArray();

  /**
   * Step 1: Load exams when class is selected
   * This auto-triggers, no extra button needed
   */
  useEffect(() => {
    if (!selectedClass || !academicYear) return;

    const loadExams = async () => {
      setLoading(true);
      try {
        const classCode = selectedClass.replace("Class ", "");
        const res = await examinationApi.getExams({ class: classCode }, 1, 50);
        const mappedExams = (res.items || []).map((e: any) => ({
          id: e.id,
          class: e.class,
          subject: e.subject,
          name: e.name,
          status: e.status || 'scheduled',
          date: e.examDate,
          totalMarks: e.totalMarks,
          passingMarks: e.passingMarks,
        }));
        setExams(mappedExams);
      } catch (err) {
        toast.error("Failed to load exams");
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [selectedClass, academicYear]);

  /**
   * Step 2: Load students for display
   */
  useEffect(() => {
    if (!selectedClass) return;

    const loadStudents = async () => {
      try {
        const classCode = selectedClass.replace("Class ", "");
        const res = await studentApi.list({ classFilter: classCode, pageSize: 200 });
        setStudents(res.students || []);
      } catch (err) {
        console.error("Failed to load students");
      }
    };

    loadStudents();
  }, [selectedClass]);

  /**
   * When exam is selected, auto-load existing results
   */
  const handleSelectExam = async (exam: ExamSession) => {
    setSelectedExam(exam);
    setResults([]);
    setUnsavedChanges(false);
    setActiveTab("entry");

    try {
      // Load existing results for this exam
      const existingRes = await examinationApi.getResults({ examId: exam.id }, 1, 500)
        .catch(() => ({ items: [] }));

      const existingMap = new Map(
        (existingRes.items || []).map((r: any) => [r.studentId, r.marksObtained])
      );

      // Initialize results with existing data or zeros
      const initialized = students.map(s => ({
        id: s.id,
        name: s.name,
        rollNumber: s.rollNumber,
        marks: existingMap.get(s.id) ?? 0,
        grade: calculateGrade(existingMap.get(s.id) ?? 0),
      }));

      setResults(initialized);
    } catch (err) {
      toast.error("Failed to load existing results");
    }
  };

  const calculateGrade = (marks: number): string => {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B+";
    if (marks >= 60) return "B";
    if (marks >= 50) return "C";
    if (marks >= 40) return "D";
    return "F";
  };

  const handleMarksChange = (studentId: string, marks: number) => {
    if (marks < 0 || marks > 100) return;
    setResults(prev => prev.map(r =>
      r.id === studentId
        ? { ...r, marks, grade: calculateGrade(marks) }
        : r
    ));
    setUnsavedChanges(true);
  };

  const handleSaveResults = async () => {
    if (!selectedExam) return;
    
    try {
      setLoading(true);
      const bulkPayload = {
        examId: selectedExam.id,
        schoolId: '550e8400-e29b-41d4-a716-446655440000',
        results: results.map(r => ({
          studentId: r.id,
          marksObtained: r.marks,
          isAbsent: r.marks === 0,
        })),
      };

      await examinationApi.bulkCreateResults(bulkPayload as any);
      setUnsavedChanges(false);
      toast.success("Results saved successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save results");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedExam) return;

    try {
      setLoading(true);
      // First save if there are unsaved changes
      if (unsavedChanges) {
        await handleSaveResults();
      }
      
      // Finalize exam — calculates ranks and publishes results
      await examinationApi.finalizeExamResults(selectedExam.id);
      toast.success("Results published — now visible to students and parents");
      setSelectedExam({ ...selectedExam, status: 'results_published' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'results_published': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Year & Class */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Exam Results Entry
          </CardTitle>
          <CardDescription>
            Select academic year and class to view exams and enter results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Academic Year</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class" disabled={loading}>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Select Exam */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Available Exams for {selectedClass}</CardTitle>
            {exams.length === 0 && !loading && (
              <CardDescription className="text-amber-600">
                No exams scheduled for this class
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-6">Loading exams...</div>
            ) : exams.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No exams found. Create an exam first.
              </div>
            ) : (
              <div className="grid gap-3">
                {exams.map(exam => (
                  <div
                    key={exam.id}
                    className={`p-4 border rounded-lg cursor-pointer transition ${ selectedExam?.id === exam.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectExam(exam)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{exam.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {exam.name} • {new Date(exam.date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total Marks: {exam.totalMarks} | Passing: {exam.passingMarks}
                        </p>
                      </div>
                      <Badge className={getStatusColor(exam.status)}>
                        {getStatusIcon(exam.status)}
                        <span className="ml-1 capitalize">{exam.status}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Enter Marks */}
      {selectedExam && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entry">Mark Entry</TabsTrigger>
            <TabsTrigger value="preview">Preview & Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enter Marks — {selectedExam.subject}</CardTitle>
                <CardDescription>
                  {unsavedChanges && (
                    <span className="text-amber-600 font-medium">You have unsaved changes</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Marks (out of {selectedExam.totalMarks})</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.rollNumber}</TableCell>
                          <TableCell>{result.name}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max={selectedExam.totalMarks}
                              value={result.marks || ''}
                              onChange={(e) => handleMarksChange(result.id, parseInt(e.target.value) || 0)}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <Badge
                              variant={result.grade === 'F' ? 'destructive' : 'default'}
                            >
                              {result.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveResults} disabled={!unsavedChanges || loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("preview")}
                    disabled={loading}
                  >
                    Preview & Publish →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Publish Results</CardTitle>
                <CardDescription>
                  Review your marks before publishing to students and parents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm font-medium text-blue-900">
                    ✓ {results.filter(r => r.marks > 0).length} out of {results.length} students have marks entered
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    Publishing will make these results visible to parents and students via their dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Exam</p>
                    <p className="font-semibold">{selectedExam.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Class</p>
                    <p className="font-semibold">{selectedClass}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedExam.status)}>
                      {selectedExam.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handlePublish}
                    disabled={loading || selectedExam.status === 'results_published'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish Results Now
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("entry")}>
                    ← Back to Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
