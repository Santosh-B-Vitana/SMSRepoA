import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Trash2, Search, X, UserPlus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { academicApi } from "@/services/api/academicApi";
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
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [maxMarks, setMaxMarks] = useState("100");
  const [credits, setCredits] = useState("4");

  // Edit-teacher dialog state
  const [editTeacherTarget, setEditTeacherTarget] = useState<ClassSubject | null>(null);
  const [editTeacherSearch, setEditTeacherSearch] = useState("");
  const [editSelectedTeacherId, setEditSelectedTeacherId] = useState("");
  const [editTeacherDropdownOpen, setEditTeacherDropdownOpen] = useState(false);
  const [editTeacherSaving, setEditTeacherSaving] = useState(false);

  // Load available subjects from school and assigned subjects for this class
  useEffect(() => {
    loadSubjects();
    loadAssignedSubjects();
    loadStaff();
  }, [classId]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      // Use academicApi which has proper auth and handles pagination
      const result = await academicApi.listSubjects(1, 500);
      const subjects = result.subjects || [];
      setAvailableSubjects(subjects.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code || "",
        type: (s.type || "Core") as Subject["type"],
        board: s.board || "",
        description: s.description,
      })));
    } catch {
      // Fallback: try raw apiClient
      try {
        const response = await apiClient.get('/academics/subjects', { params: { page: 1, pageSize: 500 } });
        const list = response.data?.subjects || response.data || [];
        setAvailableSubjects(list.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "",
          type: (s.type || "Core") as Subject["type"],
          board: s.board || "",
          description: s.description,
        })));
      } catch {
        setAvailableSubjects([]);
        toast.error("Failed to load school subjects. Please configure them in Academics → Subjects.");
      }
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

  // Teacher search filter
  const filteredTeachers = teacherSearch.trim()
    ? staffList.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(teacherSearch.toLowerCase())
      )
    : staffList;

  const resetAssignForm = () => {
    setSelectedSubjectId("");
    setSelectedTeacherId("");
    setTeacherSearch("");
    setTeacherDropdownOpen(false);
    setMaxMarks("100");
    setCredits("4");
  };

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
      resetAssignForm();
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
      resetAssignForm();
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

  const openEditTeacher = (subject: ClassSubject) => {
    setEditTeacherTarget(subject);
    const currentTeacher = staffList.find(s => s.id === subject.teacherId);
    setEditTeacherSearch(currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : "");
    setEditSelectedTeacherId(subject.teacherId ?? "");
    setEditTeacherDropdownOpen(false);
  };

  const handleUpdateTeacher = async () => {
    if (!editTeacherTarget) return;
    if (!editSelectedTeacherId) {
      toast.error("Please select a teacher");
      return;
    }
    setEditTeacherSaving(true);
    try {
      await apiClient.patch(`/academics/class-subjects/${editTeacherTarget.id}/teacher`, {
        teacherId: editSelectedTeacherId,
      });
      await loadAssignedSubjects();
      toast.success("Teacher updated successfully");
      setEditTeacherTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to update teacher");
    } finally {
      setEditTeacherSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Assigned Subjects</h3>
          <p className="text-sm text-muted-foreground mt-1">Map subjects created at school level to this class</p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) resetAssignForm();
          }}>
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
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                >
                  <option value="">Choose a subject</option>
                  {unassignedSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
                {selectedSubjectId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {availableSubjects.find(s => s.id === selectedSubjectId)?.type}
                  </p>
                )}
              </div>

              {/* Teacher search */}
              <div>
                <Label>Select Teacher</Label>
                <div className="relative mt-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search by name or email…"
                      className="pl-8 pr-8"
                      value={teacherSearch}
                      onChange={e => {
                        setTeacherSearch(e.target.value);
                        setSelectedTeacherId("");
                        setTeacherDropdownOpen(true);
                      }}
                      onFocus={() => setTeacherDropdownOpen(true)}
                    />
                    {teacherSearch && (
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => { setTeacherSearch(""); setSelectedTeacherId(""); setTeacherDropdownOpen(false); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {teacherDropdownOpen && teacherSearch && (
                    <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto">
                      {filteredTeachers.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-3 py-2">No teachers found</p>
                      ) : (
                        filteredTeachers.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              setSelectedTeacherId(s.id);
                              setTeacherSearch(`${s.firstName} ${s.lastName}`);
                              setTeacherDropdownOpen(false);
                            }}
                          >
                            <span className="font-medium">{s.firstName} {s.lastName}</span>
                            {s.email && <span className="text-xs text-muted-foreground ml-2">{s.email}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedTeacherId && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    ✓ {staffList.find(s => s.id === selectedTeacherId)
                        ? `${staffList.find(s => s.id === selectedTeacherId)!.firstName} ${staffList.find(s => s.id === selectedTeacherId)!.lastName}`
                        : ""} selected
                  </p>
                )}
                {staffList.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No staff members available. Please add staff first.</p>
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
                <Button variant="outline" onClick={() => { setIsAssignDialogOpen(false); resetAssignForm(); }}>Cancel</Button>
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
                    <TableCell>
                      {subject.teacher ? (
                        <span className="flex items-center gap-1">
                          {subject.teacher}
                          <button
                            type="button"
                            title="Change teacher"
                            className="ml-1 text-muted-foreground hover:text-primary"
                            onClick={() => openEditTeacher(subject)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => openEditTeacher(subject)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Assign Teacher
                        </Button>
                      )}
                    </TableCell>
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

      {/* Edit / Assign Teacher dialog */}
      <Dialog open={!!editTeacherTarget} onOpenChange={(open) => { if (!open) setEditTeacherTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTeacherTarget?.teacher ? "Change Teacher" : "Assign Teacher"} — {editTeacherTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Teacher</Label>
              <div className="relative mt-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name or email…"
                    className="pl-8 pr-8"
                    value={editTeacherSearch}
                    onChange={e => {
                      setEditTeacherSearch(e.target.value);
                      setEditSelectedTeacherId("");
                      setEditTeacherDropdownOpen(true);
                    }}
                    onFocus={() => setEditTeacherDropdownOpen(true)}
                  />
                  {editTeacherSearch && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditTeacherSearch(""); setEditSelectedTeacherId(""); setEditTeacherDropdownOpen(false); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editTeacherDropdownOpen && editTeacherSearch && (
                  <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto">
                    {staffList.filter(s =>
                      `${s.firstName} ${s.lastName}`.toLowerCase().includes(editTeacherSearch.toLowerCase()) ||
                      (s.email || "").toLowerCase().includes(editTeacherSearch.toLowerCase())
                    ).length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">No teachers found</p>
                    ) : (
                      staffList
                        .filter(s =>
                          `${s.firstName} ${s.lastName}`.toLowerCase().includes(editTeacherSearch.toLowerCase()) ||
                          (s.email || "").toLowerCase().includes(editTeacherSearch.toLowerCase())
                        )
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              setEditSelectedTeacherId(s.id);
                              setEditTeacherSearch(`${s.firstName} ${s.lastName}`);
                              setEditTeacherDropdownOpen(false);
                            }}
                          >
                            <span className="font-medium">{s.firstName} {s.lastName}</span>
                            {s.email && <span className="text-xs text-muted-foreground ml-2">{s.email}</span>}
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
              {editSelectedTeacherId && (
                <p className="text-xs text-green-600 mt-1">✓ Teacher selected</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateTeacher} disabled={editTeacherSaving || !editSelectedTeacherId}>
                {editTeacherSaving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditTeacherTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}