import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, XCircle } from "lucide-react";

interface LeaveRequest {
  id: string;
  studentName: string;
  class: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export function LeaveManagementDialog() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "LR001",
      studentName: "Aarav Gupta",
      class: "10-A",
      fromDate: "2024-04-20",
      toDate: "2024-04-22",
      reason: "Medical reasons",
      status: "pending",
      submittedDate: "2024-04-15"
    },
    {
      id: "LR002",
      studentName: "Ananya Sharma",
      class: "9-B",
      fromDate: "2024-04-25",
      toDate: "2024-04-25",
      reason: "Family function",
      status: "approved",
      submittedDate: "2024-04-10"
    }
  ]);
  const { toast } = useToast();

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    setLeaveRequests(requests =>
      requests.map(req =>
        req.id === id ? { ...req, status } : req
      )
    );
    toast({
      title: "Success",
      description: `Leave request ${status}`
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Leave Management
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Student Leave Management</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>From Date</TableHead>
                <TableHead>To Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.studentName}</TableCell>
                  <TableCell>{request.class}</TableCell>
                  <TableCell>{request.fromDate}</TableCell>
                  <TableCell>{request.toDate}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(request.id, 'approved')}
                        >
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(request.id, 'rejected')}
                        >
                          <XCircle className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
