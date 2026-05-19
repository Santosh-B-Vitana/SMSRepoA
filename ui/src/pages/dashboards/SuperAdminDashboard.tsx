import { useEffect, useState } from "react";
import { Shield, BarChart3, Building2, Users, GraduationCap, UserCheck, RefreshCw, ToggleLeft, ToggleRight, ChevronRight, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as superAdminApi from "@/services/api/superAdminApi";
import type { PlatformStats, SchoolPermissionsResponse } from "@/services/api/superAdminApi";
import { useSuperAdminSchool } from "@/contexts/SuperAdminSchoolContext";

const MODULE_LABELS: Record<string, string> = {
  students: "Students",
  staff: "Staff",
  attendance: "Attendance",
  fees: "Fees & Finance",
  timetable: "Timetable",
  examinations: "Examinations",
  announcements: "Announcements",
  reports: "Reports",
  documents: "Documents",
  admissions: "Admissions",
  library: "Library",
  transport: "Transport",
  hostel: "Hostel",
  health: "Health",
  payroll: "Payroll",
  communication: "Communication",
  analytics: "Analytics",
  certificates: "Certificates",
  store: "Store",
  wallet: "Wallet",
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Shared school context — in sync with the Header school switcher
  const { schools, selectedSchoolId, setSelectedSchoolId } = useSuperAdminSchool();
  const [permissions, setPermissions] = useState<SchoolPermissionsResponse | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [permLoading, setPermLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  // Reload permissions whenever selected school changes
  useEffect(() => {
    if (!selectedSchoolId) { setPermissions(null); return; }
    setPermissions(null);
    setPermLoading(true);
    superAdminApi.getSchoolPermissions(selectedSchoolId)
      .then(setPermissions)
      .catch(() => toast.error("Failed to load school permissions"))
      .finally(() => setPermLoading(false));
  }, [selectedSchoolId]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await superAdminApi.getPlatformStats();
      setStats(data);
    } catch {
      // silently fail - show zeros
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleModule = async (moduleName: string, currentEnabled: boolean) => {
    if (!selectedSchoolId || !permissions) return;
    setTogglingModule(moduleName);
    try {
      await superAdminApi.updateModulePermission(selectedSchoolId, moduleName, !currentEnabled);
      // Re-fetch from server to ensure UI reflects true DB state
      const fresh = await superAdminApi.getSchoolPermissions(selectedSchoolId);
      setPermissions(fresh);
      toast.success(`${!currentEnabled ? "Enabled" : "Disabled"} ${MODULE_LABELS[moduleName] ?? moduleName}`, { description: `Feature updated for ${permissions.schoolName}` });
    } catch {
      toast.error(`Failed to toggle ${MODULE_LABELS[moduleName] ?? moduleName}`);
    } finally {
      setTogglingModule(null);
    }
  };

  const enabledCount = permissions ? Object.values(permissions.modules).filter(m => m.enabled).length : 0;
  const totalCount = permissions ? Object.keys(permissions.modules).length : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-4 sm:px-0">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Super Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Vitana platform management & school feature control</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { fetchStats(); }} className="ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="features"><Shield className="w-4 h-4 mr-1" />Feature Toggles</TabsTrigger>
          <TabsTrigger value="quicklinks"><ChevronRight className="w-4 h-4 mr-1" />Quick Links</TabsTrigger>
        </TabsList>

        {/* â”€â”€ Overview Tab â”€â”€ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Building2, label: "Total Schools", value: stats?.totalSchools, sub: `${stats?.activeSchools ?? 0} active`, color: "text-blue-600" },
              { icon: Users, label: "Total Users", value: stats?.totalUsers, sub: `${stats?.activeUsers ?? 0} active`, color: "text-green-600" },
              { icon: GraduationCap, label: "Total Students", value: stats?.totalStudents, sub: "Across all schools", color: "text-purple-600" },
              { icon: UserCheck, label: "Total Staff", value: stats?.totalStaff, sub: "Admins & staff", color: "text-orange-500" },
              { icon: Building2, label: "Active Schools", value: stats?.activeSchools, sub: "Currently operational", color: "text-teal-600" },
              { icon: Users, label: "Active Users", value: stats?.activeUsers, sub: "Logged-in users", color: "text-indigo-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={`text-2xl font-bold ${s.color}`}>
                    {statsLoading ? "â€¦" : (s.value?.toLocaleString() ?? "0")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Onboard CTA */}
          <div
            className="rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
            onClick={() => navigate("/superadmin/onboard")}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-indigo-900">Onboard a New School</p>
                <p className="text-sm text-indigo-600">Step-by-step wizard — profile, year, admin &amp; modules in one go</p>
              </div>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => navigate("/superadmin/onboard")}>
              Start Wizard <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Schools summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registered Schools</span>
                <Button size="sm" variant="outline" onClick={() => navigate("/superadmin/schools")}>
                  Manage Schools <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schools.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active schools found.</p>
              ) : (
                <div className="space-y-2">
                  {schools.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{s.schoolCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{s.enabledModulesCount}/{s.totalModulesCount} modules</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  ))}
                  {schools.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">+{schools.length - 5} more schools</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ Feature Toggles Tab â”€â”€ */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>School Feature Management</CardTitle>
              <CardDescription>
                Enable or disable modules for each school. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select a school to configureâ€¦" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {permissions && (
                  <Badge variant="outline">{enabledCount} / {totalCount} modules enabled</Badge>
                )}
              </div>

              {permLoading && <p className="text-muted-foreground text-sm">Loading permissionsâ€¦</p>}

              {permissions && !permLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(permissions.modules).map(([moduleName, mod]) => (
                    <div
                      key={moduleName}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${mod.enabled ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-muted/30 border-border"}`}
                    >
                      <div className="flex items-center gap-2">
                        {mod.enabled ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{MODULE_LABELS[moduleName] ?? moduleName}</span>
                      </div>
                      <Switch
                        checked={mod.enabled}
                        onCheckedChange={() => handleToggleModule(moduleName, mod.enabled)}
                        disabled={togglingModule === moduleName}
                        aria-label={`Toggle ${moduleName}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!selectedSchoolId && !permLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Select a school above to manage its feature set</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ Quick Links Tab â”€â”€ */}
        <TabsContent value="quicklinks" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Onboard New School", desc: "Wizard: profile, year, admin & modules", path: "/superadmin/onboard", icon: Rocket, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
              { title: "School Management", desc: "Add, edit, and manage schools", path: "/superadmin/schools", icon: Building2, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
              { title: "User Management", desc: "Manage platform users across schools", path: "/superadmin/users", icon: Users, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
              { title: "Feature Toggles", desc: "Enable or disable modules per school", path: "#", icon: Shield, color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", tab: "features" },
              { title: "Students", desc: "View all students across platform", path: "/students", icon: GraduationCap, color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
              { title: "Staff", desc: "View all staff", path: "/staff", icon: UserCheck, color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
            ].map(link => (
              <Card
                key={link.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => link.tab ? setActiveTab(link.tab) : navigate(link.path)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.color}`}>
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{link.title}</p>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
