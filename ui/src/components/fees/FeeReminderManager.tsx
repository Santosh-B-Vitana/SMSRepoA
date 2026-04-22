import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail, MessageSquare, Send, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  class: string;
  parentPhone: string;
  parentEmail: string;
  pendingAmount: number;
  dueDate: string;
  selected?: boolean;
}

export function FeeReminderManager() {
  const [selectedClass, setSelectedClass] = useState("all");
  const [reminderType, setReminderType] = useState<"sms" | "email" | "both">("both");
  const [reminderMessage, setReminderMessage] = useState(
    "Dear Parent, This is a reminder that school fees of Rs. {amount} for {studentName} are due on {dueDate}. Please make the payment at your earliest convenience. - Vitana Schools"
  );

  const [students, setStudents] = useState<Student[]>([
    {
      id: "STU001",
      name: "Aarav Gupta",
      class: "10-A",
      parentPhone: "+91-9876543210",
      parentEmail: "parent1@example.com",
      pendingAmount: 20000,
      dueDate: "2024-04-15",
      selected: false
    },
    {
      id: "STU002",
      name: "Rohan Mehra",
      class: "10-A",
      parentPhone: "+91-9876543211",
      parentEmail: "parent2@example.com",
      pendingAmount: 45000,
      dueDate: "2024-04-15",
      selected: false
    },
    {
      id: "STU003",
      name: "Priya Sharma",
      class: "9-B",
      parentPhone: "+91-9876543212",
      parentEmail: "parent3@example.com",
      pendingAmount: 15000,
      dueDate: "2024-04-10",
      selected: false
    }
  ]);

  const classes = ["all", "10-A", "9-B", "8-C"];

  const filteredStudents = students.filter(
    s => selectedClass === "all" || s.class === selectedClass
  ).filter(s => s.pendingAmount > 0);

  const toggleStudent = (id: string) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  };

  const toggleAll = () => {
    const allSelected = filteredStudents.every(s => s.selected);
    setStudents(prev => prev.map(s => ({
      ...s,
      selected: filteredStudents.find(fs => fs.id === s.id) ? !allSelected : s.selected
    })));
  };

  const sendReminders = () => {
    const selectedStudents = filteredStudents.filter(s => s.selected);
    
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    // Simulate sending reminders
    selectedStudents.forEach(student => {
      const message = reminderMessage
        .replace("{amount}", student.pendingAmount.toString())
        .replace("{studentName}", student.name)
        .replace("{dueDate}", new Date(student.dueDate).toLocaleDateString());

      console.log(`Sending ${reminderType} to ${student.name}:`, message);
    });

    toast.success(
      `Payment reminders sent to ${selectedStudents.length} parent(s) via ${reminderType.toUpperCase()}`
    );

    // Unselect all
    setStudents(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const scheduleReminders = () => {
    const selectedStudents = filteredStudents.filter(s => s.selected);
    
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    toast.success(
      `Auto-reminders scheduled for ${selectedStudents.length} student(s) - will send 3 days before due date`
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Fee Payment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter and Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Filter by Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      {cls === "all" ? "All Classes" : cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reminder Type</Label>
              <Select value={reminderType} onValueChange={(v: any) => setReminderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Only
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Only
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Both SMS & Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message Template */}
          <div>
            <Label>Message Template</Label>
            <textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full min-h-[100px] p-3 border rounded-md"
              placeholder="Customize your reminder message..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available variables: {"{amount}"}, {"{studentName}"}, {"{dueDate}"}
            </p>
          </div>

          {/* Student List */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => s.selected)}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Checkbox
                        checked={student.selected}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell className="text-red-600 font-medium">
                      ₹{student.pendingAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(student.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {reminderType === "email" || reminderType === "both" ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {student.parentEmail}
                        </div>
                      ) : null}
                      {reminderType === "sms" || reminderType === "both" ? (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {student.parentPhone}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {new Date(student.dueDate) < new Date() ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={sendReminders}>
              <Send className="h-4 w-4 mr-2" />
              Send Now ({filteredStudents.filter(s => s.selected).length} selected)
            </Button>
            <Button variant="outline" onClick={scheduleReminders}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Auto-Reminders
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">💡 Pro Tips:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Automated reminders will be sent 3 days before the due date</li>
              <li>• Both SMS and Email ensure maximum reach to parents</li>
              <li>• Customize message templates for different fee types</li>
              <li>• Track reminder history in the Reports section</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
