import React, { useState, useEffect } from 'react';
import { Plus, Search, Heart, Activity, AlertTriangle, Shield, Eye, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  healthApi, 
  type HealthRecordBasicDto,
  type HealthRecordFullDto, 
  type CreateHealthRecordDto,
  type UpdateHealthRecordDto,
  type VaccinationDto,
  type CreateVaccinationDto,
  type HealthStatsDto,
  type HealthStudentDetailResponse,
  type HealthAlertDto
} from '@/services/healthApi';

export function HealthManagerIntegrated() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthRecords, setHealthRecords] = useState<HealthRecordBasicDto[]>([]);
  const [healthStudents, setHealthStudents] = useState<HealthStudentDetailResponse[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationDto[]>([]);
  const [alerts, setAlerts] = useState<HealthAlertDto[]>([]);
  const [stats, setStats] = useState<HealthStatsDto | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecordFullDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddVaccination, setShowAddVaccination] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Form states
  const [formData, setFormData] = useState<CreateHealthRecordDto>({
    schoolId: localStorage.getItem('schoolId') || '',
    studentId: '',
    checkupDate: new Date().toISOString().split('T')[0],
    height: 0,
    weight: 0,
    doctorName: '',
    status: 'normal'
  });

  const [vaccinationForm, setVaccinationForm] = useState<CreateVaccinationDto>({
    schoolId: localStorage.getItem('schoolId') || '',
    studentId: '',
    vaccineName: '',
    vaccinationDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [currentPage, filterStatus, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const filters = {
        status: filterStatus !== 'all' ? filterStatus : undefined,
        searchQuery: searchTerm || undefined
      };

      const [recordsData, studentsData, statsData, alertsData, upcomingVaccinations] = await Promise.all([
        healthApi.getHealthRecords(filters, currentPage, pageSize).catch(() => ({ items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 })),
        healthApi.getAllHealthStudents().catch(() => []),
        healthApi.getHealthStats().catch(() => ({
          totalRecords: 0,
          normalStatus: 0,
          attentionRequired: 0,
          critical: 0,
          followUp: 0,
          avgBMI: 0,
          upcomingCheckups: 0,
          vaccinationsDue: 0,
          bmiDistribution: { underweight: 0, normal: 0, overweight: 0, obese: 0 }
        })),
        healthApi.getHealthAlerts({ isAcknowledged: false }).catch(() => []),
        healthApi.getUpcomingVaccinations(30).catch(() => [])
      ]);

      setHealthRecords(recordsData.items || []);
      setHealthStudents(studentsData || []);
      setStats(statsData);
      setAlerts(alertsData || []);
      setVaccinations(upcomingVaccinations || []);
    } catch (error) {
      console.error('Error loading health data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load health data. Please check your connection.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    try {
      if (!formData.studentId || !formData.height || !formData.weight || !formData.doctorName) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // Validate vital signs if provided
      if (formData.bloodPressureSystolic && (formData.bloodPressureSystolic < 60 || formData.bloodPressureSystolic > 200)) {
        toast({
          title: 'Validation Error',
          description: 'Blood pressure systolic must be between 60-200',
          variant: 'destructive'
        });
        return;
      }

      if (formData.heartRate && (formData.heartRate < 40 || formData.heartRate > 150)) {
        toast({
          title: 'Validation Error',
          description: 'Heart rate must be between 40-150 bpm',
          variant: 'destructive'
        });
        return;
      }

      await healthApi.createHealthRecord(formData);
      
      toast({
        title: 'Success',
        description: 'Health record created successfully'
      });
      
      setShowAddRecord(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create health record',
        variant: 'destructive'
      });
    }
  };

  const handleAddVaccination = async () => {
    try {
      if (!vaccinationForm.studentId || !vaccinationForm.vaccineName) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      await healthApi.addVaccination(vaccinationForm);
      
      toast({
        title: 'Success',
        description: 'Vaccination record added successfully'
      });
      
      setShowAddVaccination(false);
      resetVaccinationForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add vaccination',
        variant: 'destructive'
      });
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const record = await healthApi.getHealthRecordById(id);
      setSelectedRecord(record);
      setShowViewDetails(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load health record details',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this health record?')) return;

    try {
      await healthApi.deleteHealthRecord(id);
      toast({
        title: 'Success',
        description: 'Health record deleted successfully'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete health record',
        variant: 'destructive'
      });
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const userId = localStorage.getItem('userId') || '';
      await healthApi.acknowledgeAlert(alertId, userId);
      toast({
        title: 'Success',
        description: 'Alert acknowledged successfully'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      schoolId: localStorage.getItem('schoolId') || '',
      studentId: '',
      checkupDate: new Date().toISOString().split('T')[0],
      height: 0,
      weight: 0,
      doctorName: '',
      status: 'normal'
    });
  };

  const resetVaccinationForm = () => {
    setVaccinationForm({
      schoolId: localStorage.getItem('schoolId') || '',
      studentId: '',
      vaccineName: '',
      vaccinationDate: new Date().toISOString().split('T')[0]
    });
  };

  const getBMIColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'underweight': return 'text-blue-500';
      case 'normal': return 'text-green-500';
      case 'overweight': return 'text-orange-500';
      case 'obese': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'attention_required': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading health records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Health Management
              </h1>
              <p className="text-muted-foreground">Track student health records, vaccinations, and medical data</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddRecord(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Health Record
              </Button>
              <Button onClick={() => setShowAddVaccination(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Vaccination
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{stats?.totalRecords || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg BMI: {stats?.avgBMI.toFixed(1) || 0}
                    </p>
                  </div>
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attention Required</p>
                    <p className="text-2xl font-bold">{stats?.attentionRequired || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Critical: {stats?.critical || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                    <p className="text-2xl font-bold">{alerts.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unacknowledged
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vaccinations Due</p>
                    <p className="text-2xl font-bold">{stats?.vaccinationsDue || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next 30 days
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedWrapper>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Health Records Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="records" className="space-y-4">
              <TabsList>
                <TabsTrigger value="records">Health Records</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="records" className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by student name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="attention_required">Attention Required</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Checkup Date</TableHead>
                      <TableHead>Height/Weight</TableHead>
                      <TableHead>BMI</TableHead>
                      <TableHead>Blood Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No health records found. Click "Add Health Record" to create one.
                        </TableCell>
                      </TableRow>
                    ) : healthRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>{record.class}-{record.section}</TableCell>
                        <TableCell>{new Date(record.checkupDate).toLocaleDateString()}</TableCell>
                        <TableCell>{record.height}cm / {record.weight}kg</TableCell>
                        <TableCell>
                          <span className={getBMIColor(record.bmiCategory)}>
                            {record.bmi.toFixed(1)} ({record.bmiCategory})
                          </span>
                        </TableCell>
                        <TableCell>{record.bloodGroup || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(record.status)}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(record.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Last Checkup</TableHead>
                      <TableHead>BMI Category</TableHead>
                      <TableHead>Blood Group</TableHead>
                      <TableHead>Blood Pressure</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No students with health records found.
                        </TableCell>
                      </TableRow>
                    ) : healthStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.studentName}</TableCell>
                        <TableCell>{student.class}-{student.section}</TableCell>
                        <TableCell>{new Date(student.checkupDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={getBMIColor(student.bmiCategory)}>
                            {student.bmiCategory}
                          </span>
                        </TableCell>
                        <TableCell>{student.bloodGroup || '-'}</TableCell>
                        <TableCell>
                          {student.bloodPressureSystolic && student.bloodPressureDiastolic
                            ? `${student.bloodPressureSystolic}/${student.bloodPressureDiastolic}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)}>
                            {student.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(student.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="vaccinations" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Date Given</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Administered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vaccinations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No upcoming vaccinations in the next 30 days.
                        </TableCell>
                      </TableRow>
                    ) : vaccinations.map((vaccination) => (
                      <TableRow key={vaccination.id}>
                        <TableCell className="font-medium">{vaccination.vaccineName}</TableCell>
                        <TableCell>{new Date(vaccination.vaccinationDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {vaccination.nextDueDate 
                            ? new Date(vaccination.nextDueDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>{vaccination.batchNumber || '-'}</TableCell>
                        <TableCell>{vaccination.administeredBy || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No active alerts. All alerts have been acknowledged.
                        </TableCell>
                      </TableRow>
                    ) : alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.studentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{alert.alertType.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                        <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {!alert.isAcknowledged && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Add Health Record Dialog */}
        <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Health Record</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Student ID *</Label>
                <Input
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Enter student ID"
                />
              </div>
              <div>
                <Label>Checkup Date *</Label>
                <Input
                  type="date"
                  value={formData.checkupDate}
                  onChange={(e) => setFormData({ ...formData, checkupDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Height (cm) *</Label>
                <Input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                  placeholder="Height in cm"
                />
              </div>
              <div>
                <Label>Weight (kg) *</Label>
                <Input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  placeholder="Weight in kg"
                />
              </div>
              <div>
                <Label>Blood Pressure (Systolic)</Label>
                <Input
                  type="number"
                  value={formData.bloodPressureSystolic || ''}
                  onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: parseInt(e.target.value) })}
                  placeholder="60-200"
                />
              </div>
              <div>
                <Label>Blood Pressure (Diastolic)</Label>
                <Input
                  type="number"
                  value={formData.bloodPressureDiastolic || ''}
                  onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: parseInt(e.target.value) })}
                  placeholder="40-120"
                />
              </div>
              <div>
                <Label>Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  value={formData.heartRate || ''}
                  onChange={(e) => setFormData({ ...formData, heartRate: parseInt(e.target.value) })}
                  placeholder="40-150"
                />
              </div>
              <div>
                <Label>Temperature (°F)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature || ''}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  placeholder="95-105"
                />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select
                  value={formData.bloodGroup || ''}
                  onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="attention_required">Attention Required</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Doctor Name *</Label>
                <Input
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  placeholder="Doctor's name"
                />
              </div>
              <div className="col-span-2">
                <Label>Doctor Notes</Label>
                <Textarea
                  value={formData.doctorNotes || ''}
                  onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                  placeholder="Additional notes from doctor..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRecord(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRecord}>
                Add Health Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Vaccination Dialog */}
        <Dialog open={showAddVaccination} onOpenChange={setShowAddVaccination}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vaccination</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student ID *</Label>
                <Input
                  value={vaccinationForm.studentId}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, studentId: e.target.value })}
                  placeholder="Enter student ID"
                />
              </div>
              <div>
                <Label>Vaccine Name *</Label>
                <Input
                  value={vaccinationForm.vaccineName}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })}
                  placeholder="e.g., COVID-19, MMR, HPV"
                />
              </div>
              <div>
                <Label>Vaccination Date *</Label>
                <Input
                  type="date"
                  value={vaccinationForm.vaccinationDate}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccinationDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Next Due Date</Label>
                <Input
                  type="date"
                  value={vaccinationForm.nextDueDate || ''}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, nextDueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input
                  value={vaccinationForm.batchNumber || ''}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, batchNumber: e.target.value })}
                  placeholder="Batch number"
                />
              </div>
              <div>
                <Label>Administered By</Label>
                <Input
                  value={vaccinationForm.administeredBy || ''}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, administeredBy: e.target.value })}
                  placeholder="Doctor/Nurse name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddVaccination(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVaccination}>
                Add Vaccination
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Health Record Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Student</Label>
                    <p className="font-medium">{selectedRecord.studentName}</p>
                  </div>
                  <div>
                    <Label>Class</Label>
                    <p className="font-medium">{selectedRecord.class}-{selectedRecord.section}</p>
                  </div>
                  <div>
                    <Label>BMI</Label>
                    <p className={`font-medium ${getBMIColor(selectedRecord.bmiCategory)}`}>
                      {selectedRecord.bmi.toFixed(1)} ({selectedRecord.bmiCategory})
                    </p>
                  </div>
                  <div>
                    <Label>Blood Group</Label>
                    <p className="font-medium">{selectedRecord.bloodGroup || '-'}</p>
                  </div>
                  <div>
                    <Label>Vision</Label>
                    <p className="font-medium">
                      L: {selectedRecord.visionLeft || '-'} / R: {selectedRecord.visionRight || '-'}
                    </p>
                  </div>
                  <div>
                    <Label>Doctor</Label>
                    <p className="font-medium">{selectedRecord.doctorName}</p>
                  </div>
                </div>
                
                {selectedRecord.allergies && selectedRecord.allergies.length > 0 && (
                  <div>
                    <Label>Allergies</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedRecord.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">{allergy}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecord.medicalConditions && selectedRecord.medicalConditions.length > 0 && (
                  <div>
                    <Label>Medical Conditions</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedRecord.medicalConditions.map((condition, index) => (
                        <Badge key={index} variant="default">{condition}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecord.doctorNotes && (
                  <div>
                    <Label>Doctor Notes</Label>
                    <p className="text-sm mt-1">{selectedRecord.doctorNotes}</p>
                  </div>
                )}

                {selectedRecord.vaccinations && selectedRecord.vaccinations.length > 0 && (
                  <div>
                    <Label>Recent Vaccinations</Label>
                    <div className="mt-2 space-y-2">
                      {selectedRecord.vaccinations.slice(0, 3).map((vac) => (
                        <div key={vac.id} className="flex justify-between text-sm">
                          <span>{vac.vaccineName}</span>
                          <span className="text-muted-foreground">
                            {new Date(vac.vaccinationDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewDetails(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
