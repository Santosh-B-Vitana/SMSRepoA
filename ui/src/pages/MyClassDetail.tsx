import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  FileText, 
  Edit, 
  Calendar,
  Book,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  attendance: number;
  photoUrl?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  status: 'active' | 'completed' | 'overdue';
  submissionCount: number;
  totalStudents: number;
}

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType: string;
  date: string;
}

export default function MyClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();

  // Mock class data
  const classInfo = {
    id: classId || "cls_10a",
    name: "Class 10-A",
    subject: "Mathematics", 
    totalStudents: 30,
    teacher: "Mrs. Priya Singh"
  };

  // Mock students data
  const [students] = useState<Student[]>([
  { id: "STU001", name: "Aarav Gupta", rollNo: "001", attendance: 95 },
  { id: "STU002", name: "Rohan Mehra", rollNo: "002", attendance: 88 },
  { id: "STU003", name: "Ananya Sharma", rollNo: "003", attendance: 92 },
  { id: "STU004", name: "Kavya Patel", rollNo: "004", attendance: 85 },
  { id: "STU005", name: "Arjun Singh", rollNo: "005", attendance: 97 },
  ]);

  // Mock assignments data
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "ASG001",
      title: "Quadratic Equations Practice",
      description: "Solve problems 1-20 from Chapter 4",
      subject: "Mathematics",
      dueDate: "2024-10-15",
      status: "active",
      submissionCount: 15,
      totalStudents: 30
    },
    {
      id: "ASG002",
      title: "Algebra Word Problems",
      description: "Complete worksheet on real-world algebra applications",
      subject: "Mathematics", 
      dueDate: "2024-10-08",
      status: "overdue",
      submissionCount: 28,
      totalStudents: 30
    }
  ]);

  // Mock grades data
  const [grades] = useState<Grade[]>([
    { id: "GRD001", studentId: "STU001", studentName: "Aarav Gupta", subject: "Mathematics", marks: 85, maxMarks: 100, examType: "Unit Test 1", date: "2024-09-15" },
    { id: "GRD002", studentId: "STU002", studentName: "Rohan Mehra", subject: "Mathematics", marks: 78, maxMarks: 100, examType: "Unit Test 1", date: "2024-09-15" },
    { id: "GRD003", studentId: "STU003", studentName: "Ananya Sharma", subject: "Mathematics", marks: 92, maxMarks: 100, examType: "Unit Test 1", date: "2024-09-15" },
  ]);

  // Assignment creation state
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    subject: classInfo.subject,
    dueDate: ""
  });

  const handleCreateAssignment = () => {
    if (!newAssignment.title || !newAssignment.description || !newAssignment.dueDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const assignment: Assignment = {
      id: `ASG${Date.now()}`,
      ...newAssignment,
      status: "active",
      submissionCount: 0,
      totalStudents: classInfo.totalStudents
    };

    setAssignments([...assignments, assignment]);
    setNewAssignment({ title: "", description: "", subject: classInfo.subject, dueDate: "" });
    setIsCreatingAssignment(false);
    toast.success("Assignment created successfully");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={() => navigate("/my-classes")} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Classes
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{classInfo.name}</h1>
          <p className="text-muted-foreground">
            {classInfo.subject} • {classInfo.totalStudents} Students
          </p>
        </div>
      </div>

      {/* Class Overview Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Students</div>
                <div className="text-xl font-semibold">{classInfo.totalStudents}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Assignments</div>
                <div className="text-xl font-semibold">{assignments.filter(a => a.status === 'active').length}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="text-lg font-medium">{classInfo.subject}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.rollNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-xs font-medium">{student.name.charAt(0)}</span>
                            )}
                          </div>
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Show Present/Absent based on mock attendance (>=90% present, <90% absent) */}
                        {student.attendance >= 90 ? (
                          <Badge variant="default" className="bg-green-600 text-white">Present</Badge>
                        ) : (
                          <Badge variant="destructive">Absent</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignments
                </div>
                <Dialog open={isCreatingAssignment} onOpenChange={setIsCreatingAssignment}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Assignment Title</Label>
                        <Input
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                          placeholder="Enter assignment title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newAssignment.description}
                          onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                          placeholder="Enter assignment description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Subject</Label>
                        <Input
                          value={newAssignment.subject}
                          onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                          placeholder="Subject"
                        />
                      </div>
                      <div>
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={newAssignment.dueDate}
                          onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCreateAssignment}>Create Assignment</Button>
                        <Button variant="outline" onClick={() => setIsCreatingAssignment(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{assignment.subject}</TableCell>
                      <TableCell>{new Date(assignment.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {assignment.submissionCount}/{assignment.totalStudents}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Student Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade) => {
                    const percentage = (grade.marks / grade.maxMarks) * 100;
                    const gradeLabel = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : "F";
                    
                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.studentName}</TableCell>
                        <TableCell>{grade.subject}</TableCell>
                        <TableCell>{grade.examType}</TableCell>
                        <TableCell>
                          <span className="font-medium">{grade.marks}/{grade.maxMarks}</span>
                          <span className="text-sm text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                        </TableCell>
                        <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            gradeLabel === "A+" || gradeLabel === "A" ? "default" :
                            gradeLabel === "B+" || gradeLabel === "B" ? "secondary" :
                            gradeLabel === "C" ? "outline" : "destructive"
                          }>
                            {gradeLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}