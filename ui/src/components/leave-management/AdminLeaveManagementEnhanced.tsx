import { useState } from 'react';
import { Calendar, Filter, Check, X, AlertCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminLeaveManagementEnhanced() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      staffName: 'Suresh Nair',
      leaveType: 'Casual Leave',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      days: 3,
      reason: 'Personal work',
      status: 'pending',
      appliedOn: '2026-05-01'
    },
    {
      id: 2,
      staffName: 'Priya Singh',
      leaveType: 'Sick Leave',
      startDate: '2026-05-05',
      endDate: '2026-05-06',
      days: 2,
      reason: 'Medical appointment',
      status: 'approved',
      appliedOn: '2026-04-30',
      approvedBy: 'Admin',
      approvedOn: '2026-04-30'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = req.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleApprove = (id: number) => {
    setRequests(requests.map(req =>
      req.id === id ? { ...req, status: 'approved', approvedBy: 'You', approvedOn: new Date().toISOString().split('T')[0] } : req
    ));
  };

  const handleReject = (id: number) => {
    setRequests(requests.map(req =>
      req.id === id ? { ...req, status: 'rejected' } : req
    ));
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
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-md text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.staffName}</TableCell>
                      <TableCell className="text-sm">{req.leaveType}</TableCell>
                      <TableCell className="text-sm">{req.startDate} to {req.endDate}</TableCell>
                      <TableCell className="text-sm">{req.days} days</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleApprove(req.id)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600"
                              onClick={() => handleReject(req.id)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
