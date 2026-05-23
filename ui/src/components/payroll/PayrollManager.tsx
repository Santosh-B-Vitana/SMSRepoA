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
import { payrollApi, type PayrollRecordBasic, type CreatePayrollInput, type UpdatePayrollInput } from '@/services/api/payrollApi';
import { staffApi, type StaffBasic } from '@/services/api/staffApi';

interface PayrollManagerProps {
  staffId?: string;
}

export function PayrollManager({ staffId }: PayrollManagerProps) {
  const [payrollEntries, setPayrollEntries] = useState<PayrollRecordBasic[]>([]);
  const [staffList, setStaffList] = useState<StaffBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollDialog, setPayrollDialog] = useState({ open: false, entry: null as PayrollRecordBasic | null });

  useEffect(() => {
    loadData();
  }, [staffId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const payrollResp = await payrollApi.getRecords({ staffId }, 1, 100);
      setPayrollEntries(payrollResp.items);
      // Only fetch staff list when not scoped to a specific staff member (for the add dialog)
      if (!staffId) {
        const staffResp = await staffApi.list({ pageSize: 500 });
        setStaffList(staffResp.staff);
      }
    } catch (error) {
      console.error('Error loading payroll data:', error);
    }
    setLoading(false);
  };

  const handleSavePayroll = async (data: CreatePayrollInput | UpdatePayrollInput) => {
    try {
      if (payrollDialog.entry) {
        await payrollApi.update(payrollDialog.entry.id, data as UpdatePayrollInput);
      } else {
        await payrollApi.create(data as CreatePayrollInput);
      }
      loadData();
      setPayrollDialog({ open: false, entry: null });
    } catch (error) {
      console.error('Error saving payroll:', error);
    }
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
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
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
                      {entry.staffName}
                    </TableCell>
                  )}
                  <TableCell>{entry.month} {entry.year}</TableCell>
                  <TableCell>₹{(entry.grossSalary ?? 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(entry.totalDeductions ?? 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(entry.netSalary ?? 0).toLocaleString()}</TableCell>
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
        staffList={staffList}
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
  staffList,
  defaultStaffId,
  onClose,
  onSave
}: {
  open: boolean;
  entry: PayrollRecordBasic | null;
  staffList: StaffBasic[];
  defaultStaffId?: string;
  onClose: () => void;
  onSave: (data: CreatePayrollInput | UpdatePayrollInput) => void;
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
      incomeTax: 0,
      other: 0
    },
    status: 'pending' as string
  });

  useEffect(() => {
    if (entry) {
      // Fetch full record to get allowance/deduction breakdown
      payrollApi.getById(entry.id).then(full => {
        setFormData({
          staffId: full.staffId,
          month: full.month,
          year: full.year,
          basicSalary: full.basicSalary ?? 0,
          allowances: {
            hra: full.allowances?.hra ?? 0,
            da: full.allowances?.da ?? 0,
            ta: full.allowances?.ta ?? 0,
            other: full.allowances?.other ?? 0,
          },
          deductions: {
            pf: full.deductions?.pf ?? 0,
            esi: full.deductions?.esi ?? 0,
            incomeTax: full.deductions?.incomeTax ?? 0,
            other: full.deductions?.other ?? 0,
          },
          status: full.status,
        });
      }).catch(() => {
        // Fallback to basic data if full fetch fails
        setFormData(prev => ({ ...prev, month: entry.month, year: entry.year, status: entry.status }));
      });
    } else {
      setFormData({
        staffId: defaultStaffId || '',
        month: '',
        year: new Date().getFullYear(),
        basicSalary: 0,
        allowances: { hra: 0, da: 0, ta: 0, other: 0 },
        deductions: { pf: 0, esi: 0, incomeTax: 0, other: 0 },
        status: 'pending'
      });
    }
  }, [entry, defaultStaffId]);

  const calculateSalary = () => {
    const { basicSalary, allowances, deductions } = formData;
    const totalAllowances = allowances.hra + allowances.da + allowances.ta + allowances.other;
    const totalDeductions = deductions.pf + deductions.esi + deductions.incomeTax + deductions.other;
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    return { grossSalary, netSalary };
  };

  const handleSave = () => {
    if (entry) {
      // Update: only send update-allowed fields
      const updateData: UpdatePayrollInput = {
        allowances: {
          hra: formData.allowances.hra,
          da: formData.allowances.da,
          ta: formData.allowances.ta,
          other: formData.allowances.other
        },
        deductions: {
          pf: formData.deductions.pf,
          esi: formData.deductions.esi,
          incomeTax: formData.deductions.incomeTax,
          other: formData.deductions.other
        },
        status: formData.status
      };
      onSave(updateData);
    } else {
      // Create: send all fields
      const createData: CreatePayrollInput = {
        staffId: formData.staffId,
        month: formData.month,
        year: formData.year,
        basicSalary: formData.basicSalary,
        allowances: {
          hra: formData.allowances.hra,
          da: formData.allowances.da,
          ta: formData.allowances.ta,
          other: formData.allowances.other
        },
        deductions: {
          pf: formData.deductions.pf,
          esi: formData.deductions.esi,
          incomeTax: formData.deductions.incomeTax,
          other: formData.deductions.other
        }
      };
      onSave(createData);
    }
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
                    {staffList.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name ?? `${member.firstName} ${member.lastName}`.trim()}
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
              } disabled={!!entry}>
                <SelectTrigger className={entry ? 'bg-muted text-muted-foreground' : ''}>
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
                disabled={!!entry}
                className={entry ? 'bg-muted text-muted-foreground' : ''}
              />
            </div>

            <div>
              <Label>Basic Salary</Label>
              <Input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
                disabled={!!entry}
                className={entry ? 'bg-muted text-muted-foreground' : ''}
              />
              {entry && <p className="text-xs text-muted-foreground mt-1">Basic salary cannot be changed after creation.</p>}
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
                  value={formData.deductions.incomeTax}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    deductions: { ...prev.deductions, incomeTax: parseFloat(e.target.value) || 0 }
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