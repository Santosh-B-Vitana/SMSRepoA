
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Award, Loader2, AlertCircle, BadgeCheck, Search, GraduationCap, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { toast } from "sonner";

export function MyClassesManager() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<MyClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        // No section-specific assignments - show one class-level card
        const deduped = [...new Set(classSubjects)];
        const isClassTeacher = classLevel.some(a => a.isClassTeacher);
        const rep = classLevel.find(a => a.isClassTeacher) ?? classLevel[0];
        result.push({ key: `${rep.classId}|`, rep, subjects: deduped, isClassTeacher });
      }
    }
    return result;
  }, [assignments]);

  // Derived stats
  const classTeacherCount = classCards.filter(c => c.isClassTeacher).length;
  const allSubjects = useMemo(() => {
    const seen = new Set<string>();
    classCards.forEach(c => c.subjects.forEach(s => seen.add(s)));
    return seen.size;
  }, [classCards]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return classCards;
    const q = searchQuery.toLowerCase();
    return classCards.filter(({ rep, subjects }) => {
      const label = `${rep.className}${rep.sectionName ? ` ${rep.sectionName}` : ""}`.toLowerCase();
      return label.includes(q) || subjects.some(s => s.toLowerCase().includes(q));
    });
  }, [classCards, searchQuery]);

  const classTeacherCards = filtered.filter(c => c.isClassTeacher);
  const teachingCards     = filtered.filter(c => !c.isClassTeacher);

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
          <p>Loading your classes...</p>
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
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">My Classes</h1>
        <p className="text-muted-foreground">
          {classCards.length} class{classCards.length !== 1 ? "es" : ""} assigned this academic year
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{classCards.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Classes</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <GraduationCap className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{classTeacherCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Class Teacher</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{allSubjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Subjects</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder="Search by class, section, or subject..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* No search results */}
      {filtered.length === 0 && searchQuery && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-muted-foreground">No classes match "{searchQuery}"</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Class Teacher section */}
      {classTeacherCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-green-700" />
            <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
              Class Teacher
            </h2>
            <span className="text-xs text-muted-foreground">
              - {classTeacherCards.length} class{classTeacherCards.length !== 1 ? "es" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classTeacherCards.map(({ rep, subjects }) => (
              <ClassCard
                key={`${rep.classId}|${rep.sectionId ?? ""}`}
                rep={rep}
                subjects={subjects}
                isClassTeacher
                onManage={() => navigate(`/staff-class/${rep.assignmentId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Teaching Classes section — grouped by subject */}
      {teachingCards.length > 0 && (
        <section className="space-y-5">
          {classTeacherCards.length > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
                Teaching Classes
              </h2>
              <span className="text-xs text-muted-foreground">
                - {teachingCards.length} class{teachingCards.length !== 1 ? "es" : ""}
              </span>
            </div>
          )}
          {/* Group cards by subject combination */}
          {Array.from(
            teachingCards.reduce((map, card) => {
              const key = card.subjects.length > 0 ? [...card.subjects].sort().join(", ") : "Other";
              const group = map.get(key) ?? [];
              group.push(card);
              map.set(key, group);
              return map;
            }, new Map<string, typeof teachingCards>())
          ).map(([subjectKey, cards]) => (
            <div key={subjectKey} className="space-y-2">
              <div className="flex items-center gap-2 pl-1">
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                <span className="text-sm font-medium text-foreground">{subjectKey}</span>
                <span className="text-xs text-muted-foreground">({cards.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cards.map(({ rep, subjects }) => (
                  <ClassCard
                    key={`${rep.classId}|${rep.sectionId ?? ""}`}
                    rep={rep}
                    subjects={subjects}
                    isClassTeacher={false}
                    onManage={() => navigate(`/staff-class/${rep.assignmentId}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// --- Class Card ---

function ClassCard({
  rep,
  subjects,
  isClassTeacher,
  onManage,
}: {
  rep: MyClassAssignment;
  subjects: string[];
  isClassTeacher: boolean;
  onManage: () => void;
}) {
  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4 ${
        isClassTeacher
          ? "border-l-green-500 bg-gradient-to-br from-green-50/40 to-transparent"
          : "border-l-primary"
      }`}
      onClick={onManage}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className={`h-4 w-4 flex-shrink-0 ${isClassTeacher ? "text-green-600" : "text-primary"}`} />
            <span className="text-base font-semibold truncate">
              {rep.className}
              {rep.sectionName ? ` - ${rep.sectionName}` : ""}
            </span>
          </div>
          {isClassTeacher && (
            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 flex items-center gap-1 text-xs whitespace-nowrap shrink-0">
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
            <div className="flex justify-between text-sm gap-4">
              <span className="text-muted-foreground shrink-0">Subjects</span>
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
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span>You can manage attendance for this class</span>
            </div>
          )}
          <Button
            className={`w-full transition-colors ${isClassTeacher ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            variant={isClassTeacher ? "default" : "default"}
            size="sm"
            onClick={e => { e.stopPropagation(); onManage(); }}
          >
            Manage Class
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

