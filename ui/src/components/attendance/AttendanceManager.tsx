import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Users, UserCheck, UserX, Clock, Fingerprint, Download, FileText, CalendarDays, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BiometricAttendanceManager } from "./BiometricAttendanceManager";
import { ExportButton, DateRangePicker, EmptyState, ErrorBoundary } from "@/components/common";
import { useDateRange } from "@/components/common/DateRangePicker";
import { AttendanceReportGenerator } from "./AttendanceReportGenerator";
import { LeaveManagementDialog } from "./LeaveManagementDialog";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { attendanceApi, type AttendanceRecordBasic } from "@/services/api/attendanceApi";
import { studentApi } from "@/services/api/studentApi";
import { academicApi, type ClassResponse } from "@/services/api/academicApi";

interface StudentRow {
  id: string;
  name: string;
  admissionNumber?: string;
}

export function AttendanceManager() {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const dateRange = useDateRange();

  // API-driven state
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [existingRecords, setExistingRecords] = useState<Record<string, AttendanceRecordBasic>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // studentId being saved
  const [bulkSaving, setBulkSaving] = useState(false);

  const { toast } = useToast();

  // Load classes on mount
  useEffect(() => {
    academicApi.listClasses(1, 200).then(r => {
      const list = r.classes ?? [];
      setClasses(list);
      if (list.length > 0 && !selectedClass) setSelectedClass(list[0].name);
    }).catch(() => { /* silently ignore if classes api fails */ });
  }, []);

  // Load students + attendance when class/date changes
  useEffect(() => {
    if (!selectedClass) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setLoadingStudents(true);
    Promise.all([
      studentApi.list({ classFilter: selectedClass, pageSize: 200 }),
      attendanceApi.listRecords({ dateFrom: dateStr, dateTo: dateStr, pageSize: 200 }),
    ]).then(([studRes, attRes]) => {
      const studs: StudentRow[] = (studRes.students ?? studRes.data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
        admissionNumber: s.admissionNumber,
      }));
      setStudents(studs);

      const aMap: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
      const rMap: Record<string, AttendanceRecordBasic> = {};
      (attRes.items ?? []).forEach((r: AttendanceRecordBasic) => {
        // Match by class name — backend returns class field on each record
        if (!r.class || r.class.toLowerCase() === selectedClass.toLowerCase()) {
          aMap[r.studentId] = r.status as any;
          rMap[r.studentId] = r;
        }
      });
      setAttendanceMap(aMap);
      setExistingRecords(rMap);
    }).catch(() => {
      toast({ title: 'Failed to load attendance', variant: 'destructive' });
    }).finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedDate]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSaving(studentId);
    try {
      const existing = existingRecords[studentId];
      let updated: AttendanceRecordBasic;
      if (existing) {
        updated = await attendanceApi.updateRecord(existing.id, { status, isManualOverride: true });
      } else {
        updated = await attendanceApi.markAttendance({ studentId, date: dateStr, status, isManualOverride: true });
      }
      setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
      setExistingRecords(prev => ({ ...prev, [studentId]: updated }));
      toast({ title: 'Attendance updated', description: `Marked as ${status}` });
    } catch {
      toast({ title: 'Failed to mark attendance', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleBulkMarkAbsent = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const unmarked = students.filter(s => !attendanceMap[s.id]);
    if (unmarked.length === 0) { toast({ title: 'All students already marked' }); return; }
    setBulkSaving(true);
    try {
      await attendanceApi.markBulkAttendance({
        date: dateStr,
        attendances: unmarked.map(s => ({ studentId: s.id, date: dateStr, status: 'absent' as const, isManualOverride: true })),
      });
      setAttendanceMap(prev => {
        const n = { ...prev };
        unmarked.forEach(s => { n[s.id] = 'absent'; });
        return n;
      });
      toast({ title: `Marked ${unmarked.length} students absent` });
    } catch {
      toast({ title: 'Bulk save failed', variant: 'destructive' });
    } finally {
      setBulkSaving(false);
    }
  };

  const syncBiometricData = () => {
    toast({ title: 'Syncing Biometric Data', description: 'Importing attendance from biometric devices...' });
    setTimeout(() => {
      toast({ title: 'Sync Complete', description: 'Biometric sync is managed by the Biometric System tab' });
    }, 1500);
  };

  const generateReport = () => {
    toast({ title: 'Generating Report', description: `Attendance report for ${selectedClass} on ${format(selectedDate, 'PP')} is being generated...` });
  };

  const presentCount = students.filter(s => attendanceMap[s.id] === 'present').length;
  const absentCount = students.filter(s => attendanceMap[s.id] === 'absent').length;
  const lateCount = students.filter(s => attendanceMap[s.id] === 'late').length;
  const markedCount = students.filter(s => !!attendanceMap[s.id]).length;
  const attendancePct = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  return (
    <ErrorBoundary>
    <div className="relative min-h-screen">
      <AnimatedBackground variant="gradient" className="fixed inset-0 -z-10 opacity-30" />
      
      <div className="space-y-6 relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-display gradient-text">{t('attendance.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('attendance.manageDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              data={attendanceRecords}
              filename="attendance"
              columns={[
                { key: 'studentName', label: 'Student Name' },
                { key: 'class', label: 'Class' },
                { key: 'status', label: 'Status' },
                { key: 'timestamp', label: 'Time' },
                { key: 'method', label: 'Method' },
              ]}
            />
            <Button onClick={syncBiometricData} variant="outline">
              <Fingerprint className="h-4 w-4 mr-2" />
              {t('attendance.syncBiometric')}
            </Button>
            <Button onClick={generateReport}>
              <Download className="h-4 w-4 mr-2" />
              {t('attendance.generateReport')}
            </Button>
          </div>
        </div>
        </AnimatedWrapper>

      {/* Summary Cards */}
      <AnimatedWrapper variant="fadeInUp" delay={0.2}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('attendance.presentCount')}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('attendance.absentCount')}</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('attendance.late')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('attendance.attendancePct')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{attendancePct.toFixed(1)}%</div>
          </CardContent>
        </ModernCard>
      </div>
      </AnimatedWrapper>

      <AnimatedWrapper variant="fadeInUp" delay={0.3}>
      <Tabs defaultValue="daily">
        <TabsList className="w-full flex">
          <TabsTrigger value="daily">{t('attendance.dailyTab')}</TabsTrigger>
          <TabsTrigger value="overview">{t('attendance.overviewTab')}</TabsTrigger>
          <TabsTrigger value="biometric">{t('attendance.biometricTab')}</TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            {t('attendance.reportsTab')}
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarDays className="h-4 w-4 mr-2" />
            {t('attendance.leaveTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <ModernCard variant="glass">
            <CardHeader>
<div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Daily Attendance - {selectedClass || 'Select a class'}</CardTitle>
                <div className="flex items-center gap-4 flex-wrap">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t('attendance.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length > 0
                        ? classes.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))
                        : <SelectItem value="" disabled>{t('attendance.noClassesFound')}</SelectItem>
                      }
                    </SelectContent>
                  </Select>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">{t('attendance.loadingStudents')}</span>
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {selectedClass ? t('attendance.noStudentsInClass') : t('attendance.selectClassToView')}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {markedCount} / {students.length} marked
                    </span>
                    <Button size="sm" variant="outline" onClick={handleBulkMarkAbsent} disabled={bulkSaving}>
                      {bulkSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                      {t('attendance.markRemainingAbsent')}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t('attendance.studentName')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, idx) => {
                        const status = attendanceMap[student.id];
                        const isSaving = saving === student.id;
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="text-muted-foreground w-10">{idx + 1}</TableCell>
                            <TableCell className="font-medium">
                              {student.name}
                              {student.admissionNumber && <span className="text-xs text-muted-foreground ml-1">({student.admissionNumber})</span>}
                            </TableCell>
                            <TableCell>
                              {status ? (
                                <Badge variant={status === 'present' ? 'default' : status === 'late' ? 'secondary' : 'destructive'}>
                                  {status}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">{t('attendance.notMarked')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm"
                                  className={`bg-green-50 hover:bg-green-100 ${status === 'present' ? 'ring-1 ring-green-500' : ''}`}
                                  onClick={() => markAttendance(student.id, 'present')}
                                  disabled={isSaving}>
                                  {isSaving && status !== 'present' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'P'}
                                </Button>
                                <Button variant="outline" size="sm"
                                  className={`bg-red-50 hover:bg-red-100 ${status === 'absent' ? 'ring-1 ring-red-500' : ''}`}
                                  onClick={() => markAttendance(student.id, 'absent')}
                                  disabled={isSaving}>
                                  {isSaving && status !== 'absent' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'A'}
                                </Button>
                                <Button variant="outline" size="sm"
                                  className={`bg-yellow-50 hover:bg-yellow-100 ${status === 'late' ? 'ring-1 ring-yellow-500' : ''}`}
                                  onClick={() => markAttendance(student.id, 'late')}
                                  disabled={isSaving}>
                                  {isSaving && status !== 'late' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'L'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </ModernCard>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <ModernCard variant="glass">
            <CardHeader>
              <CardTitle>{t('attendance.classwiseOverview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.class')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">{t('attendance.noClassesFound')}</TableCell></TableRow>
                  ) : classes.map(cls => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm"
                          onClick={() => { setSelectedClass(cls.name); }}
                        >{t('attendance.viewAndMark')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </ModernCard>
        </TabsContent>

        <TabsContent value="biometric">
          <BiometricAttendanceManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <AttendanceReportGenerator />
          
          <ModernCard variant="glass">
            <CardHeader>
              <CardTitle>{t('attendance.quickReports')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  {t('attendance.dailyReport')}
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  {t('attendance.weeklySummary')}
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  {t('attendance.monthlyAnalysis')}
                </Button>
              </div>
            </CardContent>
          </ModernCard>
        </TabsContent>

        <TabsContent value="leave">
          <div className="flex justify-end mb-4">
            <LeaveManagementDialog />
          </div>
          <ModernCard variant="glass">
            <CardHeader>
              <CardTitle>{t('attendance.leaveRequestsSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">5</p>
                  <p className="text-sm text-muted-foreground">{t('admissions.pending')}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-sm text-muted-foreground">{t('admissions.approved')}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">2</p>
                  <p className="text-sm text-muted-foreground">{t('admissions.rejected')}</p>
                </div>
              </div>
            </CardContent>
          </ModernCard>
        </TabsContent>
      </Tabs>
      </AnimatedWrapper>
      </div>
    </div>
    </ErrorBoundary>
  );
}
