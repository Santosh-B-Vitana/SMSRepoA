import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  class: string;
  section: string;
  subject: string;
  room?: string;
}

interface ScheduleClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  currentSchedule: ScheduleEntry[];
  onSave: (schedule: ScheduleEntry[]) => void;
}

export function ScheduleClassDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  currentSchedule,
  onSave
}: ScheduleClassDialogProps) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(currentSchedule);
  const [newEntry, setNewEntry] = useState({
    day: "",
    startTime: "",
    endTime: "",
    class: "",
    section: "",
    subject: "",
    room: ""
  });
  const { toast } = useToast();

  // Mock data
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const classes = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sections = ["A", "B", "C", "D"];
  const subjects = [
    "Mathematics", "English", "Science", "Social Studies", "Hindi",
    "Physics", "Chemistry", "Biology", "Computer Science", "Physical Education"
  ];

  const handleAddEntry = () => {
    if (!newEntry.day || !newEntry.startTime || !newEntry.endTime || !newEntry.class || !newEntry.section || !newEntry.subject) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check for time conflicts
    const conflict = schedule.find(entry => 
      entry.day === newEntry.day &&
      ((newEntry.startTime >= entry.startTime && newEntry.startTime < entry.endTime) ||
       (newEntry.endTime > entry.startTime && newEntry.endTime <= entry.endTime) ||
       (newEntry.startTime <= entry.startTime && newEntry.endTime >= entry.endTime))
    );

    if (conflict) {
      toast({
        title: "Time Conflict",
        description: "This time slot conflicts with an existing schedule entry",
        variant: "destructive"
      });
      return;
    }

    const entry: ScheduleEntry = {
      id: `${newEntry.day}-${newEntry.startTime}-${newEntry.class}-${newEntry.section}`,
      ...newEntry
    };

    setSchedule(prev => [...prev, entry].sort((a, b) => {
      const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
      if (dayOrder !== 0) return dayOrder;
      return a.startTime.localeCompare(b.startTime);
    }));
    
    setNewEntry({
      day: "",
      startTime: "",
      endTime: "",
      class: "",
      section: "",
      subject: "",
      room: ""
    });
    
    toast({
      title: "Schedule Added",
      description: "Class schedule added successfully"
    });
  };

  const handleRemoveEntry = (id: string) => {
    setSchedule(prev => prev.filter(e => e.id !== id));
    toast({
      title: "Schedule Removed",
      description: "Class schedule removed successfully"
    });
  };

  const handleSave = () => {
    onSave(schedule);
    onOpenChange(false);
    toast({
      title: "Success",
      description: "Class schedule updated successfully"
    });
  };

  const getTimeSlotDisplay = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Classes for {staffName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Schedule Entry */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Add New Schedule Entry</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Day *</Label>
                  <Select 
                    value={newEntry.day} 
                    onValueChange={(value) => setNewEntry(prev => ({ ...prev, day: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={newEntry.startTime}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={newEntry.endTime}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Class *</Label>
                  <Select 
                    value={newEntry.class} 
                    onValueChange={(value) => setNewEntry(prev => ({ ...prev, class: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Section *</Label>
                  <Select 
                    value={newEntry.section} 
                    onValueChange={(value) => setNewEntry(prev => ({ ...prev, section: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>Section {section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Subject *</Label>
                  <Select 
                    value={newEntry.subject} 
                    onValueChange={(value) => setNewEntry(prev => ({ ...prev, subject: value }))}
                  >
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
                  <Label>Room (Optional)</Label>
                  <Input
                    placeholder="e.g. Room 101"
                    value={newEntry.room}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, room: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button onClick={handleAddEntry} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Schedule */}
          <div>
            <h3 className="font-medium mb-4">Current Schedule ({schedule.length} entries)</h3>
            {schedule.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No scheduled classes yet. Add some above.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {days.map(day => {
                  const daySchedule = schedule.filter(entry => entry.day === day);
                  if (daySchedule.length === 0) return null;
                  
                  return (
                    <Card key={day}>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 text-primary">{day}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {daySchedule.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {getTimeSlotDisplay(entry.startTime, entry.endTime)}
                                  </span>
                                </div>
                                <div className="text-sm">
                                  Class {entry.class}-{entry.section} • {entry.subject}
                                </div>
                                {entry.room && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.room}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEntry(entry.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}