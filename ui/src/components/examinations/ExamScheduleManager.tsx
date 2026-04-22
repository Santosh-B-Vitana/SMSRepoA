import { useState } from "react";
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
import { 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Trash2,
  Filter,
  Search,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Exam {
  id: string;
  name: string;
  academicYear: string;
  class: string;
  section: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  maxMarks: number;
  examType: 'midterm' | 'final' | 'unit-test' | 'internal';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  venue: string;
  instructions?: string;
}

interface ExamTimetable {
  id: string;
  academicYear: string;
  class: string;
  section: string;
  examType: string;
  exams: Exam[];
  publishedAt?: string;
  publishedBy?: string;
}

export default function ExamScheduleManager() {
  const [exams, setExams] = useState<Exam[]>([
    {
      id: "EX001",
      name: "Mathematics Midterm",
      academicYear: "2024-25",
      class: "Class 10",
      section: "A",
      subject: "Mathematics",
      date: "2024-03-15",
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
      maxMarks: 100,
      examType: "midterm",
      status: "scheduled",
      venue: "Room 101",
      instructions: "Bring calculator and geometry box"
    },
    {
      id: "EX002",
      name: "English Literature Final",
      academicYear: "2024-25",
      class: "Class 10",
      section: "A",
      subject: "English",
      date: "2024-03-20",
      startTime: "10:00",
      endTime: "13:00",
      duration: 180,
      maxMarks: 100,
      examType: "final",
      status: "scheduled",
      venue: "Room 102"
    }
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("2024-25");

  // Form state
  const [formData, setFormData] = useState<Partial<Exam>>({
    academicYear: "2024-25",
    examType: "midterm",
    status: "scheduled"
  });
  const [examDate, setExamDate] = useState<Date>();

  // Mock data
  const academicYears = ["2023-24", "2024-25", "2025-26"];
  const classes = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  const sections = ["A", "B", "C"];
  const subjects = ["Mathematics", "English", "Science", "Social Studies", "Hindi"];
  const examTypes = ["midterm", "final", "unit-test", "internal"];
  const venues = ["Room 101", "Room 102", "Room 103", "Auditorium", "Computer Lab"];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === "all" || exam.class === classFilter;
    const matchesType = examTypeFilter === "all" || exam.examType === examTypeFilter;
    const matchesYear = exam.academicYear === academicYearFilter;
    
    return matchesSearch && matchesClass && matchesType && matchesYear;
  });

  const handleCreateExam = () => {
    if (!examDate || !formData.name || !formData.class || !formData.subject) {
      toast.error("Please fill all required fields");
      return;
    }

    const newExam: Exam = {
      id: `EX${Date.now()}`,
      name: formData.name!,
      academicYear: formData.academicYear!,
      class: formData.class!,
      section: formData.section || "A",
      subject: formData.subject!,
      date: format(examDate, "yyyy-MM-dd"),
      startTime: formData.startTime || "09:00",
      endTime: formData.endTime || "12:00",
      duration: formData.duration || 180,
      maxMarks: formData.maxMarks || 100,
      examType: formData.examType as any || "midterm",
      status: "scheduled",
      venue: formData.venue || "Room 101",
      instructions: formData.instructions
    };

    setExams(prev => [...prev, newExam]);
    toast.success("Exam scheduled successfully");
    
    setShowCreateDialog(false);
    setFormData({ academicYear: "2024-25", examType: "midterm", status: "scheduled" });
    setExamDate(undefined);
  };

  const handleEditExam = () => {
    if (!selectedExam || !examDate) return;

    const updatedExam = {
      ...selectedExam,
      ...formData,
      date: format(examDate, "yyyy-MM-dd")
    };

    setExams(prev => prev.map(exam => exam.id === selectedExam.id ? updatedExam as Exam : exam));
    toast.success("Exam updated successfully");
    
    setShowEditDialog(false);
    setSelectedExam(null);
    setFormData({ academicYear: "2024-25", examType: "midterm", status: "scheduled" });
    setExamDate(undefined);
  };

  const handleDeleteExam = (examId: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      setExams(prev => prev.filter(exam => exam.id !== examId));
      toast.success("Exam deleted successfully");
    }
  };

  const generateTimetable = () => {
    const selectedClassExams = filteredExams.filter(exam => 
      classFilter !== "all" ? exam.class === classFilter : true
    );
    
    if (selectedClassExams.length === 0) {
      toast.error("No exams found for the selected criteria");
      return;
    }

    toast.success(`Timetable generated for ${selectedClassExams.length} exams`);
  };

  const publishTimetable = () => {
    toast.success("Exam timetable published successfully");
  };

  const openEditDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setFormData(exam);
    setExamDate(new Date(exam.date));
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exam Schedule Management</h3>
          <p className="text-sm text-muted-foreground">Create, manage and publish exam schedules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateTimetable}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Timetable
          </Button>
          <Button onClick={publishTimetable} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Publish
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Exam</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Exam Name *</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Mathematics Midterm"
                  />
                </div>
                
                <div>
                  <Label>Academic Year</Label>
                  <Select value={formData.academicYear} onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Class *</Label>
                  <Select value={formData.class} onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Subject *</Label>
                  <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
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
                  <Label>Exam Type</Label>
                  <Select value={formData.examType} onValueChange={(value) => setFormData(prev => ({ ...prev, examType: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.replace('-', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Exam Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {examDate ? format(examDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={examDate}
                        onSelect={setExamDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Venue</Label>
                  <Select value={formData.venue} onValueChange={(value) => setFormData(prev => ({ ...prev, venue: value }))}>
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
                
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    placeholder="180"
                  />
                </div>
                
                <div>
                  <Label>Maximum Marks</Label>
                  <Input
                    type="number"
                    value={formData.maxMarks || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: parseInt(e.target.value) }))}
                    placeholder="100"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label>Instructions</Label>
                  <Input
                    value={formData.instructions || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Any special instructions for the exam"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateExam}>
                  Schedule Exam
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Exams</CardTitle>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {examTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.replace('-', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.class} {exam.section}</TableCell>
                  <TableCell>{exam.subject}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(exam.date), "PP")}</span>
                      <span className="text-sm text-muted-foreground">
                        {exam.startTime} - {exam.endTime}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{exam.duration} mins</TableCell>
                  <TableCell>{exam.venue}</TableCell>
                  <TableCell>
                    <Badge variant={
                      exam.status === 'completed' ? 'default' :
                      exam.status === 'ongoing' ? 'secondary' :
                      exam.status === 'cancelled' ? 'destructive' : 'outline'
                    }>
                      {exam.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(exam)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteExam(exam.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          {/* Same form as create dialog but with different handler */}
          <div className="grid grid-cols-2 gap-4">
            {/* ... same form fields as create dialog ... */}
            <div>
              <Label>Exam Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Mathematics Midterm"
              />
            </div>
            {/* Add other fields as needed */}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditExam}>
              Update Exam
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}