import { useState } from 'react';
import { Calendar, Clock, Check, AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function StaffLeaveManagerEnhanced() {
  const [leaves, setLeaves] = useState([
    {
      id: 1,
      type: 'Casual Leave',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      days: 3,
      status: 'pending',
      reason: 'Personal work',
      appliedOn: '2026-05-01'
    },
    {
      id: 2,
      type: 'Sick Leave',
      startDate: '2026-04-28',
      endDate: '2026-04-29',
      days: 2,
      status: 'approved',
      reason: 'Medical appointment',
      appliedOn: '2026-04-26'
    }
  ]);

  const leaveBalance = {
    casual: { allocated: 12, used: 2, pending: 3, remaining: 7 },
    sick: { allocated: 10, used: 2, pending: 0, remaining: 8 },
    earned: { allocated: 5, used: 0, pending: 0, remaining: 5 }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(leaveBalance).map(([type, balance]) => (
          <Card key={type} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold capitalize text-foreground">{type} Leave</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{balance.remaining} days</p>
                </div>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Allocated</span>
                  <span className="font-semibold">{balance.allocated} days</span>
                </div>
                <Progress value={(balance.used / balance.allocated) * 100} className="h-1.5" />
                <div className="flex justify-between">
                  <span>Used: {balance.used}</span>
                  <span>Pending: {balance.pending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Apply Leave Button */}
      <Button className="w-full md:w-auto gap-2">
        <Plus className="w-4 h-4" />
        Apply for Leave
      </Button>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leaves applied yet</p>
            ) : (
              <div className="space-y-3">
                {leaves.map(leave => (
                  <div key={leave.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{leave.type}</p>
                        <Badge className={`text-xs ${getStatusColor(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{leave.startDate} to {leave.endDate}</p>
                      <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{leave.days} days</p>
                      <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
