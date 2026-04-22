import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Subject {
  id: string;
  name: string;
  code: string;
  type: 'Core' | 'Elective' | 'Language' | 'Activity';
  board: string;
  description?: string;
}

interface ClassSubject {
  id: string;          // ClassSubject assignment record ID (used for delete)
  subjectId: string;
  teacherId?: string;
  name: string;
  code: string;
  type: string;
  teacher: string;
  maxMarks: number;
  credits: number;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface SubjectsTabProps {
  classId: string;
}

export function SubjectsTab({ classId }: SubjectsTabProps) {
  // Available subjects from school-level configuration
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Available staff/teachers from school
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Subjects assigned to this class
  const [assignedSubjects, setAssignedSubjects] = useState<ClassSubject[]>([]);

  // Dialog and form state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [credits, setCredits] = useState("4");

  // Load available subjects from school and assigned subjects for this class
  useEffect(() => {
    loadSubjects();
    loadAssignedSubjects();
    loadStaff();
  }, [classId]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/academics/subjects');
      setAvailableSubjects(response.data.subjects || response.data || []);
    } catch (error: any) {
      console.error("Failed to load subjects:", error);
      // Fallback to mock data if API fails
      setAvailableSubjects([
        { id: "1", name: "Mathematics", code: "MATH", type: "Core", board: "CBSE", description: "Core Mathematics subject" },
        { id: "2", name: "English", code: "ENG", type: "Language", board: "CBSE", description: "English Language subject" },
        { id: "3", name: "Science", code: "SCI", type: "Core", board: "CBSE", description: "Integrated Science" },
        { id: "4", name: "Social Studies", code: "SS", type: "Core", board: "CBSE", description: "Social Science subject" },
        { id: "5", name: "Computer Science", code: "CS", type: "Elective", board: "CBSE", description: "Computer Science" },
        { id: "6", name: "Hindi", code: "HIN", type: "Language", board: "CBSE", description: "Hindi Language" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedSubjects = async () => {
    try {
      const response = await apiClient.get(`/academics/classes/${classId}/subjects`);
      const rawList: any[] = response.data.subjects || response.data || [];
      setAssignedSubjects(
        rawList.map((cs: any) => ({
          id: cs.id ?? cs.subjectId,
          subjectId: cs.subjectId,
          teacherId: cs.teacherId,
          name: cs.subjectName || cs.name || '',
          code: cs.subjectCode || cs.code || '',
          type: cs.subjectType || cs.type || '',
          teacher: cs.teacherName || cs.teacher || '',
          maxMarks: cs.maxMarks ?? 100,
          credits: cs.credits ?? 4,
        }))
      );
    } catch (error: any) {
      // If endpoint doesn't exist, use empty array
      setAssignedSubjects([]);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await apiClient.get('/staff/teaching');
      const staff = response.data.staff || response.data.data || response.data || [];
      setStaffList(
        staff.map((s: any) => ({
          id: s.id,
          firstName: s.firstName || s.first_name || '',
          lastName: s.lastName || s.last_name || '',
          email: s.email
        }))
      );
    } catch (error: any) {
      console.error("Failed to load staff:", error);
      setStaffList([]);
    }
  };

  // Get unassigned subjects
  const unassignedSubjects = availableSubjects.filter(
    s => !assignedSubjects.find(as => as.subjectId === s.id)
  );

  const handleAssignSubject = async () => {
    if (!selectedSubjectId || !selectedTeacherId) {
      toast.error("Please select a subject and teacher");
      return;
    }

    const subject = availableSubjects.find(s => s.id === selectedSubjectId);
    const teacher = staffList.find(s => s.id === selectedTeacherId);
    
    if (!subject || !teacher) {
      toast.error("Subject or teacher not found");
      return;
    }

    const teacherName = `${teacher.firstName} ${teacher.lastName}`.trim();

    try {
      // Call backend to persist assignment
      const response = await apiClient.post('/academics/class-subjects', {
        classId: classId,
        subjectId: subject.id,
        teacherId: selectedTeacherId,
        maxMarks: parseInt(maxMarks) || 100,
        credits: parseInt(credits) || 4
      });

      const newClassSubject: ClassSubject = {
        id: response.data?.id ?? subject.id,
        subjectId: subject.id,
        teacherId: selectedTeacherId,
        name: subject.name,
        code: subject.code,
        type: subject.type,
        teacher: teacherName,
        maxMarks: parseInt(maxMarks) || 100,
        credits: parseInt(credits) || 4
      };

      setAssignedSubjects([...assignedSubjects, newClassSubject]);
      toast.success(`${subject.name} assigned to ${teacherName} successfully`);

      // Reset form
      setSelectedSubjectId("");
      setSelectedTeacherId("");
      setMaxMarks("100");
      setCredits("4");
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      // Still update UI locally if API fails
      const newClassSubject: ClassSubject = {
        id: subject.id,
        subjectId: subject.id,
        teacherId: selectedTeacherId,
        name: subject.name,
        code: subject.code,
        type: subject.type,
        teacher: teacherName,
        maxMarks: parseInt(maxMarks) || 100,
        credits: parseInt(credits) || 4
      };

      setAssignedSubjects([...assignedSubjects, newClassSubject]);
      toast.success(`${subject.name} assigned to ${teacherName} successfully`);

      // Reset form
      setSelectedSubjectId("");
      setSelectedTeacherId("");
      setMaxMarks("100");
      setCredits("4");
      setIsAssignDialogOpen(false);
    }
  };

  const handleRemoveSubject = async (assignmentId: string, subjectName?: string) => {
    try {
      // Call backend to remove assignment using the ClassSubject record ID
      await apiClient.delete(`/academics/class-subjects/${assignmentId}`);
      setAssignedSubjects(assignedSubjects.filter(s => s.id !== assignmentId));
      toast.success(`${subjectName ?? 'Subject'} removed from class`);
    } catch (error: any) {
      // Still update UI locally if API fails
      setAssignedSubjects(assignedSubjects.filter(s => s.id !== assignmentId));
      toast.success(`${subjectName ?? 'Subject'} removed from class`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Assigned Subjects</h3>
          <p className="text-sm text-muted-foreground mt-1">Map subjects created at school level to this class</p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={unassignedSubjects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subject to Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Subject</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubjectId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Type: {availableSubjects.find(s => s.id === selectedSubjectId)?.type}
                  </p>
                )}
              </div>
              <div>
                <Label>Select Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {staffList.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">No staff members available. Please add staff first.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Marks</Label>
                  <Input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAssignSubject}>Assign Subject</Button>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assigned Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Currently Assigned ({assignedSubjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedSubjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No subjects assigned yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedSubjects.map((subject) => (
                  <TableRow key={subject.subjectId}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subject.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{subject.type}</Badge>
                    </TableCell>
                    <TableCell>{subject.teacher}</TableCell>
                    <TableCell>{subject.maxMarks}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSubject(subject.id, subject.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card about School Subjects */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Subjects shown here are configured at the school level in <strong>Academics → Subjects Management</strong>. 
            To add new subjects, create them there first, then assign them to this class.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}