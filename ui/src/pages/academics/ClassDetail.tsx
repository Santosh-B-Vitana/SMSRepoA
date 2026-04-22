import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Users, 
  BookOpen,
  Award,
  Edit,
  Trash2,
  Plus,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { academicApi, type SectionResponse } from "@/services/api/academicApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import { SubjectsTab } from "@/components/academics/SubjectsTab";

interface GradeTier {
  id: string;
  grade: string;
  minMarks: number;
  maxMarks: number;
  gpa: number;
}

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sections");
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Sections state — backed by real API
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [teachingStaff, setTeachingStaff] = useState<StaffBasic[]>([]);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionResponse | null>(null);
  const [sectionForm, setSectionForm] = useState({
    name: "",
    classTeacherId: ""
  });

  // Grade Tiers state
  const [gradeTiers, setGradeTiers] = useState<GradeTier[]>([
    { id: "1", grade: "A+", minMarks: 90, maxMarks: 100, gpa: 10 },
    { id: "2", grade: "A", minMarks: 80, maxMarks: 89, gpa: 9 },
    { id: "3", grade: "B+", minMarks: 70, maxMarks: 79, gpa: 8 },
    { id: "4", grade: "B", minMarks: 60, maxMarks: 69, gpa: 7 },
    { id: "5", grade: "C", minMarks: 50, maxMarks: 59, gpa: 6 },
    { id: "6", grade: "D", minMarks: 40, maxMarks: 49, gpa: 5 },
    { id: "7", grade: "F", minMarks: 0, maxMarks: 39, gpa: 0 }
  ]);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeTier | null>(null);
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    minMarks: 0,
    maxMarks: 0,
    gpa: 0
  });

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = useCallback(async () => {
    setLoading(true);
    try {
      const [classData, staffData, sectionsData] = await Promise.all([
        academicApi.getClass(classId!),
        staffApi.getTeachingStaff(),
        academicApi.listSections(classId, 1, 100)
      ]);
      setClassName(classData.name || classData.standard || "");
      setTeachingStaff(staffData.staff ?? []);
      setSections(sectionsData.sections ?? []);
    } catch (error) {
      console.error("Error loading class:", error);
      toast.error("Failed to load class details");
    }
    setLoading(false);
  }, [classId]);

  const handleAddSection = () => {
    setEditingSection(null);
    setSectionForm({ name: "", classTeacherId: "" });
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section: SectionResponse) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name,
      classTeacherId: section.classTeacherId ?? ""
    });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: sectionForm.name,
        classId: classId!,
        classTeacherId: sectionForm.classTeacherId || undefined
      };
      if (editingSection) {
        await academicApi.updateSection(editingSection.id, payload);
        toast.success("Section updated successfully");
      } else {
        await academicApi.createSection(payload);
        toast.success("Section added successfully");
      }
      setSectionDialogOpen(false);
      loadClassData();
    } catch (error) {
      toast.error("Failed to save section");
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (confirm("Are you sure you want to delete this section?")) {
      try {
        await academicApi.deleteSection(id);
        toast.success("Section deleted successfully");
        setSections(prev => prev.filter(s => s.id !== id));
      } catch {
        toast.error("Failed to delete section");
      }
    }
  };

  // Grade Tier handlers
  const handleAddGradeTier = () => {
    setEditingGrade(null);
    setGradeForm({ grade: "", minMarks: 0, maxMarks: 0, gpa: 0 });
    setGradeDialogOpen(true);
  };

  const handleEditGrade = (grade: GradeTier) => {
    setEditingGrade(grade);
    setGradeForm({
      grade: grade.grade,
      minMarks: grade.minMarks,
      maxMarks: grade.maxMarks,
      gpa: grade.gpa
    });
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGrade) {
      setGradeTiers(gradeTiers.map(g => 
        g.id === editingGrade.id 
          ? { ...g, ...gradeForm }
          : g
      ));
      toast.success("Grade tier updated successfully");
    } else {
      const newGrade: GradeTier = {
        id: Date.now().toString(),
        ...gradeForm
      };
      setGradeTiers([...gradeTiers, newGrade]);
      toast.success("Grade tier added successfully");
    }
    setGradeDialogOpen(false);
  };

  const handleDeleteGrade = (id: string) => {
    if (confirm("Are you sure you want to delete this grade tier?")) {
      setGradeTiers(gradeTiers.filter(g => g.id !== id));
      toast.success("Grade tier deleted successfully");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading class details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => navigate("/academics")} 
          variant="outline" 
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{className}</h1>
          <p className="text-muted-foreground">Manage sections, subjects, and grade tiers • 2024-2025</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Button onClick={handleAddSection} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.name}</TableCell>
                      <TableCell>{section.classTeacherName ?? "Not assigned"}</TableCell>
                      <TableCell>{section.totalStudents}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/academics/classes/${classId}/sections/${section.id}`)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(section)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-destructive"
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

          {/* Section Dialog */}
          <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveSection} className="space-y-4">
                <div>
                  <Label htmlFor="sectionName">Section Name</Label>
                  <Input
                    id="sectionName"
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    placeholder="e.g., Section A"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="classTeacher">Class Teacher</Label>
                  <Select
                    value={sectionForm.classTeacherId}
                    onValueChange={(v) => setSectionForm({ ...sectionForm, classTeacherId: v })}
                  >
                    <SelectTrigger id="classTeacher">
                      <SelectValue placeholder="Select teaching staff (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachingStaff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || `${s.firstName} ${s.lastName}`} ({s.designation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSection ? "Update" : "Add"} Section
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <SubjectsTab classId={classId!} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Grade Tiers Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Grade Tiers
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Configure grading scale for all sections</p>
              </div>
              <Button onClick={handleAddGradeTier} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Grade Tier
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Min Marks</TableHead>
                    <TableHead>Max Marks</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeTiers.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.grade}</TableCell>
                      <TableCell>{grade.minMarks}</TableCell>
                      <TableCell>{grade.maxMarks}</TableCell>
                      <TableCell>{grade.gpa}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGrade(grade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGrade(grade.id)}
                            className="text-destructive"
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

          {/* Class Policies Section */}
          <Card>
            <CardHeader>
              <CardTitle>Class Policies & Requirements</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Set academic policies for this class</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passingPercentage">Passing Percentage (%)</Label>
                  <Input 
                    id="passingPercentage"
                    type="number" 
                    placeholder="e.g., 35" 
                    defaultValue="35"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Minimum marks percentage required to pass</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAttendance">Minimum Attendance (%)</Label>
                  <Input 
                    id="minAttendance"
                    type="number" 
                    placeholder="e.g., 75" 
                    defaultValue="75"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Minimum attendance required for promotion</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStudentsPerSection">Max Students per Section</Label>
                  <Input 
                    id="maxStudentsPerSection"
                    type="number" 
                    placeholder="e.g., 40" 
                    defaultValue="40"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">Maximum capacity for each section</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promotionPolicy">Promotion Policy</Label>
                  <Select defaultValue="strict">
                    <SelectTrigger id="promotionPolicy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Strict (Must pass all subjects)</SelectItem>
                      <SelectItem value="lenient">Lenient (Can have 1 failed subject)</SelectItem>
                      <SelectItem value="flexible">Flexible (Can have 2 failed subjects)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Criteria for class promotion</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>Enable Continuous Assessment</span>
                </Label>
                <p className="text-sm text-muted-foreground ml-6">Include assignments, projects, and class work in final grades</p>
                
                <Label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>Enable Mid-term Examinations</span>
                </Label>
                <p className="text-sm text-muted-foreground ml-6">Conduct mid-term exams in addition to final exams</p>
                
                <Label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Enable Supplementary Exams</span>
                </Label>
                <p className="text-sm text-muted-foreground ml-6">Allow failed students to attempt supplementary exams</p>
              </div>
            </CardContent>
          </Card>

          

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">Reset to Default</Button>
            <Button onClick={() => toast.success("Class settings saved successfully")}>Save All Settings</Button>
          </div>

          {/* Grade Tier Dialog */}
          <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGrade ? "Edit Grade Tier" : "Add Grade Tier"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    placeholder="e.g., A+"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minMarks">Min Marks</Label>
                    <Input
                      id="minMarks"
                      type="number"
                      value={gradeForm.minMarks}
                      onChange={(e) => setGradeForm({ ...gradeForm, minMarks: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxMarks">Max Marks</Label>
                    <Input
                      id="maxMarks"
                      type="number"
                      value={gradeForm.maxMarks}
                      onChange={(e) => setGradeForm({ ...gradeForm, maxMarks: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.1"
                    value={gradeForm.gpa}
                    onChange={(e) => setGradeForm({ ...gradeForm, gpa: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setGradeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingGrade ? "Update" : "Add"} Grade Tier
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
