import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Users, UserCheck, UserX, Clock, Fingerprint, Download, FileText, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BiometricAttendanceManager } from "./BiometricAttendanceManager";
import { ExportButton, DateRangePicker, EmptyState, ErrorBoundary } from "@/components/common";
import { useDateRange } from "@/components/common/DateRangePicker";
import { AttendanceReportGenerator } from "./AttendanceReportGenerator";
import { LeaveManagementDialog } from "./LeaveManagementDialog";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  class: string;
  status: 'present' | 'absent' | 'late';
  timestamp?: string;
  method?: 'manual' | 'biometric' | 'rfid';
  manualOverride?: boolean;
}

interface ClassAttendance {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
}

export function AttendanceManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("10-A");
  const dateRange = useDateRange();
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      studentId: "STU001",
      studentName: "Alice Johnson", 
      class: "10-A",
      status: "present",
      timestamp: "08:15:00",
      method: "biometric",
      manualOverride: false
    },
    {
      studentId: "STU002",
      studentName: "David Chen",
      class: "10-A", 
      status: "late",
      timestamp: "08:45:00",
      method: "manual",
      manualOverride: false
    },
    {
      studentId: "STU003",
      studentName: "Emma Wilson",
      class: "10-A",
      status: "absent",
      method: "manual",
      manualOverride: false
    }
  ]);

  const [classAttendance] = useState<ClassAttendance[]>([
    {
      classId: "10-A",
      className: "Class 10-A", 
      totalStudents: 32,
      presentCount: 28,
      absentCount: 3,
      lateCount: 1,
      attendancePercentage: 87.5
    },
    {
      classId: "10-B",
      className: "Class 10-B",
      totalStudents: 30, 
      presentCount: 29,
      absentCount: 1,
      lateCount: 0,
      attendancePercentage: 96.7
    },
    {
      classId: "9-A",
      className: "Class 9-A",
      totalStudents: 35,
      presentCount: 33,
      absentCount: 2, 
      lateCount: 0,
      attendancePercentage: 94.3
    }
  ]);

  const { toast } = useToast();

  // Check if biometric attendance is enabled
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);
  
  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    // If biometric is enabled and this is admin/staff/super admin, prevent manual entry
    if (biometricEnabled) {
      toast({
        title: "Manual Entry Disabled",
        description: "Attendance is managed through biometric devices. Please use the biometric sync feature.",
        variant: "destructive"
      });
      return;
    }

    setAttendanceRecords(prev => {
      const updated = prev.map(record =>
        record.studentId === studentId
          ? { ...record, status, timestamp: new Date().toLocaleTimeString(), method: 'manual' as 'manual' }
          : record
      );
      return updated;
    });
    toast({
      title: "Attendance Updated",
      description: `Student marked as ${status}`,
    });
  };

  const syncBiometricData = () => {
    toast({
      title: "Syncing Biometric Data",
      description: "Importing attendance from biometric devices...",
    });
    
    // Simulate biometric sync
    setTimeout(() => {
      toast({
        title: "Sync Complete",
        description: "Successfully imported 15 attendance records from biometric devices",
      });
    }, 2000);
  };

  const generateReport = () => {
    toast({
      title: "Generating Report",
      description: `Attendance report for ${selectedClass} on ${format(selectedDate, "PP")} is being generated...`,
    });
  };

  const getTotalStats = () => {
    const totals = classAttendance.reduce((acc, cls) => ({
      totalStudents: acc.totalStudents + cls.totalStudents,
      presentCount: acc.presentCount + cls.presentCount,
      absentCount: acc.absentCount + cls.absentCount,
      lateCount: acc.lateCount + cls.lateCount
    }), { totalStudents: 0, presentCount: 0, absentCount: 0, lateCount: 0 });

    return {
      ...totals,
      attendancePercentage: (totals.presentCount / totals.totalStudents) * 100
    };
  };

  const totalStats = getTotalStats();

  return (
    <ErrorBoundary>
    <div className="relative min-h-screen">
      <AnimatedBackground variant="gradient" className="fixed inset-0 -z-10 opacity-30" />
      
      <div className="space-y-6 relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-display gradient-text">Attendance Management</h2>
            <p className="text-muted-foreground mt-2">Track and manage student attendance across all classes</p>
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
              Sync Biometric
            </Button>
            <Button onClick={generateReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
        </AnimatedWrapper>

      {/* Summary Cards */}
      <AnimatedWrapper variant="fadeInUp" delay={0.2}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalStudents}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStats.presentCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalStats.absentCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalStats.lateCount}</div>
          </CardContent>
        </ModernCard>
        
        <ModernCard variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalStats.attendancePercentage.toFixed(1)}%</div>
          </CardContent>
        </ModernCard>
      </div>
      </AnimatedWrapper>

      <AnimatedWrapper variant="fadeInUp" delay={0.3}>
      <Tabs defaultValue="daily">
        <TabsList className="w-full flex">
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="overview">Class Overview</TabsTrigger>
          <TabsTrigger value="biometric">Biometric System</TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarDays className="h-4 w-4 mr-2" />
            Leave Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <ModernCard variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Attendance - {selectedClass}</CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10-A">Class 10-A</SelectItem>
                      <SelectItem value="10-B">Class 10-B</SelectItem>
                      <SelectItem value="9-A">Class 9-A</SelectItem>
                      <SelectItem value="9-B">Class 9-B</SelectItem>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords
                    .filter(record => record.class === selectedClass)
                    .map((record) => (
                    <TableRow key={record.studentId}>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.class}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === 'present' ? 'default' :
                          record.status === 'late' ? 'secondary' : 'destructive'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.timestamp || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {record.method === 'biometric' && <Fingerprint className="h-3 w-3" />}
                          <span className="capitalize">{record.method}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markAttendance(record.studentId, 'present')}
                            className={`bg-green-50 hover:bg-green-100 ${(record.method === 'biometric' && !record.manualOverride) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={record.method === 'biometric' && !record.manualOverride}
                          >
                            P
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markAttendance(record.studentId, 'absent')}
                            className={`bg-red-50 hover:bg-red-100 ${(record.method === 'biometric' && !record.manualOverride) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={record.method === 'biometric' && !record.manualOverride}
                          >
                            A
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markAttendance(record.studentId, 'late')}
                            className={`bg-yellow-50 hover:bg-yellow-100 ${(record.method === 'biometric' && !record.manualOverride) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={record.method === 'biometric' && !record.manualOverride}
                          >
                            L
                          </Button>
                          {record.method === 'biometric' && !record.manualOverride && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setAttendanceRecords(prev => prev.map(r => r.studentId === record.studentId ? { ...r, manualOverride: true } : r));
                                toast({ title: 'Manual Edit Enabled', description: `Manual editing enabled for ${record.studentName}.`, variant: 'default' });
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </ModernCard>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <ModernCard variant="glass">
            <CardHeader>
              <CardTitle>Class-wise Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Students</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Attendance %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classAttendance.map((cls) => (
                    <TableRow key={cls.classId}>
                      <TableCell className="font-medium">{cls.className}</TableCell>
                      <TableCell>{cls.totalStudents}</TableCell>
                      <TableCell className="text-green-600">{cls.presentCount}</TableCell>
                      <TableCell className="text-red-600">{cls.absentCount}</TableCell>
                      <TableCell className="text-yellow-600">{cls.lateCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{width: `${cls.attendancePercentage}%`}}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{cls.attendancePercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">View Details</Button>
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
              <CardTitle>Quick Report Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  Daily Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  Weekly Summary
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  Monthly Analysis
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
              <CardTitle>Leave Requests Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">5</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">2</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
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
