
import { useState } from "react";
import { Clock, Plus, Edit, Trash2, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Period {
  id: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

interface DaySchedule {
  day: string;
  periods: Period[];
}

const timeSlots = [
  "8:00-8:45", "8:45-9:30", "9:30-10:15", 
  "10:30-11:15", "11:15-12:00", "12:00-12:45",
  "1:30-2:15", "2:15-3:00", "3:00-3:45"
];

const subjects = [
  "Mathematics", "English", "Science", "History", "Geography",
  "Hindi", "Physical Education", "Art", "Music", "Computer Science"
];

const teachers = [
  "Anil Kumar", "Priya Singh", "Dr. Rajesh Sharma", "Rohan Mehra", 
  "Suresh Gupta", "Meena Yadav", "Rekha Sharma", "Aarav Gupta"
];

const rooms = [
  "Room 101", "Room 102", "Room 103", "Lab 1", "Lab 2", 
  "Gym", "Art Room", "Music Room", "Computer Lab"
];

const mockTimetable: DaySchedule[] = [
  {
    day: 'Monday',
    periods: [
  { id: '1', time: '8:00-8:45', subject: 'Mathematics', teacher: 'Anil Kumar', room: 'Room 101' },
  { id: '2', time: '8:45-9:30', subject: 'English', teacher: 'Priya Singh', room: 'Room 102' },
      { id: '3', time: '9:30-10:15', subject: 'Science', teacher: 'Dr. Smith', room: 'Lab 1' },
      { id: '4', time: '10:30-11:15', subject: 'History', teacher: 'John Davis', room: 'Room 103' },
  { id: '5', time: '11:15-12:00', subject: 'Physical Education', teacher: 'Suresh Gupta', room: 'Gym' },
    ]
  },
  {
    day: 'Tuesday',
    periods: [
  { id: '6', time: '8:00-8:45', subject: 'English', teacher: 'Priya Singh', room: 'Room 102' },
  { id: '7', time: '8:45-9:30', subject: 'Mathematics', teacher: 'Anil Kumar', room: 'Room 101' },
  { id: '8', time: '9:30-10:15', subject: 'Hindi', teacher: 'Meena Yadav', room: 'Room 104' },
      { id: '9', time: '10:30-11:15', subject: 'Science', teacher: 'Dr. Smith', room: 'Lab 1' },
      { id: '10', time: '11:15-12:00', subject: 'Art', teacher: 'Lisa Chen', room: 'Art Room' },
    ]
  }
];

export function TimetableManager() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [timetable, setTimetable] = useState<DaySchedule[]>(mockTimetable);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    time: "",
    subject: "",
    teacher: "",
    room: "",
    day: ""
  });
  const { toast } = useToast();

  const handleSavePeriod = () => {
    if (!newPeriod.time || !newPeriod.subject || !newPeriod.teacher || !newPeriod.room || !newPeriod.day) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const period: Period = {
      id: editingPeriod?.id || Date.now().toString(),
      time: newPeriod.time,
      subject: newPeriod.subject,
      teacher: newPeriod.teacher,
      room: newPeriod.room
    };

    setTimetable(prev => prev.map(daySchedule => {
      if (daySchedule.day === newPeriod.day) {
        if (editingPeriod) {
          return {
            ...daySchedule,
            periods: daySchedule.periods.map(p => p.id === editingPeriod.id ? period : p)
          };
        } else {
          return {
            ...daySchedule,
            periods: [...daySchedule.periods, period].sort((a, b) => a.time.localeCompare(b.time))
          };
        }
      }
      return daySchedule;
    }));

    setShowPeriodDialog(false);
    setEditingPeriod(null);
    setNewPeriod({ time: "", subject: "", teacher: "", room: "", day: "" });
    
    toast({
      title: "Success",
      description: editingPeriod ? "Period updated successfully" : "Period added successfully"
    });
  };

  const handleEditPeriod = (period: Period, day: string) => {
    setEditingPeriod(period);
    setNewPeriod({
      time: period.time,
      subject: period.subject,
      teacher: period.teacher,
      room: period.room,
      day: day
    });
    setShowPeriodDialog(true);
  };

  const handleDeletePeriod = (periodId: string, day: string) => {
    setTimetable(prev => prev.map(daySchedule => {
      if (daySchedule.day === day) {
        return {
          ...daySchedule,
          periods: daySchedule.periods.filter(p => p.id !== periodId)
        };
      }
      return daySchedule;
    }));

    toast({
      title: "Success",
      description: "Period deleted successfully"
    });
  };

  const handleAddPeriod = () => {
    setEditingPeriod(null);
    setNewPeriod({ time: "", subject: "", teacher: "", room: "", day: "" });
    setShowPeriodDialog(true);
  };

  const copyTimetable = () => {
    toast({
      title: "Success",
      description: "Timetable copied to clipboard"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and periods</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyTimetable}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Timetable
          </Button>
          <Button onClick={handleAddPeriod}>
            <Plus className="h-4 w-4 mr-2" />
            Add Period
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Class Timetable
          </CardTitle>
          <div className="flex gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>Class {i+1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C', 'D'].map(section => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedClass && selectedSection ? (
            <Tabs defaultValue="weekly">
              <TabsList>
                <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                <TabsTrigger value="daily">Daily View</TabsTrigger>
                <TabsTrigger value="teacher">Teacher View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="weekly" className="space-y-6">
                {timetable.map((daySchedule, dayIndex) => (
                  <Card key={dayIndex}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {daySchedule.day}
                        <Badge variant="outline">{daySchedule.periods.length} periods</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {daySchedule.periods.map((period) => (
                            <TableRow key={period.id}>
                              <TableCell>
                                <Badge variant="outline">{period.time}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{period.subject}</TableCell>
                              <TableCell>{period.teacher}</TableCell>
                              <TableCell>{period.room}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditPeriod(period, daySchedule.day)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeletePeriod(period.id, daySchedule.day)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="daily">
                <div className="space-y-4">
                  <div className="flex gap-4 items-center">
                    <Input type="date" className="w-48" defaultValue={new Date().toISOString().split('T')[0]} />
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class-10-a">Class 10-A</SelectItem>
                        <SelectItem value="class-10-b">Class 10-B</SelectItem>
                        <SelectItem value="class-9-a">Class 9-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Today's Schedule - Class 10-A</h3>
                      <div className="space-y-3">
                        {[
                          { time: "9:00-10:00", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101" },
                          { time: "10:00-11:00", subject: "English", teacher: "Ms. Johnson", room: "Room 102" },
                          { time: "11:00-11:15", subject: "Break", teacher: "-", room: "-" },
                          { time: "11:15-12:15", subject: "Science", teacher: "Dr. Wilson", room: "Lab 1" },
                          { time: "12:15-1:15", subject: "History", teacher: "Mr. Brown", room: "Room 103" },
                        ].map((period, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="font-medium">{period.time}</div>
                            <div className="flex-1 mx-4">{period.subject}</div>
                            <div className="text-muted-foreground">{period.teacher}</div>
                            <div className="text-muted-foreground ml-4">{period.room}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="teacher">
                <div className="space-y-4">
                  <div className="flex gap-4 items-center">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher-smith">Mr. Smith (Math)</SelectItem>
                        <SelectItem value="teacher-johnson">Ms. Johnson (English)</SelectItem>
                        <SelectItem value="teacher-wilson">Dr. Wilson (Science)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>View Schedule</Button>
                  </div>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Mr. Smith - Weekly Schedule</h3>
                      <div className="grid grid-cols-6 gap-4">
                        <div className="font-semibold">Time</div>
                        <div className="font-semibold">Monday</div>
                        <div className="font-semibold">Tuesday</div>
                        <div className="font-semibold">Wednesday</div>
                        <div className="font-semibold">Thursday</div>
                        <div className="font-semibold">Friday</div>
                        
                        <div className="py-2">9:00-10:00</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 10A</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 10B</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 9A</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 9B</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Free</div>
                        
                        <div className="py-2">10:00-11:00</div>
                        <div className="p-2 bg-secondary/10 rounded text-sm">Free</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 8A</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 8B</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 10A</div>
                        <div className="p-2 bg-primary/10 rounded text-sm">Math - 10B</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Select class and section to view timetable
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Period Dialog */}
      <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Edit Period' : 'Add New Period'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Day</label>
              <Select value={newPeriod.day} onValueChange={(value) => 
                setNewPeriod(prev => ({ ...prev, day: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Time Slot</label>
              <Select value={newPeriod.time} onValueChange={(value) => 
                setNewPeriod(prev => ({ ...prev, time: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Select value={newPeriod.subject} onValueChange={(value) => 
                setNewPeriod(prev => ({ ...prev, subject: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Teacher</label>
              <Select value={newPeriod.teacher} onValueChange={(value) => 
                setNewPeriod(prev => ({ ...prev, teacher: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Room</label>
              <Select value={newPeriod.room} onValueChange={(value) => 
                setNewPeriod(prev => ({ ...prev, room: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSavePeriod}>
                <Save className="h-4 w-4 mr-2" />
                {editingPeriod ? 'Update' : 'Add'} Period
              </Button>
              <Button variant="outline" onClick={() => setShowPeriodDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
