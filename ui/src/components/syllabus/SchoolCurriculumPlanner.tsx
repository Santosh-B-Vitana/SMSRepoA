import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BookOpen, ChevronDown, ChevronRight, Loader2, Filter, Download,
  CheckCircle2, Circle, Clock, AlertCircle
} from "lucide-react";
import { syllabusApi, SyllabusUnit } from "@/services/api/syllabusApi";
import { academicApi, ClassBasic, ClassSubjectResponse } from "@/services/api/academicApi";

const CURR_YR = new Date().getFullYear();
const CURRENT_YEAR = `${CURR_YR}-${CURR_YR + 1}`;

interface CurriculumClass {
  class: ClassBasic;
  subjects: ClassSubjectResponse[];
}

interface CurriculumData {
  class: ClassBasic;
  subject: ClassSubjectResponse;
  units: SyllabusUnit[];
  loading?: boolean;
  error?: string;
}

export function SchoolCurriculumPlanner() {
  const [curriculum, setCurriculum] = useState<CurriculumData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  useEffect(() => {
    loadSchoolCurriculum();
  }, []);

  const loadSchoolCurriculum = async () => {
    setLoading(true);
    try {
      // Get all classes
      const classesResponse = await academicApi.listClasses(1, 100);
      const allClasses = classesResponse.classes;

      // For each class, get subjects and then get curriculum for each subject
      const curriculumData: CurriculumData[] = [];

      for (const cls of allClasses) {
        try {
          const subjects = await academicApi.getClassSubjects(cls.id);
          
          for (const subject of subjects) {
            try {
              const units = await syllabusApi.getUnits(cls.id, subject.subjectId, CURRENT_YEAR, true);
              curriculumData.push({
                class: cls,
                subject,
                units: units || [],
              });
            } catch (error) {
              curriculumData.push({
                class: cls,
                subject,
                units: [],
                error: "Failed to load units",
              });
            }
          }
        } catch (error) {
          console.error(`Failed to load subjects for class ${cls.id}:`, error);
        }
      }

      // Sort by class name and subject name
      curriculumData.sort((a, b) => {
        const classCompare = a.class.name.localeCompare(b.class.name);
        return classCompare !== 0 ? classCompare : a.subject.subjectName.localeCompare(b.subject.subjectName);
      });

      setCurriculum(curriculumData);
      toast.success(`Loaded curriculum for ${curriculumData.length} class-subject combinations`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load curriculum";
      toast.error(msg);
      setCurriculum([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCurriculum = curriculum.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      item.class.name.toLowerCase().includes(search) ||
      item.subject.subjectName.toLowerCase().includes(search) ||
      item.subject.code?.toLowerCase().includes(search)
    );
  });

  const groupedByClass = filteredCurriculum.reduce((acc, item) => {
    const key = item.class.id;
    if (!acc[key]) acc[key] = { class: item.class, subjects: [] };
    acc[key].subjects.push(item);
    return acc;
  }, {} as Record<string, { class: ClassBasic; subjects: CurriculumData[] }>);

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: string }> = {
      pending: { label: "Pending", variant: "outline" },
      in_progress: { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "default" },
    };
    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            School Curriculum
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Complete curriculum overview for all classes and subjects
          </p>
        </div>
        <Button onClick={loadSchoolCurriculum} variant="outline" size="sm">
          <Loader2 className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search by class, subject, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{Object.keys(groupedByClass).length}</p>
              <p className="text-sm text-gray-500">Classes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{filteredCurriculum.length}</p>
              <p className="text-sm text-gray-500">Class-Subject</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {filteredCurriculum.reduce((sum, item) => sum + item.units.length, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Units</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {filteredCurriculum.reduce((sum, item) =>
                  sum + item.units.reduce((u, unit) => u + (unit.completionPercentage || 0) / item.units.length, 0), 0
                ).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">Avg Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Curriculum List */}
      <div className="space-y-4">
        {Object.entries(groupedByClass).length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No curriculum found</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByClass).map(([classId, { class: cls, subjects }]) => (
            <Card key={classId}>
              <Collapsible
                open={expandedClass === classId}
                onOpenChange={() => setExpandedClass(expandedClass === classId ? null : classId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {expandedClass === classId ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                      <div>
                        <h3 className="font-semibold">{cls.name}</h3>
                        <p className="text-sm text-gray-500">{subjects.length} subjects</p>
                      </div>
                    </div>
                    <Badge variant="outline">{subjects.length} Subjects</Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t">
                  <div className="p-4 space-y-3">
                    {subjects.map((item, idx) => (
                      <div key={idx} className="ml-4 p-3 bg-gray-50 rounded-lg">
                        <Collapsible
                          open={expandedUnit === `${classId}-${item.subject.subjectId}`}
                          onOpenChange={() =>
                            setExpandedUnit(
                              expandedUnit === `${classId}-${item.subject.subjectId}`
                                ? null
                                : `${classId}-${item.subject.subjectId}`
                            )
                          }
                        >
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer p-2 hover:bg-gray-100 rounded flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {expandedUnit === `${classId}-${item.subject.subjectId}` ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{item.subject.subjectName}</p>
                                  <p className="text-xs text-gray-500">{item.units.length} units</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.units.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${getProgressColor(
                                          item.units.reduce((sum, u) => sum + (u.completionPercentage || 0), 0) /
                                          item.units.length
                                        )}`}
                                        style={{
                                          width: `${
                                            item.units.reduce((sum, u) => sum + (u.completionPercentage || 0), 0) /
                                            item.units.length
                                          }%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-600 w-8">
                                      {Math.round(
                                        item.units.reduce((sum, u) => sum + (u.completionPercentage || 0), 0) /
                                        item.units.length
                                      )}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="ml-6 mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
                            {item.units.length === 0 ? (
                              <p className="text-xs text-gray-500 py-2">No units created yet</p>
                            ) : (
                              item.units.map((unit) => (
                                <div
                                  key={unit.id}
                                  className="p-2 text-sm bg-white rounded border border-gray-200 hover:border-gray-300"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        Unit {unit.unitNumber}: {unit.title}
                                      </div>
                                      <p className="text-xs text-gray-500 line-clamp-1">{unit.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                      {getStatusBadge(unit.status)}
                                      <div className="text-right">
                                        <p className="text-xs font-medium">
                                          {unit.completedTopics}/{unit.totalTopics} topics
                                        </p>
                                        <p className="text-xs text-gray-500">{unit.completionPercentage}%</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
