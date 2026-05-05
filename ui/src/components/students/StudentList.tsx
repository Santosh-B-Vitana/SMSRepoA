
import { useState, useEffect } from "react";
import { Search, Filter, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentBasic, studentApi } from "@/services/api/studentApi";
import placeholderImg from '/placeholder.svg';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentListProps {
  students: StudentBasic[];
  onRefresh: () => void;
}

export function StudentList({ students, onRefresh }: StudentListProps) {
  const [filteredStudents, setFilteredStudents] = useState<StudentBasic[]>(students);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Re-filter whenever source data or filters change
  useEffect(() => {
    let filtered = students;

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
  }, [students, searchTerm, selectedClass, selectedSection]);

  const toggleStudentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await studentApi.update(id, { status: newStatus });
      onRefresh();
      toast({
        title: "Success",
        description: `Student ${newStatus === "active" ? "reactivated" : "deactivated"} successfully`,
      });
    } catch {
      toast({
        title: "Error",
        description: `Failed to update student status`,
        variant: "destructive",
      });
    }
  };

  // Build unique class/section options from data
  const classes = [...new Set(students.map((s) => s.class).filter(Boolean))].sort((a, b) =>
    Number(a) - Number(b) || (a ?? '').localeCompare(b ?? '')
  );
  const sections = [...new Set(students.map((s) => s.section).filter(Boolean))].sort();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Filters */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("studentList.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("studentList.showing")} {filteredStudents.length} {t("studentList.of")}{" "}
          {students.length} {t("studentList.students")}
        </span>
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
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium text-sm">
                        {student.rollNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-block w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={placeholderImg}
                                alt="No photo"
                                className="w-full h-full object-cover opacity-60"
                              />
                            )}
                          </span>
                          <div className="space-y-0.5">
                            <div className="font-medium text-sm">{student.name}</div>
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
                          className="text-xs"
                        >
                          {student.status === "active"
                            ? t("common.active")
                            : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("common.manage")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStudentStatus(student.id, student.status)}
                            title={student.status === "active" ? "Deactivate" : "Reactivate"}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
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

