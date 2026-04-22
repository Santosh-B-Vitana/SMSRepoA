
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Download, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkGenerationJob {
  id: string;
  certificateType: string;
  totalCount: number;
  completedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  downloadUrl?: string;
}

export function BulkCertificateGenerator() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkGenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const mockStudents = [
    { id: "STU001", name: "Alice Johnson", class: "10", section: "A", rollNo: "001" },
    { id: "STU002", name: "David Chen", class: "10", section: "A", rollNo: "002" },
    { id: "STU003", name: "Emma Wilson", class: "10", section: "A", rollNo: "003" },
    { id: "STU004", name: "James Brown", class: "10", section: "B", rollNo: "001" },
    { id: "STU005", name: "Sarah Davis", class: "10", section: "B", rollNo: "002" }
  ];

  const filteredStudents = mockStudents.filter(student => 
    (!selectedClass || student.class === selectedClass) &&
    (!selectedSection || student.section === selectedSection)
  );

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const selectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const generateBulkCertificates = async () => {
    if (!certificateType || selectedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Please select certificate type and students",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const newJob: BulkGenerationJob = {
      id: `JOB${Date.now()}`,
      certificateType,
      totalCount: selectedStudents.length,
      completedCount: 0,
      status: 'processing',
      createdAt: new Date().toISOString()
    };

    setBulkJobs(prev => [newJob, ...prev]);

    // Simulate bulk generation progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / selectedStudents.length);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          
          // Update job status
          setBulkJobs(prevJobs => prevJobs.map(job => 
            job.id === newJob.id 
              ? { 
                  ...job, 
                  status: 'completed', 
                  completedCount: job.totalCount,
                  downloadUrl: '#'
                }
              : job
          ));
          
          toast({
            title: "Success",
            description: `${selectedStudents.length} certificates generated successfully`
          });
          
          // Reset form
          setSelectedStudents([]);
          setProgress(0);
          return 100;
        }
        
        return newProgress;
      });
    }, 500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Certificate Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Certificate Type</Label>
              <Select value={certificateType} onValueChange={setCertificateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonafide">Bonafide Certificate</SelectItem>
                  <SelectItem value="character">Character Certificate</SelectItem>
                  <SelectItem value="conduct">Conduct Certificate</SelectItem>
                  <SelectItem value="transfer">Transfer Certificate</SelectItem>
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
                  <SelectItem value="9">Class 9</SelectItem>
                  <SelectItem value="10">Class 10</SelectItem>
                  <SelectItem value="11">Class 11</SelectItem>
                  <SelectItem value="12">Class 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generating certificates...</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Students ({selectedStudents.length} selected)</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={selectedStudents.length === filteredStudents.length}
                    onCheckedChange={selectAllStudents}
                    id="select-all"
                  />
                  <Label htmlFor="select-all">Select All</Label>
                </div>
              </div>
              
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll No</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleStudentSelection(student.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>{student.rollNo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button 
            onClick={generateBulkCertificates} 
            disabled={isGenerating || selectedStudents.length === 0}
            className="w-full"
          >
            {isGenerating ? "Generating..." : `Generate ${selectedStudents.length} Certificates`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate Type</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulkJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.certificateType.charAt(0).toUpperCase() + job.certificateType.slice(1)}
                  </TableCell>
                  <TableCell>{job.completedCount}/{job.totalCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <Badge variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'processing' ? 'secondary' : 'destructive'
                      }>
                        {job.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {job.status === 'completed' && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
