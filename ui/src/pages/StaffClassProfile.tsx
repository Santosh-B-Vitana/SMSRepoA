import { useEffect, useState } from "react";
import { mockApi } from "../services/mockApi";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, FileText } from "lucide-react";

interface ClassInfo {
  id: string;
  standard: string;
  section: string;
  subject: string;
  totalStudents: number;
  students: Array<{
    id: string;
    name: string;
    rollNo: string;
    status: "Present" | "Absent";
  }>;
}

export default function StaffClassProfile() {
  // ...existing code...
  // Mock grades data
  const grades = [
    {
      student: "Aarav Gupta",
      subject: "Mathematics",
      examType: "Unit Test 1",
      marks: 85,
      total: 100,
      date: "9/15/2024",
      grade: "A",
      gradeColor: "bg-blue-600 text-white"
    },
    {
      student: "Rohan Mehra",
      subject: "Mathematics",
      examType: "Unit Test 1",
      marks: 78,
      total: 100,
      date: "9/15/2024",
      grade: "B+",
      gradeColor: "bg-blue-300 text-gray-900"
    },
    {
      student: "Ananya Sharma",
      subject: "Mathematics",
      examType: "Unit Test 1",
      marks: 92,
      total: 100,
      date: "9/15/2024",
      grade: "A+",
      gradeColor: "bg-blue-700 text-white"
    },
  ];
  // Dialog state
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<string>("");
  const [studentSubmissions, setStudentSubmissions] = useState<{[id: string]: boolean}>({});
  // Mock assignments data
  const assignments = [
    {
      id: "a1",
      title: "Quadratic Equations Practice",
      subject: "Mathematics",
      dueDate: "10/15/2024",
      submissions: "15/30",
      status: "Active",
    },
    {
      id: "a2",
      title: "Algebra Word Problems",
      subject: "Mathematics",
      dueDate: "10/8/2024",
      submissions: "28/30",
      status: "Overdue",
    },
  ];
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const cls = await mockApi.getClass(classId);
        if (cls) {
          setClassInfo({
            ...cls,
            subject: (cls as any).subject || "Mathematics",
            students: Array.isArray((cls as any).students) ? (cls as any).students : []
          });
        } else {
          setClassInfo(null);
        }
      } catch (err) {
        setClassInfo(null);
      }
      setLoading(false);
    })();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading class profile...</p>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-red-500 mb-4">Class not found for ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{String(classId)}</span></div>
        <Button onClick={() => navigate("/my-classes")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-5xl">
      <Button onClick={() => navigate("/my-classes")} variant="outline" size="sm" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Classes
      </Button>
      <h1 className="text-2xl lg:text-3xl font-bold mb-2">
        Class {classInfo.standard}-{classInfo.section}
      </h1>
      <p className="text-muted-foreground mb-4">
        {classInfo.subject} • {classInfo.totalStudents} Students
      </p>
  <Card className="mb-8 shadow-sm border border-border rounded-xl">
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
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Assignments</div>
                <div className="text-xl font-semibold">1</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="text-sm font-medium">{classInfo.subject}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  <Tabs defaultValue="students" className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <Card className="shadow-sm border border-border rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 3v18m9-9H3"/></svg>
                Class Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left font-semibold">Roll No</th>
                      <th className="p-3 text-left font-semibold">Name</th>
                      <th className="p-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classInfo.students.map((student) => {
                      const status = student.status === "Present" ? "Present" : "Absent";
                      return (
                        <tr key={student.id} className="border-b last:border-b-0">
                          <td className="p-3 font-medium">{student.rollNo}</td>
                          <td className="p-3">{student.name}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assignments</CardTitle>
              <Button variant="default" size="sm" className="flex items-center gap-2" onClick={() => setNewDialogOpen(true)}>
                <span className="text-lg font-bold">+</span> New Assignment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>{a.subject}</TableCell>
                        <TableCell>{a.dueDate}</TableCell>
                        <TableCell>{a.submissions}</TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${a.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                            {a.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => {
                            setSelectedAssignment(a);
                            setAssignmentStatus(a.status);
                            // Initialize submissions: mark first N as submitted based on a.submissions
                            let submittedCount = 0;
                            if (a.submissions && classInfo?.students) {
                              const [sub, total] = a.submissions.split("/").map(Number);
                              submittedCount = sub;
                              const subs: {[id: string]: boolean} = {};
                              classInfo.students.forEach((s, idx) => {
                                subs[s.id] = idx < submittedCount;
                              });
                              setStudentSubmissions(subs);
                            }
                            setManageDialogOpen(true);
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><rect width="18" height="14" x="3" y="4" rx="2" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 10h6"/></svg>
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* New Assignment Dialog */}
          {newDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-background rounded-xl shadow-xl p-8 w-full max-w-md animate-fadeIn">
                <h2 className="text-xl font-bold mb-2">New Assignment</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input type="text" className="border rounded-lg px-3 py-2 w-full" placeholder="Assignment Title" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input type="text" className="border rounded-lg px-3 py-2 w-full" placeholder="Subject" defaultValue="Mathematics" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input type="date" className="border rounded-lg px-3 py-2 w-full" />
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="default" className="flex-1">Create</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Manage Assignment Dialog */}
          {manageDialogOpen && selectedAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-background rounded-xl shadow-xl p-8 w-full max-w-lg animate-fadeIn">
                <h2 className="text-xl font-bold mb-2">Manage Assignment</h2>
                <div className="space-y-2 mb-4">
                  <div><span className="font-semibold">Title:</span> {selectedAssignment.title}</div>
                  <div><span className="font-semibold">Subject:</span> {selectedAssignment.subject}</div>
                  <div><span className="font-semibold">Due Date:</span> {selectedAssignment.dueDate}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    <select value={assignmentStatus} onChange={e => setAssignmentStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
                      <option value="Active">Active</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${assignmentStatus === "Active" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{assignmentStatus}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="font-semibold mb-2">Student Submissions</div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2 text-left">Roll No</th>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classInfo?.students.map(student => (
                          <tr key={student.id}>
                            <td className="p-2">{student.rollNo}</td>
                            <td className="p-2">{student.name}</td>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={!!studentSubmissions[student.id]}
                                onChange={e => setStudentSubmissions(subs => ({ ...subs, [student.id]: e.target.checked }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setManageDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="grades">
          <Card className="shadow-sm border border-border rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 3v18m9-9H3"/></svg>
                Student Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left font-semibold">Student</th>
                      <th className="p-3 text-left font-semibold">Subject</th>
                      <th className="p-3 text-left font-semibold">Exam Type</th>
                      <th className="p-3 text-left font-semibold">Marks</th>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">{g.student}</td>
                        <td className="p-3">{g.subject}</td>
                        <td className="p-3">{g.examType}</td>
                        <td className="p-3 font-semibold">
                          {g.marks}/{g.total} <span className="text-muted-foreground ml-1">({((g.marks/g.total)*100).toFixed(1)}%)</span>
                        </td>
                        <td className="p-3">{g.date}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${g.gradeColor}`}>{g.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
