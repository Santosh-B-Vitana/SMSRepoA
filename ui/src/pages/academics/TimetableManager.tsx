import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Loader2, Trash2, AlertTriangle, Printer, MapPin, X, LayoutGrid, CalendarClock, RefreshCw, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timetableApi, TimetableRecord, TimetablePeriod } from "@/services/api/timetableApi";
import { academicApi, ClassResponse, AcademicYearResponse, ClassSubjectResponse } from "@/services/api/academicApi";
import { staffApi, StaffBasic } from "@/services/api/staffApi";

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

interface PeriodSlot {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
}

const PERIOD_SLOTS: PeriodSlot[] = [
  { periodNumber: 1, label: "P1", startTime: "08:00", endTime: "08:45" },
  { periodNumber: 2, label: "P2", startTime: "08:45", endTime: "09:30" },
  { periodNumber: 3, label: "P3", startTime: "09:45", endTime: "10:30" },
  { periodNumber: 4, label: "P4", startTime: "10:30", endTime: "11:15" },
  { periodNumber: 5, label: "P5", startTime: "11:15", endTime: "12:00" },
  { periodNumber: 6, label: "P6", startTime: "12:30", endTime: "13:15" },
  { periodNumber: 7, label: "P7", startTime: "13:15", endTime: "14:00" },
  { periodNumber: 8, label: "P8", startTime: "14:00", endTime: "14:45" },
];

