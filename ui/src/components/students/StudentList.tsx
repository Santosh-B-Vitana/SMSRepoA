
import { useState, useEffect } from "react";
import { Search, Filter, Eye, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentBasic } from "@/services/api/studentApi";
import placeholderImg from '/placeholder.svg';
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentListProps {
  students: StudentBasic[];
  onRefresh: () => void;
}

export function StudentList({ students, onRefresh }: StudentListProps) {
  const [view, setView] = useState<"active" | "inactive">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [filteredStudents, setFilteredStudents] = useState<StudentBasic[]>([]);

  const navigate = useNavigate();
  const { t } = useLanguage();

  const activeStudents = students.filter((s) => s.status === "active");
  const inactiveStudents = students.filter((s) => s.status !== "active");
  const sourceStudents = view === "active" ? activeStudents : inactiveStudents;

  // Re-filter whenever source data or filters change
  useEffect(() => {
    let filtered = sourceStudents;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(lower) ||
          (s.admissionNumber ?? '').toLowerCase().includes(lower) ||
          (s.rollNumber ?? '').toLowerCase().includes(lower)
      );
    }

    if (selectedClass !== "all") {
      filtered = filtered.filter((s) => s.class === selectedClass);
    }

    if (selectedSection !== "all") {
      filtered = filtered.filter((s) => s.section === selectedSection);
    }

    setFilteredStudents(filtered);
  }, [students, view, searchTerm, selectedClass, selectedSection]);

  // Reset filters when switching views
  const switchView = (v: "active" | "inactive") => {
    setView(v);
    setSearchTerm("");
    setSelectedClass("all");
    setSelectedSection("all");
  };

  // Build unique class/section options from current source
  const classes = [...new Set(sourceStudents.map((s) => s.class).filter(Boolean))].sort((a, b) =>
    Number(a) - Number(b) || (a ?? '').localeCompare(b ?? '')
  );
  const sections = [...new Set(sourceStudents.map((s) => s.section).filter(Boolean))].sort();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Tab bubble filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => switchView("active")}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            view === "active"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Active Students
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            view === "active" ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>{activeStudents.length}</span>
        </button>

        {inactiveStudents.length > 0 && (
          <button
            onClick={() => switchView("inactive")}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              view === "inactive"
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-background border-orange-200 text-orange-600 hover:bg-orange-50"
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            Inactive Students
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              view === "inactive" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"
            }`}>{inactiveStudents.length}</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("studentList.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder={t("studentList.allClasses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentList.allClasses")}</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {t("studentList.class")} {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger>
            <SelectValue placeholder={t("studentList.allSections")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentList.allSections")}</SelectItem>
            {sections.map((sec) => (
              <SelectItem key={sec} value={sec}>
                {t("studentList.section")} {sec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm("");
            setSelectedClass("all");
            setSelectedSection("all");
          }}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          {t("studentList.clearFilters")}
        </Button>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredStudents.length} of {sourceStudents.length}{" "}
        {view === "active" ? "active" : "inactive"} students
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-semibold">{t("studentList.rollNo")}</TableHead>
                    <TableHead className="font-semibold">{t("studentList.name")}</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">
                      {t("studentList.class")}
                    </TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">
                      Admission No
                    </TableHead>
                    <TableHead className="font-semibold">{t("studentList.status")}</TableHead>
                    <TableHead className="font-semibold text-right">
                      {t("studentList.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`border-border hover:bg-muted/50 transition-colors ${view === "inactive" ? "opacity-80" : ""}`}
                    >
                      <TableCell className="font-medium text-sm">
                        {student.rollNumber || "â€”"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-block w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                            )}
                          </span>
                          <div className="space-y-0.5">
                            <div className={`font-medium text-sm ${view === "inactive" ? "text-muted-foreground" : ""}`}>
                              {student.name}
                            </div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {student.class}-{student.section}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {student.class}-{student.section}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.status === "active" ? "default" : "secondary"}
                          className={`text-xs capitalize ${view === "inactive" ? "border-orange-200 text-orange-700 bg-orange-50" : ""}`}
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/students/${student.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {view === "inactive" ? "View / Reactivate" : t("common.manage")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t("studentList.noStudentsFound")}</p>
                <p className="text-sm">{t("studentList.adjustCriteria")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



