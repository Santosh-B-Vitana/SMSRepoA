import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StaffForm } from "./StaffForm";
import { StaffList } from "./StaffList";
import { staffApi, StaffBasic as Staff } from "@/services/api/staffApi";
import { LoadingState, EmptyState, ExportButton, ImportButton, ErrorBoundary } from "@/components/common";
import { useKeyboardShortcuts, CommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";

export function StaffManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    CommonShortcuts.new(() => setIsAddDialogOpen(true)),
    CommonShortcuts.search(() => document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()),
  ]);

  const fetchStaff = useCallback(async () => {
    try {
      const result = await staffApi.list({ pageSize: 1000 });
      setStaff(result.staff);
      setFilteredStaff(result.staff);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        (member.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.employeeId ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(member => member.department === departmentFilter);
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, departmentFilter]);

  const handleStaffSuccess = async () => {
    try {
      await fetchStaff();
      setIsAddDialogOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error("Failed to refresh staff:", error);
    }
  };

  const getDepartments = () => {
    const departments = [...new Set(staff.map(member => member.department))];
    return departments.sort();
  };

  const getStaffStats = () => {
    return {
      total: staff.length,
      active: staff.filter(s => s.status === 'active').length,
      departments: getDepartments().length,
      teachers: staff.filter(s => s.designation.toLowerCase().includes('teacher')).length
    };
  };

  const stats = getStaffStats();

  if (loading) {
    return <LoadingState variant="cards" message="Loading staff..." />;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="mesh" className="fixed inset-0 -z-10 opacity-30" />
        
        <div className="space-y-6 relative z-10">
          <AnimatedWrapper variant="fadeInUp" delay={0.05}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-display gradient-text">{t('staffMgmt.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('staffMgmt.subtitle')}</p>
              </div>
              <div className="flex gap-2">
                <ImportButton
                  columns={[
                    { key: 'name', label: 'Name', required: true },
                    { key: 'email', label: 'Email', required: true },
                    { key: 'phone', label: 'Phone', required: true },
                    { key: 'department', label: 'Department', required: true },
                    { key: 'designation', label: 'Designation', required: true },
                    { key: 'joiningDate', label: 'Joining Date', required: true },
                  ]}
                  onImport={async (data) => {
                    toast({
                      title: "Import Complete",
                      description: `Successfully imported ${data.length} staff records`,
                    });
                    await fetchStaff();
                  }}
                  templateFilename="staff_import_template"
                />
                <ExportButton
                  data={filteredStaff}
                  filename="staff"
                  columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'department', label: 'Department' },
                    { key: 'designation', label: 'Designation' },
                    { key: 'status', label: 'Status' },
                  ]}
                />
              </div>
            </div>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('staff.totalStaff')}</p>
                      <p className="text-xl font-semibold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('common.active')}</p>
                      <p className="text-xl font-semibold">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('staff.departments')}</p>
                      <p className="text-xl font-semibold">{stats.departments}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
              <ModernCard variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('staff.teachers')}</p>
                      <p className="text-xl font-semibold">{stats.teachers}</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
            </div>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.15}>
            <ModernCard variant="glass">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder={t('staffMgmt.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={t('staffMgmt.filterDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('staffMgmt.allDepartments')}</SelectItem>
                      {getDepartments().map(department => (
                        <SelectItem key={department} value={department}>{department}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </ModernCard>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.2}>
            {filteredStaff.length === 0 ? (
              <EmptyState
                title={t('staff.noStaffFound')}
                description={t('staff.noStaffDesc')}
              />
            ) : (
              <StaffList staff={filteredStaff} refreshStaff={handleStaffSuccess} />
            )}
          </AnimatedWrapper>
        </div>
      </div>
    </ErrorBoundary>
  );
}
