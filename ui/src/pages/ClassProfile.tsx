import { useEffect, useState } from "react";
import { mockApi } from "../services/mockApi";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Users, 
  Calendar,
  Clock,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Timer,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import AttendanceRoster from "@/components/attendance/AttendanceRoster";

interface ClassInfo {
  id: string;
  standard: string;
  section: string;
  academicYear: string;
  classTeacher: string;
  totalStudents: number;
  students: Array<{
    id: string;
    name: string;
    rollNo: string;
    photoUrl?: string;
  }>;
}

export default function ClassProfile() {
  // Mock timetable for the class
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const timeSlots = [
    { period: 1, start: "09:00", end: "09:40" },
    { period: 2, start: "09:40", end: "10:20" },
    { period: 3, start: "10:40", end: "11:20" },
    { period: 4, start: "11:20", end: "12:00" },
    { period: 5, start: "01:00", end: "01:40" },
    { period: 6, start: "01:40", end: "02:20" },
    { period: 7, start: "02:20", end: "03:00" },
    { period: 8, start: "03:00", end: "03:40" }
  ];
  const timetableEntries = [
    { day: "Monday", period: 1, subject: "Mathematics", teacher: "Ms. Sarah" },
    { day: "Monday", period: 2, subject: "English", teacher: "Mr. John" },
    { day: "Monday", period: 3, subject: "Science", teacher: "Ms. Lisa" },
    { day: "Tuesday", period: 1, subject: "Hindi", teacher: "Ms. Priya" },
    { day: "Tuesday", period: 2, subject: "Mathematics", teacher: "Ms. Sarah" },
    { day: "Wednesday", period: 1, subject: "EVS", teacher: "Mr. Kumar" },
    { day: "Thursday", period: 1, subject: "Games", teacher: "Coach Amit" },
    { day: "Friday", period: 1, subject: "Art", teacher: "Ms. Ritu" },
    { day: "Saturday", period: 1, subject: "Music", teacher: "Mr. Dev" }
  ];
  function getTimetableEntry(day: string, period: number) {
    return timetableEntries.find(e => e.day === day && e.period === period);
  }

  // Mock attendance history data
  const attendanceHistory = [
    { date: "Dec 30, 2025", total: 30, present: 28, absent: 2, late: 0, percentage: 93.3 },
    { date: "Dec 29, 2025", total: 30, present: 30, absent: 0, late: 0, percentage: 100 },
    { date: "Dec 28, 2025", total: 30, present: 27, absent: 3, late: 0, percentage: 90 },
    { date: "Dec 27, 2025", total: 30, present: 29, absent: 1, late: 0, percentage: 96.7 },
    { date: "Dec 26, 2025", total: 30, present: 28, absent: 1, late: 1, percentage: 93.3 },
    { date: "Dec 23, 2025", total: 30, present: 30, absent: 0, late: 0, percentage: 100 },
    { date: "Dec 22, 2025", total: 30, present: 29, absent: 1, late: 0, percentage: 96.7 },
    { date: "Dec 21, 2025", total: 30, present: 27, absent: 2, late: 1, percentage: 90 },
    { date: "Dec 20, 2025", total: 30, present: 28, absent: 2, late: 0, percentage: 93.3 },
    { date: "Dec 19, 2025", total: 30, present: 30, absent: 0, late: 0, percentage: 100 },
    { date: "Dec 16, 2025", total: 30, present: 26, absent: 4, late: 0, percentage: 86.7 },
    { date: "Dec 15, 2025", total: 30, present: 29, absent: 1, late: 0, percentage: 96.7 },
    { date: "Dec 14, 2025", total: 30, present: 28, absent: 2, late: 0, percentage: 93.3 },
    { date: "Dec 13, 2025", total: 30, present: 30, absent: 0, late: 0, percentage: 100 },
    { date: "Dec 12, 2025", total: 30, present: 27, absent: 3, late: 0, percentage: 90 },
  ];

  const handleLoadMore = () => {
    setVisibleRecords(prev => Math.min(prev + 5, attendanceHistory.length));
  };
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [timetableEditMode, setTimetableEditMode] = useState(false);
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleRecords, setVisibleRecords] = useState(5);
  const [editForm, setEditForm] = useState({
    standard: "",
    section: "",
    academicYear: "",
    classTeacher: ""
  });

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const cls = await mockApi.getClass(classId);
        if (cls) {
          setClassInfo({
            ...cls,
            students: Array.isArray((cls as any).students) ? (cls as any).students : []
          });
          setEditForm({
            standard: cls.standard,
            section: cls.section,
            academicYear: cls.academicYear,
            classTeacher: cls.classTeacher || ""
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
        <Button onClick={() => navigate("/academics")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academics
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/academics")} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {classInfo.standard} - {classInfo.section}
            </h1>
            <p className="text-muted-foreground">
              Section Profile • {classInfo.academicYear}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Section Details</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    // Fetch all classes to check for duplicates
                    const allClasses = await mockApi.getClasses();
                    const duplicate = allClasses.find(cls =>
                      cls.id !== classId &&
                      cls.standard === editForm.standard &&
                      cls.section === editForm.section &&
                      cls.academicYear === editForm.academicYear
                    );
                    if (duplicate) {
                      toast.error("Another class with this standard, section, and academic year already exists.");
                      return;
                    }
                    await mockApi.updateClass(classId, {
                      standard: editForm.standard,
                      section: editForm.section,
                      academicYear: editForm.academicYear,
                      classTeacher: editForm.classTeacher
                    });
                    toast.success("Class updated successfully");
                    // Reload class info
                    const updated = await mockApi.getClass(classId);
                    setClassInfo({
                      ...updated,
                      students: Array.isArray((updated as any).students) ? (updated as any).students : []
                    });
                    setEditDialogOpen(false);
                  } catch {
                    toast.error("Failed to update class");
                  }
                }}
              >
                <div>
                  <Label htmlFor="standard">Standard</Label>
                  <Input
                    id="standard"
                    value={editForm.standard}
                    onChange={e => setEditForm(f => ({ ...f, standard: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={editForm.section}
                    onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={editForm.academicYear}
                    onChange={e => setEditForm(f => ({ ...f, academicYear: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="classTeacher">Class Teacher</Label>
                  <Input
                    id="classTeacher"
                    value={editForm.classTeacher}
                    onChange={e => setEditForm(f => ({ ...f, classTeacher: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <Button type="submit" className="flex-1">Update</Button>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setEditDialogOpen(false);
                      setActiveTab("settings");
                    }}
                    title="Go to class settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Class Overview Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Present Today</div>
                <div className="text-xl font-semibold">28</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Absent Today</div>
                <div className="text-xl font-semibold">2</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Class Teacher</div>
                <div className="text-sm font-medium">{classInfo.classTeacher}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="mark-today" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mark-today">Mark Today's Attendance</TabsTrigger>
                  <TabsTrigger value="view-history">View Past Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="mark-today">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Today's Attendance</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          28 Present
                        </Badge>
                        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          2 Absent
                        </Badge>
                      </div>
                    </div>
                    <AttendanceRoster classId={classInfo.id} students={classInfo.students} />
                  </div>
                </TabsContent>

                <TabsContent value="view-history">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Attendance History</h3>
                        <p className="text-sm text-muted-foreground">View past attendance records</p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="date" 
                          className="w-40"
                          defaultValue={new Date().toISOString().split('T')[0]}
                        />
                        <Button variant="outline" size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Total Students</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>Attendance %</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceHistory.slice(0, visibleRecords).map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{record.date}</TableCell>
                            <TableCell>{record.total}</TableCell>
                            <TableCell><Badge className="bg-green-500">{record.present}</Badge></TableCell>
                            <TableCell><Badge variant="destructive">{record.absent}</Badge></TableCell>
                            <TableCell><Badge variant="secondary">{record.late}</Badge></TableCell>
                            <TableCell>{record.percentage}%</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(record.date);
                                  setAttendanceDetailsOpen(true);
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-between items-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {visibleRecords} of {attendanceHistory.length} records
                      </p>
                      {visibleRecords < attendanceHistory.length ? (
                        <Button variant="outline" onClick={handleLoadMore}>
                          Load More
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">All records loaded</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classInfo.students.map((student) => (
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
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            Manage Student
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Class Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents available</p>
                <p className="text-sm">Class documents will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timetable">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Section Timetable
              </CardTitle>
              <Button 
                size="sm" 
                variant={timetableEditMode ? "default" : "outline"}
                onClick={() => {
                  setTimetableEditMode(!timetableEditMode);
                  toast.success(timetableEditMode ? "Edit mode disabled" : "Edit mode enabled - Click on any cell to edit");
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                {timetableEditMode ? "Save Timetable" : "Edit Timetable"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Time</TableHead>
                      {days.map((day) => (
                        <TableHead key={day} className="text-center min-w-[120px]">{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.map((slot) => (
                      <TableRow key={slot.period}>
                        <TableCell className="font-medium">
                          <div className="text-xs text-muted-foreground">Period {slot.period}</div>
                          <div className="text-sm">{slot.start} - {slot.end}</div>
                        </TableCell>
                        {days.map((day) => {
                          const entry = getTimetableEntry(day, slot.period);
                          return (
                            <TableCell key={`${day}-${slot.period}`} className="text-center p-2">
                              {entry ? (
                                <div 
                                  className={`bg-primary/10 rounded p-2 transition-colors ${
                                    timetableEditMode ? 'hover:bg-primary/30 cursor-pointer' : 'hover:bg-primary/20'
                                  }`}
                                  onClick={() => {
                                    if (timetableEditMode) {
                                      toast.info(`Edit ${entry.subject} - ${day} Period ${slot.period}`);
                                    }
                                  }}
                                >
                                  <div className="font-medium text-sm">{entry.subject}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{entry.teacher}</div>
                                </div>
                              ) : (
                                <div 
                                  className={`text-xs text-muted-foreground ${
                                    timetableEditMode ? 'hover:bg-primary/10 cursor-pointer rounded p-2' : ''
                                  }`}
                                  onClick={() => {
                                    if (timetableEditMode) {
                                      toast.info(`Add class for ${day} Period ${slot.period}`);
                                    }
                                  }}
                                >
                                  {timetableEditMode ? '+ Add' : '-'}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Attendance Details Dialog */}
      <Dialog open={attendanceDetailsOpen} onOpenChange={setAttendanceDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Attendance Details - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                28 Present
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                2 Absent
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">
                <Timer className="h-3 w-3 mr-1" />
                0 Late
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classInfo?.students.slice(0, 10).map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      {index < 8 ? (
                        <Badge className="bg-green-500">Present</Badge>
                      ) : (
                        <Badge variant="destructive">Absent</Badge>
                      )}
                    </TableCell>
                    <TableCell>{index < 8 ? "9:15 AM" : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {index < 8 ? "On time" : "No reason provided"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAttendanceDetailsOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                toast.success("Attendance exported successfully");
                setAttendanceDetailsOpen(false);
              }}>
                Export to PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}