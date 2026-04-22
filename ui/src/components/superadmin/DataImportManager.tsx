import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileText, Users, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { mockApi } from '@/services/mockApi';
import type { ImportResult } from '@/services/mockApi';

export function DataImportManager() {
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [studentImporting, setStudentImporting] = useState(false);
  const [staffImporting, setStaffImporting] = useState(false);
  const [studentResult, setStudentResult] = useState<ImportResult | null>(null);
  const [staffResult, setStaffResult] = useState<ImportResult | null>(null);

  const handleStudentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setStudentFile(file);
      setStudentResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleStaffFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setStaffFile(file);
      setStaffResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleStudentImport = async () => {
    if (!studentFile) return;

    setStudentImporting(true);
    try {
      // Simulate reading CSV data
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@school.edu`,
        grade: Math.floor(Math.random() * 12) + 1
      }));

      const result = await mockApi.importStudents(mockData);
      setStudentResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setStudentResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Import failed due to an error']
      });
    }
    setStudentImporting(false);
  };

  const handleStaffImport = async () => {
    if (!staffFile) return;

    setStaffImporting(true);
    try {
      // Simulate reading CSV data
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        name: `Staff ${i + 1}`,
        email: `staff${i + 1}@school.edu`,
        position: ['Teacher', 'Administrator', 'Support'][Math.floor(Math.random() * 3)]
      }));

      const result = await mockApi.importStaff(mockData);
      setStaffResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setStaffResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Import failed due to an error']
      });
    }
    setStaffImporting(false);
  };

  const downloadTemplate = (type: 'student' | 'staff') => {
    const headers = type === 'student' 
      ? ['name', 'email', 'grade', 'class', 'parent_name', 'parent_phone', 'address']
      : ['name', 'email', 'position', 'department', 'phone', 'address', 'salary'];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_import_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Import Manager</h2>
        <p className="text-muted-foreground">
          Import student and staff data from CSV files
        </p>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Data Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate('student')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <span className="text-sm text-muted-foreground">
                  Download the CSV template with required columns
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="studentFile">Select CSV File</Label>
                  <Input
                    id="studentFile"
                    type="file"
                    accept=".csv"
                    onChange={handleStudentFileChange}
                    className="mt-1"
                  />
                </div>

                {studentFile && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{studentFile.name}</span>
                    </div>
                    <Button
                      onClick={handleStudentImport}
                      disabled={studentImporting}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {studentImporting ? 'Importing...' : 'Import Students'}
                    </Button>
                  </div>
                )}

                {studentImporting && (
                  <div className="space-y-2">
                    <Progress value={45} className="w-full" />
                    <p className="text-sm text-muted-foreground">Processing student data...</p>
                  </div>
                )}

                {studentResult && (
                  <Alert className={studentResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {studentResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          Import {studentResult.success ? 'Completed' : 'Failed'}
                        </p>
                        <p>Successfully imported: {studentResult.imported} records</p>
                        {studentResult.failed > 0 && (
                          <p>Failed imports: {studentResult.failed} records</p>
                        )}
                        {studentResult.errors.length > 0 && (
                          <div>
                            <p className="font-medium">Errors:</p>
                            <ul className="list-disc list-inside">
                              {studentResult.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Staff Data Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate('staff')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <span className="text-sm text-muted-foreground">
                  Download the CSV template with required columns
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="staffFile">Select CSV File</Label>
                  <Input
                    id="staffFile"
                    type="file"
                    accept=".csv"
                    onChange={handleStaffFileChange}
                    className="mt-1"
                  />
                </div>

                {staffFile && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{staffFile.name}</span>
                    </div>
                    <Button
                      onClick={handleStaffImport}
                      disabled={staffImporting}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {staffImporting ? 'Importing...' : 'Import Staff'}
                    </Button>
                  </div>
                )}

                {staffImporting && (
                  <div className="space-y-2">
                    <Progress value={60} className="w-full" />
                    <p className="text-sm text-muted-foreground">Processing staff data...</p>
                  </div>
                )}

                {staffResult && (
                  <Alert className={staffResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {staffResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          Import {staffResult.success ? 'Completed' : 'Failed'}
                        </p>
                        <p>Successfully imported: {staffResult.imported} records</p>
                        {staffResult.failed > 0 && (
                          <p>Failed imports: {staffResult.failed} records</p>
                        )}
                        {staffResult.errors.length > 0 && (
                          <div>
                            <p className="font-medium">Errors:</p>
                            <ul className="list-disc list-inside">
                              {staffResult.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Student Import Format:</h4>
              <p className="text-sm text-muted-foreground">
                Required columns: name, email, grade, class, parent_name, parent_phone, address
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Staff Import Format:</h4>
              <p className="text-sm text-muted-foreground">
                Required columns: name, email, position, department, phone, address, salary
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Files must be in CSV format</li>
                <li>Email addresses must be unique</li>
                <li>All required fields must be filled</li>
                <li>Import process may take a few minutes for large files</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}