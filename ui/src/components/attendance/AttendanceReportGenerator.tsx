import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Calendar } from "lucide-react";
import { exportToPDF } from "@/utils/exportUtils";

export function AttendanceReportGenerator() {
  const [reportType, setReportType] = useState("daily");
  const [selectedClass, setSelectedClass] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  const generateReport = () => {
    if (!dateRange?.from || !dateRange?.to || !selectedClass) {
      toast({
        title: "Error",
        description: "Please select class and date range",
        variant: "destructive"
      });
      return;
    }

    const reportData = [
      { studentName: "Aarav Gupta", rollNo: "101", present: 18, absent: 2, percentage: "90%" },
      { studentName: "Ananya Sharma", rollNo: "102", present: 20, absent: 0, percentage: "100%" },
      { studentName: "Rohan Patel", rollNo: "103", present: 17, absent: 3, percentage: "85%" },
    ];

    exportToPDF(reportData, {
      filename: `attendance_report_${selectedClass}_${dateRange.from.toISOString().split('T')[0]}`,
      columns: [
        { key: 'studentName', label: 'Student Name' },
        { key: 'rollNo', label: 'Roll No' },
        { key: 'present', label: 'Present Days' },
        { key: 'absent', label: 'Absent Days' },
        { key: 'percentage', label: 'Attendance %' }
      ],
      title: `Attendance Report - Class ${selectedClass}`
    });

    toast({
      title: "Success",
      description: "Attendance report generated successfully"
    });
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
                <SelectItem value="10-A">Class 10-A</SelectItem>
                <SelectItem value="10-B">Class 10-B</SelectItem>
                <SelectItem value="9-A">Class 9-A</SelectItem>
                <SelectItem value="9-B">Class 9-B</SelectItem>
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
          <Button onClick={generateReport} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button variant="outline" onClick={generateReport} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Generate Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
