import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  GraduationCap, Save, Download, Loader2, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import examinationApi, { ExamBasic } from "@/services/api/examinationApi";
import { studentApi } from "@/services/api/studentApi";
import { academicApi, ClassResponse } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

// ─── Types ────────────────────────────────────────────────
interface SubjectCol {
  examId: string;
  subject: string;
  maxMarks: number;
  passingMarks: number;
  date: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  rollNo: string;
  section: string;
  marks: Record<string, { value: number; isAbsent: boolean; isDirty: boolean }>;
}

// ─── Indian CBSE/ICSE Grading ────────────────────────────
function calcGradeInfo(pct: number): { label: string; cls: string } {
  if (pct >= 91) return { label: "A1", cls: "text-emerald-600 font-bold" };
  if (pct >= 81) return { label: "A2", cls: "text-green-600 font-bold" };
  if (pct >= 71) return { label: "B1", cls: "text-blue-600 font-bold" };
  if (pct >= 61) return { label: "B2", cls: "text-blue-500 font-bold" };
  if (pct >= 51) return { label: "C1", cls: "text-yellow-600 font-bold" };
  if (pct >= 41) return { label: "C2", cls: "text-orange-600 font-bold" };
  if (pct >= 33) return { label: "D",  cls: "text-orange-800 font-bold" };
  return            { label: "E",  cls: "text-red-600 font-bold" };
}

function cellBg(pct: number, isDirty: boolean) {
  if (isDirty) return "border-yellow-400 bg-yellow-50";
  if (pct >= 75) return "border-emerald-200 bg-emerald-50/40";
  if (pct >= 33) return "border-blue-200 bg-blue-50/20";
  return "border-red-300 bg-red-50/40";
}

// ─── Props ───────────────────────────────────────────────
interface ResultsManagerProps {
  /** Pre-select a class when navigating from ExamEventCard */
  initialClass?: string;
  /** Pre-select a section ("all" or a specific section) */
  initialSection?: string;
  /** Pre-select an exam name (grouped exam name) */
  initialExamName?: string;
}

