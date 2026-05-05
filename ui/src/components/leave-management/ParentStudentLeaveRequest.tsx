import { useState } from 'react';
import { Calendar, Upload, Bell, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function ParentStudentLeaveRequest() {
  const [children, setChildren] = useState([
    {
      id: 1,
      name: 'Arjun Sharma',
      rollNumber: '101',
      class: '10A',
      balance: { allocated: 15, used: 2, pending: 1, remaining: 12 }
    },
    {
      id: 2,
      name: 'Ananya Sharma',
      rollNumber: '205',
      class: '8B',
      balance: { allocated: 15, used: 0, pending: 0, remaining: 15 }
    }
  ]);

  const [requests, setRequests] = useState([
    {
      id: 1,
      studentName: 'Arjun Sharma',
      leaveType: 'Casual Leave',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      days: 3,
      status: 'pending',
      reason: 'Family function'
    }
  ]);

  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRequestLeave = (childId: number) => {
    setSelectedChild(childId);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-blue-900">Notification</p>
              <p className="text-xs text-blue-800 mt-1">Arjun's leave request is pending approval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Balance Cards */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Children's Leave Balance</p>
        {children.map(child => (
          <Card key={child.id} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm">{child.name}</p>
                  <p className="text-xs text-muted-foreground">Roll No: {child.rollNumber} | Class: {child.class}</p>
                </div>
                <Dialog open={isDialogOpen && selectedChild === child.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestLeave(child.id)}
                    >
                      Request Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Leave for {child.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium">Leave Type</label>
                        <select className="w-full px-3 py-2 border border-border rounded-md text-sm mt-1">
                          <option>Casual Leave</option>
                          <option>Medical Leave</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">From Date</label>
                        <Input type="date" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">To Date</label>
                        <Input type="date" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Reason</label>
                        <textarea
                          className="w-full px-3 py-2 border border-border rounded-md text-sm mt-1"
                          rows={3}
                          placeholder="Provide reason for leave..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Upload Document (optional)
                        </label>
                        <Input type="file" className="mt-1" />
                      </div>
                      <Button className="w-full">Submit Request</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{child.balance.allocated}</p>
                    <p className="text-muted-foreground">Allocated</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{child.balance.used}</p>
                    <p className="text-muted-foreground">Used</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{child.balance.pending}</p>
                    <p className="text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-green-600">{child.balance.remaining}</p>
                    <p className="text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leave requests yet</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{req.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.leaveType}</p>
                    <p className="text-xs text-muted-foreground">{req.startDate} to {req.endDate} ({req.days} days)</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
