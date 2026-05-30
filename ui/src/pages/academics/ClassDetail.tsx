import { useCallback, useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import {
  academicApi,
  type SectionResponse,
  type GradeTierResponse,
  type ClassSettingsResponse,
} from "@/services/api/academicApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import { boardApi, type SchoolBoardConfigResponse } from "@/services/api/boardApi";
import { SubjectsTab } from "@/components/academics/SubjectsTab";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { academicYear: activeAcademicYear } = useAcademicYear();
  const [activeTab, setActiveTab] = useState("sections");
  const [className, setClassName] = useState("");
  const [classBoardConfigurationId, setClassBoardConfigurationId] = useState<string | undefined>(undefined);
  const [classBoard, setClassBoard] = useState<SchoolBoardConfigResponse | null>(null);
  // Ref so stale closures (useCallback) always see the latest board
  const classBoardRef = useRef<SchoolBoardConfigResponse | null>(null);
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

  // Grade Tiers state — API-backed
  const [gradeTiers, setGradeTiers] = useState<GradeTierResponse[]>([]);
  const [gradeTiersLoading, setGradeTiersLoading] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeTierResponse | null>(null);
  const [gradeForm, setGradeForm] = useState({ grade: "", minMarks: 0, maxMarks: 0, gpa: 0 });
  const [gradeSaving, setGradeSaving] = useState(false);

  // Class Settings state — API-backed
  const [classSettings, setClassSettings] = useState<ClassSettingsResponse | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    passingPercentage: 35,
    minimumAttendance: 75,
    gradingScale: "percentage",
    promotionPolicy: "strict",
    enableAutoPromotion: true,
    enableSupplementaryExams: false,
    enableGradingForPromotion: true,
    minSubjectsToPass: undefined as number | undefined,
    notes: "",
  });

  useEffect(() => {
    loadClassData();
  }, [classId]);

  useEffect(() => {
    if (activeTab === "settings") {
      loadGradeTiers();
      loadClassSettings();
    }
  }, [activeTab, classId]);

  const loadClassData = useCallback(async () => {
    setLoading(true);
    try {
      const [classData, staffData, sectionsData] = await Promise.all([
        academicApi.getClass(classId!),
        staffApi.getTeachingStaff(),
        academicApi.listSections(classId, 1, 100)
      ]);
      setClassName(classData.name || classData.standard || "");
      const boardId = classData.boardConfigurationId;
      setClassBoardConfigurationId(boardId);
      setTeachingStaff(staffData.staff ?? []);
      setSections(sectionsData.sections ?? []);

      // Fetch board defaults — awaited so board data is ready before the loading spinner
      // disappears, eliminating any race when the user immediately opens the Settings tab.
      if (boardId) {
        try {
          const r = await boardApi.getSchoolBoards();
          const match = r.boards?.find(b => b.boardConfigurationId === boardId) ?? null;
          classBoardRef.current = match;
          setClassBoard(match);
        } catch {/* non-critical */}
      }
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

  // Grade Tier loaders
  const loadGradeTiers = useCallback(async () => {
    if (!classId) return;
    setGradeTiersLoading(true);
    try {
      const res = await academicApi.getGradeTiers(classId);
      setGradeTiers(res.gradeTiers ?? []);
    } catch {
      toast.error("Failed to load grade tiers");
    } finally {
      setGradeTiersLoading(false);
    }
  }, [classId]);

  const loadClassSettings = useCallback(async () => {
    if (!classId) return;
    setSettingsLoading(true);
    try {
      const res = await academicApi.getClassSettings(classId);
      setClassSettings(res);
      setPolicyForm({
        passingPercentage: res.passingPercentage,
        minimumAttendance: res.minimumAttendance,
        gradingScale: res.gradingScale,
        promotionPolicy: res.promotionPolicy,
        enableAutoPromotion: res.enableAutoPromotion,
        enableSupplementaryExams: res.enableSupplementaryExams,
        enableGradingForPromotion: res.enableGradingForPromotion,
        minSubjectsToPass: res.minSubjectsToPass,
        notes: res.notes ?? "",
      });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status !== 404) toast.error("Failed to load class settings");
      // 404 = no settings yet — seed passing% from board default (via ref, always current)
      const boardDefault = classBoardRef.current?.effectiveOverallPassingPercentage;
      if (boardDefault !== undefined) {
        setPolicyForm(p => ({ ...p, passingPercentage: boardDefault }));
      }
    } finally {
      setSettingsLoading(false);
    }
  }, [classId]);

  // Grade Tier handlers
  const handleAddGradeTier = () => {
    setEditingGrade(null);
    setGradeForm({ grade: "", minMarks: 0, maxMarks: 0, gpa: 0 });
    setGradeDialogOpen(true);
  };

  const handleEditGrade = (grade: GradeTierResponse) => {
    setEditingGrade(grade);
    setGradeForm({ grade: grade.grade, minMarks: grade.minMarks, maxMarks: grade.maxMarks, gpa: grade.gpa });
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setGradeSaving(true);
    try {
      if (editingGrade) {
        const updated = await academicApi.updateGradeTier(editingGrade.id, gradeForm);
        setGradeTiers(prev => prev.map(g => g.id === editingGrade.id ? updated : g));
        toast.success("Grade tier updated");
      } else {
        const created = await academicApi.createGradeTier({
          classId: classId!,
          ...gradeForm,
          displayOrder: gradeTiers.length,
        });
        setGradeTiers(prev => [...prev, created]);
        toast.success("Grade tier added");
      }
      setGradeDialogOpen(false);
    } catch {
      toast.error("Failed to save grade tier");
    } finally {
      setGradeSaving(false);
    }
  };

  const handleDeleteGrade = async (id: string) => {
    if (!confirm("Delete this grade tier?")) return;
    try {
      await academicApi.deleteGradeTier(id);
      setGradeTiers(prev => prev.filter(g => g.id !== id));
      toast.success("Grade tier deleted");
    } catch {
      toast.error("Failed to delete grade tier");
    }
  };

  // Class Settings save
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      // Guid.Empty ("00000000-…") means the backend returned virtual defaults — no DB row exists yet.
      const isUnsaved = !classSettings || classSettings.id === '00000000-0000-0000-0000-000000000000';
      if (!isUnsaved) {
        const updated = await academicApi.updateClassSettings(classSettings!.id, policyForm);
        setClassSettings(updated);
        toast.success("Class settings saved");
      } else {
        const created = await academicApi.createClassSettings({ classId: classId!, ...policyForm });
        setClassSettings(created);
        toast.success("Class settings created");
      }
    } catch {
      toast.error("Failed to save class settings");
    } finally {
      setSettingsSaving(false);
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
          <p className="text-muted-foreground">Manage sections, subjects, and grade tiers • {activeAcademicYear}</p>
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
          <SubjectsTab classId={classId!} boardConfigurationId={classBoardConfigurationId} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Board Defaults Reference Card */}
          {classBoard ? (
            <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Board Defaults
                  <Badge variant="outline" className="text-blue-700 border-blue-400">{classBoard.boardCode}</Badge>
                  {classBoard.hasCustomGradingScale && (
                    <Badge variant="secondary" className="text-amber-700 bg-amber-100">School Override Active</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {classBoard.boardName} · Pass: {classBoard.effectiveOverallPassingPercentage}%
                  {classBoard.hasCustomGradingScale ? " (school-level custom scale)" : " (board default scale)"}
                  {classBoard.board?.gradingSystem ? ` · ${classBoard.board.gradingSystem}` : ""}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {classBoard.effectiveGradingScale.map(entry => (
                    <div
                      key={entry.grade}
                      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${
                        entry.isPassing
                          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                      }`}
                    >
                      <span className="font-bold">{entry.grade}</span>
                      <span className="opacity-70 ml-0.5">{entry.minPercentage}–{entry.maxPercentage}%</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  The <span className="font-semibold">Grade Tiers</span> section below lets you override these defaults for this class.
                  If no class-level grade tiers are added, the board defaults above are used automatically.
                </p>
              </CardContent>
            </Card>
          ) : classBoardConfigurationId ? (
            <p className="text-xs text-muted-foreground px-1">Loading board defaults…</p>
          ) : null}

          {/* Grade Tiers Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Grade Tiers
                  {gradeTiers.length > 0 && (
                    <Badge variant="secondary" className="text-amber-700 bg-amber-100">Class Override Active</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Override the board grading scale for this class only</p>
              </div>
              <Button onClick={handleAddGradeTier} size="sm" disabled={gradeTiersLoading}>
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
                  {gradeTiersLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Loading grade tiers…</TableCell></TableRow>
                  )}
                  {!gradeTiersLoading && gradeTiers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No grade tiers configured. Add one to get started.</TableCell></TableRow>
                  )}
                  {!gradeTiersLoading && gradeTiers.map((grade) => (
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
              {settingsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading settings…</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="passingPercentage">Passing Percentage (%)</Label>
                      <Input
                        id="passingPercentage"
                        type="number"
                        value={policyForm.passingPercentage}
                        onChange={e => setPolicyForm(p => ({ ...p, passingPercentage: Number(e.target.value) }))}
                        min="0" max="100"
                      />
                      <p className="text-xs text-muted-foreground">
                        {classBoard
                          ? <>Board default: <span className="font-medium">{classBoard.effectiveOverallPassingPercentage}%</span>. Override here for this class only.</>
                          : "Minimum marks percentage required to pass"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minAttendance">Minimum Attendance (%)</Label>
                      <Input
                        id="minAttendance"
                        type="number"
                        value={policyForm.minimumAttendance}
                        onChange={e => setPolicyForm(p => ({ ...p, minimumAttendance: Number(e.target.value) }))}
                        min="0" max="100"
                      />
                      <p className="text-xs text-muted-foreground">Minimum attendance required for promotion</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minSubjectsToPass">Min Subjects to Pass (optional)</Label>
                      <Input
                        id="minSubjectsToPass"
                        type="number"
                        value={policyForm.minSubjectsToPass ?? ""}
                        onChange={e => setPolicyForm(p => ({ ...p, minSubjectsToPass: e.target.value === "" ? undefined : Number(e.target.value) }))}
                        placeholder="Leave blank for all"
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">Number of subjects required to pass for promotion</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotionPolicy">Promotion Policy</Label>
                      <Select
                        value={policyForm.promotionPolicy}
                        onValueChange={v => setPolicyForm(p => ({ ...p, promotionPolicy: v }))}
                      >
                        <SelectTrigger id="promotionPolicy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strict">Strict (Must pass all subjects)</SelectItem>
                          <SelectItem value="lenient">Lenient (Can have 1 failed subject)</SelectItem>
                          <SelectItem value="flexible">Flexible (Can have 2 failed subjects)</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Criteria for class promotion</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={policyForm.enableAutoPromotion}
                        onChange={e => setPolicyForm(p => ({ ...p, enableAutoPromotion: e.target.checked }))}
                      />
                      <div>
                        <p className="text-sm font-medium">Enable Auto Promotion</p>
                        <p className="text-xs text-muted-foreground">Automatically promote students who meet all criteria</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={policyForm.enableGradingForPromotion}
                        onChange={e => setPolicyForm(p => ({ ...p, enableGradingForPromotion: e.target.checked }))}
                      />
                      <div>
                        <p className="text-sm font-medium">Enable Grading for Promotion</p>
                        <p className="text-xs text-muted-foreground">Include grade tiers in promotion evaluation</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={policyForm.enableSupplementaryExams}
                        onChange={e => setPolicyForm(p => ({ ...p, enableSupplementaryExams: e.target.checked }))}
                      />
                      <div>
                        <p className="text-sm font-medium">Enable Supplementary Exams</p>
                        <p className="text-xs text-muted-foreground">Allow failed students to appear in supplementary exams</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-[72px] focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Optional notes about class policies…"
                      value={policyForm.notes}
                      onChange={e => setPolicyForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => loadClassSettings()} disabled={settingsSaving || settingsLoading}>Reset</Button>
            <Button onClick={handleSaveSettings} disabled={settingsSaving || settingsLoading}>
              {settingsSaving ? "Saving…" : classSettings ? "Save Changes" : "Create Settings"}
            </Button>
          </div>

          {/* Grade Tier Dialog */}
          <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGrade ? "Edit Grade Tier" : "Add Grade Tier"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveGrade} className="space-y-4" noValidate>
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
                  <Button type="button" variant="outline" onClick={() => setGradeDialogOpen(false)} disabled={gradeSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={gradeSaving}>
                    {gradeSaving ? "Saving…" : (editingGrade ? "Update" : "Add") + " Grade Tier"}
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