// break row shown BEFORE period at this index (0-based in PERIOD_SLOTS)
const BREAK_BEFORE_IDX: Record<number, { label: string; time: string }> = {
  2: { label: "Short Break",  time: "9:30 – 9:45 AM" },
  5: { label: "Lunch Break",  time: "12:00 – 12:30 PM" },
};

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-red-100 text-red-800 border-red-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-lime-100 text-lime-800 border-lime-200",
  "bg-rose-100 text-rose-800 border-rose-200",
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function TimetableManager() {
  // Lookup data
  const [allClasses, setAllClasses]     = useState<ClassResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [teachers, setTeachers]         = useState<StaffBasic[]>([]);

  // Filters
  const [selectedYear, setSelectedYear]         = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedSection, setSelectedSection]   = useState("");

  // Timetable data
  const [activeTimetable, setActiveTimetable] = useState<TimetableRecord | null>(null);
  const [periodsMap, setPeriodsMap]           = useState<Record<string, TimetablePeriod>>({});

  // Edit cell dialog
  const [editCell, setEditCell]   = useState<{ day: string; period: number } | null>(null);
  const [editForm, setEditForm]   = useState({ subjectId: "", teacherId: "", room: "", notes: "" });
  const [cellSaving, setCellSaving] = useState(false);

  // Loading flags
  const [loadingFilters, setLoadingFilters]     = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [loadingSubjects, setLoadingSubjects]   = useState(false);
  const [creating, setCreating]                 = useState(false);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const availableStandards = useMemo(
    () => [...new Set(allClasses.map(c => c.standard))].sort(
      (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)
    ),
    [allClasses]
  );

  const availableSections = useMemo(
    () => selectedStandard
      ? allClasses.filter(c => c.standard === selectedStandard).map(c => c.section).sort()
      : [],
    [allClasses, selectedStandard]
  );

  const selectedClassObj = useMemo(
    () => allClasses.find(c => c.standard === selectedStandard && c.section === selectedSection) ?? null,
    [allClasses, selectedStandard, selectedSection]
  );

  const subjectColorIdx = useMemo(() => {
    const map: Record<string, number> = {};
    classSubjects.forEach((cs, i) => { map[cs.subjectId] = i % SUBJECT_COLORS.length; });
    return map;
  }, [classSubjects]);

  const getSubjectColor = (subjectId: string) =>
    SUBJECT_COLORS[subjectColorIdx[subjectId] ?? 0];

  const getSubjectName = (subjectId?: string) =>
    classSubjects.find(s => s.subjectId === subjectId)?.subjectName ?? subjectId ?? "";

  const getTeacherShortName = (teacherId?: string) => {
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return "";
    const full = (t.name ?? `${t.firstName} ${t.lastName}`).trim();
    const parts = full.split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : full;
  };

  const openCellKey = editCell ? `${editCell.day}-${editCell.period}` : null;
  const existingPeriod = openCellKey ? (periodsMap[openCellKey] ?? null) : null;

  // Subject in cells with teacher assignments count
  const assignedCount = Object.values(periodsMap).filter(p => p.subjectId).length;
  const totalSlots = PERIOD_SLOTS.length * DAYS.length;

  // ─── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    setLoadingFilters(true);
    Promise.all([
      academicApi.listClasses(1, 500),
      academicApi.listAcademicYears(1, 50),
      staffApi.list(),
    ]).then(([c, y, s]) => {
      setAllClasses(c.classes || []);
      setAcademicYears(y.academicYears || []);
      setTeachers(s.staff || []);
    }).catch(() => {}).finally(() => setLoadingFilters(false));
  }, []);

  // ─── Load class subjects when class changes ──────────────────────────────
  useEffect(() => {
    if (!selectedClassObj) { setClassSubjects([]); return; }
    setLoadingSubjects(true);
    academicApi.getClassSubjects(selectedClassObj.id)
      .then(data => setClassSubjects(Array.isArray(data) ? data : []))
      .catch(() => setClassSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, [selectedClassObj?.id]);

  // ─── Load timetable when class + year change ─────────────────────────────
  useEffect(() => {
    if (!selectedClassObj || !selectedYear) {
      setActiveTimetable(null);
      setPeriodsMap({});
      return;
    }
    loadTimetableData();
  }, [selectedClassObj?.id, selectedYear]);

  const loadTimetableData = async () => {
    if (!selectedClassObj || !selectedYear) return;
    setLoadingTimetable(true);
    try {
      const res = await timetableApi.list(selectedClassObj.id, 1, 50);
      const tt = (res.timetables || []).find(t => t.academicYear === selectedYear) ?? null;
      if (!tt) { setActiveTimetable(null); setPeriodsMap({}); return; }
      setActiveTimetable(tt);
      const periodsRes = await timetableApi.getPeriods(tt.id);
      const map: Record<string, TimetablePeriod> = {};
      for (const p of periodsRes.periods || []) {
        if (p.subjectId) map[`${p.dayOfWeek}-${p.periodNumber}`] = p;
      }
      setPeriodsMap(map);
    } catch {
      toast.error("Failed to load timetable");
    } finally {
      setLoadingTimetable(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleInitTimetable = async () => {
    if (!selectedClassObj || !selectedYear) return;
    setCreating(true);
    try {
      const tt = await timetableApi.create({
        SchoolId: "00000000-0000-0000-0000-000000000000",
        ClassId: selectedClassObj.id,
        AcademicYear: selectedYear,
        Status: "active",
      });
      setActiveTimetable(tt);
      setPeriodsMap({});
      toast.success("Timetable initialized — click any cell to assign subjects");
    } catch {
      toast.error("Failed to initialize timetable");
    } finally {
      setCreating(false);
    }
  };

  const handleCellClick = (day: string, slot: PeriodSlot) => {
    if (!activeTimetable) return;
    const key = `${day}-${slot.periodNumber}`;
    const existing = periodsMap[key];
    setEditCell({ day, period: slot.periodNumber });
    setEditForm({
      subjectId:  existing?.subjectId  ?? "",
      teacherId:  existing?.teacherId  ?? "",
      room:       existing?.room       ?? "",
      notes:      existing?.notes      ?? "",
    });
  };

  const handleSubjectChange = (subjectId: string) => {
    const cs = classSubjects.find(s => s.subjectId === subjectId);
    setEditForm(f => ({ ...f, subjectId, teacherId: cs?.teacherId ?? f.teacherId }));
  };

  const handleSaveCell = async () => {
    if (!editCell || !activeTimetable || !editForm.subjectId) return;
    const key    = `${editCell.day}-${editCell.period}`;
    const slot   = PERIOD_SLOTS.find(s => s.periodNumber === editCell.period)!;
    const existing = periodsMap[key];
    setCellSaving(true);
    try {
      let saved: TimetablePeriod;
      if (existing) {
        saved = await timetableApi.updatePeriod(existing.id, {
          SubjectId:  editForm.subjectId,
          TeacherId:  editForm.teacherId || undefined,
          Room:       editForm.room      || undefined,
          Notes:      editForm.notes     || undefined,
          PeriodType: "class",
        });
      } else {
        saved = await timetableApi.createPeriod({
          TimetableId: activeTimetable.id,
          DayOfWeek:   editCell.day,
          PeriodNumber: editCell.period,
          StartTime:   slot.startTime + ":00",
          EndTime:     slot.endTime   + ":00",
          SubjectId:   editForm.subjectId,
          TeacherId:   editForm.teacherId || undefined,
          Room:        editForm.room      || undefined,
          Notes:       editForm.notes     || undefined,
          PeriodType:  "class",
        });
      }
      setPeriodsMap(prev => ({ ...prev, [key]: saved }));
      setEditCell(null);
      toast.success("Period saved");
    } catch {
      toast.error("Failed to save period");
    } finally {
      setCellSaving(false);
    }
  };

  const handleClearCell = async () => {
    if (!editCell) return;
    const key = `${editCell.day}-${editCell.period}`;
    const existing = periodsMap[key];
    if (!existing) { setEditCell(null); return; }
    setCellSaving(true);
    try {
      await timetableApi.deletePeriod(existing.id);
      setPeriodsMap(prev => { const n = { ...prev }; delete n[key]; return n; });
      setEditCell(null);
      toast.success("Period cleared");
    } catch {
      toast.error("Failed to clear period");
    } finally {
      setCellSaving(false);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!activeTimetable) return;
    if (!confirm(`Delete the entire timetable for Class ${selectedStandard}-${selectedSection} (${selectedYear})? This cannot be undone.`)) return;
    try {
      await timetableApi.delete(activeTimetable.id);
      setActiveTimetable(null);
      setPeriodsMap({});
      toast.success("Timetable deleted");
    } catch {
      toast.error("Failed to delete timetable");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Filter / Action Bar ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Academic Year
              </Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingFilters ? "Loading…" : "Select year"} />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => (
                    <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Class *
              </Label>
              <Select
                value={selectedStandard}
                onValueChange={v => { setSelectedStandard(v); setSelectedSection(""); }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableStandards.map(s => (
                    <SelectItem key={s} value={s}>Class {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Section *
              </Label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
                disabled={!selectedStandard}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={!selectedStandard ? "Select class first" : "Select section"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map(s => (
                    <SelectItem key={s} value={s}>Section {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTimetable && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-tight">
                <div className="font-semibold text-foreground">Class {selectedStandard}-{selectedSection}</div>
                <div>{assignedCount}/{totalSlots} slots filled</div>
              </div>
            )}

            <div className="flex-1" />

            {activeTimetable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={loadTimetableData}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDeleteTimetable}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Loading ── */}
      {loadingTimetable && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Empty: no class/year selected ── */}
      {!loadingTimetable && (!selectedClassObj || !selectedYear) && (
        <Card className="py-14 text-center border-dashed">
          <LayoutGrid className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Select academic year, class and section</p>
          <p className="text-xs text-muted-foreground mt-1">The weekly timetable grid will appear here</p>
        </Card>
      )}

      {/* ── No timetable yet ── */}
      {!loadingTimetable && selectedClassObj && selectedYear && !activeTimetable && (
        <Card className="py-14 text-center">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/25" />
          <p className="text-lg font-semibold">
            No timetable for Class {selectedStandard}‑{selectedSection} ({selectedYear})
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Initialize a blank timetable, then click any cell to assign subjects and teachers
          </p>
          {classSubjects.length === 0 && !loadingSubjects && (
            <div className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No subjects are assigned to this class yet. Assign subjects under Academic Setup → Classes first.
            </div>
          )}
          <div>
            <Button
              onClick={handleInitTimetable}
              disabled={creating || (classSubjects.length === 0 && !loadingSubjects)}
            >
              {creating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Initializing…</>
                : <>Initialize Timetable for {selectedStandard}‑{selectedSection}</>
              }
            </Button>
          </div>
        </Card>
      )}

      {/* ── Subjects warning (timetable exists but no subjects) ── */}
      {activeTimetable && classSubjects.length === 0 && !loadingSubjects && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            No subjects are assigned to Class {selectedStandard}‑{selectedSection}.
            Go to <strong>Academic Setup → Classes</strong> to assign subjects before filling the timetable.
          </span>
        </div>
      )}

      {/* ── Subject legend ── */}
      {activeTimetable && classSubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subjects:</span>
          {classSubjects.map(cs => (
            <span
              key={cs.subjectId}
              className={cn(
                "text-[11px] px-2.5 py-0.5 rounded-full border font-medium",
                getSubjectColor(cs.subjectId)
              )}
            >
              {cs.subjectName}
              {cs.teacherName && (
                <span className="opacity-60 font-normal ml-1">· {cs.teacherName.split(" ")[0]}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Weekly Timetable Grid ── */}
      {activeTimetable && !loadingTimetable && (
        <Card className="overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="border-b-2 bg-muted/60">
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-12 border-r">
                    Per.
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-24 border-r">
                    Time
                  </th>
                  {DAYS.map(d => (
                    <th
                      key={d}
                      className="px-2 py-3 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[118px]"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIOD_SLOTS.map((slot, idx) => (
                  <tr key={slot.periodNumber + "-wrapper"} className="contents">
                    {/* Break row before this period? */}
                    {BREAK_BEFORE_IDX[idx] && (
                      <tr key={`break-${idx}`}>
                        <td
                          colSpan={8}
                          className="px-3 py-1.5 text-center bg-muted/40 border-y border-border/60"
                        >
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {BREAK_BEFORE_IDX[idx].label}
                            <span className="font-normal mx-1.5 opacity-60">·</span>
                            {BREAK_BEFORE_IDX[idx].time}
                          </span>
                        </td>
                      </tr>
                    )}

                    {/* Period row */}
                    <tr
                      key={slot.periodNumber}
                      className="border-b hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-3 py-2 font-bold text-xs text-primary border-r">{slot.label}</td>
                      <td className="px-2 py-2 text-[11px] text-muted-foreground font-mono border-r whitespace-nowrap">
                        {slot.startTime}
                        <br />
                        <span className="opacity-60">{slot.endTime}</span>
                      </td>

                      {DAYS.map(day => {
                        const key        = `${day}-${slot.periodNumber}`;
                        const period     = periodsMap[key];
                        const hasSubject = !!period?.subjectId;
                        const color      = hasSubject ? getSubjectColor(period.subjectId!) : "";
                        const subName    = hasSubject ? getSubjectName(period.subjectId) : "";
                        const teachShort = hasSubject && period?.teacherId
                          ? getTeacherShortName(period.teacherId) : "";

                        return (
                          <td key={day} className="p-1.5 align-top">
                            <div
                              onClick={() => handleCellClick(day, slot)}
                              className={cn(
                                "min-h-[74px] rounded-lg border-2 cursor-pointer transition-all duration-150",
                                hasSubject
                                  ? `${color} hover:shadow-md hover:scale-[1.03] hover:border-current/40`
                                  : "border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center group"
                              )}
                            >
                              {hasSubject ? (
                                <div className="p-2 h-full">
                                  <div className="font-bold text-[12px] leading-snug">{subName}</div>
                                  {teachShort && (
                                    <div className="text-[10px] mt-1 opacity-70">{teachShort}</div>
                                  )}
                                  {period?.room && (
                                    <div className="text-[10px] mt-0.5 opacity-55 flex items-center gap-0.5">
                                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                                      {period.room}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary/50 transition-colors" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: completion status */}
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              <span className="font-semibold text-foreground">{assignedCount}</span> of {totalSlots} slots assigned
            </span>
            <span>
              <span className="font-semibold text-foreground">{classSubjects.length}</span> subjects configured
            </span>
            <span className="ml-auto text-[11px]">Click any cell to assign · Click filled cell to edit or clear</span>
          </div>
        </Card>
      )}

      {/* ── Edit / Add Cell Dialog ── */}
      <Dialog open={!!editCell} onOpenChange={open => { if (!open && !cellSaving) setEditCell(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editCell && (
                <>
                  <span>{editCell.day}</span>
                  <span className="text-muted-foreground font-normal">·</span>
                  <span>Period {editCell.period}</span>
                  {PERIOD_SLOTS.find(s => s.periodNumber === editCell.period) && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({PERIOD_SLOTS.find(s => s.periodNumber === editCell.period)?.startTime}
                      {" – "}
                      {PERIOD_SLOTS.find(s => s.periodNumber === editCell.period)?.endTime})
                    </span>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Subject */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Subject *
                {loadingSubjects && <Loader2 className="h-3 w-3 inline animate-spin ml-1.5" />}
              </Label>
              <Select
                value={editForm.subjectId}
                onValueChange={handleSubjectChange}
                disabled={loadingSubjects || classSubjects.length === 0}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue
                    placeholder={
                      classSubjects.length === 0
                        ? "No subjects assigned to this class"
                        : "Select subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {classSubjects.map(cs => (
                    <SelectItem key={cs.subjectId} value={cs.subjectId}>
                      <span
                        className={cn(
                          "inline-block w-2 h-2 rounded-full mr-2 align-middle",
                          getSubjectColor(cs.subjectId).split(" ")[0]
                        )}
                      />
                      {cs.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Teacher
              </Label>
              <Select
                value={editForm.teacherId}
                onValueChange={v => setEditForm(f => ({ ...f, teacherId: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select teacher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t.name ?? `${t.firstName} ${t.lastName}`).trim()}
                      {t.designation ? ` · ${t.designation}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room + Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Room
                </Label>
                <Input
                  value={editForm.room}
                  onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))}
                  placeholder="e.g. Room 101"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Notes
                </Label>
                <Input
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={handleSaveCell}
                disabled={cellSaving || !editForm.subjectId}
                className="flex-1"
              >
                {cellSaving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : existingPeriod ? "Update Period" : "Assign Period"
                }
              </Button>
              {existingPeriod && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleClearCell}
                  disabled={cellSaving}
                >
                  <X className="h-4 w-4 mr-1" />Clear
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setEditCell(null)}
                disabled={cellSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
