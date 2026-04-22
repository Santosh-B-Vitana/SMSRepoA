import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BookOpen, GraduationCap, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { academicApi } from "@/services/api/academicApi";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import AcademicYearManager from "./AcademicYearManager";
import ClassManager from "./ClassManager";
import SubjectManager from "./SubjectManager";

interface AcademicStats {
  currentYear: string;
  totalYears: number;
  totalClasses: number;
  totalSubjects: number;
}

function StatTile({
  icon: Icon, label, value, sub, iconColor, iconBg, loading,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  iconColor: string; iconBg: string; loading: boolean;
}) {
  return (
    <Card className="border-l-4 border-l-transparent hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
          )}
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Academics() {
  const [activeTab, setActiveTab] = useState("academic-years");
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { currentYear } = useAcademicYear();

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    Promise.all([
      academicApi.listAcademicYears(1, 50),
      academicApi.listClasses(1, 1),
      academicApi.listSubjects(1, 1),
    ])
      .then(([years, classes, subjects]) => {
        if (cancelled) return;
        const activeYear = years.academicYears.find(y => y.isCurrent || y.status === "active");
        setStats({
          currentYear: activeYear?.name ?? currentYear ?? "—",
          totalYears: years.total,
          totalClasses: classes.total,
          totalSubjects: subjects.total,
        });
      })
      .catch(() => {
        if (!cancelled) setStats({ currentYear: currentYear ?? "—", totalYears: 0, totalClasses: 0, totalSubjects: 0 });
      })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [currentYear]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-50">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border-indigo-200 text-indigo-700">
              Academic Setup
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Academic Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage academic years, class structures, and subject catalogue.
          </p>
        </div>
        {!statsLoading && stats && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">Active year:</span>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-semibold px-2 py-0.5">
              {stats.currentYear}
            </Badge>
          </div>
        )}
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Calendar} label="Active Year"
          value={stats?.currentYear ?? "—"} sub="Current session"
          iconColor="text-indigo-600" iconBg="bg-indigo-50" loading={statsLoading}
        />
        <StatTile
          icon={GraduationCap} label="Total Classes"
          value={stats?.totalClasses ?? "—"} sub="All standards & sections"
          iconColor="text-blue-600" iconBg="bg-blue-50" loading={statsLoading}
        />
        <StatTile
          icon={BookOpen} label="Subjects"
          value={stats?.totalSubjects ?? "—"} sub="Across all classes"
          iconColor="text-teal-600" iconBg="bg-teal-50" loading={statsLoading}
        />
        <StatTile
          icon={Layers} label="Academic Years"
          value={stats?.totalYears ?? "—"} sub="Configured on record"
          iconColor="text-violet-600" iconBg="bg-violet-50" loading={statsLoading}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border mb-6">
          <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
            {[
              { value: "academic-years", icon: Calendar, label: "Academic Years" },
              { value: "classes",        icon: GraduationCap, label: "Classes" },
              { value: "subjects",       icon: BookOpen, label: "Subjects" },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground gap-2"
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="academic-years" className="mt-0">
          <AcademicYearManager />
        </TabsContent>

        <TabsContent value="classes" className="mt-0">
          <ClassManager />
        </TabsContent>

        <TabsContent value="subjects" className="mt-0">
          <SubjectManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}