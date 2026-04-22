import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, GraduationCap, CalendarDays, Upload, Loader2 } from "lucide-react";
import ResultsManager from "@/pages/academics/ResultsManager";
import ExamTimetableCreator from "@/components/examinations/ExamTimetableCreator";
import StudentResultPortal from "@/pages/StudentResultPortal";
import { BulkMarksImportDialog } from "@/components/examinations/BulkMarksImportDialog";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export default function ExaminationManager() {
  const { academicYear } = useAcademicYear();
  const [bulkClasses, setBulkClasses]       = useState<ClassResponse[]>([]);
  const [bulkClass, setBulkClass]           = useState("");
  const [bulkExams, setBulkExams]           = useState<ExamBasic[]>([]);
  const [bulkExamId, setBulkExamId]         = useState("");
  const [loadingBulkClass, setLoadingBulkClass] = useState(false);

  const availableStandards = Array.from(new Set(bulkClasses.map(c => c.standard))).sort(
    (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
  );
  const selectedExam = bulkExams.find(e => e.id === bulkExamId);

  useEffect(() => {
    academicApi.listClasses(1, 500).then(r => setBulkClasses(r.classes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!bulkClass) { setBulkExams([]); setBulkExamId(""); return; }
    setLoadingBulkClass(true);
    examinationApi.getExams({ class: bulkClass }, 1, 500)
      .then(r => { setBulkExams(r.items || []); setBulkExamId(""); })
      .catch(() => {})
      .finally(() => setLoadingBulkClass(false));
  }, [bulkClass, academicYear]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Examination Management System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timetable" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timetable">
                <CalendarDays className="h-4 w-4 mr-2" />
                Exam Schedule
              </TabsTrigger>
              <TabsTrigger value="results">
                <FileText className="h-4 w-4 mr-2" />
                Results & Marks
              </TabsTrigger>
              <TabsTrigger value="bulkimport">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </TabsTrigger>
              <TabsTrigger value="portal">
                <GraduationCap className="h-4 w-4 mr-2" />
                Student Portal
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timetable">
              <ExamTimetableCreator />
            </TabsContent>
            <TabsContent value="results">
              <ResultsManager />
            </TabsContent>
            <TabsContent value="bulkimport">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Marks Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Class</Label>
                      <Select value={bulkClass} onValueChange={setBulkClass}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Exam{loadingBulkClass && <Loader2 className="h-3 w-3 inline animate-spin ml-1" />}
                      </Label>
                      <Select value={bulkExamId} onValueChange={setBulkExamId} disabled={!bulkClass || loadingBulkClass}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={!bulkClass ? "Select class first" : bulkExams.length === 0 ? "No exams found" : "Select exam"} />
                        </SelectTrigger>
                        <SelectContent>
                          {bulkExams.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} — {e.subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {bulkExamId && selectedExam && (
                    <BulkMarksImportDialog
                      examId={bulkExamId}
                      examName={`${selectedExam.name} — ${selectedExam.subject}`}
                      onImport={(marks) => console.log('Imported marks:', marks)}
                    />
                  )}
                  {!bulkExamId && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">Select a class and exam to import marks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="portal">
              <StudentResultPortal />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}