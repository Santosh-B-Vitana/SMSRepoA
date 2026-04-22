
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, Users, BookOpen, Plus, Sun, Download } from "lucide-react";
import TimetableManager from "./academics/TimetableManager";
import HolidayManager from "@/components/timetable/HolidayManager";

export default function Timetable() {
  const [stats] = useState({
    totalClasses: 45,
    activeTeachers: 28,
    periodsPerDay: 8,
    workingDays: 5,
    totalSubjects: 12,
    upcomingHolidays: 3
  });

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Period
          </Button>
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
