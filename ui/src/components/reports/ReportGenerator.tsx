
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportGeneratorProps {
  onGenerate: (reportConfig: any) => void;
}

export function ReportGenerator({ onGenerate }: ReportGeneratorProps) {
  const [reportConfig, setReportConfig] = useState({
    type: "",
    format: "pdf",
    dateRange: {
      from: "",
      to: ""
    },
    filters: {
      class: "",
      section: "",
      department: "",
      status: ""
    },
    includeCharts: true,
    includeSummary: true
  });
  const { toast } = useToast();

  const reportTypes = [
    { value: "student-attendance", label: "Student Attendance Report" },
    { value: "fee-collection", label: "Fee Collection Report" },
    { value: "exam-results", label: "Exam Results Report" },
    { value: "staff-attendance", label: "Staff Attendance Report" },
    { value: "enrollment", label: "Student Enrollment Report" },
    { value: "performance", label: "Academic Performance Report" }
  ];

  const handleGenerate = () => {
    if (!reportConfig.type) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive"
      });
      return;
    }

    const config = {
      ...reportConfig,
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      generatedBy: "Admin User"
    };

    onGenerate(config);
    toast({
      title: "Success",
      description: "Report generated successfully"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Report Type *</label>
          <Select value={reportConfig.type} onValueChange={(value) => 
            setReportConfig(prev => ({ ...prev, type: value }))
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Format</label>
          <Select value={reportConfig.format} onValueChange={(value) => 
            setReportConfig(prev => ({ ...prev, format: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={reportConfig.dateRange.from}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, from: e.target.value }
              }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={reportConfig.dateRange.to}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, to: e.target.value }
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Class (Optional)</label>
            <Select value={reportConfig.filters.class} onValueChange={(value) => 
              setReportConfig(prev => ({ ...prev, filters: { ...prev.filters, class: value } }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>Class {i+1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Section (Optional)</label>
            <Select value={reportConfig.filters.section} onValueChange={(value) => 
              setReportConfig(prev => ({ ...prev, filters: { ...prev.filters, section: value } }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C', 'D'].map(section => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="charts"
              checked={reportConfig.includeCharts}
              onCheckedChange={(checked) => 
                setReportConfig(prev => ({ ...prev, includeCharts: checked as boolean }))
              }
            />
            <label htmlFor="charts" className="text-sm">Include Charts & Graphs</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="summary"
              checked={reportConfig.includeSummary}
              onCheckedChange={(checked) => 
                setReportConfig(prev => ({ ...prev, includeSummary: checked as boolean }))
              }
            />
            <label htmlFor="summary" className="text-sm">Include Summary</label>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleGenerate}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
