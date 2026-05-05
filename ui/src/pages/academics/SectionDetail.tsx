import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Search,
  ArrowRightLeft,
  UserPlus,
  Loader2,
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

  // ── Add Students Dialog ──────────────────────────────────────────────────
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [allClassStudents, setAllClassStudents] = useState<StudentInfo[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);

  // ── Transfer Dialog (single / from section) ──────────────────────────────
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<StudentInfo | null>(null);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [allSections, setAllSections] = useState<SectionResponse[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);

  // ── Bulk Transfer from THIS section ─────────────────────────────────────
  const [selectedInSection, setSelectedInSection] = useState<Set<string>>(new Set());
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState("");
  const [bulkTransferLoading, setBulkTransferLoading] = useState(false);

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

  // ── Load all sections in this class (for transfer target dropdown) ────────
  const loadAllSections = useCallback(async () => {
    if (allSections.length > 0) return;
    try {
      const res = await academicApi.listSections(classId!, 1, 100);
      setAllSections((res.sections ?? []).filter(s => s.id !== sectionId));
    } catch {
      toast.error("Failed to load sections");
    }
  }, [classId, sectionId, allSections.length]);

  // ── Open "Add Students" dialog: load all class students not in THIS section
  const openAddStudents = async () => {
    setAddStudentsOpen(true);
    setSelectedToAdd(new Set());
    setAddSearch("");
    setLoadingAllStudents(true);
    try {
      const [studentsRes, sectionsRes] = await Promise.all([
        studentApi.list({ classFilter: section?.className, pageSize: 500, status: "active" }),
        academicApi.listSections(classId!, 1, 100),
      ]);
      // Students not already in THIS section
      const eligible = (studentsRes.students ?? []).filter(
        (s: StudentInfo) => s.section !== section?.name
      );
      setAllClassStudents(eligible);
      setAllSections((sectionsRes.sections ?? []).filter(s => s.id !== sectionId));
    } catch {
      toast.error("Failed to load students");
    }
    setLoadingAllStudents(false);
  };

  // ── Confirm: assign / transfer selected students into THIS section ────────
  const handleAddStudents = async () => {
    if (selectedToAdd.size === 0) return;
    setAddLoading(true);
    try {
      await studentApi.bulkUpdate({
        studentIds: Array.from(selectedToAdd),
        class: section!.className,
        section: section!.name,
      });
      toast.success(`${selectedToAdd.size} student(s) added to ${section?.name}`);
      setAddStudentsOpen(false);
      setSelectedInSection(new Set());
      await loadSectionData();
    } catch {
      toast.error("Failed to add students. Please try again.");
    }
    setAddLoading(false);
  };

  // ── Open single-student transfer dialog ───────────────────────────────────
  const openTransfer = async (student: StudentInfo) => {
    setTransferStudent(student);
    setTargetSectionId("");
    setTransferDialogOpen(true);
    await loadAllSections();
  };

  // ── Confirm single-student transfer ──────────────────────────────────────
  const handleTransferStudent = async () => {
    if (!transferStudent || !targetSectionId) return;
    setTransferLoading(true);
    try {
      const target = allSections.find(s => s.id === targetSectionId);
      await studentApi.update(transferStudent.id, {
        class: section!.className,
        section: target!.name,
      });
      toast.success(`${transferStudent.name} transferred to ${target?.name}`);
      setTransferDialogOpen(false);
      setSelectedInSection(new Set());
      await loadSectionData();
    } catch {
      toast.error("Failed to transfer student. Please try again.");
    }
    setTransferLoading(false);
  };

  // ── Open bulk-transfer dialog ────────────────────────────────────────────
  const openBulkTransfer = async () => {
    setBulkTargetSectionId("");
    setBulkTransferOpen(true);
    await loadAllSections();
  };

  // ── Confirm bulk transfer from THIS section ───────────────────────────────
  const handleBulkTransfer = async () => {
    if (selectedInSection.size === 0 || !bulkTargetSectionId) return;
    setBulkTransferLoading(true);
    try {
      const target = allSections.find(s => s.id === bulkTargetSectionId);
      await studentApi.bulkUpdate({
        studentIds: Array.from(selectedInSection),
        class: section!.className,
        section: target!.name,
      });
      toast.success(`${selectedInSection.size} student(s) transferred to ${target?.name}`);
      setBulkTransferOpen(false);
      setSelectedInSection(new Set());
      await loadSectionData();
    } catch {
      toast.error("Failed to transfer students. Please try again.");
    }
    setBulkTransferLoading(false);
  };

  // ── Select-all helpers ────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedInSection.size === students.length) {
      setSelectedInSection(new Set());
    } else {
      setSelectedInSection(new Set(students.map(s => s.id)));
    }
  };

  const filteredAddStudents = useMemo(() => {
    if (!addSearch.trim()) return allClassStudents;
    const q = addSearch.toLowerCase();
    return allClassStudents.filter(
      s => s.name.toLowerCase().includes(q) || s.rollNo?.toLowerCase().includes(q)
    );
  }, [allClassStudents, addSearch]);

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
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students in {section.name}
                <Badge variant="secondary" className="ml-1">{students.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedInSection.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openBulkTransfer}
                    className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer {selectedInSection.size} Selected
                  </Button>
                )}
                <Button size="sm" onClick={openAddStudents} className="gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Add Students
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">No students assigned to this section yet</p>
                  <p className="text-sm mt-1">Use the "Add Students" button to assign students from {section.className}</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={openAddStudents}>
                    <UserPlus className="h-4 w-4" />
                    Add Students
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedInSection.size === students.length && students.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.id}
                        data-state={selectedInSection.has(student.id) ? "selected" : undefined}
                        className={selectedInSection.has(student.id) ? "bg-muted/50" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedInSection.has(student.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedInSection);
                              if (checked) next.add(student.id);
                              else next.delete(student.id);
                              setSelectedInSection(next);
                            }}
                            aria-label={`Select ${student.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.rollNo || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <span className="text-xs font-bold text-primary">{student.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{section.className} – {section.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-700 border-green-200" variant="outline">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openTransfer(student)}
                              className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/students/${student.id}`)}
                            >
                              View Profile
                            </Button>
                          </div>
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

      {/* ── Add Students Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addStudentsOpen} onOpenChange={setAddStudentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Students to {section?.className} – {section?.name}
            </DialogTitle>
            <DialogDescription>
              Students from {section?.className} not yet in this section. Select one or more and click "Add to Section".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or roll number..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
              />
            </div>

            {/* Selection summary */}
            {selectedToAdd.size > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <span className="text-primary font-medium">{selectedToAdd.size} student(s) selected</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedToAdd(new Set())}>
                  Clear selection
                </Button>
              </div>
            )}

            {/* Student list */}
            {loadingAllStudents ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Loading students...</span>
              </div>
            ) : filteredAddStudents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                {allClassStudents.length === 0
                  ? <p>All students of {section?.className} are already in a section.</p>
                  : <p>No students match your search.</p>
                }
              </div>
            ) : (
              <>
                {/* Select All row */}
                <div className="flex items-center gap-3 px-1 pb-1 border-b">
                  <Checkbox
                    id="select-all-add"
                    checked={selectedToAdd.size === filteredAddStudents.length && filteredAddStudents.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedToAdd(new Set(filteredAddStudents.map(s => s.id)));
                      else setSelectedToAdd(new Set());
                    }}
                  />
                  <label htmlFor="select-all-add" className="text-sm font-medium cursor-pointer">
                    Select all {filteredAddStudents.length} students
                  </label>
                </div>

                <ScrollArea className="h-72 pr-2">
                  <div className="space-y-1">
                    {filteredAddStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => {
                          const next = new Set(selectedToAdd);
                          if (next.has(student.id)) next.delete(student.id);
                          else next.add(student.id);
                          setSelectedToAdd(next);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          selectedToAdd.has(student.id)
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={selectedToAdd.has(student.id)}
                          onCheckedChange={() => {}}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-xs font-bold text-primary">{student.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Roll: {student.rollNo || "—"}
                            {student.section ? (
                              <span className="ml-2 text-orange-600">
                                (Currently in {section?.className} – {student.section})
                              </span>
                            ) : (
                              <span className="ml-2 text-green-600">(Unassigned)</span>
                            )}
                          </p>
                        </div>
                        {student.section && student.section !== section?.name && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Transfer</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddStudentsOpen(false)} disabled={addLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleAddStudents}
                disabled={selectedToAdd.size === 0 || addLoading}
                className="gap-2"
              >
                {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {addLoading ? "Adding..." : `Add ${selectedToAdd.size > 0 ? selectedToAdd.size : ""} to ${section?.name}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Transfer Dialog ──────────────────────────────────────────── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer Student
            </DialogTitle>
            <DialogDescription>
              Move <span className="font-semibold">{transferStudent?.name}</span> from{" "}
              <span className="font-semibold">{section?.className} – {section?.name}</span> to another section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Target Section</Label>
              <Select value={targetSectionId} onValueChange={setTargetSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target section..." />
                </SelectTrigger>
                <SelectContent>
                  {allSections.length === 0 ? (
                    <SelectItem value="_none" disabled>No other sections available</SelectItem>
                  ) : (
                    allSections.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.className} – {s.name}
                        {s.classTeacherName && (
                          <span className="text-muted-foreground ml-2">({s.classTeacherName})</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={transferLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleTransferStudent}
                disabled={!targetSectionId || transferLoading}
                className="gap-2"
              >
                {transferLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {transferLoading ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Transfer Dialog ─────────────────────────────────────────────── */}
      <Dialog open={bulkTransferOpen} onOpenChange={setBulkTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Bulk Transfer Students
            </DialogTitle>
            <DialogDescription>
              Transfer <span className="font-semibold">{selectedInSection.size} student(s)</span> from{" "}
              <span className="font-semibold">{section?.className} – {section?.name}</span> to another section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Target Section</Label>
              <Select value={bulkTargetSectionId} onValueChange={setBulkTargetSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target section..." />
                </SelectTrigger>
                <SelectContent>
                  {allSections.length === 0 ? (
                    <SelectItem value="_none" disabled>No other sections available</SelectItem>
                  ) : (
                    allSections.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.className} – {s.name}
                        {s.classTeacherName && (
                          <span className="text-muted-foreground ml-2">({s.classTeacherName})</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkTransferOpen(false)} disabled={bulkTransferLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkTransfer}
                disabled={!bulkTargetSectionId || bulkTransferLoading}
                className="gap-2"
              >
                {bulkTransferLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkTransferLoading ? "Transferring..." : `Transfer ${selectedInSection.size} Student(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

