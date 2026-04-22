
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { ReportGenerator } from "./ReportGenerator";
import { ErrorBoundary, LoadingState } from "@/components/common";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

interface Report {
  id: string;
  type: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
}

const mockReports: Report[] = [
  {
    id: '1',
    type: 'Student Attendance Report',
    format: 'PDF',
    generatedAt: '2024-12-01T10:00:00Z',
    generatedBy: 'Admin User',
    status: 'completed',
    downloadUrl: '#'
  },
  {
    id: '2',
    type: 'Fee Collection Report',
    format: 'Excel',
    generatedAt: '2024-11-30T15:30:00Z',
    generatedBy: 'Finance Manager',
    status: 'completed',
    downloadUrl: '#'
  }
];

export function ReportsManager() {
  const [reports, setReports] = useState<Report[]>(mockReports);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthCount = reports.filter(r => {
    const d = new Date(r.generatedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  const completedCount = reports.filter(r => r.status === 'completed').length;

  const handleGenerateReport = (reportConfig: any) => {
    const newReport: Report = {
      id: reportConfig.id,
      type: reportConfig.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      format: reportConfig.format.toUpperCase(),
      generatedAt: reportConfig.generatedAt,
      generatedBy: reportConfig.generatedBy,
      status: 'generating'
    };

    setReports(prev => [newReport, ...prev]);

    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev.map(report => 
        report.id === newReport.id 
          ? { ...report, status: 'completed', downloadUrl: '#' }
          : report
      ));
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'generating': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <ErrorBoundary>
    <div className="relative min-h-screen">
      <AnimatedBackground variant="mesh" className="fixed inset-0 -z-10 opacity-30" />
      
      <div className="space-y-6 relative z-10">
        <AnimatedWrapper variant="fadeInUp" delay={0.05}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display gradient-text">Reports</h1>
              <p className="text-muted-foreground mt-2">Generate and manage school reports</p>
            </div>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ModernCard variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </ModernCard>
            
            <ModernCard variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">{thisMonthCount}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </ModernCard>
            
            <ModernCard variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Most Popular</p>
                    <p className="text-sm font-bold">Attendance</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </ModernCard>
            
            <ModernCard variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </ModernCard>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.15}>
          <Tabs defaultValue="generate">
            <TabsList>
              <TabsTrigger value="generate">Generate Report</TabsTrigger>
              <TabsTrigger value="history">Report History</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate">
              <ReportGenerator onGenerate={handleGenerateReport} />
            </TabsContent>
            
            <TabsContent value="history">
              <ModernCard variant="glass">
                <CardHeader>
                  <CardTitle>Report History</CardTitle>
                </CardHeader>
                <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.type}</TableCell>
                      <TableCell>{report.format}</TableCell>
                      <TableCell>
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{report.generatedBy}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(report.status) as any}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status === 'completed' && (
                            <>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
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
        
        <TabsContent value="scheduled">
          <ModernCard variant="glass">
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No scheduled reports configured</p>
                <Button className="mt-4">Schedule a Report</Button>
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
