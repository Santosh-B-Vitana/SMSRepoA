import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, UserCheck, Clock } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

async function downloadExportFromApi(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  apiUrl: string;
  filename: string;
}

function ExportCard({ icon, title, description, apiUrl, filename }: ExportCardProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExportFromApi(apiUrl, filename);
      toast.success(`${title} exported successfully`);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Export failed';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          size="sm"
          className="w-full flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export as CSV'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ComingSoonCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <Card className="opacity-60">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full flex items-center gap-2" disabled>
          <Clock className="h-4 w-4" />
          Coming Soon
        </Button>
      </CardContent>
    </Card>
  );
}

export function DataExportManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Export</h2>
        <p className="text-muted-foreground">
          Export school data to CSV for reporting, backups, or migration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download complete data sets as CSV files. All exported files include headers and can be opened in Excel or Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard
              icon={<Users className="h-5 w-5" />}
              title="Students"
              description="All student records with guardian and health info"
              apiUrl="/Students/export"
              filename={`students_export_${new Date().toISOString().slice(0, 10)}.csv`}
            />
            <ExportCard
              icon={<UserCheck className="h-5 w-5" />}
              title="Staff"
              description="All staff members with payroll and contact info"
              apiUrl="/Staff/export"
              filename={`staff_export_${new Date().toISOString().slice(0, 10)}.csv`}
            />
            <ComingSoonCard
              icon={<Download className="h-5 w-5" />}
              title="Attendance"
              description="Daily attendance records"
            />
            <ComingSoonCard
              icon={<Download className="h-5 w-5" />}
              title="Fees"
              description="Fee collection and pending dues"
            />
            <ComingSoonCard
              icon={<Download className="h-5 w-5" />}
              title="Examinations"
              description="Exam results and grade sheets"
            />
            <ComingSoonCard
              icon={<Download className="h-5 w-5" />}
              title="Library"
              description="Book inventory and issue records"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
