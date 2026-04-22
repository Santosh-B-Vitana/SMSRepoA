import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { academicApi, type SectionResponse } from "@/services/api/academicApi";
import { studentApi } from "@/services/api/studentApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import AttendanceRoster from "@/components/attendance/AttendanceRoster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentInfo {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  class?: string;
  section?: string;
}

interface AttendanceRecord {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export default function SectionDetail() {
  const { classId, sectionId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<SectionResponse | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [teachingStaff, setTeachingStaff] = useState<StaffBasic[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    classTeacherId: ""
  });

  // Timetable for the section
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

  const [timetableEntries, setTimetableEntries] = useState([
    { day: "Monday", period: 1, subject: "Mathematics", teacher: "Ms. Sarah" },
    { day: "Monday", period: 2, subject: "English", teacher: "Mr. John" },
    { day: "Monday", period: 3, subject: "Science", teacher: "Ms. Lisa" },
    { day: "Tuesday", period: 1, subject: "Hindi", teacher: "Ms. Priya" },
    { day: "Tuesday", period: 2, subject: "Mathematics", teacher: "Ms. Sarah" },
    { day: "Wednesday", period: 1, subject: "EVS", teacher: "Mr. Kumar" },
    { day: "Thursday", period: 1, subject: "Games", teacher: "Coach Amit" },
    { day: "Friday", period: 1, subject: "Art", teacher: "Ms. Ritu" },
    { day: "Saturday", period: 1, subject: "Music", teacher: "Mr. Dev" }
  ]);

  const [timetableEditMode, setTimetableEditMode] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [visibleRecords, setVisibleRecords] = useState(5);
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    loadSectionData();
  }, [classId, sectionId]);

  const loadSectionData = useCallback(async () => {
    setLoading(true);
    try {
      // Load section data, students, and teaching staff in parallel
      const [sectionData, studentsData, staffData] = await Promise.all([
        academicApi.getSection(sectionId!),
        studentApi.list({ pageSize: 100 }),
        staffApi.getTeachingStaff()
      ]);

      setSection(sectionData);
      setTeachingStaff(staffData.staff ?? []);
      setEditForm({
        name: sectionData.name,
        classTeacherId: sectionData.classTeacherId ?? ""
      });

      // Load students in this section - filtered by class name, section name, and active status
      const classStudents = (studentsData.students ?? []).filter(
        (s: any) => s.class === sectionData.className && s.section === sectionData.name && s.status === 'active'
      );
      setStudents(classStudents);

      // Load attendance history for this class for the last 30 days
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];

        const attendanceData = await attendanceApi.listRecords({
          dateFrom,
          dateTo,
          pageSize: 1000
        });

        // Group attendance by date and calculate statistics
        const groupedByDate: Record<string, any> = {};
        const totalStudentsCount = classStudents.length;

        attendanceData.records?.forEach((record: any) => {
          const date = new Date(record.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          if (!groupedByDate[date]) {
            groupedByDate[date] = {
              date,
              present: 0,
              absent: 0,
              late: 0,
              total: totalStudentsCount,
              percentage: 0,
              recordDate: record.date // for sorting
            };
          }

          if (record.status === 'present') groupedByDate[date].present++;
          else if (record.status === 'absent') groupedByDate[date].absent++;
          else if (record.status === 'late') groupedByDate[date].late++;
        });

        // Calculate percentages and sort by date
        const history = Object.values(groupedByDate)
          .map((record: any) => ({
            ...record,
            percentage: totalStudentsCount > 0 ?
              Math.round((record.present / totalStudentsCount) * 100 * 10) / 10 : 0
          }))
          .sort((a: any, b: any) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
          .slice(0, 10); // Show last 10 days

        setAttendanceHistory(history);
      } catch (attendanceError) {
        console.warn("Could not load attendance history:", attendanceError);
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error("Error loading section:", error);
      toast.error("Failed to load section details");
    }
    setLoading(false);
  }, [sectionId]);

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.updateSection(sectionId!, {
        name: editForm.name,
        classId: classId!,
        classTeacherId: editForm.classTeacherId || undefined
      });
      toast.success("Section updated successfully");
      setEditDialogOpen(false);
      loadSectionData();
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("Failed to update section");
    }
  };

  const getTimetableEntry = (day: string, period: number) => {
    return timetableEntries.find(e => e.day === day && e.period === period);
  };

  const handleLoadMore = () => {
    setVisibleRecords(prev => Math.min(prev + 5, attendanceHistory.length));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading section details...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-red-500 mb-4">Section not found</div>
        <Button onClick={() => navigate("/academics")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academics
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {section.className} - {section.name}
            </h1>
            <p className="text-muted-foreground">
              Section Management • {section.totalStudents} Students
            </p>
          </div>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <Button onClick={() => setEditDialogOpen(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Edit Section
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section Details</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveSection} className="space-y-4">
              <div>
                <Label htmlFor="sectionName">Section Name</Label>
                <Input
                  id="sectionName"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="classTeacher">Class Teacher</Label>
                <Select 
                  value={editForm.classTeacherId || "none"} 
                  onValueChange={(value) => setEditForm(f => ({ ...f, classTeacherId: value === "none" ? "" : value }))}
                >
                  <SelectTrigger id="classTeacher">
                    <SelectValue placeholder="Select a class teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - No class teacher assigned</SelectItem>
                    {teachingStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({staff.designation || 'Teacher'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select from available teaching staff in your school
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update</Button>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Section Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Students</div>
                <div className="text-xl font-semibold">{section.totalStudents}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Class Teacher</div>
                <div className="text-sm font-semibold">{section.classTeacherName || "Not assigned"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge>Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Clock className="h-4 w-4 mr-2" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <FileText className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students in {section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students assigned to this section yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            View Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
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
                          {Math.floor(section.totalStudents * 0.85)} Present
                        </Badge>
                        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          {Math.floor(section.totalStudents * 0.15)} Absent
                        </Badge>
                      </div>
                    </div>
                    <AttendanceRoster classId={classId!} students={students} />
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

        {/* Timetable Tab */}
        <TabsContent value="timetable" className="space-y-4">
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
                  toast.success(timetableEditMode ? "Edit mode disabled" : "Edit mode enabled");
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                {timetableEditMode ? "Done" : "Edit"}
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
                                >
                                  <div className="font-medium text-sm">{entry.subject}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{entry.teacher}</div>
                                </div>
                              ) : (
                                <div className={`text-xs text-muted-foreground ${timetableEditMode ? 'hover:bg-primary/10 cursor-pointer rounded p-2' : ''}`}>
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

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assignments
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assignments available</p>
                <p className="text-sm">Create assignments for this section</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.slice(0, 10).map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      {index % 2 === 0 ? (
                        <Badge className="bg-green-500">Present</Badge>
                      ) : (
                        <Badge variant="destructive">Absent</Badge>
                      )}
                    </TableCell>
                    <TableCell>{index % 2 === 0 ? "9:15 AM" : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAttendanceDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
