import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Loader2 } from "lucide-react";
import { exportToPDF } from "@/utils/exportUtils";
import { attendanceApi, AttendanceRecordBasic } from "@/services/api/attendanceApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";

export function AttendanceReportGenerator() {
  const [reportType, setReportType] = useState("daily");
  const [selectedClass, setSelectedClass] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    academicApi.listClasses(1, 200).then(r => {
      setClasses(r.classes ?? []);
    }).catch(() => {});
  }, []);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedClass) {
      toast({
        title: "Error",
        description: "Please select class and date range",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const dateFrom = dateRange.from.toISOString().split('T')[0];
      const dateTo = dateRange.to.toISOString().split('T')[0];

      const response = await attendanceApi.listRecords({ dateFrom, dateTo, pageSize: 2000 });

      const classRecords = response.items.filter(
        (r: AttendanceRecordBasic) => r.class === selectedClass
      );

      if (classRecords.length === 0) {
        toast({
          title: "No Data",
          description: "No attendance records found for the selected class and date range.",
          variant: "destructive"
        });
        return;
      }

      const studentMap = new Map<string, { studentName: string; present: number; absent: number; total: number }>();
      for (const record of classRecords) {
        if (!studentMap.has(record.studentId)) {
          studentMap.set(record.studentId, { studentName: record.studentName, present: 0, absent: 0, total: 0 });
        }
        const s = studentMap.get(record.studentId)!;
        s.total++;
        if (record.status === 'present' || record.status === 'late' || record.status === 'half_day') {
          s.present++;
        } else {
          s.absent++;
        }
      }

      const reportData = Array.from(studentMap.values()).map(s => ({
        studentName: s.studentName,
        present: s.present,
        absent: s.absent,
        percentage: s.total > 0 ? `${Math.round((s.present / s.total) * 100)}%` : 'N/A',
      }));

      exportToPDF(reportData, {
        filename: `attendance_report_${selectedClass.replace(/\s+/g, '_')}_${dateFrom}`,
        columns: [
          { key: 'studentName', label: 'Student Name' },
          { key: 'present', label: 'Present Days' },
          { key: 'absent', label: 'Absent Days' },
          { key: 'percentage', label: 'Attendance %' }
        ],
        title: `Attendance Report - ${selectedClass} (${dateFrom} to ${dateTo})`
      });

      toast({
        title: "Success",
        description: "Attendance report generated successfully"
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch attendance data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Attendance Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Report</SelectItem>
                <SelectItem value="weekly">Weekly Report</SelectItem>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Date Range</Label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={generateReport} disabled={isGenerating} className="w-full">
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Generate PDF
          </Button>
          <Button variant="outline" onClick={generateReport} disabled={isGenerating} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Generate Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
