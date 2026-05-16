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
  Pencil,
  Trash2,
  Search,
  ArrowRightLeft,
  UserPlus,
  Loader2,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  ChevronRight,
  Award,
  AlertCircle,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { academicApi, type SectionResponse, type TeacherAssignmentResponse, type ClassSubjectResponse } from "@/services/api/academicApi";
import { timetableApi, type TimetableRecord, type TimetablePeriod } from "@/services/api/timetableApi";
import { studentApi } from "@/services/api/studentApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import AttendanceRoster from "@/components/attendance/AttendanceRoster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignmentApi, type AssignmentResponse, type SubmissionResponse } from "@/services/api/assignmentApi";

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

  // Timetable constants
  const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const TIMETABLE_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
  const DEFAULT_PERIOD_TIMES: Record<number, { start: string; end: string }> = {
    1: { start: "09:00", end: "09:45" }, 2: { start: "09:45", end: "10:30" },
    3: { start: "10:45", end: "11:30" }, 4: { start: "11:30", end: "12:15" },
    5: { start: "13:00", end: "13:45" }, 6: { start: "13:45", end: "14:30" },
    7: { start: "14:30", end: "15:15" }, 8: { start: "15:15", end: "16:00" },
  };

  // Timetable state
  const [timetableRecord, setTimetableRecord] = useState<TimetableRecord | null>(null);
  const [timetablePeriods, setTimetablePeriods] = useState<TimetablePeriod[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableInitializing, setTimetableInitializing] = useState(false);
  const [timetableEditMode, setTimetableEditMode] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodSaving, setPeriodSaving] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState({
    day: "Monday", periodNumber: 1,
    startTime: "09:00", endTime: "09:45",
    subjectId: "", teacherId: "", teacherName: "", room: "",
    periodType: "lecture", notes: "",
  });
  const [teacherPickerQuery, setTeacherPickerQuery] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  // ΓöÇΓöÇ Staff Assignments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [staffAssignments, setStaffAssignments] = useState<TeacherAssignmentResponse[]>([]);
  const [staffAssignmentsLoading, setStaffAssignmentsLoading] = useState(false);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [assignStaffOpen, setAssignStaffOpen] = useState(false);
  const [assignStaffSaving, setAssignStaffSaving] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<{
    staffId: string;
    staffName: string;
    subjectId: string;
    isClassTeacher: boolean;
  }>({ staffId: "", staffName: "", subjectId: "", isClassTeacher: false });

  // Subject-level section override dialog
  const [subjectOverrideOpen, setSubjectOverrideOpen] = useState(false);
  const [overrideSubject, setOverrideSubject] = useState<ClassSubjectResponse | null>(null);
  const [overrideExistingId, setOverrideExistingId] = useState<string | null>(null);
  const [overrideStaffId, setOverrideStaffId] = useState("");
  const [overrideStaffName, setOverrideStaffName] = useState("");
  const [overrideStaffSearch, setOverrideStaffSearch] = useState("");
  const [overrideDropdownOpen, setOverrideDropdownOpen] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [visibleRecords, setVisibleRecords] = useState(5);
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [rawAttendanceItems, setRawAttendanceItems] = useState<{ studentId: string; date: string; status: string }[]>([]);

  // ΓöÇΓöÇ Add Students Dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [allClassStudents, setAllClassStudents] = useState<StudentInfo[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);

  // ΓöÇΓöÇ Transfer Dialog (single / from section) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<StudentInfo | null>(null);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [allSections, setAllSections] = useState<SectionResponse[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);

  // ΓöÇΓöÇ Bulk Transfer from THIS section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [selectedInSection, setSelectedInSection] = useState<Set<string>>(new Set());
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState("");
  const [bulkTransferLoading, setBulkTransferLoading] = useState(false);

  // ΓöÇΓöÇ Assignments Tab ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [classAssignments, setClassAssignments] = useState<AssignmentResponse[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  // Create assignment dialog
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [createAssignmentSaving, setCreateAssignmentSaving] = useState(false);
  const [createAssignmentForm, setCreateAssignmentForm] = useState({
    title: "", description: "", subjectId: "",
    assignedDate: new Date().toISOString().split("T")[0],
    dueDate: "", maxMarks: "100",
  });
  // Assignment detail / submissions panel
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentResponse | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<SubmissionResponse[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  // Grade dialog
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionResponse | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks: "", feedback: "" });
  const [gradeSaving, setGradeSaving] = useState(false);

  // ΓöÇΓöÇ Assignment loaders and handlers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const loadAssignments = useCallback(async () => {
    if (!classId || !sectionId) return;
    setAssignmentsLoading(true);
    try {
      const result = await assignmentApi.getAssignments(classId, sectionId, undefined, 1, 100);
      setClassAssignments(result.assignments ?? []);
      setAssignmentsLoaded(true);
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  }, [classId, sectionId]);

  const loadSubmissions = useCallback(async (assignment: AssignmentResponse) => {
    setSelectedAssignment(assignment);
    setSubmissionsLoading(true);
    try {
      const result = await assignmentApi.getSubmissions(assignment.id, 1, 200);
      setAssignmentSubmissions(result.submissions ?? []);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const handleCreateAssignment = async () => {
    if (!createAssignmentForm.title.trim() || !createAssignmentForm.subjectId || !createAssignmentForm.dueDate) {
      toast.error("Title, subject, and due date are required");
      return;
    }
    setCreateAssignmentSaving(true);
    try {
      const created = await assignmentApi.createAssignment({
        classId: classId!,
        sectionId: sectionId!,
        subjectId: createAssignmentForm.subjectId,
        title: createAssignmentForm.title.trim(),
        description: createAssignmentForm.description.trim(),
        assignedDate: createAssignmentForm.assignedDate,
        dueDate: createAssignmentForm.dueDate,
        maxMarks: parseFloat(createAssignmentForm.maxMarks) || 100,
        status: "active",
      });
      setClassAssignments(prev => [created, ...prev]);
      setCreateAssignmentOpen(false);
      setCreateAssignmentForm({ title: "", description: "", subjectId: "", assignedDate: new Date().toISOString().split("T")[0], dueDate: "", maxMarks: "100" });
      toast.success("Assignment created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to create assignment");
    } finally {
      setCreateAssignmentSaving(false);
    }
  };

  const handleGradeSubmit = async () => {
    if (!gradingSubmission || !gradeForm.marks) return;
    const marks = parseFloat(gradeForm.marks);
    if (isNaN(marks) || marks < 0) { toast.error("Enter valid marks"); return; }
    setGradeSaving(true);
    try {
      await assignmentApi.gradeSubmission(gradingSubmission.id, {
        marksObtained: marks,
        feedback: gradeForm.feedback || undefined,
        gradedById: "",  // server resolves from JWT in future; for now backend doesn't validate this
        status: "graded",
      });
      toast.success("Submission graded");
      setGradeDialogOpen(false);
      setGradingSubmission(null);
      setGradeForm({ marks: "", feedback: "" });
      // Refresh submissions list
      if (selectedAssignment) loadSubmissions(selectedAssignment);
      // Refresh assignment list to update graded count
      loadAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to grade submission");
    } finally {
      setGradeSaving(false);
    }
  };

  useEffect(() => {
    loadSectionData();
    loadStaffAssignments();
    loadTimetable();
  }, [classId, sectionId]);

  // Lazy-load assignments when tab is first selected
  useEffect(() => {
    if (activeTab === "assignments" && !assignmentsLoaded) {
      loadAssignments();
    }
  }, [activeTab, assignmentsLoaded, loadAssignments]);

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

        // Filter records to only this section's students
        const sectionStudentIds = new Set(classStudents.map((s: any) => s.id));
        const sectionItems = (attendanceData.items ?? []).filter(
          (record: any) => sectionStudentIds.has(record.studentId)
        );

        // Store raw items for use in the details modal
        setRawAttendanceItems(sectionItems.map((r: any) => ({
          studentId: r.studentId,
          date: r.date,
          status: r.status,
        })));

        // Group attendance by date and calculate statistics
        const groupedByDate: Record<string, any> = {};
        const totalStudentsCount = classStudents.length;

        sectionItems.forEach((record: any) => {
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

  const loadStaffAssignments = useCallback(async () => {
    if (!sectionId) return;
    setStaffAssignmentsLoading(true);
    try {
      const [assignmentsResult, classSubjectsResult] = await Promise.all([
        academicApi.getTeacherAssignments({ sectionId, pageSize: 100 }),
        academicApi.getClassSubjects(classId!),
      ]);
      setStaffAssignments(assignmentsResult.assignments ?? []);
      setClassSubjects(classSubjectsResult ?? []);
    } catch {
      toast.error("Failed to load staff assignments");
    } finally {
      setStaffAssignmentsLoading(false);
    }
  }, [sectionId]);

  const handleAssignStaff = async () => {
    if (!assignForm.staffId || !classId || !sectionId) {
      toast.error("Please select a staff member");
      return;
    }
    setAssignStaffSaving(true);
    try {
      // Determine current academic year
      const years = await academicApi.listAcademicYears(1, 1);
      const academicYear =
        years.academicYears?.find(y => y.isCurrent)?.name ??
        years.academicYears?.[0]?.name ??
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      const saved = await academicApi.assignTeacher({
        staffId: assignForm.staffId,
        classId,
        sectionId,
        subjectId: assignForm.subjectId || undefined,
        isClassTeacher: assignForm.isClassTeacher,
        academicYear,
      });

      // Optimistically add the new assignment immediately (with the UI-supplied names)
      // so it shows up right away even before the background re-fetch completes.
      const optimistic: typeof saved = {
        ...saved,
        staffName: assignForm.staffName,
        subjectName: classSubjects.find(cs => cs.subjectId === assignForm.subjectId)?.subjectName ?? saved.subjectName,
        academicYear,
      };
      setStaffAssignments(prev => {
        // Avoid duplicates (server may already have returned the record in a race)
        if (prev.some(a => a.id === optimistic.id)) return prev;
        return [...prev, optimistic];
      });

      toast.success(`${assignForm.staffName} assigned successfully`);
      // Auto-role assignment is handled server-side — surface it to the admin
      if (assignForm.isClassTeacher) {
        toast.info(`Role "Class Teacher" has been automatically assigned to ${assignForm.staffName} in Role Management.`);
      } else if (assignForm.subjectId) {
        toast.info(`Role "Teacher" (Subject) has been automatically assigned to ${assignForm.staffName} in Role Management.`);
      }
      setAssignStaffOpen(false);
      setAssignForm({ staffId: "", staffName: "", subjectId: "", isClassTeacher: false });
      setStaffSearchQuery("");
      // Background re-fetch to get accurate server data (nav-prop names etc.)
      loadStaffAssignments();
      // Reload section data to refresh class teacher name in header
      loadSectionData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to assign staff");
    } finally {
      setAssignStaffSaving(false);
    }
  };

  const handleRemoveStaffAssignment = async (assignmentId: string, staffName: string) => {
    try {
      await academicApi.removeTeacherAssignment(assignmentId);
      toast.success(`${staffName} removed from section`);
      setStaffAssignments(prev => prev.filter(a => a.id !== assignmentId));
      // Reload section to refresh class teacher display
      await loadSectionData();
    } catch {
      toast.error("Failed to remove staff assignment");
    }
  };

  const handleSaveSubjectOverride = async () => {
    if (!overrideStaffId || !overrideSubject || !sectionId || !classId) {
      toast.error("Please select a staff member");
      return;
    }
    setOverrideSaving(true);
    try {
      const years = await academicApi.listAcademicYears(1, 1);
      const academicYear =
        years.academicYears?.find(y => y.isCurrent)?.name ??
        years.academicYears?.[0]?.name ??
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      if (overrideExistingId) {
        await academicApi.removeTeacherAssignment(overrideExistingId);
        setStaffAssignments(prev => prev.filter(a => a.id !== overrideExistingId));
      }
      const saved = await academicApi.assignTeacher({
        staffId: overrideStaffId,
        classId,
        sectionId,
        subjectId: overrideSubject.subjectId,
        isClassTeacher: false,
        academicYear,
      });
      setStaffAssignments(prev => {
        if (prev.some(a => a.id === saved.id)) return prev;
        return [...prev, { ...saved, staffName: overrideStaffName, subjectName: overrideSubject!.subjectName }];
      });
      toast.success(`${overrideStaffName} assigned to ${overrideSubject.subjectName} for this section`);
      setSubjectOverrideOpen(false);
      setOverrideSubject(null); setOverrideExistingId(null);
      setOverrideStaffId(""); setOverrideStaffName(""); setOverrideStaffSearch("");
      loadStaffAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save assignment");
    } finally {
      setOverrideSaving(false);
    }
  };

  const filteredStaffForAssign = useMemo(() => {
    const q = staffSearchQuery.toLowerCase();
    return (teachingStaff ?? []).filter(
      s => !q || (s.name ?? `${s.firstName} ${s.lastName}`).toLowerCase().includes(q)
    ).slice(0, 8);
  }, [teachingStaff, staffSearchQuery]);

  const filteredStaffForOverride = useMemo(() => {
    const q = overrideStaffSearch.toLowerCase();
    return (teachingStaff ?? []).filter(
      s => !q || (s.name ?? `${s.firstName} ${s.lastName}`).toLowerCase().includes(q)
    ).slice(0, 8);
  }, [teachingStaff, overrideStaffSearch]);

  // Teacher picker for the period dialog.
  // Primary source: teachers configured for subjects in this class (ClassSubjects).
  // Secondary: any additional staff directly assigned to this section (TeacherAssignments).
  // We do NOT fall back to all teaching staff - only show class-configured teachers.
  const periodTeacherOptions = useMemo(() => {
    // Deduplicated list from class subjects (each teacher appears once, labelled with their subject)
    const fromClassSubjects = classSubjects
      .filter(cs => cs.teacherId)
      .filter((cs, i, arr) => arr.findIndex(x => x.teacherId === cs.teacherId) === i)
      .map(cs => ({
        id: cs.teacherId!,
        name: cs.teacherName ?? "",
        designation: cs.subjectName, // shown as sub-text so the user knows which subject
        isAssigned: true,
        subjectId: cs.subjectId,
      }));

    const classSubjectTeacherIds = new Set(fromClassSubjects.map(t => t.id));

    // Section-level assignments not already covered by classSubjects
    const fromSectionAssignments = staffAssignments
      .filter((a, i, arr) => a.staffId && arr.findIndex(x => x.staffId === a.staffId) === i)
      .filter(a => !classSubjectTeacherIds.has(a.staffId))
      .map(a => ({
        id: a.staffId,
        name: a.staffName,
        designation: a.subjectName ?? "",
        isAssigned: true,
        subjectId: a.subjectId,
      }));

    return [...fromClassSubjects, ...fromSectionAssignments];
  }, [classSubjects, staffAssignments]);

  // ΓöÇΓöÇ Timetable ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const loadTimetable = useCallback(async () => {
    if (!classId || !sectionId) return;
    setTimetableLoading(true);
    try {
      // Resolve current academic year for filtering
      const yearsRes = await academicApi.listAcademicYears(1, 5);
      const currentYear =
        yearsRes.academicYears?.find(y => y.isCurrent)?.name ??
        yearsRes.academicYears?.[0]?.name;
      const normalizeYear = (y: string) => y.replace(/\//g, '-').trim();

      const findTarget = (list: TimetableRecord[]) => {
        if (!currentYear) return list.find(t => t.status === 'active') ?? list[0] ?? null;
        const byYear = list.filter(
          t => normalizeYear(t.academicYear) === normalizeYear(currentYear)
        );
        return byYear.find(t => t.status === 'active') ?? byYear[0] ??
          list.find(t => t.status === 'active') ?? list[0] ?? null;
      };

      // 1. Try section-specific timetable
      const secRes = await timetableApi.list(classId, 1, 50, sectionId, currentYear);
      let target = findTarget(secRes.timetables ?? []);

      // 2. Fall back to class-level (no sectionId) timetable if none found
      if (!target) {
        const classRes = await timetableApi.list(classId, 1, 50, undefined, currentYear);
        target = findTarget(classRes.timetables ?? []);
      }

      setTimetableRecord(target);
      if (target) {
        const detail = await timetableApi.getDetail(target.id);
        setTimetablePeriods(detail.periods ?? []);
      } else {
        setTimetablePeriods([]);
      }
    } catch {
      // silently degrade - timetable is non-critical
    } finally {
      setTimetableLoading(false);
    }
  }, [classId, sectionId]);

  const handleInitTimetable = async () => {
    if (!classId || !sectionId) return;
    setTimetableInitializing(true);
    try {
      const years = await academicApi.listAcademicYears(1, 5);
      const academicYear =
        years.academicYears?.find(y => y.isCurrent)?.name ??
        years.academicYears?.[0]?.name ??
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const record = await timetableApi.create({
        ClassId: classId,
        SectionId: sectionId,
        AcademicYear: academicYear,
        Status: "active",
      });
      setTimetableRecord(record);
      setTimetablePeriods([]);
      setTimetableEditMode(true);
      toast.success("Timetable created - add periods by clicking cells");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create timetable";
      // If duplicate, just reload
      if (msg.toLowerCase().includes("already exists")) {
        toast.info("Timetable already exists, refreshing...");
        await loadTimetable();
      } else {
        toast.error(msg);
      }
    } finally {
      setTimetableInitializing(false);
    }
  };

  const openAddPeriod = (day: string, periodNumber: number) => {
    const defaults = DEFAULT_PERIOD_TIMES[periodNumber] ?? { start: "09:00", end: "09:45" };
    setPeriodForm({
      day, periodNumber,
      startTime: defaults.start, endTime: defaults.end,
      subjectId: "", teacherId: "", teacherName: "", room: "", periodType: "lecture", notes: "",
    });
    setTeacherPickerQuery("");
    setEditingPeriodId(null);
    setPeriodDialogOpen(true);
  };

  const openEditPeriod = (period: TimetablePeriod) => {
    const fmt = (t: string) => t.substring(0, 5); // "HH:MM:SS" ΓåÆ "HH:MM"
    setPeriodForm({
      day: period.dayOfWeek, periodNumber: period.periodNumber,
      startTime: fmt(period.startTime), endTime: fmt(period.endTime),
      subjectId: period.subjectId ?? "", teacherId: period.teacherId ?? "",
      teacherName: period.teacherName ?? "",
      room: period.room ?? "", periodType: period.periodType ?? "lecture",
      notes: period.notes ?? "",
    });
    setTeacherPickerQuery("");
    setEditingPeriodId(period.id);
    setPeriodDialogOpen(true);
  };

  const handleSavePeriod = async () => {
    if (!timetableRecord) return;
    if (!periodForm.day || !periodForm.startTime || !periodForm.endTime) {
      toast.error("Day, start time and end time are required");
      return;
    }
    setPeriodSaving(true);
    try {
      const toTimeSpan = (t: string) => t.length === 5 ? `${t}:00` : t;
      if (editingPeriodId) {
        const updated = await timetableApi.updatePeriod(editingPeriodId, {
          StartTime: toTimeSpan(periodForm.startTime),
          EndTime: toTimeSpan(periodForm.endTime),
          SubjectId: periodForm.subjectId || undefined,
          TeacherId: periodForm.teacherId || undefined,
          Room: periodForm.room || undefined,
          PeriodType: periodForm.periodType || undefined,
          Notes: periodForm.notes || undefined,
        });
        setTimetablePeriods(prev =>
          prev.map(p => p.id === editingPeriodId ? updated : p)
        );
        toast.success("Period updated");
      } else {
        const created = await timetableApi.createPeriod({
          TimetableId: timetableRecord.id,
          DayOfWeek: periodForm.day,
          PeriodNumber: periodForm.periodNumber,
          StartTime: toTimeSpan(periodForm.startTime),
          EndTime: toTimeSpan(periodForm.endTime),
          SubjectId: periodForm.subjectId || undefined,
          TeacherId: periodForm.teacherId || undefined,
          Room: periodForm.room || undefined,
          PeriodType: periodForm.periodType || undefined,
          Notes: periodForm.notes || undefined,
        });
        setTimetablePeriods(prev => [...prev, created]);
        toast.success("Period added");
      }
      setPeriodDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save period");
    } finally {
      setPeriodSaving(false);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    setDeletingPeriodId(periodId);
    try {
      await timetableApi.deletePeriod(periodId);
      setTimetablePeriods(prev => prev.filter(p => p.id !== periodId));
      toast.success("Period removed");
    } catch {
      toast.error("Failed to remove period");
    } finally {
      setDeletingPeriodId(null);
    }
  };

  const getPeriodForCell = (day: string, periodNumber: number) =>
    timetablePeriods.find(
      p => p.dayOfWeek.toLowerCase() === day.toLowerCase() && p.periodNumber === periodNumber
    ) ?? null;

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

  const handleLoadMore = () => {
    setVisibleRecords(prev => Math.min(prev + 5, attendanceHistory.length));
  };

  // ΓöÇΓöÇ Load all sections in this class (for transfer target dropdown) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const loadAllSections = useCallback(async () => {
    if (allSections.length > 0) return;
    try {
      const res = await academicApi.listSections(classId!, 1, 100);
      setAllSections((res.sections ?? []).filter(s => s.id !== sectionId));
    } catch {
      toast.error("Failed to load sections");
    }
  }, [classId, sectionId, allSections.length]);

  // ΓöÇΓöÇ Open "Add Students" dialog: load all class students not in THIS section
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

  // ΓöÇΓöÇ Confirm: assign / transfer selected students into THIS section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇ Open single-student transfer dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const openTransfer = async (student: StudentInfo) => {
    setTransferStudent(student);
    setTargetSectionId("");
    setTransferDialogOpen(true);
    await loadAllSections();
  };

  // ΓöÇΓöÇ Confirm single-student transfer ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇ Open bulk-transfer dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const openBulkTransfer = async () => {
    setBulkTargetSectionId("");
    setBulkTransferOpen(true);
    await loadAllSections();
  };

  // ΓöÇΓöÇ Confirm bulk transfer from THIS section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇ Select-all helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
              {section.className} &mdash; Section {section.name} &bull; {students.length} Active Students
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
                <div className="text-sm text-muted-foreground">Active Students</div>
                <div className="text-xl font-semibold">{students.length}</div>
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="staff">
            <GraduationCap className="h-4 w-4 mr-2" />
            Staff
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
                      <TableHead className="font-semibold">Roll No</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
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
                        <TableCell className="font-semibold text-sm">{student.rollNo || "—"}</TableCell>
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
                          <Badge variant="outline">{section.className} - {section.name}</Badge>
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

        {/* Staff Assignment Tab */}
        <TabsContent value="staff" className="space-y-4">

          {/* Subject Teachers card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subject Teachers
                <Badge variant="secondary" className="ml-1">{classSubjects.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={loadStaffAssignments} disabled={staffAssignmentsLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${staffAssignmentsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {staffAssignmentsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No subjects configured for this class</p>
                  <p className="text-sm mt-1">Add subjects in Class setup to manage teachers here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class Default Teacher</TableHead>
                      <TableHead>Section Teacher</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classSubjects.map(cs => {
                      const override = staffAssignments.find(a => a.subjectId === cs.subjectId);
                      return (
                        <TableRow key={cs.subjectId}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{cs.subjectName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {cs.teacherName ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold">{cs.teacherName[0].toUpperCase()}</span>
                                </div>
                                <span className="text-sm">{cs.teacherName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/60 italic">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {override ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-primary">{(override.staffName || "?")[0].toUpperCase()}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{override.staffName}</p>
                                  <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">Section override</Badge>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Uses class default</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs"
                                onClick={() => {
                                  setOverrideSubject(cs);
                                  setOverrideExistingId(override?.id ?? null);
                                  setOverrideStaffId(override?.staffId ?? "");
                                  setOverrideStaffName(override?.staffName ?? "");
                                  setOverrideStaffSearch("");
                                  setSubjectOverrideOpen(true);
                                }}>
                                {override ? <><Pencil className="h-3 w-3" />Edit</> : <><Plus className="h-3 w-3" />Assign</>}
                              </Button>
                              {override && (
                                <Button size="sm" variant="ghost"
                                  className="gap-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveStaffAssignment(override.id, override.staffName)}>
                                  <Trash2 className="h-3 w-3" />Remove
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Class Teacher & General Assignments card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Class Teacher &amp; Other Assignments
                <Badge variant="secondary" className="ml-1">{staffAssignments.filter(a => a.isClassTeacher || !a.subjectId).length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={() => { setAssignForm({ staffId: "", staffName: "", subjectId: "", isClassTeacher: true }); setStaffSearchQuery(""); setAssignStaffOpen(true); }} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Assign Staff
              </Button>
            </CardHeader>
            <CardContent>
              {staffAssignmentsLoading ? null : (() => {
                const general = staffAssignments.filter(a => a.isClassTeacher || !a.subjectId);
                return general.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No class teacher assigned yet</p>
                    <Button size="sm" className="mt-3 gap-1.5" onClick={() => { setAssignForm({ staffId: "", staffName: "", subjectId: "", isClassTeacher: true }); setStaffSearchQuery(""); setAssignStaffOpen(true); }}>
                      <Plus className="h-4 w-4" />Assign Class Teacher
                    </Button>
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {general.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {(assignment.staffName || "?")[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{assignment.staffName || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.isClassTeacher ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1" variant="outline">
                              <ShieldCheck className="h-3 w-3" />
                              Class Teacher
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Subject Teacher</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{assignment.academicYear}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={assignment.status === "active"
                              ? "bg-green-500/10 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600"}
                          >
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveStaffAssignment(assignment.id, assignment.staffName)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                );
              })()}
            </CardContent>
          </Card>

          {/* Subject Override Dialog */}
          <Dialog open={subjectOverrideOpen} onOpenChange={open => { setSubjectOverrideOpen(open); if (!open) { setOverrideSubject(null); setOverrideExistingId(null); setOverrideStaffId(""); setOverrideStaffName(""); setOverrideStaffSearch(""); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {overrideExistingId ? "Edit Section Teacher" : "Assign Section Teacher"}
                </DialogTitle>
                <DialogDescription>
                  {overrideSubject && (<>Assign a section-specific teacher for <strong>{overrideSubject.subjectName}</strong>.{overrideSubject.teacherName && (<> Class default: <span className="font-medium">{overrideSubject.teacherName}</span>.</>)}</>)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</Label>
                  <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{overrideSubject?.subjectName}</span>
                  </div>
                </div>
                <div>
                  <Label>Staff Member <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <div className="flex items-center border rounded-md px-3 h-10">
                      <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                      <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Search staff..."
                        value={overrideStaffId ? overrideStaffName : overrideStaffSearch}
                        onFocus={() => { setOverrideDropdownOpen(true); if (overrideStaffId) setOverrideStaffSearch(""); }}
                        onBlur={() => setTimeout(() => setOverrideDropdownOpen(false), 150)}
                        onChange={e => { setOverrideStaffSearch(e.target.value); setOverrideStaffId(""); setOverrideStaffName(""); setOverrideDropdownOpen(true); }}
                      />
                      {overrideStaffId && (
                        <button className="ml-1 text-muted-foreground hover:text-foreground" onMouseDown={e => { e.preventDefault(); setOverrideStaffId(""); setOverrideStaffName(""); setOverrideStaffSearch(""); }}>×</button>
                      )}
                    </div>
                    {overrideDropdownOpen && !overrideStaffId && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {filteredStaffForOverride.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No staff found</div>
                        ) : filteredStaffForOverride.map(s => (
                          <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
                            onMouseDown={e => { e.preventDefault(); setOverrideStaffId(s.id); setOverrideStaffName(s.name ?? `${s.firstName} ${s.lastName}`); setOverrideDropdownOpen(false); }}>
                            <span className="font-medium">{s.name ?? `${s.firstName} ${s.lastName}`}</span>
                            <span className="text-xs text-muted-foreground">{s.designation} · {s.department}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1" onClick={handleSaveSubjectOverride} disabled={!overrideStaffId || overrideSaving}>
                    {overrideSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {overrideExistingId ? "Update Assignment" : "Assign to Section"}
                  </Button>
                  <Button variant="outline" onClick={() => setSubjectOverrideOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assign Staff Dialog (Class Teacher / General) */}
          <Dialog open={assignStaffOpen} onOpenChange={setAssignStaffOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Assign Staff to {section?.className} - {section?.name}
                </DialogTitle>
                <DialogDescription>
                  Assign a staff member to this section. Optionally link to a subject and designate as class teacher.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Subject - drives which teacher is pre-filled */}
                <div>
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                    Only subjects assigned to this class are listed. Selecting one pre-fills the assigned teacher.
                  </p>
                  <Select
                    value={assignForm.subjectId || "none"}
                    onValueChange={v => {
                      if (v === "none") {
                        setAssignForm(f => ({ ...f, subjectId: "", staffId: "", staffName: "" }));
                        setStaffSearchQuery("");
                        return;
                      }
                      const cs = classSubjects.find(c => c.subjectId === v);
                      setAssignForm(f => ({
                        ...f,
                        subjectId: v,
                        // Auto-fill from ClassSubject teacher; keep any manually-set override
                        staffId: cs?.teacherId ?? "",
                        staffName: cs?.teacherName ?? "",
                      }));
                      setStaffSearchQuery("");
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">- Class Teacher (no subject) -</SelectItem>
                      {classSubjects.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No subjects assigned to this class yet
                        </div>
                      )}
                      {classSubjects.map(cs => (
                        <SelectItem key={cs.subjectId} value={cs.subjectId}>
                          {cs.subjectName}{cs.teacherName ? ` ┬╖ ${cs.teacherName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Staff Member - auto-filled from subject, override allowed */}
                <div>
                  <Label>
                    Staff Member <span className="text-destructive">*</span>
                    {assignForm.staffId && assignForm.subjectId && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(pre-filled from class subject)</span>
                    )}
                  </Label>
                  <div className="relative mt-1">
                    <div className="flex items-center border rounded-md px-3 h-10">
                      <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                      <input
                        className="flex-1 bg-transparent outline-none text-sm"
                        placeholder="Search to override staff..."
                        value={assignForm.staffId ? assignForm.staffName : staffSearchQuery}
                        onFocus={() => { setStaffDropdownOpen(true); if (assignForm.staffId) setStaffSearchQuery(""); }}
                        onBlur={() => setTimeout(() => setStaffDropdownOpen(false), 150)}
                        onChange={e => { setStaffSearchQuery(e.target.value); setAssignForm(f => ({ ...f, staffId: "", staffName: "" })); setStaffDropdownOpen(true); }}
                      />
                      {assignForm.staffId && (
                        <button
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          onMouseDown={e => { e.preventDefault(); setAssignForm(f => ({ ...f, staffId: "", staffName: "" })); setStaffSearchQuery(""); }}
                        >
                          ├ù
                        </button>
                      )}
                    </div>
                    {staffDropdownOpen && !assignForm.staffId && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {filteredStaffForAssign.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No staff found</div>
                        ) : filteredStaffForAssign.map(s => (
                          <button
                            key={s.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
                            onMouseDown={e => {
                              e.preventDefault();
                              setAssignForm(f => ({ ...f, staffId: s.id, staffName: s.name ?? `${s.firstName} ${s.lastName}` }));
                              setStaffDropdownOpen(false);
                              setStaffSearchQuery("");
                            }}
                          >
                            <span className="font-medium">{s.name ?? `${s.firstName} ${s.lastName}`}</span>
                            <span className="text-xs text-muted-foreground">{s.designation} ┬╖ {s.department}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Teacher toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Designate as Class Teacher</p>
                    <p className="text-xs text-muted-foreground">This staff will be responsible for attendance and section management</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={assignForm.isClassTeacher}
                    onClick={() => setAssignForm(f => ({ ...f, isClassTeacher: !f.isClassTeacher }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${assignForm.isClassTeacher ? "bg-primary" : "bg-input"}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ${assignForm.isClassTeacher ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1"
                    onClick={handleAssignStaff}
                    disabled={!assignForm.staffId || assignStaffSaving}
                  >
                    {assignStaffSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Assign
                  </Button>
                  <Button variant="outline" onClick={() => setAssignStaffOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                        Showing {Math.min(visibleRecords, attendanceHistory.length)} of {attendanceHistory.length} records
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
          {timetableLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Loading timetable...</span>
              </CardContent>
            </Card>
          ) : !timetableRecord ? (
            <Card>
              <CardContent className="text-center py-14">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="font-medium text-lg">No timetable yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Initialise the section timetable to start scheduling periods
                </p>
                <Button onClick={handleInitTimetable} disabled={timetableInitializing}>
                  {timetableInitializing
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                    : <><Plus className="h-4 w-4 mr-2" />Create Timetable</>}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Section Timetable
                  <Badge variant="outline" className="text-xs ml-1">{timetableRecord.academicYear}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {timetableEditMode && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                      Edit mode - click cells to add/edit
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={timetableEditMode ? "default" : "outline"}
                    onClick={() => setTimetableEditMode(!timetableEditMode)}
                  >
                    {timetableEditMode
                      ? <><CheckCircle className="h-4 w-4 mr-1.5" />Done Editing</>
                      : <><Edit className="h-4 w-4 mr-1.5" />Edit</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border px-3 py-2 text-left text-sm font-semibold text-muted-foreground w-28">Period</th>
                        {TIMETABLE_DAYS.map(day => (
                          <th key={day} className="border px-3 py-2 text-center text-sm font-semibold min-w-[120px]">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIMETABLE_PERIODS.map(periodNum => {
                        // For time row header, find actual stored time or use default
                        const anyPeriod = timetablePeriods.find(p => p.periodNumber === periodNum);
                        const fmt = (t?: string) => t ? t.substring(0, 5) : DEFAULT_PERIOD_TIMES[periodNum]?.start ?? "";
                        const rowStart = anyPeriod ? fmt(anyPeriod.startTime) : DEFAULT_PERIOD_TIMES[periodNum]?.start;
                        const rowEnd = anyPeriod ? fmt(anyPeriod.endTime) : DEFAULT_PERIOD_TIMES[periodNum]?.end;
                        return (
                          <tr key={periodNum} className="hover:bg-muted/20">
                            <td className="border px-3 py-2 bg-muted/30">
                              <div className="font-semibold text-sm">P{periodNum}</div>
                              <div className="text-sm text-muted-foreground font-medium">{rowStart}-{rowEnd}</div>
                            </td>
                            {TIMETABLE_DAYS.map(day => {
                              const p = getPeriodForCell(day, periodNum);
                              return (
                                <td
                                  key={`${day}-${periodNum}`}
                                  className={`border px-2 py-2 text-center align-middle ${timetableEditMode ? "cursor-pointer" : ""}`}
                                  onClick={() => {
                                    if (!timetableEditMode) return;
                                    if (p) openEditPeriod(p);
                                    else openAddPeriod(day, periodNum);
                                  }}
                                >
                                  {p ? (
                                    <div className={`rounded px-1.5 py-1 text-left transition-colors ${timetableEditMode ? "bg-primary/15 hover:bg-primary/25" : "bg-primary/10"}`}>
                                      <div className="font-semibold text-sm leading-tight">
                                        {p.subjectName ?? <span className="text-muted-foreground">-</span>}
                                      </div>
                                      {p.teacherName && (
                                        <div className="text-sm text-muted-foreground mt-0.5 leading-tight">{p.teacherName}</div>
                                      )}
                                      {p.room && (
                                        <div className="text-sm text-muted-foreground/70 mt-0.5">{p.room}</div>
                                      )}
                                      {timetableEditMode && (
                                        <div className="flex justify-end mt-1">
                                          <button
                                            className="text-destructive/70 hover:text-destructive p-0.5 rounded"
                                            onClick={e => { e.stopPropagation(); handleDeletePeriod(p.id); }}
                                            disabled={deletingPeriodId === p.id}
                                          >
                                            {deletingPeriodId === p.id
                                              ? <Loader2 className="h-3 w-3 animate-spin" />
                                              : <Trash2 className="h-3 w-3" />}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={`text-muted-foreground/40 text-xs py-1 rounded transition-colors ${timetableEditMode ? "hover:bg-primary/10 hover:text-primary" : ""}`}>
                                      {timetableEditMode ? <Plus className="h-3.5 w-3.5 mx-auto" /> : "-"}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Period Add/Edit Dialog */}
          <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {editingPeriodId ? "Edit Period" : `Add Period - ${periodForm.day}, P${periodForm.periodNumber}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {/* Day + Period (read-only if editing, editable if new) */}
                {!editingPeriodId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Day</Label>
                      <Select value={periodForm.day} onValueChange={v => setPeriodForm(f => ({ ...f, day: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMETABLE_DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Period Number</Label>
                      <Select
                        value={String(periodForm.periodNumber)}
                        onValueChange={v => {
                          const n = parseInt(v);
                          const defaults = DEFAULT_PERIOD_TIMES[n] ?? { start: "09:00", end: "09:45" };
                          setPeriodForm(f => ({ ...f, periodNumber: n, startTime: defaults.start, endTime: defaults.end }));
                        }}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMETABLE_PERIODS.map(n => <SelectItem key={n} value={String(n)}>Period {n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" className="mt-1" value={periodForm.startTime}
                      onChange={e => setPeriodForm(f => ({ ...f, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input type="time" className="mt-1" value={periodForm.endTime}
                      onChange={e => setPeriodForm(f => ({ ...f, endTime: e.target.value }))} />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label>Subject</Label>
                  <Select
                    value={periodForm.subjectId || "none"}
                    onValueChange={v => {
                      const subjectId = v === "none" ? "" : v;
                      // Auto-fill teacher from the class-subject configuration
                      const cs = classSubjects.find(c => c.subjectId === subjectId);
                      setPeriodForm(f => ({
                        ...f,
                        subjectId,
                        ...(cs?.teacherId
                          ? { teacherId: cs.teacherId, teacherName: cs.teacherName ?? "" }
                          : {}),
                      }));
                      if (cs?.teacherId) setTeacherPickerQuery("");
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">- No subject -</SelectItem>
                      {classSubjects.map(cs => (
                        <SelectItem key={cs.subjectId} value={cs.subjectId}>
                          {cs.subjectName}{cs.teacherName ? ` ┬╖ ${cs.teacherName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Teacher - card picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Teacher</Label>
                    {periodForm.teacherId && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => { setPeriodForm(f => ({ ...f, teacherId: "", teacherName: "" })); setTeacherPickerQuery(""); }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Selected teacher pill */}
                  {periodForm.teacherId ? (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(periodForm.teacherName || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{periodForm.teacherName}</span>
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => { setPeriodForm(f => ({ ...f, teacherId: "", teacherName: "" })); setTeacherPickerQuery(""); }}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          className="pl-8 h-8 text-sm"
                          placeholder="Search teacher..."
                          value={teacherPickerQuery}
                          onChange={e => setTeacherPickerQuery(e.target.value)}
                        />
                      </div>

                      {/* Section-assigned staff first, then others */}
                      {(() => {
                        const q = teacherPickerQuery.toLowerCase();
                        const filtered = periodTeacherOptions.filter(
                          t => !q || t.name.toLowerCase().includes(q)
                        );
                        const assigned = filtered.filter(t => t.isAssigned);
                        const others = filtered.filter(t => !t.isAssigned).slice(0, teacherPickerQuery ? 6 : 3);

                        return (
                          <div className="mt-1.5 space-y-1 max-h-44 overflow-y-auto">
                            {assigned.length > 0 && (
                              <>
                                <p className="text-xs font-medium text-muted-foreground px-1 py-0.5">Configured for this class</p>
                                {assigned.map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-primary/10 text-left transition-colors group"
                                    onClick={() => { setPeriodForm(f => ({ ...f, teacherId: t.id, teacherName: t.name })); setTeacherPickerQuery(""); }}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold text-primary">{(t.name || "?")[0].toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium leading-none">{t.name}</p>
                                      {t.designation && <p className="text-xs text-muted-foreground mt-0.5">{t.designation}</p>}
                                    </div>
                                    <ShieldCheck className="h-3.5 w-3.5 text-primary/60 opacity-0 group-hover:opacity-100 shrink-0" />
                                  </button>
                                ))}
                              </>
                            )}
                            {others.length > 0 && (
                              <>
                                <p className="text-xs font-medium text-muted-foreground px-1 py-0.5 mt-1">
                                  {assigned.length > 0 ? "Other assigned staff" : "Assigned to this class"}
                                </p>
                                {others.map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                                    onClick={() => { setPeriodForm(f => ({ ...f, teacherId: t.id, teacherName: t.name })); setTeacherPickerQuery(""); }}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-muted-foreground/15 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-semibold text-muted-foreground">{(t.name || "?")[0].toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium leading-none">{t.name}</p>
                                      {t.designation && <p className="text-xs text-muted-foreground mt-0.5">{t.designation}</p>}
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}
                            {filtered.length === 0 && (
                              <p className="text-sm text-muted-foreground px-2 py-3 text-center">No staff found</p>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                {/* Room + Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Room (optional)</Label>
                    <Input className="mt-1" placeholder="e.g. Room 101" value={periodForm.room}
                      onChange={e => setPeriodForm(f => ({ ...f, room: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={periodForm.periodType} onValueChange={v => setPeriodForm(f => ({ ...f, periodType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["lecture", "practical", "lab", "seminar", "tutorial", "break", "lunch"].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button className="flex-1" onClick={handleSavePeriod} disabled={periodSaving}>
                    {periodSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingPeriodId ? "Save Changes" : "Add Period"}
                  </Button>
                  <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {/* If an assignment is selected, show the detail/submissions view */}
          {selectedAssignment ? (
            <div className="space-y-4">
              {/* Back + header */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedAssignment(null); setAssignmentSubmissions([]); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assignments
                </Button>
              </div>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{selectedAssignment.title}</CardTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{selectedAssignment.subjectName || "-"}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{selectedAssignment.assignedByName || "-"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Due: {new Date(selectedAssignment.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />Max: {selectedAssignment.maxMarks} marks</span>
                      </div>
                      {selectedAssignment.description && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedAssignment.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant={selectedAssignment.status === "active" ? "default" : "secondary"} className="capitalize">{selectedAssignment.status}</Badge>
                    </div>
                  </div>
                  {/* Submission stats */}
                  <div className="flex gap-4 mt-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{assignmentSubmissions.length}</div>
                      <div className="text-xs text-muted-foreground">Submitted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{assignmentSubmissions.filter(s => s.status === "graded").length}</div>
                      <div className="text-xs text-muted-foreground">Graded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{assignmentSubmissions.filter(s => s.status !== "graded").length}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    {assignmentSubmissions.filter(s => s.marksObtained != null).length > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(assignmentSubmissions.filter(s => s.marksObtained != null).reduce((sum, s) => sum + (s.marksObtained ?? 0), 0) / assignmentSubmissions.filter(s => s.marksObtained != null).length).toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Score</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span className="text-muted-foreground">Loading submissions...</span>
                    </div>
                  ) : assignmentSubmissions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>No submissions yet for this assignment</p>
                      <p className="text-sm mt-1">Students will appear here once they submit</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Submitted On</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Marks</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignmentSubmissions.map(sub => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.studentName || sub.studentId.slice(0, 8)}</TableCell>
                            <TableCell className="text-muted-foreground">{sub.studentRollNo || "-"}</TableCell>
                            <TableCell className="text-sm">{new Date(sub.submissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                            <TableCell>
                              <Badge variant={sub.status === "graded" ? "default" : "secondary"} className="capitalize text-xs">{sub.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {sub.marksObtained != null ? `${sub.marksObtained} / ${selectedAssignment.maxMarks}` : "ΓÇö"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{sub.feedback || "ΓÇö"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={sub.status === "graded" ? "outline" : "default"}
                                onClick={() => { setGradingSubmission(sub); setGradeForm({ marks: sub.marksObtained?.toString() ?? "", feedback: sub.feedback ?? "" }); setGradeDialogOpen(true); }}
                              >
                                <Award className="h-3.5 w-3.5 mr-1" />
                                {sub.status === "graded" ? "Re-grade" : "Grade"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Assignments list view */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignments
                  {classAssignments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{classAssignments.length}</Badge>
                  )}
                </CardTitle>
                <Button size="sm" onClick={() => setCreateAssignmentOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">Loading assignmentsΓÇª</span>
                  </div>
                ) : classAssignments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No assignments yet</p>
                    <p className="text-sm mt-1">Create the first assignment for this section</p>
                    <Button size="sm" className="mt-4" onClick={() => setCreateAssignmentOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Create Assignment
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Assigned By</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Max Marks</TableHead>
                        <TableHead className="text-center">Submissions</TableHead>
                        <TableHead className="text-center">Graded</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classAssignments.map(a => {
                        const isOverdue = new Date(a.dueDate) < new Date() && a.status === "active";
                        return (
                          <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadSubmissions(a)}>
                            <TableCell className="font-medium">{a.title}</TableCell>
                            <TableCell className="text-muted-foreground">{a.subjectName || "ΓÇö"}</TableCell>
                            <TableCell className="text-muted-foreground">{a.assignedByName || "ΓÇö"}</TableCell>
                            <TableCell>
                              <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                                {new Date(a.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              {isOverdue && <span className="ml-1 text-xs text-red-400">(overdue)</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{a.maxMarks}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1">
                                {a.submissionCount}
                                {a.submissionCount > 0 && (
                                  <span className="text-xs text-muted-foreground">/ {students.length}</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {a.gradedCount > 0 ? (
                                <span className="text-green-600 font-medium">{a.gradedCount}</span>
                              ) : (
                                <span className="text-muted-foreground">ΓÇö</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{a.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Assignment Dialog */}
          <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create Assignment
                </DialogTitle>
                <DialogDescription>
                  Create a new assignment for {section?.className} ΓÇô {section?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="asgn-title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="asgn-title"
                    placeholder="e.g. Chapter 3 ΓÇô Algebraic Expressions"
                    value={createAssignmentForm.title}
                    onChange={e => setCreateAssignmentForm(f => ({ ...f, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="asgn-subject">Subject <span className="text-red-500">*</span></Label>
                  <Select
                    value={createAssignmentForm.subjectId}
                    onValueChange={v => setCreateAssignmentForm(f => ({ ...f, subjectId: v }))}
                  >
                    <SelectTrigger id="asgn-subject" className="mt-1">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {classSubjects.map(cs => (
                        <SelectItem key={cs.subjectId} value={cs.subjectId}>{cs.subjectName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="asgn-desc">Description</Label>
                  <textarea
                    id="asgn-desc"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Instructions or details for studentsΓÇª"
                    value={createAssignmentForm.description}
                    onChange={e => setCreateAssignmentForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="asgn-assigned">Assigned Date</Label>
                    <Input
                      id="asgn-assigned"
                      type="date"
                      className="mt-1"
                      value={createAssignmentForm.assignedDate}
                      onChange={e => setCreateAssignmentForm(f => ({ ...f, assignedDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="asgn-due">Due Date <span className="text-red-500">*</span></Label>
                    <Input
                      id="asgn-due"
                      type="date"
                      className="mt-1"
                      value={createAssignmentForm.dueDate}
                      min={createAssignmentForm.assignedDate}
                      onChange={e => setCreateAssignmentForm(f => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="asgn-marks">Maximum Marks</Label>
                  <Input
                    id="asgn-marks"
                    type="number"
                    min="1"
                    max="1000"
                    className="mt-1"
                    value={createAssignmentForm.maxMarks}
                    onChange={e => setCreateAssignmentForm(f => ({ ...f, maxMarks: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCreateAssignmentOpen(false)} disabled={createAssignmentSaving}>Cancel</Button>
                  <Button onClick={handleCreateAssignment} disabled={createAssignmentSaving}>
                    {createAssignmentSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />CreatingΓÇª</> : "Create Assignment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Grade Submission Dialog */}
          <Dialog open={gradeDialogOpen} onOpenChange={open => { if (!open) { setGradeDialogOpen(false); setGradingSubmission(null); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Grade Submission
                </DialogTitle>
                <DialogDescription>
                  {gradingSubmission?.studentName} ΓÇö {selectedAssignment?.title}
                </DialogDescription>
              </DialogHeader>
              {gradingSubmission && (
                <div className="space-y-4 pt-2">
                  {gradingSubmission.content && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Student's Answer</Label>
                      <div className="mt-1 rounded-md border bg-muted/30 p-3 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {gradingSubmission.content}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="grade-marks">Marks Obtained (out of {selectedAssignment?.maxMarks}) <span className="text-red-500">*</span></Label>
                    <Input
                      id="grade-marks"
                      type="number"
                      min="0"
                      max={selectedAssignment?.maxMarks}
                      className="mt-1"
                      value={gradeForm.marks}
                      onChange={e => setGradeForm(f => ({ ...f, marks: e.target.value }))}
                      placeholder={`0 ΓÇô ${selectedAssignment?.maxMarks}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade-feedback">Feedback</Label>
                    <textarea
                      id="grade-feedback"
                      rows={3}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Optional feedback for the studentΓÇª"
                      value={gradeForm.feedback}
                      onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setGradeDialogOpen(false); setGradingSubmission(null); }} disabled={gradeSaving}>Cancel</Button>
                    <Button onClick={handleGradeSubmit} disabled={gradeSaving}>
                      {gradeSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />SavingΓÇª</> : "Save Grade"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* ΓöÇΓöÇ Add Students Dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Dialog open={addStudentsOpen} onOpenChange={setAddStudentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Students to {section?.className} ΓÇô {section?.name}
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
                            Roll: {student.rollNo || "ΓÇö"}
                            {student.section ? (
                              <span className="ml-2 text-orange-600">
                                (Currently in {section?.className} ΓÇô {student.section})
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

      {/* ΓöÇΓöÇ Single Transfer Dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer Student
            </DialogTitle>
            <DialogDescription>
              Move <span className="font-semibold">{transferStudent?.name}</span> from{" "}
              <span className="font-semibold">{section?.className} ΓÇô {section?.name}</span> to another section.
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
                        {s.className} ΓÇô {s.name}
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

      {/* ΓöÇΓöÇ Bulk Transfer Dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Dialog open={bulkTransferOpen} onOpenChange={setBulkTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Bulk Transfer Students
            </DialogTitle>
            <DialogDescription>
              Transfer <span className="font-semibold">{selectedInSection.size} student(s)</span> from{" "}
              <span className="font-semibold">{section?.className} ΓÇô {section?.name}</span> to another section.
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
                        {s.className} ΓÇô {s.name}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const record = rawAttendanceItems.find(
                    (r) =>
                      r.studentId === student.id &&
                      new Date(r.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) === selectedDate
                  );
                  const status = record?.status ?? 'not-marked';
                  return (
                    <TableRow key={student.id}>
                      <TableCell>{student.rollNo}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {status === 'present' ? (
                          <Badge className="bg-green-500">Present</Badge>
                        ) : status === 'absent' ? (
                          <Badge variant="destructive">Absent</Badge>
                        ) : status === 'late' ? (
                          <Badge className="bg-amber-500">Late</Badge>
                        ) : status === 'excused' ? (
                          <Badge variant="secondary">Excused</Badge>
                        ) : (
                          <Badge variant="outline">Not Marked</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

