
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Award, Loader2, AlertCircle, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { toast } from "sonner";

export function MyClassesManager() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<MyClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deduplicate: one card per visible class-section.
  // Class-wide assignments (sectionId=null) are merged into section-specific cards when
  // both exist for the same classId, so we never show two "Class 10" cards.
  const classCards = useMemo(() => {
    // Group all assignments by classId
    const byClass = new Map<string, MyClassAssignment[]>();
    for (const a of assignments) {
      const list = byClass.get(a.classId) ?? [];
      list.push(a);
      byClass.set(a.classId, list);
    }

    const result: { key: string; rep: MyClassAssignment; subjects: string[]; isClassTeacher: boolean }[] = [];

    for (const classAssignments of byClass.values()) {
      const sectionSpecific = classAssignments.filter(a => a.sectionId);
      const classLevel      = classAssignments.filter(a => !a.sectionId);
      const classSubjects   = classLevel.map(a => a.subjectName).filter(Boolean) as string[];

      if (sectionSpecific.length > 0) {
        // Group section-specific rows by sectionId
        const bySection = new Map<string, MyClassAssignment[]>();
        for (const a of sectionSpecific) {
          const list = bySection.get(a.sectionId!) ?? [];
          list.push(a);
          bySection.set(a.sectionId!, list);
        }
        for (const [sectionId, sectionRows] of bySection) {
          const sectionSubjects = sectionRows.map(a => a.subjectName).filter(Boolean) as string[];
          const allSubjects = [...new Set([...classSubjects, ...sectionSubjects])];
          const isClassTeacher = sectionRows.some(a => a.isClassTeacher) || classLevel.some(a => a.isClassTeacher);
          const rep = sectionRows.find(a => a.isClassTeacher) ?? sectionRows[0];
          result.push({ key: `${rep.classId}|${sectionId}`, rep, subjects: allSubjects, isClassTeacher });
        }
        // If there are also class-level assignments that have no section counterpart,
        // suppress them (they're already merged into the section cards above).
      } else {
        // No section-specific assignments — show one class-level card
        const deduped = [...new Set(classSubjects)];
        const isClassTeacher = classLevel.some(a => a.isClassTeacher);
        const rep = classLevel.find(a => a.isClassTeacher) ?? classLevel[0];
        result.push({ key: `${rep.classId}|`, rep, subjects: deduped, isClassTeacher });
      }
    }
    return result;
  }, [assignments]);

  useEffect(() => {
    academicApi
      .getMyClassAssignments()
      .then((data) => setAssignments(data))
      .catch((err) => {
        const msg =
          err?.response?.data?.message ?? err?.message ?? "Failed to load class assignments";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading your classes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground mt-1">Classes you are assigned to teach this academic year</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No classes assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact your administrator to be assigned to a class.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Classes</h1>
        <p className="text-muted-foreground mt-1">
          {classCards.length} class{classCards.length !== 1 ? "es" : ""} assigned this academic year
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classCards.map(({ rep, subjects, isClassTeacher }) => (
          <Card
            key={`${rep.classId}|${rep.sectionId ?? ""}`}
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-base font-semibold">
                    {rep.className}
                    {rep.sectionName ? ` — ${rep.sectionName}` : ""}
                  </span>
                </div>
                {isClassTeacher && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs whitespace-nowrap"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Class Teacher
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Academic Year</span>
                  <span className="font-medium">{rep.academicYear}</span>
                </div>
                {subjects.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subjects</span>
                    <span className="font-medium text-right">{subjects.join(", ")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={rep.status === "active" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {rep.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {isClassTeacher && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1.5">
                    <Award className="h-3.5 w-3.5" />
                    <span>You can manage attendance for this class</span>
                  </div>
                )}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => navigate(`/staff-class/${rep.assignmentId}`)}
                >
                  Manage Class
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
