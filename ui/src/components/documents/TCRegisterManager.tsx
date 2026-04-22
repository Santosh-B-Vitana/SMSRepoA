import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";

interface TCRecord {
  id: string;
  serialNo: string;
  tcNumber: string;
  studentName: string;
  fatherName: string;
  class: string;
  dateOfBirth: string;
  dateOfAdmission: string;
  dateOfLeaving: string;
  reasonForLeaving: string;
  conduct: string;
  issueDate: string;
  academicYear: string;
  status: 'issued' | 'cancelled' | 'duplicate';
  remarks?: string;
}

export function TCRegisterManager() {
  const [tcRecords, setTcRecords] = useState<TCRecord[]>([
    {
      id: '1',
      serialNo: 'TC/2024/001',
      tcNumber: 'TC-001-2024',
      studentName: 'Rahul Kumar',
      fatherName: 'Suresh Kumar',
      class: 'Class 10-A',
      dateOfBirth: '15/05/2009',
      dateOfAdmission: '01/04/2019',
      dateOfLeaving: '31/03/2024',
      reasonForLeaving: 'Parent Transfer',
      conduct: 'Good',
      issueDate: '05/04/2024',
      academicYear: '2023-24',
      status: 'issued'
    }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentSerialNo, setCurrentSerialNo] = useState(1);

  const [formData, setFormData] = useState<Partial<TCRecord>>({
    studentName: '',
    fatherName: '',
    class: '',
    dateOfBirth: '',
    dateOfAdmission: '',
    dateOfLeaving: '',
    reasonForLeaving: '',
    conduct: 'Good',
    issueDate: new Date().toISOString().split('T')[0],
    academicYear: '2024-25'
  });

  const generateSerialNumber = () => {
    const year = new Date().getFullYear();
    const serial = `TC/${year}/${String(currentSerialNo + tcRecords.length).padStart(3, '0')}`;
    return serial;
  };

  const generateTCNumber = () => {
    const year = new Date().getFullYear();
    const number = `TC-${String(currentSerialNo + tcRecords.length).padStart(3, '0')}-${year}`;
    return number;
  };

  const handleAddTC = () => {
    if (!formData.studentName || !formData.fatherName || !formData.class) {
      toast.error("Please fill all required fields");
      return;
    }

    const newRecord: TCRecord = {
      id: Date.now().toString(),
      serialNo: generateSerialNumber(),
      tcNumber: generateTCNumber(),
      studentName: formData.studentName,
      fatherName: formData.fatherName || '',
      class: formData.class,
      dateOfBirth: formData.dateOfBirth || '',
      dateOfAdmission: formData.dateOfAdmission || '',
      dateOfLeaving: formData.dateOfLeaving || '',
      reasonForLeaving: formData.reasonForLeaving || '',
      conduct: formData.conduct || 'Good',
      issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
      academicYear: formData.academicYear || '2024-25',
      status: 'issued'
    };

    setTcRecords([...tcRecords, newRecord]);
    setIsAddDialogOpen(false);
    setFormData({
      studentName: '',
      fatherName: '',
      class: '',
      dateOfBirth: '',
      dateOfAdmission: '',
      dateOfLeaving: '',
      reasonForLeaving: '',
      conduct: 'Good',
      issueDate: new Date().toISOString().split('T')[0],
      academicYear: '2024-25'
    });
    toast.success(`TC ${newRecord.tcNumber} issued successfully`);
  };

  const filteredRecords = tcRecords.filter(record =>
    record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.tcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.serialNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: TCRecord['status']) => {
    const variants = {
      issued: 'default',
      cancelled: 'destructive',
      duplicate: 'secondary'
    };
    return (
      <Badge variant={variants[status] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Transfer Certificate (TC) Register
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Issue New TC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Issue Transfer Certificate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Auto-generated fields */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Serial Number</Label>
                      <p className="font-mono font-bold">{generateSerialNumber()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">TC Number</Label>
                      <p className="font-mono font-bold">{generateTCNumber()}</p>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Student Name *</Label>
                      <Input
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        placeholder="Enter student name"
                      />
                    </div>
                    <div>
                      <Label>Father's Name *</Label>
                      <Input
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        placeholder="Enter father's name"
                      />
                    </div>
                    <div>
                      <Label>Class *</Label>
                      <Input
                        value={formData.class}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        placeholder="e.g., Class 10-A"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Date of Admission</Label>
                      <Input
                        type="date"
                        value={formData.dateOfAdmission}
                        onChange={(e) => setFormData({ ...formData, dateOfAdmission: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Date of Leaving</Label>
                      <Input
                        type="date"
                        value={formData.dateOfLeaving}
                        onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Input
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        placeholder="e.g., 2024-25"
                      />
                    </div>
                    <div>
                      <Label>Issue Date</Label>
                      <Input
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Reason for Leaving</Label>
                    <Input
                      value={formData.reasonForLeaving}
                      onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                      placeholder="e.g., Parent Transfer, Migration, etc."
                    />
                  </div>

                  <div>
                    <Label>Character & Conduct</Label>
                    <Input
                      value={formData.conduct}
                      onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
                      placeholder="e.g., Good, Very Good, Excellent"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTC}>
                      <FileText className="h-4 w-4 mr-2" />
                      Issue TC
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total TCs Issued</div>
                <div className="text-2xl font-bold text-primary">{tcRecords.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-success/5">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Active TCs</div>
                <div className="text-2xl font-bold text-success">
                  {tcRecords.filter(r => r.status === 'issued').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/5">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Duplicate TCs</div>
                <div className="text-2xl font-bold text-secondary">
                  {tcRecords.filter(r => r.status === 'duplicate').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Cancelled TCs</div>
                <div className="text-2xl font-bold text-destructive">
                  {tcRecords.filter(r => r.status === 'cancelled').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, TC number, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* TC Register Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Serial No</TableHead>
                  <TableHead>TC Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date of Leaving</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">{record.serialNo}</TableCell>
                      <TableCell className="font-mono font-semibold">{record.tcNumber}</TableCell>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.class}</TableCell>
                      <TableCell>{record.dateOfLeaving}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{record.reasonForLeaving}</TableCell>
                      <TableCell>{record.issueDate}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No TC records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Serial numbers are auto-generated and cannot be changed once issued</p>
          <p>• TC Register must be maintained as per education board regulations</p>
          <p>• Duplicate TCs can be issued with 'Duplicate' status for lost certificates</p>
          <p>• All TC records are permanent and should be preserved for audit purposes</p>
          <p>• Ensure all details are verified before issuing the certificate</p>
        </CardContent>
      </Card>
    </div>
  );
}
