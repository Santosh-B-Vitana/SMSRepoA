
import { Search, Filter, Eye, UserX, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentBasic } from "@/services/api/studentApi";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import placeholderImg from '/placeholder.svg';
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentListProps {
  // data
  students: StudentBasic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // filter state (all controlled by parent / server-side)
  statusFilter: "" | "active" | "inactive";
  onStatusChange: (v: "" | "active" | "inactive") => void;
  search: string;
  onSearchChange: (v: string) => void;
  classFilter: string;
  onClassChange: (v: string) => void;
  sectionFilter: string;
  onSectionChange: (v: string) => void;
  availableClasses: string[];
  availableSections: string[];
  // pagination
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

/** Build a compact page-number list with ellipsis. Returns numbers or null (ellipsis). */
function buildPageList(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [];
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  addPage(1);
  if (current - 2 > 2) pages.push(null); // leading ellipsis
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) addPage(p);
  if (current + 2 < total - 1) pages.push(null); // trailing ellipsis
  addPage(total);
  return pages;
}

export function StudentList({
  students, total, page, pageSize, totalPages,
  statusFilter, onStatusChange,
  search, onSearchChange,
  classFilter, onClassChange,
  sectionFilter, onSectionChange,
  availableClasses, availableSections,
  onPageChange, onRefresh,
}: StudentListProps) {
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const rowPadding = preferences.compactMode ? "py-3" : "py-5";
  const cellPadding = preferences.compactMode ? "px-4" : "px-6";
  const fontSize = preferences.compactMode ? "text-sm" : "text-base";
  const fontSizeSmall = preferences.compactMode ? "text-xs" : "text-sm";
  const nameTextSize = preferences.compactMode ? "text-[13px]" : "text-[16px]";
  const tableViewClass = preferences.tableView === "compact" ? "text-xs" : fontSize;

  const isInactive = (s: StudentBasic) => s.status?.toLowerCase() !== "active";

  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  const hasActiveFilters = !!search || !!classFilter || !!sectionFilter;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Status tab bubbles */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["", "active", "inactive"] as const).map((v) => {
          const label = v === "" ? "All Students" : v === "active" ? "Active" : "Inactive";
          const icon = v === "inactive" ? <UserX className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />;
          const activeStyle =
            v === "" ? "bg-primary text-primary-foreground border-primary shadow-sm" :
            v === "active" ? "bg-green-600 text-white border-green-600 shadow-sm" :
            "bg-orange-500 text-white border-orange-500 shadow-sm";
          const inactiveStyle =
            v === "" ? "bg-background border-border text-muted-foreground hover:bg-muted" :
            v === "active" ? "bg-background border-green-200 text-green-700 hover:bg-green-50" :
            "bg-background border-orange-200 text-orange-600 hover:bg-orange-50";
          const isSelected = statusFilter === v;
          return (
            <button
              key={v}
              onClick={() => onStatusChange(v)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                isSelected ? activeStyle : inactiveStyle
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("studentList.searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={classFilter || "all"}
          onValueChange={(v) => onClassChange(v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("studentList.allClasses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentList.allClasses")}</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {t("studentList.class")} {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sectionFilter || "all"}
          onValueChange={(v) => onSectionChange(v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("studentList.allSections")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentList.allSections")}</SelectItem>
            {availableSections.map((sec) => (
              <SelectItem key={sec} value={sec}>
                {t("studentList.section")} {sec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => { onSearchChange(""); onClassChange(""); onSectionChange(""); }}
          disabled={!hasActiveFilters}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          {t("studentList.clearFilters")}
        </Button>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {total === 0
          ? "No students found"
          : `Showing ${firstItem}–${lastItem} of ${total} student${total !== 1 ? "s" : ""}`}
        {statusFilter && <span className="ml-1">· {statusFilter} only</span>}
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={`border-border hover:bg-muted/50 transition-colors ${rowPadding}`}>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.rollNo")}</TableHead>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.name")}</TableHead>
                    <TableHead className={`font-semibold hidden sm:table-cell ${cellPadding}`}>
                      {t("studentList.class")}
                    </TableHead>
                    <TableHead className={`font-semibold hidden md:table-cell ${cellPadding}`}>
                      Admission No
                    </TableHead>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.status")}</TableHead>
                    <TableHead className={`font-semibold text-right ${cellPadding}`}>
                      {t("studentList.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`border-border hover:bg-muted/50 transition-colors ${rowPadding} ${isInactive(student) ? "opacity-80" : ""}`}
                    >
                      <TableCell className={`font-medium ${cellPadding} ${tableViewClass}`}>
                        {student.rollNumber || "-"}
                      </TableCell>
                      <TableCell className={cellPadding}>
                        <div className={`flex items-center ${preferences.compactMode ? "gap-3" : "gap-4"}`}>
                          <span className={`inline-block rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0 ${
                            preferences.compactMode ? "w-9 h-9" : "w-10 h-10"
                          }`}>
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                            )}
                          </span>
                          <div className="space-y-0.5">
                            <div className={`font-medium ${cellPadding} ${nameTextSize} ${isInactive(student) ? "text-muted-foreground" : ""}`}>
                              {student.name}
                            </div>
                            <div className={`text-muted-foreground sm:hidden ${fontSizeSmall}`}>
                              {student.class}-{student.section}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`hidden sm:table-cell ${cellPadding} ${tableViewClass}`}>
                        {student.class}-{student.section}
                      </TableCell>
                      <TableCell className={`hidden md:table-cell ${cellPadding} ${tableViewClass}`}>
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell className={cellPadding}>
                        <Badge
                          variant={student.status?.toLowerCase() === "active" ? "default" : "secondary"}
                          className={`text-xs capitalize ${isInactive(student) ? "border-orange-200 text-orange-700 bg-orange-50" : ""} ${preferences.compactMode ? "" : "text-sm px-2.5 py-1.5"}`}
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${cellPadding}`}>
                        <Button
                          variant="outline"
                          size={preferences.compactMode ? "xs" : "sm"}
                          onClick={() => navigate(`/students/${student.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isInactive(student) ? "View / Reactivate" : t("common.manage")}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {buildPageList(page, totalPages).map((p, i) =>
              p === null ? (
                <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 text-sm rounded-md transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentBasic } from "@/services/api/studentApi";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import placeholderImg from '/placeholder.svg';
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentListProps {
  students: StudentBasic[];
  onRefresh: () => void;
}

export function StudentList({ students, onRefresh }: StudentListProps) {
  const [view, setView] = useState<"all" | "active" | "inactive">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [filteredStudents, setFilteredStudents] = useState<StudentBasic[]>([]);
  const { preferences } = useUserPreferences();

  const navigate = useNavigate();
  const { t } = useLanguage();

  // Determine spacing classes based on preferences (inverted: compact=current, normal=expanded)
  const rowPadding = preferences.compactMode ? "py-3" : "py-5";
  const cellPadding = preferences.compactMode ? "px-4" : "px-6";
  const fontSize = preferences.compactMode ? "text-sm" : "text-base";
  const fontSizeSmall = preferences.compactMode ? "text-xs" : "text-sm";
  const nameTextSize = preferences.compactMode ? "text-[13px]" : "text-[16px]";
  const tableViewClass = preferences.tableView === "compact" ? "text-xs" : fontSize;

  const activeStudents = students.filter((s) => s.status?.toLowerCase() === "active");
  const inactiveStudents = students.filter((s) => s.status?.toLowerCase() !== "active");
  const sourceStudents = view === "all" ? students : view === "active" ? activeStudents : inactiveStudents;

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
  const switchView = (v: "all" | "active" | "inactive") => {
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
          onClick={() => switchView("all")}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            view === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          All Students
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            view === "all" ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>{students.length}</span>
        </button>

        <button
          onClick={() => switchView("active")}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            view === "active"
              ? "bg-green-600 text-white border-green-600 shadow-sm"
              : "bg-background border-green-200 text-green-700 hover:bg-green-50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Active
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            view === "active" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
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
            Inactive
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
        {view === "all" ? "" : view === "active" ? "active " : "inactive "}students
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={`border-border hover:bg-muted/50 transition-colors ${rowPadding}`}>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.rollNo")}</TableHead>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.name")}</TableHead>
                    <TableHead className={`font-semibold hidden sm:table-cell ${cellPadding}`}>
                      {t("studentList.class")}
                    </TableHead>
                    <TableHead className={`font-semibold hidden md:table-cell ${cellPadding}`}>
                      Admission No
                    </TableHead>
                    <TableHead className={`font-semibold ${cellPadding}`}>{t("studentList.status")}</TableHead>
                    <TableHead className={`font-semibold text-right ${cellPadding}`}>
                      {t("studentList.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`border-border hover:bg-muted/50 transition-colors ${rowPadding} ${(view === "inactive" || (view === "all" && student.status?.toLowerCase() !== "active")) ? "opacity-80" : ""}`}
                    >
                      <TableCell className={`font-medium ${cellPadding} ${tableViewClass}`}>
                        {student.rollNumber || "-"}
                      </TableCell>
                      <TableCell className={cellPadding}>
                        <div className={`flex items-center ${preferences.compactMode ? "gap-3" : "gap-4"}`}>
                          <span className={`inline-block rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0 ${
                            preferences.compactMode ? "w-9 h-9" : "w-10 h-10"
                          }`}>
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                            )}
                          </span>
                            <div className={`space-y-0.5`}>
                            <div className={`font-medium ${cellPadding} ${nameTextSize} ${view === "inactive" ? "text-muted-foreground" : ""}`}>
                              {student.name}
                            </div>
                            <div className={`text-muted-foreground sm:hidden ${fontSizeSmall}`}>
                              {student.class}-{student.section}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`hidden sm:table-cell ${cellPadding} ${tableViewClass}`}>
                        {student.class}-{student.section}
                      </TableCell>
                      <TableCell className={`hidden md:table-cell ${cellPadding} ${tableViewClass}`}>
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell className={cellPadding}>
                        <Badge
                          variant={student.status === "active" ? "default" : "secondary"}
                          className={`text-xs capitalize ${(view === "inactive" || (view === "all" && student.status?.toLowerCase() !== "active")) ? "border-orange-200 text-orange-700 bg-orange-50" : ""} ${preferences.compactMode ? "" : "text-sm px-2.5 py-1.5"}`}
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${cellPadding}`}>
                        <Button
                          variant="outline"
                          size={preferences.compactMode ? "xs" : "sm"}
                          onClick={() => navigate(`/students/${student.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {view === "inactive" || (view === "all" && student.status?.toLowerCase() !== "active") ? "View / Reactivate" : t("common.manage")}
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



