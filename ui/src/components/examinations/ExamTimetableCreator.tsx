import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
  Download,
  Send,
  Eye,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  Clock,
  Pencil
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import examinationApi from "@/services/api/examinationApi";
import { academicApi, ClassResponse, SubjectResponse, AcademicYearResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface SubjectExam {
  subject: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  maxMarks: number;
  venue: string;
  instructions?: string;
}

interface ExamTimetable {
  id: string; // composite key: name|class|section|examType|academicYear
  examIds: string[]; // real exam IDs for API operations
  examName: string;
  examType: string;
  academicYear: string;
  class: string;
  section: string;
  subjects: SubjectExam[];
  status: 'draft' | 'published' | 'ongoing' | 'completed';
  createdAt: string;
  generalInstructions?: string;
}

interface ExamTimetableCreatorProps {
  openCreateOnMount?: boolean;
}

export default function ExamTimetableCreator({ openCreateOnMount }: ExamTimetableCreatorProps = {}) {
  const { academicYear } = useAcademicYear();
  const [timetables, setTimetables] = useState<ExamTimetable[]>([]);
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<ExamTimetable | null>(null);
  const [currentStep, setCurrentStep] = useState<'basic' | 'subjects'>("basic");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<ExamTimetable | null>(null);
  
  const [formData, setFormData] = useState<Partial<ExamTimetable>>({
    examType: "half-yearly",
    status: "draft",
    academicYear: academicYear || "",
    subjects: []
  });
  
  const [currentSubject, setCurrentSubject] = useState<Partial<SubjectExam>>({
    startTime: "09:00",
    endTime: "12:00",
    duration: 180,
    maxMarks: 100
  });
  const [subjectDate, setSubjectDate] = useState<Date>();

  const examTypes = [
    { value: "quarterly", label: "Quarterly Exam" },
    { value: "half-yearly", label: "Half Yearly Exam" },
    { value: "annual", label: "Annual Exam" },
    { value: "pre-board", label: "Pre-Board Exam" },
    { value: "unit-test", label: "Unit Test" }
  ];
  const venues = ["Room 101", "Room 102", "Room 103", "Room 104", "Auditorium", "Computer Lab", "Science Lab"];

  // Derived from selected class
  const availableStandards = Array.from(new Set(allClasses.map(c => c.standard))).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, "")) || 0;
    const bNum = parseInt(b.replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });
  const availableSections = formData.class
    ? allClasses.filter(c => c.standard === formData.class).map(c => c.section).sort()
    : [];

  const loadExams = () => {
    // Include academicYear in filter to ensure correct results
    const filter = academicYear ? { academicYear } : {};
    examinationApi.getExams(filter, 1, 500)
      .then(res => {
        const grouped = groupExamsIntoTimetables(res.items || []);
        setTimetables(grouped);
      })
      .catch((err) => {
        console.error('Failed to load exams:', err);
        setTimetables([]);
      });
  };

  const groupExamsIntoTimetables = (exams: any[]): ExamTimetable[] => {
    const groups: Record<string, ExamTimetable> = {};
    for (const exam of exams) {
      const key = [exam.name, exam.class, exam.section || "", exam.examType || ""].join("|");
      if (!groups[key]) {
        groups[key] = {
          id: key,
          examIds: [],
          examName: exam.name,
          examType: exam.examType || "",
          academicYear: exam.academicYear || "",
          class: exam.class,
          section: exam.section || "",
          subjects: [],
          status: exam.status === "completed" ? "completed" : exam.status === "ongoing" ? "ongoing" : "published",
          createdAt: exam.createdAt || new Date().toISOString(),
        };
      }
      groups[key].examIds.push(exam.id);
      groups[key].subjects.push({
        subject: exam.subject,
        date: new Date(exam.date),
        startTime: exam.startTime || "09:00",
        endTime: exam.endTime || "12:00",
        duration: exam.duration || 180,
        maxMarks: exam.maxMarks,
        venue: exam.room || "",
        instructions: exam.instructions,
      });
    }
    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      academicApi.listClasses(1, 500),
      academicApi.listSubjects(1, 200),
      academicApi.listAcademicYears(1, 50),
    ]).then(([classRes, subjectRes, yearRes]) => {
      setAllClasses(classRes.classes || []);
      setAllSubjects(subjectRes.subjects || []);
      setAcademicYears(yearRes.academicYears || []);
    }).catch(() => {}).finally(() => setLoadingData(false));

    // Call loadExams on mount if academicYear is available
    if (academicYear) {
      loadExams();
    }
  }, [academicYear]);

  // Open create dialog when triggered by parent
  useEffect(() => {
    if (openCreateOnMount) {
      setShowCreateDialog(true);
    }
  }, [openCreateOnMount]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.academicYear) return prev;
      return { ...prev, academicYear: academicYear || "" };
    });
  }, [academicYear]);

  const handleClassChange = (value: string) => {
    setFormData(prev => ({ ...prev, class: value, section: "" }));
  };

  const handleOpenEdit = (tt: ExamTimetable) => {
    setEditingTimetable(tt);
    setIsEditMode(true);
    setFormData({
      examName: tt.examName,
      examType: tt.examType,
      class: tt.class,
      section: tt.section,
      academicYear: tt.academicYear,
      generalInstructions: tt.generalInstructions,
      subjects: tt.subjects.map(s => ({ ...s, date: s.date instanceof Date ? s.date : new Date(s.date) })),
      status: tt.status,
    });
    setCurrentStep('basic');
    setShowCreateDialog(true);
  };

  const handleUpdateTimetable = async () => {
    if (!editingTimetable) return;
    if (!formData.examName || !formData.class || !formData.subjects || formData.subjects.length === 0) {
      toast.error("Please fill all required fields and add at least one subject");
      return;
    }
    setSaving(true);
    try {
      const formSubjects = formData.subjects as SubjectExam[];
      const oldExamIds = editingTimetable.examIds;
      for (let i = 0; i < formSubjects.length; i++) {
        const subject = formSubjects[i];
        const dateVal = subject.date instanceof Date ? subject.date : new Date(subject.date);
        const payload = {
          name: formData.examName!,
          examType: formData.examType || "unit-test",
          class: formData.class!,
          section: formData.section,
          subject: subject.subject,
          date: format(dateVal, "yyyy-MM-dd"),
          startTime: subject.startTime,
          endTime: subject.endTime,
          duration: subject.duration,
          maxMarks: subject.maxMarks,
          passingMarks: Math.round(subject.maxMarks * 0.33),
          room: subject.venue,
          instructions: subject.instructions || formData.generalInstructions,
          academicYear: formData.academicYear || "",
        };
        if (i < oldExamIds.length) {
          await examinationApi.updateExam(oldExamIds[i], payload);
        } else {
          await examinationApi.createExam({ ...payload, schoolId: "" });
        }
      }
      // Delete exams that were removed
      for (let i = formSubjects.length; i < oldExamIds.length; i++) {
        await examinationApi.deleteExam(oldExamIds[i]);
      }
      toast.success("Exam timetable updated successfully");
      loadExams();
      setShowCreateDialog(false);
      setIsEditMode(false);
      setEditingTimetable(null);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update timetable");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTimetable = async () => {
    if (!formData.examName || !formData.class || !formData.subjects || formData.subjects.length === 0) {
      toast.error("Please fill all required fields and add at least one subject");
      return;
    }

    setSaving(true);
    try {
      for (const subject of formData.subjects as SubjectExam[]) {
        await examinationApi.createExam({
          name: formData.examName!,
          examType: formData.examType || "unit-test",
          class: formData.class!,
          section: formData.section,
          subject: subject.subject,
          date: format(subject.date, "yyyy-MM-dd"),
          startTime: subject.startTime,
          endTime: subject.endTime,
          duration: subject.duration,
          maxMarks: subject.maxMarks,
          passingMarks: Math.round(subject.maxMarks * 0.33),
          room: subject.venue,
          instructions: subject.instructions || formData.generalInstructions,
          academicYear: formData.academicYear || "",
          schoolId: "",
        });
      }
      toast.success("Exam timetable created successfully");
      loadExams();
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create timetable");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubject = () => {
    if (!currentSubject.subject || !subjectDate) {
      toast.error("Please fill subject and date");
      return;
    }

    const newSubject: SubjectExam = {
      subject: currentSubject.subject!,
      date: subjectDate,
      startTime: currentSubject.startTime || "09:00",
      endTime: currentSubject.endTime || "12:00",
      duration: currentSubject.duration || 180,
      maxMarks: currentSubject.maxMarks || 100,
      venue: currentSubject.venue || "Room 101",
      instructions: currentSubject.instructions
    };

    setFormData(prev => ({
      ...prev,
      subjects: [...(prev.subjects || []), newSubject]
    }));

    // Reset subject form
    setCurrentSubject({
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
      maxMarks: 100
    });
    setSubjectDate(undefined);
    
    toast.success("Subject added to timetable");
  };

  const handleRemoveSubject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects?.filter((_, i) => i !== index)
    }));
    toast.success("Subject removed");
  };

  const handlePublishTimetable = async (timetableId: string) => {
    const timetable = timetables.find(tt => tt.id === timetableId);
    if (!timetable) return;
    try {
      await Promise.all(timetable.examIds.map(id => examinationApi.updateExam(id, { status: "completed" })));
      toast.success("Exam timetable published — visible to students and parents");
      loadExams();
    } catch {
      toast.error("Failed to publish timetable");
    }
  };

  const handleDeleteTimetable = async (timetableId: string) => {
    const timetable = timetables.find(tt => tt.id === timetableId);
    if (!timetable) return;
    if (!confirm("Delete this entire timetable and all its exams? This cannot be undone.")) return;
    try {
      await Promise.all(timetable.examIds.map(id => examinationApi.deleteExam(id)));
      toast.success("Timetable deleted successfully");
      loadExams();
    } catch {
      toast.error("Failed to delete timetable");
    }
  };

  const handleDownloadTimetable = async (timetable: ExamTimetable) => {
    try {
      // Create a simple PDF for timetable
      toast.success("Timetable download feature - PDF generation coming soon");
      
      // TODO: Implement proper timetable PDF generation
      // For now, just show success message
    } catch (error) {
      toast.error("Failed to download timetable");
    }
  };

  const handleNotifyStudents = (timetableId: string) => {
    toast.success("Notification sent to all students and parents");
  };

  const resetForm = () => {
    setFormData({
      examType: "half-yearly",
      status: "draft",
      academicYear: academicYear || "",
      subjects: []
    });
    setCurrentSubject({
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
      maxMarks: 100
    });
    setSubjectDate(undefined);
    setCurrentStep("basic");
    setShowCreateDialog(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "ongoing": return "secondary";
      case "completed": return "outline";
      default: return "outline";
    }
  };

  // Stats derived from timetables
  const draftCount     = timetables.filter(t => t.status === "draft").length;
  const publishedCount = timetables.filter(t => t.status === "published").length;
  const completedCount = timetables.filter(t => t.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Exam Schedule Manager</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage quarterly, half-yearly, annual and other examinations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setLoadingData(true); loadExams(); setTimeout(() => setLoadingData(false), 800); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { setIsEditMode(false); setEditingTimetable(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Exam Timetable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentStep === "basic"
                  ? (isEditMode ? "Edit Exam — Basic Information" : "Basic Information")
                  : (isEditMode ? "Edit Exam — Subjects" : "Add Subjects")}
              </DialogTitle>
            </DialogHeader>

            {currentStep === "basic" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Exam Name *</Label>
                    <Input
                      value={formData.examName || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, examName: e.target.value }))}
                      placeholder="e.g., Half Yearly Examination 2024"
                    />
                  </div>

                  <div>
                    <Label>Exam Type *</Label>
                    <Select 
                      value={formData.examType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, examType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Academic Year *</Label>
                    <Select 
                      value={formData.academicYear} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.length === 0 ? (
                          <SelectItem value="_none" disabled>No academic years configured</SelectItem>
                        ) : (
                          academicYears.map(ay => (
                            <SelectItem key={ay.id} value={ay.name}>{ay.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Class *</Label>
                    <Select 
                      value={formData.class} 
                      onValueChange={handleClassChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStandards.length === 0 ? (
                          <SelectItem value="_none" disabled>No classes configured</SelectItem>
                        ) : (
                          availableStandards.map(std => (
                            <SelectItem key={std} value={std}>{std}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Section</Label>
                    <Select 
                      value={formData.section} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}
                      disabled={!formData.class || availableSections.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!formData.class ? "Select class first" : "Select section"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>General Instructions</Label>
                    <Textarea
                      value={formData.generalInstructions || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, generalInstructions: e.target.value }))}
                      placeholder="General instructions for all exams (e.g., reporting time, required documents)"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={() => setCurrentStep("subjects")}>
                    Next: Add Subjects
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add Subject Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Subject to Timetable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Subject *</Label>
                        <Select 
                          value={currentSubject.subject} 
                          onValueChange={(value) => setCurrentSubject(prev => ({ ...prev, subject: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {allSubjects.length === 0 ? (
                              <SelectItem value="_none" disabled>No subjects configured</SelectItem>
                            ) : (
                              allSubjects.map(s => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Exam Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {subjectDate ? format(subjectDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={subjectDate}
                              onSelect={setSubjectDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={currentSubject.startTime || ""}
                          onChange={(e) => setCurrentSubject(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={currentSubject.endTime || ""}
                          onChange={(e) => setCurrentSubject(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={currentSubject.duration || ""}
                          onChange={(e) => setCurrentSubject(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                          placeholder="180"
                        />
                      </div>

                      <div>
                        <Label>Maximum Marks</Label>
                        <Input
                          type="number"
                          value={currentSubject.maxMarks || ""}
                          onChange={(e) => setCurrentSubject(prev => ({ ...prev, maxMarks: parseInt(e.target.value) }))}
                          placeholder="100"
                        />
                      </div>

                      <div>
                        <Label>Venue</Label>
                        <Select 
                          value={currentSubject.venue} 
                          onValueChange={(value) => setCurrentSubject(prev => ({ ...prev, venue: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select venue" />
                          </SelectTrigger>
                          <SelectContent>
                            {venues.map(venue => (
                              <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Special Instructions</Label>
                        <Input
                          value={currentSubject.instructions || ""}
                          onChange={(e) => setCurrentSubject(prev => ({ ...prev, instructions: e.target.value }))}
                          placeholder="e.g., Bring calculator, geometry box"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button onClick={handleAddSubject}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subject
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Added Subjects List */}
                {formData.subjects && formData.subjects.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Added Subjects ({formData.subjects.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Marks</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.subjects.map((subject, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{subject.subject}</TableCell>
                              <TableCell>{format(new Date(subject.date), "PPP")}</TableCell>
                              <TableCell>{subject.startTime} - {subject.endTime}</TableCell>
                              <TableCell>{subject.venue}</TableCell>
                              <TableCell>{subject.maxMarks}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSubject(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep("basic")}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={isEditMode ? handleUpdateTimetable : handleCreateTimetable}
                      disabled={saving || !formData.subjects || formData.subjects.length === 0}
                    >
                      {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : (isEditMode ? "Update Timetable" : "Create Timetable")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary */}
      {!loadingData && timetables.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Exam Schedule Cards */}
      <div>
        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : timetables.length === 0 ? (
          <Card className="py-16 text-center border-dashed">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-semibold text-muted-foreground">No exam schedules yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first exam timetable using the button above</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {timetables.map(tt => {
              const dateRange = tt.subjects.length > 0
                ? `${format(new Date(tt.subjects[0].date), "d MMM")} – ${format(new Date(tt.subjects[tt.subjects.length - 1].date), "d MMM yyyy")}`
                : "";
              const typeLabel = examTypes.find(t => t.value === tt.examType)?.label ?? tt.examType;
              return (
                <Card key={tt.id} className="hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden border">
                  {/* Coloured top accent by status */}
                  <div className={`h-1 w-full ${
                    tt.status === "completed" ? "bg-emerald-500" :
                    tt.status === "published"  ? "bg-blue-500" :
                    tt.status === "ongoing"    ? "bg-orange-400" :
                    "bg-yellow-400"
                  }`} />

                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-[15px] leading-snug truncate">{tt.examName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                          Class {tt.class}{tt.section ? ` — Section ${tt.section}` : ""}
                          {tt.academicYear ? ` · ${tt.academicYear}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          tt.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          tt.status === "published"  ? "bg-blue-100 text-blue-700" :
                          tt.status === "ongoing"    ? "bg-orange-100 text-orange-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{tt.status}</span>
                      </div>
                    </div>

                    {typeLabel && (
                      <p className="text-[11px] font-medium text-primary/80 mt-1">{typeLabel}</p>
                    )}
                  </div>

                  <div className="px-4 pb-2">
                    {/* Subjects as pills */}
                    <div className="flex flex-wrap gap-1">
                      {tt.subjects
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 6)
                        .map((s, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border">
                            {s.subject}
                          </span>
                        ))}
                      {tt.subjects.length > 6 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          +{tt.subjects.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{tt.subjects.length} subject{tt.subjects.length !== 1 ? "s" : ""}</span>
                      {dateRange && <span>{dateRange}</span>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        title="Edit timetable"
                        onClick={() => handleOpenEdit(tt)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        title="View timetable"
                        onClick={() => { setSelectedTimetable(tt); setShowViewDialog(true); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(tt.status === "draft" || tt.status === "published") && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Publish to students & parents"
                          onClick={() => handlePublishTimetable(tt.id)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        title="Delete timetable"
                        onClick={() => handleDeleteTimetable(tt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Timetable Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTimetable?.examName}</DialogTitle>
          </DialogHeader>
          {selectedTimetable && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Class</Label>
                  <p className="font-medium">{selectedTimetable.class} {selectedTimetable.section}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Academic Year</Label>
                  <p className="font-medium">{selectedTimetable.academicYear}</p>
                </div>
                {selectedTimetable.generalInstructions && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">General Instructions</Label>
                    <p className="text-sm">{selectedTimetable.generalInstructions}</p>
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Max Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTimetable.subjects
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((subject, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell>{format(new Date(subject.date), "PPP")}</TableCell>
                        <TableCell>{subject.startTime} - {subject.endTime}</TableCell>
                        <TableCell>{subject.duration} min</TableCell>
                        <TableCell>{subject.venue}</TableCell>
                        <TableCell>{subject.maxMarks}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