// ─── Component ───────────────────────────────────────────
export default function ResultsManager({
  initialClass = "",
  initialSection = "all",
  initialExamName = "",
}: ResultsManagerProps = {}) {
  // Global academic year from context
  const { academicYear: globalYear, availableYears, currentYear } = useAcademicYear();

  // Filter state — initialized from global context (or pre-selected props)
  const [selectedYear, setSelectedYear]         = useState(globalYear || "all");
  const [selectedClass, setSelectedClass]       = useState(initialClass);
  const [selectedSection, setSelectedSection]   = useState(initialSection);
  const [selectedExamName, setSelectedExamName] = useState(initialExamName);

  // Lookup data
  const [allClasses, setAllClasses]       = useState<ClassResponse[]>([]);
  const [examGroups, setExamGroups]       = useState<Record<string, ExamBasic[]>>({});

  // Grid data
  const [columns, setColumns] = useState<SubjectCol[]>([]);
  const [rows, setRows]       = useState<StudentRow[]>([]);

  // UI state
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingExams, setLoadingExams]     = useState(false);
  const [loadingGrid, setLoadingGrid]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [loaded, setLoaded]                 = useState(false);

  // Derived
  const availableStandards = Array.from(new Set(allClasses.map(c => c.standard))).sort((a, b) => {
    return (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0);
  });
  const availableSections = selectedClass
    ? allClasses.filter(c => c.standard === selectedClass).map(c => c.section).sort()
    : [];
  const hasUnsaved = rows.some(r => Object.values(r.marks).some(m => m.isDirty));
  const examGroupKeys = Object.keys(examGroups).sort();

  // ─── Sync local selectedYear when global context changes ─
  useEffect(() => {
    if (globalYear) setSelectedYear(globalYear);
  }, [globalYear]);

  // ─── Load filter lookup data ────────────────────────────
  useEffect(() => {
    setLoadingFilters(true);
    academicApi.listClasses(1, 500)
      .then((c) => setAllClasses(c.classes || []))
      .catch(() => {})
      .finally(() => setLoadingFilters(false));
  }, []);

  // ─── Load exam groups when class / year changes ─────────
  useEffect(() => {
    if (!selectedClass) {
      setExamGroups({});
      setSelectedExamName("");
      setLoaded(false);
      return;
    }
    setLoadingExams(true);
    setExamGroups({});
    setSelectedExamName("");
    setLoaded(false);

    const filters: Record<string, string> = { class: selectedClass };
    if (selectedYear && selectedYear !== "all") filters.academicYear = selectedYear;

    examinationApi.getExams(filters, 1, 500).then(res => {
      const groups: Record<string, ExamBasic[]> = {};
      for (const exam of (res.items || [])) {
        const key = exam.name;
        if (!groups[key]) groups[key] = [];
        groups[key].push(exam);
      }
      Object.values(groups).forEach(arr =>
        arr.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      );
      setExamGroups(groups);
    }).catch(() => {}).finally(() => setLoadingExams(false));
  }, [selectedClass, selectedYear]);

  // ─── Load students + existing marks ────────────────────
  const handleLoadGrid = async () => {
    if (!selectedClass || !selectedExamName) return;
    setLoadingGrid(true);
    setLoaded(false);
    try {
      const groupExams = examGroups[selectedExamName] || [];

      const cols: SubjectCol[] = groupExams.map(e => ({
        examId: e.id,
        subject: e.subject,
        maxMarks: e.maxMarks,
        passingMarks: e.passingMarks ?? Math.round(e.maxMarks * 0.33),
        date: e.date,
      }));
      setColumns(cols);

      // Students
      const studentRes = await studentApi.list({ classFilter: selectedClass, pageSize: 1000 });
      const students = (studentRes.students || [])
        .filter(s => selectedSection === "all" || !selectedSection || s.section === selectedSection)
        .sort((a, b) =>
          (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true })
        );

      // Existing results for all exams in group
      const existingMap: Record<string, Record<string, { value: number; isAbsent: boolean }>> = {};
      await Promise.all(groupExams.map(exam =>
        examinationApi.getResults({ examId: exam.id }, 1, 2000).then(res => {
          for (const r of (res.items || [])) {
            if (!existingMap[r.studentId]) existingMap[r.studentId] = {};
            existingMap[r.studentId][exam.id] = {
              value: r.marksObtained,
              isAbsent: r.isAbsent ?? false,
            };
          }
        }).catch(() => {})
      ));

      // Build rows
      const gridRows: StudentRow[] = students.map(s => ({
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNumber || "",
        section: s.section || "",
        marks: cols.reduce((acc, col) => {
          const ex = existingMap[s.id]?.[col.examId];
          acc[col.examId] = { value: ex?.value ?? 0, isAbsent: ex?.isAbsent ?? false, isDirty: false };
          return acc;
        }, {} as StudentRow["marks"]),
      }));
      setRows(gridRows);
      setLoaded(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load data");
    } finally {
      setLoadingGrid(false);
    }
  };

  const updateMark = (studentId: string, examId: string, val: number) => {
    const max = columns.find(c => c.examId === examId)?.maxMarks ?? 100;
    setRows(prev => prev.map(r => r.studentId !== studentId ? r : {
      ...r,
      marks: { ...r.marks, [examId]: { ...r.marks[examId], value: Math.max(0, Math.min(val, max)), isDirty: true } },
    }));
  };

  const toggleAbsent = (studentId: string, examId: string) => {
    setRows(prev => prev.map(r => r.studentId !== studentId ? r : {
      ...r,
      marks: {
        ...r.marks,
        [examId]: {
          ...r.marks[examId],
          isAbsent: !r.marks[examId].isAbsent,
          value: !r.marks[examId].isAbsent ? 0 : r.marks[examId].value,
          isDirty: true,
        },
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const col of columns) {
        await examinationApi.bulkCreateResults({
          examId: col.examId,
          schoolId: "",
          results: rows.map(r => ({
            studentId: r.studentId,
            marksObtained: r.marks[col.examId]?.isAbsent ? 0 : (r.marks[col.examId]?.value ?? 0),
            isAbsent: r.marks[col.examId]?.isAbsent ?? false,
          })),
        } as any);
      }
      setRows(prev => prev.map(r => ({
        ...r,
        marks: Object.fromEntries(
          Object.entries(r.marks).map(([k, v]) => [k, { ...v, isDirty: false }])
        ),
      })));
      toast.success(`Saved marks for ${rows.length} students across ${columns.length} subjects`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived stats ──────────────────────────────────────
  const rowStats = (row: StudentRow) => {
    const present = columns.filter(c => !row.marks[c.examId]?.isAbsent);
    const totalMax = present.reduce((s, c) => s + c.maxMarks, 0);
    const totalObt = present.reduce((s, c) => s + (row.marks[c.examId]?.value ?? 0), 0);
    const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
    return { totalObt, totalMax, pct, grade: calcGradeInfo(pct) };
  };

  const colStats = (col: SubjectCol) => {
    const present = rows.filter(r => !r.marks[col.examId]?.isAbsent);
    if (!present.length) return null;
    const vals = present.map(r => r.marks[col.examId]?.value ?? 0);
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    const high = Math.max(...vals);
    const passCount = vals.filter(v => v >= col.passingMarks).length;
    return { avg, high, passCount, total: present.length };
  };

  // ─── Export ─────────────────────────────────────────────
  const handleExport = () => {
    if (!rows.length) return;
    const headers = ["#", "Roll No", "Name", "Section", ...columns.map(c => c.subject), "Total", "%", "Grade"];
    const csvRows = rows.map((row, i) => {
      const stats = rowStats(row);
      return [
        i + 1, row.rollNo, row.name, row.section,
        ...columns.map(col => row.marks[col.examId]?.isAbsent ? "AB" : (row.marks[col.examId]?.value ?? 0)),
        `${stats.totalObt}/${stats.totalMax}`, `${stats.pct}%`, stats.grade.label,
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedExamName}_${selectedClass}_${selectedSection}_marks.csv`;
    a.click();
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Filter Panel ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Academic Year
              </Label>
              <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {availableYears.map(ay => (
                    <SelectItem key={ay.id} value={ay.name}>{ay.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Class *
              </Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("all"); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingFilters ? "Loading…" : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStandards.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Section
              </Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={!selectedClass ? "Select class first" : "All sections"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Exam{loadingExams && <Loader2 className="h-3 w-3 inline animate-spin ml-1.5" />}
              </Label>
              <Select
                value={selectedExamName}
                onValueChange={setSelectedExamName}
                disabled={!selectedClass || loadingExams}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={
                    !selectedClass ? "Select class first" :
                    loadingExams ? "Loading exams…" :
                    examGroupKeys.length === 0 ? "No exams for this class" :
                    "Select exam"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {examGroupKeys.map(name => (
                    <SelectItem key={name} value={name}>
                      <span>{name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({examGroups[name].length} subjects)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={handleLoadGrid}
              disabled={!selectedClass || !selectedExamName || loadingGrid}
              size="sm"
              className="h-8"
            >
              {loadingGrid
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Loading…</>
                : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Load Students & Marks</>
              }
            </Button>
            {loaded && (
              <Button
                onClick={handleSaveAll}
                disabled={saving || !hasUnsaved}
                size="sm"
                className="h-8"
              >
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Save className="h-3.5 w-3.5 mr-1.5" />Save All Marks</>
                }
              </Button>
            )}
            {loaded && (
              <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
            )}
            {loaded && !hasUnsaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 ml-1">
                <CheckCircle2 className="h-3.5 w-3.5" />All saved
              </span>
            )}
            {loaded && hasUnsaved && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 ml-1">
                <AlertCircle className="h-3.5 w-3.5" />Unsaved changes
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Info bar ── */}
      {loaded && (
        <div className="flex items-center gap-2 text-sm px-1 flex-wrap">
          <span className="font-semibold">{selectedClass}</span>
          {selectedSection !== "all" && <span className="font-semibold">· {selectedSection}</span>}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{rows.length} students</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{columns.length} subjects</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-primary">{selectedExamName}</span>
        </div>
      )}

      {/* ── Marks Grid ── */}
      {loaded && rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 bg-muted/60">
                  <th className="sticky left-0 z-20 bg-muted/90 px-2 py-3 text-center text-xs font-semibold text-muted-foreground w-9">#</th>
                  <th className="sticky left-9 z-20 bg-muted/90 px-3 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[170px] border-r">STUDENT</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-16">ROLL</th>
                  {columns.map(col => (
                    <th key={col.examId} className="px-2 py-2 text-center min-w-[100px] border-l border-muted">
                      <div className="font-semibold text-xs truncate max-w-[96px] mx-auto">{col.subject}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Max {col.maxMarks}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{format(new Date(col.date), "d MMM yy")}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[90px] border-l">TOTAL</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-16">%</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-14 border-r">GRADE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const stats = rowStats(row);
                  return (
                    <tr
                      key={row.studentId}
                      className={cn("border-b transition-colors hover:bg-accent/30", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-2 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="sticky left-9 z-10 bg-inherit px-3 py-2 border-r">
                        <div className="font-medium leading-tight">{row.name}</div>
                        {row.section && <div className="text-[10px] text-muted-foreground">Section {row.section}</div>}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{row.rollNo || "—"}</td>
                      {columns.map(col => {
                        const cell = row.marks[col.examId];
                        const pct = cell?.isAbsent ? 0 : ((cell?.value ?? 0) / col.maxMarks) * 100;
                        return (
                          <td key={col.examId} className="px-2 py-1.5 text-center border-l border-muted/40">
                            {cell?.isAbsent ? (
                              <button
                                onClick={() => toggleAbsent(row.studentId, col.examId)}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                                title="Click to unmark absent"
                              >
                                AB
                              </button>
                            ) : (
                              <div className="flex items-center gap-0.5 justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={col.maxMarks}
                                  value={cell?.value === 0 && !cell?.isDirty ? "" : (cell?.value ?? "")}
                                  onChange={e => updateMark(row.studentId, col.examId, parseInt(e.target.value) || 0)}
                                  placeholder="—"
                                  className={cn(
                                    "w-14 h-7 text-center text-sm rounded border outline-none focus:ring-1 focus:ring-primary transition-all bg-background px-1",
                                    cellBg(pct, cell?.isDirty ?? false)
                                  )}
                                />
                                <button
                                  onClick={() => toggleAbsent(row.studentId, col.examId)}
                                  className="opacity-30 hover:opacity-80 text-red-500 text-[10px] transition-opacity"
                                  title="Mark absent"
                                >✕</button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className={cn(
                        "px-3 py-2 text-center text-sm font-semibold border-l",
                        stats.pct >= 33 ? "text-foreground" : "text-red-600"
                      )}>
                        {stats.totalObt}<span className="text-muted-foreground font-normal text-xs">/{stats.totalMax}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-medium">{stats.pct}%</td>
                      <td className={cn("px-3 py-2 text-center text-sm border-r", stats.grade.cls)}>
                        {stats.grade.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/60 font-medium">
                  <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide sticky left-0">
                    Class Stats
                  </td>
                  {columns.map(col => {
                    const s = colStats(col);
                    return (
                      <td key={col.examId} className="px-2 py-2 text-center border-l border-muted/40">
                        {s ? (
                          <div className="text-xs space-y-0.5">
                            <div className="font-semibold">Avg: {s.avg}</div>
                            <div className="text-muted-foreground text-[10px]">High: {s.high}</div>
                            <div className={cn("font-medium text-[10px]", s.passCount === s.total ? "text-emerald-600" : "text-orange-600")}>
                              {s.passCount}/{s.total} pass
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                  <td colSpan={3} className="border-l" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grade legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 border-t bg-muted/20 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Grade Scale (Default):</span>
            {[["A1","≥91","text-emerald-600"],["A2","81–90","text-green-600"],["B1","71–80","text-blue-600"],
              ["B2","61–70","text-blue-500"],["C1","51–60","text-yellow-600"],["C2","41–50","text-orange-600"],
              ["D","33–40","text-orange-800"],["E","<33","text-red-600"]].map(([g, r, c]) => (
              <span key={g} className={cn("font-bold", c)}>
                {g} <span className="font-normal text-muted-foreground">({r})</span>
              </span>
            ))}
            <span className="ml-auto text-yellow-600 font-medium">Yellow border = unsaved · AB = Absent</span>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {loaded && rows.length === 0 && (
        <Card className="py-16 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">No students found for this class/section</p>
          <p className="text-sm text-muted-foreground mt-1">Add students in the Students module first</p>
        </Card>
      )}

      {!loaded && !loadingGrid && (
        <Card className="py-14 text-center border-dashed">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-muted-foreground font-medium">Select class and exam, then click Load</p>
          <p className="text-xs text-muted-foreground mt-1">Students and marks will appear in a grid below</p>
        </Card>
      )}
    </div>
  );
}
