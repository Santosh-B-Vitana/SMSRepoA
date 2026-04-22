import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Clock, User, Mail, Send, CheckCircle, XCircle, AlertCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockApi } from "@/services/mockApi";

interface StaffLeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export default function StaffCommunicationManager() {
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [parentMessages, setParentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showParentDialog, setShowParentDialog] = useState(false);
  const { toast } = useToast();

  const [leaveData, setLeaveData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    reason: ''
  });

  const [parentMessageData, setParentMessageData] = useState({
    studentId: '',
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate fetching staff leaves, students, and parent messages
        const [staffLeaves, allStudents, messages] = await Promise.all([
          mockApi.getStaffLeaveRequests(),
          mockApi.getStudents(),
          mockApi.getParentMessages('current-staff-id')
        ]);
        const currentStaffLeaves = staffLeaves.filter(l => l.staffId === 'STAFF001');
        setLeaves(currentStaffLeaves);
        setStudents(allStudents);
        setParentMessages(messages);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmitLeave = async () => {
    try {
      const newRequest = await mockApi.addStaffLeaveRequest({
        staffId: 'STAFF001',
        startDate: leaveData.startDate,
        endDate: leaveData.endDate || leaveData.startDate,
        days: leaveData.isHalfDay ? 0.5 : 1,
        isHalfDay: leaveData.isHalfDay,
        reason: leaveData.reason,
        status: 'pending'
      });
      setLeaves(prev => [...prev, newRequest]);
      setLeaveData({
        type: '',
        startDate: '',
        endDate: '',
        isHalfDay: false,
        reason: ''
      });
      setShowDialog(false);
      toast({
        title: "Success",
        description: "Leave request submitted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive"
      });
    }
  };

  const handleSendParentMessage = async () => {
    try {
      const newMessage = await mockApi.sendParentMessage({
        ...parentMessageData,
        staffId: 'current-staff-id',
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
      setParentMessages(prev => [...prev, newMessage]);
      setParentMessageData({
        studentId: '',
        subject: '',
        message: '',
        priority: 'medium'
      });
      setShowParentDialog(false);
      toast({
        title: "Success",
        description: "Message sent to parent successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Communication Center</h1>
          <p className="text-muted-foreground">Manage leave requests and parent communication</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leave Requests</p>
                <p className="text-2xl font-bold">{leaves.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Leaves</p>
                <p className="text-2xl font-bold">{leaves.filter(l => l.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parent Messages</p>
                <p className="text-2xl font-bold">{parentMessages.length}</p>
              </div>
              <Mail className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="parent-communication" className="w-full">
            <TabsList className="w-full flex">
              <TabsTrigger value="parent-communication">Parent Communication</TabsTrigger>
            </TabsList>

            <TabsContent value="parent-communication" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parent Communication</h3>
                <Dialog open={showParentDialog} onOpenChange={setShowParentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Send Message to Parent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Send Message to Parent</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="student-select">Select Student</Label>
                        <Select 
                          value={parentMessageData.studentId} 
                          onValueChange={(value) => setParentMessageData(prev => ({ ...prev, studentId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.class}-{student.section})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={parentMessageData.subject}
                          onChange={(e) => setParentMessageData(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Message subject"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={parentMessageData.message}
                          onChange={(e) => setParentMessageData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Write your message about the student's performance..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={parentMessageData.priority} 
                          onValueChange={(value) => setParentMessageData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      <Button variant="outline" onClick={() => setShowParentDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendParentMessage}>
                        Send Message
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {parentMessages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No parent messages sent yet.</p>
                ) : (
                  parentMessages.map((message) => (
                    <Card key={message.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{message.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              To: Parent of {students.find(s => s.id === message.studentId)?.name || 'Unknown Student'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              message.priority === 'high' ? 'destructive' :
                              message.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {message.priority}
                            </Badge>
                            <Badge variant={message.status === 'sent' ? 'default' : 'secondary'}>
                              {message.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-2">{message.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent on {new Date(message.sentAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}