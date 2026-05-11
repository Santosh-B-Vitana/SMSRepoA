import { useState, useEffect } from "react";
import {
  User, Calendar, Award, BookOpen, Loader2, AlertCircle,
  CheckCircle, XCircle, Timer, GraduationCap, TrendingUp,
  ChevronDown, ChevronUp, CalendarDays, BarChart2, Bus, Home
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, type StudentBasic, type StudentProfileSummary } from "@/services/api/studentApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import { getResults, type ResultBasic } from "@/services/api/examinationApi";
import { gradesApi, type StudentGradeResponse } from "@/services/api/gradesApi";
import { assignmentApi, type SubmissionResponse } from "@/services/api/assignmentApi";
import { ParentLeaveTab } from "@/components/leave-management/ParentLeaveTab";
import { toast } from "sonner";

interface AttendanceRecord {
  id?: string;
  date: string;
  status: string;
  isManualOverride: boolean;
  remarks?: string;
}

interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
}

interface ExamGroup {
  examName: string;
  results: ResultBasic[];
  totalMarks: number;
  totalObtained: number;
  percentage: number;
}

export function ChildProfileManager() {
  const [children, setChildren] = useState<StudentBasic[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentProfileSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState<string>("all");

  // Academic state
  const [examResults, setExamResults] = useState<ResultBasic[]>([]);
  const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  // Grades state
  const [gradeRecords, setGradeRecords] = useState<StudentGradeResponse[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Assignment submissions state
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    studentApi.getMyChildren()
      .then(data => {
        setChildren(data);
        if (data.length > 0) setSelectedChildId(data[0].id);
      })
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadChildData(selectedChildId);
    }
  }, [selectedChildId]);

  const loadChildData = async (childId: string) => {
    setSummaryLoading(true);
    try {
      const s = await studentApi.profileSummary(childId);
      setSummary(s);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedChildId) return;
    setAttendanceLoading(true);
    try {
      const recordsRes = await attendanceApi.getStudentRecords(selectedChildId, undefined, undefined, 1, 200);
      const records = recordsRes.items.map((r: any) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        isManualOverride: r.isManualOverride,
        remarks: r.remarks,
      }));
      setAttendanceRecords(records);
      // Compute per-student stats from fetched records
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const totalDays = records.length;
      const attendancePercent = totalDays > 0 ? Math.round((presentDays + lateDays) / totalDays * 100) : 0;
      setAttendanceStats({ presentDays, absentDays, lateDays, attendancePercent });
    } catch {
      toast.error("Failed to load attendance");
      setAttendanceRecords([]);
      setAttendanceStats({ presentDays: 0, absentDays: 0, lateDays: 0, attendancePercent: 0 });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadAcademics = async () => {
    if (!selectedChildId) return;
    setAcademicLoading(true);
    try {
      const res = await getResults({ studentId: selectedChildId }, 1, 100);
      const results = res.items || [];
      setExamResults(results);

      // Group results by exam name
      const groupMap = new Map<string, ResultBasic[]>();
      results.forEach(r => {
        const key = (r as any).examName || r.subject;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(r);
      });

      const groups: ExamGroup[] = Array.from(groupMap.entries()).map(([examName, results]) => {
        const totalObtained = results.reduce((sum, r) => sum + r.marksObtained, 0);
        const totalMarks = results.reduce((sum, r) => sum + r.maxMarks, 0);
        return {
          examName,
          results,
          totalMarks,
          totalObtained,
          percentage: totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0,
        };
      });

      setExamGroups(groups);
      if (groups.length > 0) setExpandedExam(groups[0].examName);
    } catch {
      toast.error("Failed to load academic results");
      setExamResults([]);
      setExamGroups([]);
    } finally {
      setAcademicLoading(false);
    }
  };

  const loadGrades = async () => {
    if (!selectedChildId) return;
    setGradesLoading(true);
    try {
      const res = await gradesApi.getMyChildGrades(selectedChildId, undefined, 1, 100);
      setGradeRecords(res.studentGrades ?? []);
    } catch {
      toast.error("Failed to load grades");
      setGradeRecords([]);
    } finally {
      setGradesLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!selectedChildId) return;
    setSubmissionsLoading(true);
    try {
      const res = await assignmentApi.getStudentSubmissions(selectedChildId);
      setSubmissions(res.data ?? []);
    } catch {
      toast.error("Failed to load assignment submissions");
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const currentChild = children.find(c => c.id === selectedChildId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Child Profile</h1>
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No children linked to your account.</p>
            <p className="text-xs text-muted-foreground">
              Contact the school administrator to link your children to your parent account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtered attendance records by month
  const filteredAttendance = attendanceMonth === "all"
    ? attendanceRecords
    : attendanceRecords.filter(r => {
        const d = new Date(r.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === attendanceMonth;
      });

  // Get unique months for filter
  const months = Array.from(new Set(
    attendanceRecords.map(r => {
      const d = new Date(r.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })
  )).sort().reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Child Profile</h1>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all min-w-fit ${
                selectedChildId === child.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                selectedChildId === child.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {child.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${selectedChildId === child.id ? "text-primary" : ""}`}>{child.name}</p>
                <p className="text-xs text-muted-foreground">{child.class} {child.section ? `- ${child.section}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Student Header */}
      {currentChild && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {currentChild.photoUrl ? (
                  <img src={currentChild.photoUrl} alt={currentChild.name} className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-2xl font-bold">{currentChild.name}</h2>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{currentChild.class}{currentChild.section ? ` - ${currentChild.section}` : ""}</span>
                  {currentChild.rollNumber && <span>Roll No: {currentChild.rollNumber}</span>}
                  {currentChild.admissionNumber && <span>Adm: {currentChild.admissionNumber}</span>}
                </div>
                <Badge variant="default" className="capitalize">{currentChild.status ?? "active"}</Badge>
              </div>
            </div>

            {/* Quick stats row */}
            {!summaryLoading && summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                <MiniStat icon={<Calendar className="h-4 w-4 text-blue-500" />} label="Attendance" value={`${summary.attendance?.attendancePercent ?? 0}%`} />
                <MiniStat icon={<Award className="h-4 w-4 text-purple-500" />} label="Latest Grade" value={summary.exams?.results?.[0]?.grade ?? "-"} />
                <MiniStat icon={<TrendingUp className="h-4 w-4 text-green-500" />} label="Present Days" value={String(summary.attendance?.presentDays ?? 0)} />
                <MiniStat icon={<BookOpen className="h-4 w-4 text-amber-500" />} label="Exams Taken" value={String(summary.exams?.results?.length ?? 0)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentChild && (
        <Tabs defaultValue="attendance" className="space-y-4" onValueChange={(val) => {
          if (val === "attendance" && attendanceRecords.length === 0) loadAttendance();
          if (val === "academics" && examResults.length === 0) loadAcademics();
          if (val === "grades" && gradeRecords.length === 0) loadGrades();
        }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="attendance" onClick={() => { if (attendanceRecords.length === 0) loadAttendance(); }}>
              <Calendar className="h-4 w-4 mr-1.5" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="academics" onClick={() => { if (examResults.length === 0) loadAcademics(); }}>
              <Award className="h-4 w-4 mr-1.5" />
              Academic Performance
            </TabsTrigger>
            <TabsTrigger value="grades" onClick={() => { if (gradeRecords.length === 0) loadGrades(); }}>
              <BarChart2 className="h-4 w-4 mr-1.5" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="assignments" onClick={() => { if (submissions.length === 0) loadSubmissions(); }}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="leave">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Leave
            </TabsTrigger>
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
          </TabsList>

          {/* ── Attendance Tab (READ-ONLY) ── */}
          <TabsContent value="attendance">
            {attendanceLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading attendance records...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                {attendanceStats && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">{attendanceStats.attendancePercent}%</div>
                          <div className="text-xs text-muted-foreground mt-1">Overall</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{attendanceStats.presentDays}</div>
                          <div className="text-xs text-muted-foreground mt-1">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{attendanceStats.absentDays}</div>
                          <div className="text-xs text-muted-foreground mt-1">Absent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-600">{attendanceStats.lateDays}</div>
                          <div className="text-xs text-muted-foreground mt-1">Late</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {attendanceStats.presentDays + attendanceStats.absentDays + attendanceStats.lateDays}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Total Days</div>
                        </div>
                      </div>
                      <Progress value={attendanceStats.attendancePercent} className="h-2 mt-4" />
                    </CardContent>
                  </Card>
                )}

                {/* Month filter + Records */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Attendance History
                      </CardTitle>
                      <Select value={attendanceMonth} onValueChange={setAttendanceMonth}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {months.map(m => (
                            <SelectItem key={m} value={m}>
                              {new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Day</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAttendance.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No attendance records found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAttendance.map((record, idx) => {
                              const d = new Date(record.date);
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {d.toLocaleDateString("en-IN", { weekday: "short" })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getStatusVariant(record.status)} className="flex w-fit items-center gap-1">
                                      {getStatusIcon(record.status)}
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="capitalize text-muted-foreground">
                                    {record.isManualOverride ? "Manual" : "Biometric"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {record.remarks || "\u2014"}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredAttendance.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Showing {filteredAttendance.length} record{filteredAttendance.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Academics Tab ── */}
          <TabsContent value="academics">
            {academicLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading academic results...</p>
                </CardContent>
              </Card>
            ) : examGroups.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No exam results available yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Results will appear here once exams are conducted and graded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Overall Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{examGroups.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">Exams</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{examResults.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">Subjects Graded</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {examResults.length > 0 ? (examResults.reduce((s, r) => s + (r.percentage ?? (r.marksObtained / r.maxMarks * 100)), 0) / examResults.length).toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {examResults.length > 0 ? examResults.reduce((best, r) => {
                            const p = r.percentage ?? (r.marksObtained / r.maxMarks * 100);
                            return p > best ? p : best;
                          }, 0).toFixed(0) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Best Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exam-wise Results */}
                {examGroups.map(group => (
                  <Card key={group.examName} className="overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedExam(expandedExam === group.examName ? null : group.examName)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          group.percentage >= 80 ? "bg-green-100 text-green-700" :
                          group.percentage >= 60 ? "bg-blue-100 text-blue-700" :
                          group.percentage >= 40 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{group.examName}</p>
                          <p className="text-xs text-muted-foreground">{group.results.length} subject{group.results.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{group.percentage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{group.totalObtained}/{group.totalMarks}</p>
                        </div>
                        {expandedExam === group.examName ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </button>

                    {expandedExam === group.examName && (
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead className="text-center">Marks</TableHead>
                              <TableHead className="text-center">Percentage</TableHead>
                              <TableHead className="text-center">Grade</TableHead>
                              <TableHead className="w-[200px]">Performance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.results.map((result, idx) => {
                              const pct = result.percentage ?? (result.maxMarks > 0 ? (result.marksObtained / result.maxMarks) * 100 : 0);
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{result.subject}</TableCell>
                                  <TableCell className="text-center">{result.marksObtained}/{result.maxMarks}</TableCell>
                                  <TableCell className="text-center font-medium">{pct.toFixed(1)}%</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={pct >= 60 ? "default" : pct >= 40 ? "secondary" : "destructive"}>
                                      {result.grade || "-"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress value={pct} className="h-2 flex-1" />
                                      <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-5 w-5 text-primary" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <InfoRow label="Name" value={currentChild.name} />
                    <InfoRow label="Class" value={`${currentChild.class}${currentChild.section ? ` - ${currentChild.section}` : ""}`} />
                    {currentChild.rollNumber && <InfoRow label="Roll Number" value={currentChild.rollNumber} />}
                    {currentChild.admissionNumber && <InfoRow label="Admission No." value={currentChild.admissionNumber} />}
                    <InfoRow label="Status" value={currentChild.status ?? "Active"} />
                  </div>
                </CardContent>
              </Card>

              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Quick Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <InfoRow label="Attendance" value={`${summary.attendance?.attendancePercent ?? 0}%`} />
                      <InfoRow label="Present Days" value={String(summary.attendance?.presentDays ?? 0)} />
                      <InfoRow label="Total Exams" value={String(summary.exams?.results?.length ?? 0)} />
                      {summary.fee && (
                        <>
                          <InfoRow label="Total Fee" value={`\u20B9${summary.fee.totalAmount.toLocaleString("en-IN")}`} />
                          <InfoRow label="Pending" value={`\u20B9${summary.fee.pendingAmount.toLocaleString("en-IN")}`} />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {summary?.transport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bus className="h-5 w-5 text-blue-500" />
                      Transport Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <InfoRow label="Route" value={`${summary.transport.routeNumber} — ${summary.transport.routeName}`} />
                      {summary.transport.pickupPoint && <InfoRow label="Pickup Point" value={summary.transport.pickupPoint} />}
                      {summary.transport.dropPoint && <InfoRow label="Drop Point" value={summary.transport.dropPoint} />}
                      {summary.transport.vehicleNumber && <InfoRow label="Vehicle No." value={summary.transport.vehicleNumber} />}
                      {summary.transport.driverName && <InfoRow label="Driver" value={summary.transport.driverName} />}
                      {summary.transport.driverPhone && <InfoRow label="Driver Phone" value={summary.transport.driverPhone} />}
                      <InfoRow label="Monthly Fee" value={`\u20B9${summary.transport.monthlyFee.toLocaleString("en-IN")}`} />
                      <InfoRow label="Status" value={summary.transport.status} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {summary?.hostel && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Home className="h-5 w-5 text-purple-500" />
                      Hostel Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <InfoRow label="Room Number" value={summary.hostel.roomNumber} />
                      {summary.hostel.roomType && <InfoRow label="Room Type" value={summary.hostel.roomType} />}
                      {summary.hostel.floor && <InfoRow label="Floor" value={summary.hostel.floor} />}
                      <InfoRow label="Check-In Date" value={new Date(summary.hostel.checkInDate).toLocaleDateString("en-IN")} />
                      <InfoRow label="Monthly Fee" value={`\u20B9${summary.hostel.monthlyFee.toLocaleString("en-IN")}`} />
                      <InfoRow label="Status" value={summary.hostel.status} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Grades Tab ── */}
          <TabsContent value="grades">
            {gradesLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading grades...</p>
                </CardContent>
              </Card>
            ) : gradeRecords.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">No grades recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grades will appear here once teachers enter marks for your child.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Grades ({gradeRecords.length} entries)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject / Grade Item</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">Max</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeRecords.map(g => {
                        const pct = g.maxMarks && g.maxMarks > 0 ? Math.round((g.marksObtained / g.maxMarks) * 100) : null;
                        return (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{g.gradeItemName ?? "—"}</TableCell>
                            <TableCell className="text-center font-bold">{g.marksObtained}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{g.maxMarks ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {g.grade ? (
                                <Badge variant={g.grade >= "C" ? "default" : "destructive"}>{g.grade}</Badge>
                              ) : pct !== null ? (
                                <span className={pct >= 50 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{pct}%</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{g.remarks ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(g.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments">
            {submissionsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading assignments...</p>
                </CardContent>
              </Card>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">No assignment submissions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Graded assignments will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Assignment Submissions ({submissions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">Max</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Feedback</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map(s => {
                        const pct = s.assignmentMaxMarks && s.assignmentMaxMarks > 0 && s.marksObtained != null
                          ? Math.round((s.marksObtained / s.assignmentMaxMarks) * 100) : null;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.assignmentTitle ?? "—"}</TableCell>
                            <TableCell className="text-center font-bold">
                              {s.marksObtained != null ? s.marksObtained : "—"}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {s.assignmentMaxMarks ?? "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={
                                s.status === "graded" ? "default" :
                                s.status === "submitted" ? "secondary" : "outline"
                              }>
                                {s.status}
                              </Badge>
                              {pct !== null && (
                                <span className={`ml-1 text-xs font-semibold ${pct >= 50 ? "text-green-600" : "text-red-600"}`}>
                                  ({pct}%)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {s.feedback ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(s.submissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Leave Tab ── */}
          <TabsContent value="leave">
            <ParentLeaveTab studentId={selectedChildId} studentName={currentChild.name} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "present": return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    case "absent": return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    case "late": return <Timer className="h-3.5 w-3.5 text-amber-600" />;
    case "excused": return <AlertCircle className="h-3.5 w-3.5 text-blue-600" />;
    default: return null;
  }
}

function getStatusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status.toLowerCase()) {
    case "present": return "default";
    case "absent": return "destructive";
    case "late": return "secondary";
    case "excused": return "outline";
    default: return "outline";
  }
}
