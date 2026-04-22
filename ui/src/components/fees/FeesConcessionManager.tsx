import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Percent, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Concession {
  id: string;
  studentId: string;
  studentName: string;
  type: 'percentage' | 'fixed';
  value: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired';
}

export function FeesConcessionManager() {
  const [concessions, setConcessions] = useState<Concession[]>([
    {
      id: 'CON001',
      studentId: 'STU001',
      studentName: 'Aarav Sharma',
      type: 'percentage',
      value: 25,
      reason: 'Merit Scholarship',
      appliedBy: 'Principal',
      appliedDate: '2024-01-15',
      startDate: '2024-01-01',
      status: 'active'
    }
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    reason: '',
    startDate: '',
    endDate: ''
  });
  const { toast } = useToast();

  const handleSubmit = () => {
    const newConcession: Concession = {
      id: `CON${String(concessions.length + 1).padStart(3, '0')}`,
      studentId: formData.studentId,
      studentName: 'Student Name', // Would be fetched from API
      type: formData.type,
      value: Number(formData.value),
      reason: formData.reason,
      appliedBy: 'Admin',
      appliedDate: new Date().toISOString().split('T')[0],
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      status: 'active'
    };
    
    setConcessions([...concessions, newConcession]);
    setShowForm(false);
    setFormData({
      studentId: '',
      type: 'percentage',
      value: '',
      reason: '',
      startDate: '',
      endDate: ''
    });
    
    toast({
      title: "Success",
      description: "Concession added successfully"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fee Concessions & Discounts</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Concession
        </Button>
      </div>

      {/* Concession Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee Concession</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student ID</Label>
              <Input
                value={formData.studentId}
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                placeholder="Enter student ID"
              />
            </div>
            <div>
              <Label>Concession Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({...formData, type: value as 'percentage' | 'fixed'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}</Label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                placeholder={formData.type === 'percentage' ? '25' : '5000'}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Merit Scholarship, Sibling Discount, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Add Concession
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Concessions</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{concessions.filter(c => c.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Concession Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concessions.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.studentName}</TableCell>
                  <TableCell><Badge>{c.type}</Badge></TableCell>
                  <TableCell>{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</TableCell>
                  <TableCell>{c.reason}</TableCell>
                  <TableCell>{c.appliedDate}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
