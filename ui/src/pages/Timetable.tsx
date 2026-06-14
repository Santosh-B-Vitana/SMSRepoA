
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, BookOpen, Sun, AlertTriangle, UserCheck, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TimetableManager from "./academics/TimetableManager";
import HolidayManager from "@/components/timetable/HolidayManager";
import { StaffTimetableView } from "@/components/timetable/StaffTimetableView";
import { academicApi } from "@/services/api/academicApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import { timetableApi, type TeacherScheduleEntry, type TeacherScheduleResponse } from "@/services/api/timetableApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const PERIOD_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-amber-100 text-amber-800 border-amber-200",
];

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Teacher Schedule Panel ────────────────────────────────────────────────────

function TeacherSchedulePanel() {
  const [allStaff, setAllStaff] = useState<StaffBasic[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [scheduleData, setScheduleData] = useState<TeacherScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    setStaffLoading(true);
    staffApi.getTeachingStaff()
      .then((res) => setAllStaff(res.staff ?? []))
      .catch(() => toast.error("Failed to load teachers"))
      .finally(() => setStaffLoading(false));
  }, []);

  const loadSchedule = async (teacherId: string) => {
    if (!teacherId) return;
    setLoading(true);
    setScheduleData(null);
    try {
      const data = await timetableApi.getTeacherSchedule(teacherId);
      setScheduleData(data);
    } catch {
      toast.error("Failed to load teacher schedule");
    } finally {
      setLoading(false);
    }
  };

  const schedule: TeacherScheduleEntry[] = scheduleData?.schedule ?? [];

  // Build period slot list (unique period numbers from schedule)
  const periodNumbers = [...new Set(schedule.map((e) => e.periodNumber))].sort((a, b) => a - b);

  // Build map: day-period → entries (may have conflicts)
  const slotMap: Record<string, TeacherScheduleEntry[]> = {};
  for (const entry of schedule) {
    const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(entry);
  }

  // Get time for a period number
  const getPeriodTime = (periodNumber: number): string => {
    const entry = schedule.find((e) => e.periodNumber === periodNumber);
    if (!entry) return "";
    return `${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`;
  };

  // Detect conflicts: same teacher, same day, same period → multiple classes
  const conflictKeys = Object.entries(slotMap)
    .filter(([, entries]) => entries.length > 1)
    .map(([key]) => key);

  const hasConflicts = conflictKeys.length > 0;

  const selectedTeacher = allStaff.find((s) => s.id === selectedTeacherId);

  return (
    <div className="space-y-5">
      {/* Teacher selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[260px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Select Teacher
              </label>
              <Select
                value={selectedTeacherId}
                onValueChange={(v) => {
                  setSelectedTeacherId(v);
                  loadSchedule(v);
                }}
                disabled={staffLoading}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue
                    placeholder={staffLoading ? "Loading teachers…" : "Choose a teacher to view schedule"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {allStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name ?? `${s.firstName} ${s.lastName}`}
                      {s.designation && (
                        <span className="text-xs text-muted-foreground ml-2">· {s.designation}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scheduleData && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span className="font-semibold text-foreground">{scheduleData.teacherName}</span>
                {" "}· {scheduleData.totalPeriods} periods/week
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflict alert */}
      {hasConflicts && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold text-sm">
              {conflictKeys.length} scheduling conflict{conflictKeys.length > 1 ? "s" : ""} detected
            </p>
            <p className="text-xs mt-0.5 text-red-700">
              {selectedTeacher?.name ?? "This teacher"} is assigned to multiple classes during the same period.
              Review and resolve conflicts below.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !selectedTeacherId && (
        <Card className="py-14 text-center border-dashed">
          <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
          <p className="font-semibold text-muted-foreground">Select a teacher above</p>
          <p className="text-xs text-muted-foreground mt-1">
            Their full weekly schedule will appear here, with conflicts highlighted
          </p>
        </Card>
      )}

      {!loading && selectedTeacherId && scheduleData && schedule.length === 0 && (
        <Card className="py-14 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
          <p className="font-semibold text-muted-foreground">No schedule found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {scheduleData.teacherName} has not been assigned any timetable periods yet.
          </p>
        </Card>
      )}

      {/* Schedule grid */}
      {!loading && schedule.length > 0 && (
        <Card className="overflow-hidden border">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/60 border-b-2">
                  <TableHead className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-12 border-r">
                    Period
                  </TableHead>
                  <TableHead className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-28 border-r">
                    Time
                  </TableHead>
                  {DAYS.map((day) => (
                    <TableHead
                      key={day}
                      className="px-2 py-3 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[130px]"
                    >
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodNumbers.map((periodNum) => (
                  <TableRow key={periodNum} className="border-b hover:bg-accent/5">
                    <TableCell className="px-3 py-2 font-bold text-xs text-primary border-r">
                      P{periodNum}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[11px] text-muted-foreground font-mono border-r whitespace-nowrap">
                      {getPeriodTime(periodNum)}
                    </TableCell>
                    {DAYS.map((day) => {
                      const key = `${day}-${periodNum}`;
                      const entries = slotMap[key] ?? [];
                      const isConflict = entries.length > 1;

                      return (
                        <TableCell
                          key={day}
                          className={cn("p-1.5 align-top", isConflict && "bg-red-50")}
                        >
                          {entries.length === 0 ? (
                            <div className="min-h-[60px] rounded-lg border-dashed border-2 border-muted-foreground/15" />
                          ) : (
                            <div className="flex flex-col gap-1">
                              {entries.map((entry, idx) => (
                                <div
                                  key={entry.periodId}
                                  className={cn(
                                    "rounded-lg border-2 p-2 text-[11px] leading-snug",
                                    isConflict
                                      ? "border-red-300 bg-red-100 text-red-900"
                                      : PERIOD_COLORS[idx % PERIOD_COLORS.length]
                                  )}
                                >
                                  <div className="font-bold truncate">
                                    {entry.className ?? "Unknown Class"}
                                    {entry.sectionName && (
                                      <span className="font-normal ml-0.5">({entry.sectionName})</span>
                                    )}
                                  </div>
                                  {entry.subjectName && (
                                    <div className="opacity-80 truncate mt-0.5">{entry.subjectName}</div>
                                  )}
                                  {entry.room && (
                                    <div className="opacity-60 mt-0.5">Room {entry.room}</div>
                                  )}
                                  {isConflict && (
                                    <div className="flex items-center gap-1 mt-1 text-red-700 font-semibold">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>Conflict</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              <span className="font-semibold text-foreground">{scheduleData.totalPeriods}</span> periods/week
            </span>
            {hasConflicts && (
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {conflictKeys.length} conflict{conflictKeys.length > 1 ? "s" : ""}
              </span>
            )}
            {!hasConflicts && (
              <span className="text-green-600 font-medium">No scheduling conflicts</span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded border-2 border-red-300 bg-red-100" />
                Conflict
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded border-2 border-blue-200 bg-blue-100" />
                Assigned
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded border-2 border-dashed border-muted-foreground/25" />
                Free
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Timetable Page ───────────────────────────────────────────────────────

export default function Timetable() {
  const { academicYear } = useAcademicYear();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeTeachers: 0,
    periodsPerDay: 8,
    workingDays: 5,
    upcomingHolidays: 0
  });

  useEffect(() => {
    if (!isAdmin) return;
    Promise.allSettled([
      academicApi.listClasses(1, 500),
      staffApi.list(),
      timetableApi.list(undefined, 1, 1),
    ]).then(([classRes, staffRes]) => {
      setStats(prev => ({
        ...prev,
        totalClasses: classRes.status === 'fulfilled' ? (classRes.value.total ?? 0) : prev.totalClasses,
        activeTeachers: staffRes.status === 'fulfilled' ? (staffRes.value.total ?? staffRes.value.staff?.length ?? 0) : prev.activeTeachers,
      }));
    });
  }, [academicYear, isAdmin]);

  // Staff (non-admin): show personal timetable
  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-display flex items-center gap-3">
            <Clock className="h-8 w-8" />
            {t('timetable.myTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('timetable.myDesc')}
          </p>
        </div>
        <StaffTimetableView />
      </div>
    );
  }

  // Admin: full timetable management
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
            <Clock className="h-8 w-8" />
            {t('timetable.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('timetable.desc')}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('timetable.totalClasses')}</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalClasses}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('timetable.activeSchedules')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('timetable.periodsPerDay')}</p>
                <h3 className="text-2xl font-bold mt-2">{stats.periodsPerDay}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stats.workingDays} {t('timetable.workingDays')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('timetable.activeTeachers')}</p>
                <h3 className="text-2xl font-bold mt-2">{stats.activeTeachers}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('timetable.teachingStaff')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('timetable.upcomingHolidays')}</p>
                <h3 className="text-2xl font-bold mt-2">{stats.upcomingHolidays}</h3>
                <p className="text-xs text-orange-600 mt-1">{t('timetable.next30Days')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Sun className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timetable" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="timetable" className="flex items-center gap-2 py-3">
            <Clock className="h-4 w-4" />
            {t('timetable.tabTimetable')}
          </TabsTrigger>
          <TabsTrigger value="teacher-schedule" className="flex items-center gap-2 py-3">
            <UserCheck className="h-4 w-4" />
            Teacher Schedule
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2 py-3">
            <Sun className="h-4 w-4" />
            {t('timetable.tabHolidays')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timetable" className="mt-6">
          <TimetableManager />
        </TabsContent>

        <TabsContent value="teacher-schedule" className="mt-6">
          <TeacherSchedulePanel />
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <HolidayManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
