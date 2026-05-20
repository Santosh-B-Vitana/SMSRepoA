import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Users, UserPlus, GraduationCap, ArrowUpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { StudentForm } from "./StudentForm";
import { StudentList } from "./StudentList";
import { BulkPromotionDialog } from "./BulkPromotionDialog";
import { StudentBasic, StudentClassesSections, studentApi } from "@/services/api/studentApi";
import { LoadingState, EmptyState, ExportButton, ImportButton, ErrorBoundary } from "@/components/common";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  byClass?: Record<string, number>;
}

export function StudentsManager() {
  const { t } = useLanguage();
  const { academicYear } = useAcademicYear();

  // ── paginated list state ──────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  // ── filter state (all server-side) ────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  // ── dropdown options ──────────────────────────────────────────────────────
  const [classesSections, setClassesSections] = useState<StudentClassesSections>({ classes: [], sections: [] });

  // ── school-wide stats (not affected by current filters) ───────────────────
  const [stats, setStats] = useState<StudentStats>({ total: 0, active: 0, inactive: 0 });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);

  // ── debounce ref ──────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  // ── fetch current page ────────────────────────────────────────────────────
  const fetchPage = useCallback(async (opts: {
    page: number;
    search: string;
    statusFilter: string;
    classFilter: string;
    sectionFilter: string;
  }) => {
    try {
      const result = await studentApi.list({
        page: opts.page,
        pageSize: PAGE_SIZE,
        search: opts.search || undefined,
        status: opts.statusFilter || undefined,
        classFilter: opts.classFilter || undefined,
        sectionFilter: opts.sectionFilter || undefined,
      });
      setStudents(result.students || []);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? Math.ceil(result.total / PAGE_SIZE));
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── fetch school-wide stats + dropdown options once on mount / year change ─
  useEffect(() => {
    studentApi.getStats()
      .then((s: Record<string, unknown>) => setStats({
        total: (s.total as number) ?? 0,
        active: (s.active as number) ?? 0,
        inactive: (s.inactive as number) ?? 0,
        byClass: s.byClass as Record<string, number>,
      }))
      .catch(() => {/* non-critical */});

    studentApi.classesSections()
      .then(setClassesSections)
      .catch(() => {/* non-critical */});
  }, [academicYear]);

  // ── initial + page/filter re-fetch ────────────────────────────────────────
  useEffect(() => {
    fetchPage({ page, search, statusFilter, classFilter, sectionFilter });
  }, [fetchPage, page, statusFilter, classFilter, sectionFilter, academicYear]);
  // NOTE: search is intentionally excluded here — handled via debounce below

  // ── debounced search ──────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPage({ page: 1, search: pendingSearch.current, statusFilter, classFilter, sectionFilter });
    }, SEARCH_DEBOUNCE_MS);
  }, [fetchPage, statusFilter, classFilter, sectionFilter]);

  // ── filter change helpers (reset to page 1) ───────────────────────────────
  const handleStatusChange = (v: "" | "active" | "inactive") => { setStatusFilter(v); setPage(1); };
  const handleClassChange = (v: string) => { setClassFilter(v); setSectionFilter(""); setPage(1); };
  const handleSectionChange = (v: string) => { setSectionFilter(v); setPage(1); };
  const handlePageChange = (p: number) => setPage(p);

  const refresh = useCallback(async () => {
    await fetchPage({ page, search, statusFilter, classFilter, sectionFilter });
    // Refresh stats too after mutations
    studentApi.getStats()
      .then((s: Record<string, unknown>) => setStats({
        total: (s.total as number) ?? 0,
        active: (s.active as number) ?? 0,
        inactive: (s.inactive as number) ?? 0,
        byClass: s.byClass as Record<string, number>,
      }))
      .catch(() => {});
    studentApi.classesSections().then(setClassesSections).catch(() => {});
  }, [fetchPage, page, search, statusFilter, classFilter, sectionFilter]);

  const handleStudentSuccess = async () => {
    setIsAddDialogOpen(false);
    await refresh();
  };

  if (loading) {
    return <LoadingState variant="cards" message="Loading students..." />;
  }

  const classCount = stats.byClass ? Object.keys(stats.byClass).length : 0;

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="mesh" className="fixed inset-0 -z-10 opacity-30" />

        <div className="space-y-6 relative z-10">
          <AnimatedWrapper variant="fadeInUp" delay={0.1}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-display gradient-text">{t("studentMgmt.title")}</h1>
                <p className="text-muted-foreground mt-2">{t("studentMgmt.subtitle")}</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPromotionDialogOpen(true)}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  {t("students.bulkPromotion")}
                </Button>
                <ImportButton
                  columns={[
                    { key: "name", label: "Name", required: true },
                    { key: "rollNumber", label: "Roll No", required: true },
                    { key: "class", label: "Class", required: true },
                    { key: "section", label: "Section", required: true },
                    { key: "dateOfBirth", label: "Date of Birth", required: true },
                    { key: "guardianName", label: "Guardian Name", required: true },
                    { key: "guardianPhone", label: "Guardian Phone", required: true },
                    { key: "address", label: "Address", required: false },
                  ]}
                  apiTemplateUrl="/Students/bulk-import/template"
                  apiImportUrl="/Students/bulk-import/csv"
                  onImport={async (_data) => {
                    toast.success("Students imported successfully");
                    await refresh();
                  }}
                  templateFilename="students_import_template"
                />
                <ExportButton
                  data={students}
                  filename="students"
                  apiExportUrl="/Students/export"
                  columns={[
                    { key: "name", label: "Name" },
                    { key: "admissionNumber", label: "Admission No" },
                    { key: "rollNumber", label: "Roll No" },
                    { key: "class", label: "Class" },
                    { key: "section", label: "Section" },
                    { key: "status", label: "Status" },
                  ]}
                />
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("studentMgmt.addStudent")}
                </Button>
              </div>
            </div>
          </AnimatedWrapper>

          {isAddDialogOpen && (
            <StudentForm
              student={null}
              onClose={() => setIsAddDialogOpen(false)}
              onSuccess={handleStudentSuccess}
            />
          )}

          <AnimatedWrapper variant="fadeInUp" delay={0.12}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("studentMgmt.totalStudents")}</p>
                      <p className="text-xl font-semibold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserPlus className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("common.active")}</p>
                      <p className="text-xl font-semibold">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Users className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("common.inactive")}</p>
                      <p className="text-xl font-semibold">{stats.inactive}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("studentMgmt.classes")}</p>
                      <p className="text-xl font-semibold">{classCount}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
            </div>

            {/* Students List */}
            {stats.total === 0 ? (
              <EmptyState
                title={t("students.noStudentsFound")}
                description={t("students.noStudentsDesc")}
                action={{
                  label: t("students.addStudent"),
                  onClick: () => setIsAddDialogOpen(true),
                }}
              />
            ) : (
              <StudentList
                students={students}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
                totalPages={totalPages}
                statusFilter={statusFilter}
                onStatusChange={handleStatusChange}
                search={search}
                onSearchChange={handleSearchChange}
                classFilter={classFilter}
                onClassChange={handleClassChange}
                sectionFilter={sectionFilter}
                onSectionChange={handleSectionChange}
                availableClasses={classesSections.classes}
                availableSections={classesSections.sections}
                onPageChange={handlePageChange}
                onRefresh={refresh}
              />
            )}

            <BulkPromotionDialog
              open={promotionDialogOpen}
              onOpenChange={setPromotionDialogOpen}
              onComplete={refresh}
            />
          </AnimatedWrapper>
        </div>
      </div>
    </ErrorBoundary>
  );
}
