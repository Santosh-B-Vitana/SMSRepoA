/**
 * StaffTimetableView — personal timetable for teachers/staff
 *
 * Shows the logged-in teacher's own class schedule, resolved server-side
 * from their email. Includes:
 *  • Today's schedule (highlighted)
 *  • Full week grid (Mon–Fri)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timetableApi, TeacherScheduleEntry } from "@/services/api/timetableApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, BookOpen, MapPin, AlertCircle, CalendarDays } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type Day = typeof DAYS[number];

const DAY_SHORT: Record<Day, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

function getTodayName(): Day {
  const d = new Date().getDay(); // 0=Sun,1=Mon,...
  const map: Record<number, Day> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };
  return map[d] ?? "Monday";
}

function formatTime(t: string): string {
  // "HH:MM:SS" → "h:mm AM/PM"
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

const PERIOD_TYPE_COLORS: Record<string, string> = {
  lecture: "bg-blue-50 border-blue-200 text-blue-900",
  lab: "bg-purple-50 border-purple-200 text-purple-900",
  break: "bg-amber-50 border-amber-200 text-amber-800",
  lunch: "bg-green-50 border-green-200 text-green-800",
  free: "bg-gray-50 border-gray-200 text-gray-600",
};

function PeriodCard({ entry, today }: { entry: TeacherScheduleEntry; today: boolean }) {
  const typeColor = PERIOD_TYPE_COLORS[entry.periodType?.toLowerCase() ?? "lecture"] ?? PERIOD_TYPE_COLORS.lecture;
  const isBreak = entry.periodType === "break" || entry.periodType === "lunch";
  return (
    <div
      className={`rounded-lg border p-3 transition-all ${typeColor} ${today ? "shadow-sm ring-1 ring-blue-300" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
        </span>
        <Badge variant="outline" className="text-xs py-0 px-1.5 capitalize">
          {entry.periodType ?? "lecture"}
        </Badge>
      </div>
      {!isBreak && (
        <>
          <p className="font-semibold text-sm truncate flex items-center gap-1 mt-1">
            <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
            {entry.subjectName ?? "—"}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {[entry.className, entry.sectionName].filter(Boolean).join(" – ")}
          </p>
          {entry.room && (
            <p className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {entry.room}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TodaySchedule({ entries }: { entries: TeacherScheduleEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No periods scheduled for today.</p>
      </div>
    );
  }
  const sorted = [...entries].sort((a, b) => a.periodNumber - b.periodNumber);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map(e => (
        <PeriodCard key={e.periodId} entry={e} today />
      ))}
    </div>
  );
}

function WeekGrid({ schedule }: { schedule: TeacherScheduleEntry[] }) {
  const today = getTodayName();
  const byDay = Object.fromEntries(
    DAYS.map(d => [d, schedule.filter(e => e.dayOfWeek === d).sort((a, b) => a.periodNumber - b.periodNumber)])
  ) as Record<Day, TeacherScheduleEntry[]>;

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-3 min-w-[700px]">
        {DAYS.map(day => (
          <div key={day}>
            <div
              className={`text-center text-sm font-semibold py-2 rounded-t-lg mb-2 ${
                day === today
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {DAY_SHORT[day]}
            </div>
            <div className="space-y-2">
              {byDay[day].length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4 border rounded-lg bg-muted/30">
                  Free day
                </p>
              ) : (
                byDay[day].map(e => (
                  <PeriodCard key={e.periodId} entry={e} today={day === today} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffTimetableView() {
  const [view, setView] = useState<"today" | "week">("today");
  const today = getTodayName();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timetable", "my-schedule"],
    queryFn: () => timetableApi.getMySchedule(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const schedule = data?.schedule ?? [];
  const todayEntries = schedule.filter(e => e.dayOfWeek === today);

  const stats = {
    totalPeriods: schedule.filter(e => e.periodType !== "break" && e.periodType !== "lunch").length,
    todayPeriods: todayEntries.filter(e => e.periodType !== "break" && e.periodType !== "lunch").length,
    uniqueClasses: new Set(schedule.map(e => e.classId)).size,
    uniqueSubjects: new Set(schedule.filter(e => e.subjectId).map(e => e.subjectId)).size,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <Card>
        <CardContent className="pt-10 pb-10 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <p className="font-semibold">No timetable assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact your administrator to set up your class assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Periods Today", value: stats.todayPeriods, color: "text-blue-600" },
          { label: "Weekly Periods", value: stats.totalPeriods, color: "text-purple-600" },
          { label: "Classes", value: stats.uniqueClasses, color: "text-green-600" },
          { label: "Subjects", value: stats.uniqueSubjects, color: "text-orange-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-3">
              <Clock className={`h-7 w-7 ${color}`} />
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("today")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            view === "today"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-background border-border hover:border-blue-400"
          }`}
        >
          Today ({today})
        </button>
        <button
          onClick={() => setView("week")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            view === "week"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-background border-border hover:border-blue-400"
          }`}
        >
          Full Week
        </button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {view === "today" ? `Today's Schedule — ${today}` : "Weekly Schedule"}
          </CardTitle>
          {data && (
            <p className="text-sm text-muted-foreground">{data.teacherName}</p>
          )}
        </CardHeader>
        <CardContent>
          {view === "today" ? (
            <TodaySchedule entries={todayEntries} />
          ) : (
            <WeekGrid schedule={schedule} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
