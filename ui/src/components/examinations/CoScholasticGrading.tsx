import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Save, Loader2, Search, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import examinationApi, {
  CoScholasticArea,
  CoScholasticAssessment,
  CreateCoScholasticAreaDto,
  SaveCoScholasticAssessmentDto,
} from "@/services/api/examinationApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

const GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];
const TERMS = ["Term 1", "Term 2", "Annual"];

export function CoScholasticGrading() {
  const { academicYear } = useAcademicYear();
  const { toast } = useToast();

  const [areas, setAreas] = useState<CoScholasticArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [newArea, setNewArea] = useState<CreateCoScholasticAreaDto>({ name: "", code: "", description: "", gradeScale: "A-E", displayOrder: 0 });
  const [savingArea, setSavingArea] = useState(false);

  // Student grading state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentBasic[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentBasic | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [assessments, setAssessments] = useState<CoScholasticAssessment[]>([]);
  const [gradeDraft, setGradeDraft] = useState<Record<string, string>>({});
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAreas = async () => {
    setLoadingAreas(true);
    try {
      const data = await examinationApi.getCoScholasticAreas();
      setAreas(data);
    } catch {
      toast({ title: "Failed to load co-scholastic areas", variant: "destructive" });
    } finally {
      setLoadingAreas(false);
    }
  };

  useEffect(() => { loadAreas(); }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingAssessments(true);
    examinationApi.getStudentCoScholastic(selectedStudent.id, academicYear, selectedTerm)
      .then(data => {
        setAssessments(data);
        const draft: Record<string, string> = {};
        data.forEach(a => { draft[a.coScholasticAreaId] = a.grade; });
        setGradeDraft(draft);
      })
      .catch(() => {})
      .finally(() => setLoadingAssessments(false));
  }, [selectedStudent, selectedTerm, academicYear]);

  const handleSearch = async () => {
    if (!studentSearch.trim()) return;
    setSearching(true);
    try {
      const res = await studentApi.list({ search: studentSearch, pageSize: 20 });
      setStudentResults(res.students || []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleSaveAssessments = async () => {
    if (!selectedStudent || areas.length === 0) return;
    setSaving(true);
    try {
      const payload: SaveCoScholasticAssessmentDto = {
        studentId: selectedStudent.id,
        academicYear,
        term: selectedTerm,
        assessments: areas
          .filter(a => gradeDraft[a.id])
          .map(a => ({ coScholasticAreaId: a.id, grade: gradeDraft[a.id] })),
      };
      await examinationApi.saveCoScholasticAssessments(payload);
      toast({ title: "Grades saved successfully" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateArea = async () => {
    if (!newArea.name.trim() || !newArea.code.trim()) {
      toast({ title: "Name and Code are required", variant: "destructive" });
      return;
    }
    setSavingArea(true);
    try {
      await examinationApi.createCoScholasticArea(newArea);
      toast({ title: "Area created" });
      setAreaDialogOpen(false);
      await loadAreas();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingArea(false);
    }
  };

  return (
    <>
      <Tabs defaultValue="grading">
        <TabsList>
          <TabsTrigger value="grading"><BookOpen className="h-4 w-4 mr-1" />Student Grading</TabsTrigger>
          <TabsTrigger value="areas"><Settings className="h-4 w-4 mr-1" />Manage Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="grading" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Co-Scholastic Assessment (CBSE)
              </CardTitle>
              <CardDescription>Grade students on activity areas like sports, arts, discipline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Student Search */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label>Search Student</Label>
                  <Input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Name or admission number..."
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching} variant="secondary">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {studentResults.length > 0 && !selectedStudent && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {studentResults.map(s => (
                    <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between" onClick={() => { setSelectedStudent(s); setStudentResults([]); }}>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">{s.admissionNumber} | {s.class}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                    <div>
                      <p className="font-medium">{selectedStudent.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedStudent.admissionNumber} | {selectedStudent.class}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(null); setAssessments([]); setGradeDraft({}); }}>Change</Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label>Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Badge variant="outline">{academicYear}</Badge>
                  </div>

                  {loadingAreas || loadingAssessments ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">No co-scholastic areas defined. Add areas in the "Manage Areas" tab.</div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Activity / Area</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Grade Scale</TableHead>
                            <TableHead>Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {areas.filter(a => a.isActive).map(area => (
                            <TableRow key={area.id}>
                              <TableCell className="font-medium">{area.name}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono">{area.code}</Badge></TableCell>
                              <TableCell className="text-muted-foreground text-sm">{area.gradeScale}</TableCell>
                              <TableCell>
                                <Select value={gradeDraft[area.id] ?? ""} onValueChange={v => setGradeDraft(prev => ({ ...prev, [area.id]: v }))}>
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-end">
                        <Button onClick={handleSaveAssessments} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Grades
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Co-Scholastic Areas</CardTitle>
                  <CardDescription>Define activity / assessment areas (e.g. Sports, Arts, Discipline)</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setNewArea({ name: "", code: "", description: "", gradeScale: "A-E", displayOrder: areas.length }); setAreaDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Area
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAreas ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Grade Scale</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areas.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No areas defined yet.</TableCell></TableRow>
                    )}
                    {areas.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-muted-foreground">{a.displayOrder}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{a.code}</Badge></TableCell>
                        <TableCell>{a.gradeScale}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.description ?? "—"}</TableCell>
                        <TableCell>
                          {a.isActive
                            ? <Badge variant="default">Active</Badge>
                            : <Badge variant="secondary">Inactive</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Area Dialog */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Co-Scholastic Area</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={newArea.name} onChange={e => setNewArea(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sports" />
              </div>
              <div className="space-y-1">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input value={newArea.code} onChange={e => setNewArea(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SP" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={newArea.description} onChange={e => setNewArea(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Grade Scale</Label>
                <Input value={newArea.gradeScale} onChange={e => setNewArea(f => ({ ...f, gradeScale: e.target.value }))} placeholder="A-E" />
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input type="number" value={newArea.displayOrder} onChange={e => setNewArea(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateArea} disabled={savingArea}>
              {savingArea && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
