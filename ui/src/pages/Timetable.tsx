
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, BookOpen, Sun } from "lucide-react";
import TimetableManager from "./academics/TimetableManager";
import HolidayManager from "@/components/timetable/HolidayManager";
import { academicApi } from "@/services/api/academicApi";
import { staffApi } from "@/services/api/staffApi";
import { timetableApi } from "@/services/api/timetableApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export default function Timetable() {
  const { academicYear } = useAcademicYear();
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeTeachers: 0,
    periodsPerDay: 8,
    workingDays: 5,
    upcomingHolidays: 0
  });

  useEffect(() => {
    Promise.allSettled([
      academicApi.listClasses(1, 500),
      staffApi.list(),
      timetableApi.list(undefined, 1, 1),
    ]).then(([classRes, staffRes, ttRes]) => {
      setStats(prev => ({
        ...prev,
        totalClasses: classRes.status === 'fulfilled' ? (classRes.value.total ?? 0) : prev.totalClasses,
        activeTeachers: staffRes.status === 'fulfilled' ? (staffRes.value.total ?? staffRes.value.staff?.length ?? 0) : prev.activeTeachers,
      }));
    });
  }, [academicYear]); // re-fetch KPI stats when year changes

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
            <Clock className="h-8 w-8" />
            Timetable Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage class schedules, teacher assignments, and holidays
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalClasses}</h3>
                <p className="text-xs text-muted-foreground mt-1">Active schedules</p>
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
                <p className="text-sm font-medium text-muted-foreground">Periods Per Day</p>
                <h3 className="text-2xl font-bold mt-2">{stats.periodsPerDay}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stats.workingDays} working days</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                <h3 className="text-2xl font-bold mt-2">{stats.activeTeachers}</h3>
                <p className="text-xs text-muted-foreground mt-1">Teaching staff</p>
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
                <p className="text-sm font-medium text-muted-foreground">Upcoming Holidays</p>
                <h3 className="text-2xl font-bold mt-2">{stats.upcomingHolidays}</h3>
                <p className="text-xs text-orange-600 mt-1">Next 30 days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Sun className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface for Timetable and Holidays */}
      <Tabs defaultValue="timetable" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="timetable" className="flex items-center gap-2 py-3">
            <Clock className="h-4 w-4" />
            Class Timetable
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2 py-3">
            <Sun className="h-4 w-4" />
            Holiday Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timetable" className="mt-6">
          <TimetableManager />
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <HolidayManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
