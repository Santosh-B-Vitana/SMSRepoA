import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, DollarSign, Calculator, FileText } from 'lucide-react';
import { mockApi } from '@/services/mockApi';
import type { PayrollEntry, Staff } from '@/services/mockApi';

interface PayrollManagerProps {
  staffId?: string;
}

export function PayrollManager({ staffId }: PayrollManagerProps) {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollDialog, setPayrollDialog] = useState({ open: false, entry: null as PayrollEntry | null });

  useEffect(() => {
    loadData();
  }, [staffId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollData, staffData] = await Promise.all([
        mockApi.getPayrollEntries(staffId),
        mockApi.getStaff()
      ]);
      setPayrollEntries(payrollData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading payroll data:', error);
    }
    setLoading(false);
  };

  const handleSavePayroll = async (payrollData: Partial<PayrollEntry>) => {
    try {
      if (payrollDialog.entry) {
        await mockApi.updatePayrollEntry(payrollDialog.entry.id, payrollData);
      } else {
        await mockApi.addPayrollEntry(payrollData as Omit<PayrollEntry, 'id'>);
      }
      loadData();
      setPayrollDialog({ open: false, entry: null });
    } catch (error) {
      console.error('Error saving payroll:', error);
    }
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.name || 'Unknown Staff';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'processed': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Management</h2>
          <p className="text-muted-foreground">
            {staffId ? 'Staff payroll records' : 'Manage staff payroll and salary processing'}
          </p>
        </div>
        <Button onClick={() => setPayrollDialog({ open: true, entry: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payroll Entry
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollEntries.filter(e => e.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{payrollEntries.reduce((sum, entry) => sum + entry.netSalary, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {!staffId && <TableHead>Staff</TableHead>}
                <TableHead>Month/Year</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollEntries.map((entry) => (
                <TableRow key={entry.id}>
                  {!staffId && (
                    <TableCell className="font-medium">
                      {getStaffName(entry.staffId)}
                    </TableCell>
                  )}
                  <TableCell>{entry.month} {entry.year}</TableCell>
                  <TableCell>₹{entry.basicSalary.toLocaleString()}</TableCell>
                  <TableCell>₹{entry.grossSalary.toLocaleString()}</TableCell>
                  <TableCell>₹{entry.netSalary.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(entry.status)}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPayrollDialog({ open: true, entry })}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PayrollDialog
        open={payrollDialog.open}
        entry={payrollDialog.entry}
        staff={staff}
        defaultStaffId={staffId}
        onClose={() => setPayrollDialog({ open: false, entry: null })}
        onSave={handleSavePayroll}
      />
    </div>
  );
}

function PayrollDialog({
  open,
  entry,
  staff,
  defaultStaffId,
  onClose,
  onSave
}: {
  open: boolean;
  entry: PayrollEntry | null;
  staff: Staff[];
  defaultStaffId?: string;
  onClose: () => void;
  onSave: (data: Partial<PayrollEntry>) => void;
}) {
  const [formData, setFormData] = useState({
    staffId: defaultStaffId || '',
    month: '',
    year: new Date().getFullYear(),
    basicSalary: 0,
    allowances: {
      hra: 0,
      da: 0,
      ta: 0,
      other: 0
    },
    deductions: {
      pf: 0,
      esi: 0,
      tax: 0,
      other: 0
    },
    status: 'pending' as 'pending' | 'processed' | 'paid'
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        staffId: entry.staffId,
        month: entry.month,
        year: entry.year,
        basicSalary: entry.basicSalary,
        allowances: entry.allowances,
        deductions: entry.deductions,
        status: entry.status
      });
    } else {
      setFormData({
        staffId: defaultStaffId || '',
        month: '',
        year: new Date().getFullYear(),
        basicSalary: 0,
        allowances: { hra: 0, da: 0, ta: 0, other: 0 },
        deductions: { pf: 0, esi: 0, tax: 0, other: 0 },
        status: 'pending'
      });
    }
  }, [entry, defaultStaffId]);

  const calculateSalary = () => {
    const { basicSalary, allowances, deductions } = formData;
    const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + val, 0);
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;
    
    return { grossSalary, netSalary };
  };

  const handleSave = () => {
    const { grossSalary, netSalary } = calculateSalary();
    onSave({
      ...formData,
      grossSalary,
      netSalary
    });
  };

  const { grossSalary, netSalary } = calculateSalary();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Payroll Entry' : 'Add Payroll Entry'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {!defaultStaffId && (
              <div>
                <Label>Staff Member</Label>
                <Select value={formData.staffId} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, staffId: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Month</Label>
              <Select value={formData.month} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, month: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <Label>Basic Salary</Label>
              <Input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Allowances</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label>HRA</Label>
                <Input
                  type="number"
                  value={formData.allowances.hra}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    allowances: { ...prev.allowances, hra: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>DA</Label>
                <Input
                  type="number"
                  value={formData.allowances.da}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    allowances: { ...prev.allowances, da: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>TA</Label>
                <Input
                  type="number"
                  value={formData.allowances.ta}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    allowances: { ...prev.allowances, ta: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>Other</Label>
                <Input
                  type="number"
                  value={formData.allowances.other}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    allowances: { ...prev.allowances, other: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Deductions</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label>PF</Label>
                <Input
                  type="number"
                  value={formData.deductions.pf}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    deductions: { ...prev.deductions, pf: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>ESI</Label>
                <Input
                  type="number"
                  value={formData.deductions.esi}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    deductions: { ...prev.deductions, esi: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>Tax</Label>
                <Input
                  type="number"
                  value={formData.deductions.tax}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    deductions: { ...prev.deductions, tax: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>Other</Label>
                <Input
                  type="number"
                  value={formData.deductions.other}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    deductions: { ...prev.deductions, other: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => 
              setFormData(prev => ({ ...prev, status: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Salary Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gross Salary:</span>
                  <span className="font-semibold">₹{grossSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Salary:</span>
                  <span className="font-semibold text-lg">₹{netSalary.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Payroll Entry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}