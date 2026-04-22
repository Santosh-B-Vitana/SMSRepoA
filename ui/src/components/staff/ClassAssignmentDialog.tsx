import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassAssignment {
  id: string;
  class: string;
  section: string;
  subject: string;
}

interface ClassAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  currentAssignments: ClassAssignment[];
  onSave: (assignments: ClassAssignment[]) => void;
}

export function ClassAssignmentDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  currentAssignments,
  onSave
}: ClassAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<ClassAssignment[]>(currentAssignments);
  const [newAssignment, setNewAssignment] = useState({
    class: "",
    section: "",
    subject: ""
  });
  const { toast } = useToast();

  // Mock data
  const classes = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sections = ["A", "B", "C", "D"];
  const subjects = [
    "Mathematics", "English", "Science", "Social Studies", "Hindi",
    "Physics", "Chemistry", "Biology", "Computer Science", "Physical Education"
  ];

  const handleAddAssignment = () => {
    if (!newAssignment.class || !newAssignment.section || !newAssignment.subject) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields to add a class assignment",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate assignment
    const duplicate = assignments.find(a => 
      a.class === newAssignment.class && 
      a.section === newAssignment.section && 
      a.subject === newAssignment.subject
    );

    if (duplicate) {
      toast({
        title: "Duplicate Assignment",
        description: "This class-section-subject combination is already assigned",
        variant: "destructive"
      });
      return;
    }

    const assignment: ClassAssignment = {
      id: `${newAssignment.class}-${newAssignment.section}-${newAssignment.subject}`,
      ...newAssignment
    };

    setAssignments(prev => [...prev, assignment]);
    setNewAssignment({ class: "", section: "", subject: "" });
    
    toast({
      title: "Assignment Added",
      description: "Class assignment added successfully"
    });
  };

  const handleRemoveAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Assignment Removed",
      description: "Class assignment removed successfully"
    });
  };

  const handleSave = () => {
    onSave(assignments);
    onOpenChange(false);
    toast({
      title: "Success",
      description: "Class assignments updated successfully"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Classes to {staffName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Assignment */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Add New Class Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select 
                    value={newAssignment.class} 
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, class: value }))}
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
                  <Label>Section</Label>
                  <Select 
                    value={newAssignment.section} 
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, section: value }))}
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
                  <Label>Subject</Label>
                  <Select 
                    value={newAssignment.subject} 
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, subject: value }))}
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
                
                <div className="flex items-end">
                  <Button onClick={handleAddAssignment} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <div>
            <h3 className="font-medium mb-4">Current Assignments ({assignments.length})</h3>
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No class assignments yet. Add some above.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="font-medium">
                            Class {assignment.class}-{assignment.section}
                          </div>
                          <Badge variant="outline">{assignment.subject}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Assignments
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}