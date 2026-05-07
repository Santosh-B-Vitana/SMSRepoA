import { useState, useEffect, useCallback } from "react";
import { Plus, Users, UserPlus, GraduationCap, ArrowUpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StudentForm } from "./StudentForm";
import { StudentList } from "./StudentList";
import { BulkPromotionDialog } from "./BulkPromotionDialog";
import { StudentBasic, studentApi } from "@/services/api/studentApi";
import { LoadingState, EmptyState, ExportButton, ImportButton, ErrorBoundary } from "@/components/common";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

export function StudentsManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { academicYear } = useAcademicYear();
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const result = await studentApi.list({ pageSize: 1000 });
      setStudents(result.students || []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, academicYear]); // academicYear in deps so we re-fetch when year changes

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleStudentSuccess = async () => {
    setIsAddDialogOpen(false);
    await fetchStudents();
  };

  const getStats = () => ({
    total: students.length,
    active: students.filter((s) => s.status === "active").length,
    inactive: students.filter((s) => s.status !== "active").length,
    classes: new Set(students.map((s) => s.class)).size,
  });

  const stats = getStats();

  const handleBulkPromotion = async (fromClass: string, toClass: string) => {
    await studentApi.bulkPromote({ fromClass, toClass });
    await fetchStudents();
  };

  if (loading) {
    return <LoadingState variant="cards" message="Loading students..." />;
  }

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
            </div>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.12}>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
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
                onImport={async (data) => {
                  toast({
                    title: "Import Complete",
                    description: `Successfully imported ${data.length} student records`,
                  });
                  await fetchStudents();
                }}
                templateFilename="students_import_template"
              />
              <ExportButton
                data={students}
                filename="students"
                columns={[
                  { key: "name", label: "Name" },
                  { key: "admissionNumber", label: "Admission No" },
                  { key: "rollNumber", label: "Roll No" },
                  { key: "class", label: "Class" },
                  { key: "section", label: "Section" },
                  { key: "status", label: "Status" },
                ]}
              />
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("studentMgmt.addStudent")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("studentMgmt.addStudent")}</DialogTitle>
                  </DialogHeader>
                  <StudentForm
                    student={null}
                    onClose={() => setIsAddDialogOpen(false)}
                    onSuccess={handleStudentSuccess}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
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
                      <p className="text-xl font-semibold">{stats.classes}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
            </div>

            {/* Students List */}
            {students.length === 0 ? (
              <EmptyState
                title={t("students.noStudentsFound")}
                description={t("students.noStudentsDesc")}
                action={{
                  label: t("students.addStudent"),
                  onClick: () => setIsAddDialogOpen(true),
                }}
              />
            ) : (
              <StudentList students={students} onRefresh={fetchStudents} />
            )}

            {/* Bulk Promotion Dialog */}
            <BulkPromotionDialog
              open={promotionDialogOpen}
              onOpenChange={setPromotionDialogOpen}
              onPromote={handleBulkPromotion}
            />
          </AnimatedWrapper>
        </div>
      </div>
    </ErrorBoundary>
  );
}
