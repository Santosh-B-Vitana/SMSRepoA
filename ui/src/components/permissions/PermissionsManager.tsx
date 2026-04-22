import { useState, useEffect } from "react";
import { Check, AlertCircle, Eye, Edit, Trash2, Users, DollarSign, BookOpen, MessageSquare, TrendingUp, Building, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissions, ModuleName, PermissionLevel } from "../../contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

// Module categories for better organization
const MODULE_CATEGORIES = {
  core: {
    label: 'Core Management',
    icon: Users,
    modules: ['students', 'staff', 'attendance'] as ModuleName[]
  },
  financial: {
    label: 'Financial',
    icon: DollarSign,
    modules: ['fees', 'payroll', 'wallet', 'store'] as ModuleName[]
  },
  academic: {
    label: 'Academic',
    icon: BookOpen,
    modules: ['timetable', 'examinations', 'admissions', 'library', 'certificates'] as ModuleName[]
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    modules: ['announcements', 'communication', 'documents'] as ModuleName[]
  },
  analytics: {
    label: 'Reports & Analytics',
    icon: TrendingUp,
    modules: ['reports', 'analytics'] as ModuleName[]
  },
  facilities: {
    label: 'Facilities & Services',
    icon: Building,
    modules: ['transport', 'hostel', 'health'] as ModuleName[]
  }
};

// Simple, non-tech labels for modules
const MODULE_LABELS: Record<ModuleName, string> = {
  students: 'Student Management',
  staff: 'Staff Management',
  attendance: 'Attendance Tracking',
  fees: 'Fee Management',
  timetable: 'Class Timetable',
  examinations: 'Exams & Results',
  announcements: 'Announcements',
  reports: 'Reports',
  documents: 'Document Storage',
  admissions: 'Student Admissions',
  library: 'Library System',
  transport: 'Transport Management',
  hostel: 'Hostel Management',
  health: 'Health Records',
  payroll: 'Staff Payroll',
  communication: 'Parent Communication',
  analytics: 'Analytics Dashboard',
  certificates: 'Certificates',
  store: 'School Store',
  wallet: 'Digital Wallet'
};

const MODULE_DESCRIPTIONS: Record<ModuleName, string> = {
  students: 'Manage student profiles, enrollment, and records',
  staff: 'Manage teachers and staff information',
  attendance: 'Track student and staff attendance',
  fees: 'Handle fee collection and payments',
  timetable: 'Create and manage class schedules',
  examinations: 'Conduct exams and manage results',
  announcements: 'Send school-wide announcements',
  reports: 'Generate various reports',
  documents: 'Store and manage documents',
  admissions: 'Handle new student admissions',
  library: 'Manage library books and lending',
  transport: 'Manage school buses and routes',
  hostel: 'Manage hostel rooms and students',
  health: 'Track student health records',
  payroll: 'Process staff salaries',
  communication: 'SMS and email to parents',
  analytics: 'View insights and trends',
  certificates: 'Generate certificates',
  store: 'School supplies and uniform sales',
  wallet: 'Digital payment wallet'
};

export function PermissionsManager() {
  const { schoolPermissions, updateSchoolPermissions, loading } = usePermissions();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [saving, setSaving] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  
  const PERMISSION_CONFIG: Record<PermissionLevel, { label: string; icon: any; color: string }> = {
    read: { 
      label: 'View',
      icon: Eye, 
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
    },
    write: { 
      label: 'Edit',
      icon: Edit, 
      color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
    },
    delete: { 
      label: 'Delete',
      icon: Trash2, 
      color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' 
    }
  };

  // For super admin, they manage the current logged-in school's features
  // Each school has its own DNS, so we use the school from the user's context
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Get the current school - either from user context or the first school in permissions
  const currentSchool = schoolPermissions.find(s => s.schoolId === user?.schoolId) || schoolPermissions[0];

  const handleModuleToggle = async (schoolId: string, moduleName: ModuleName, enabled: boolean) => {
    setSaving(`${schoolId}-${moduleName}`);
    try {
      const school = currentSchool;
      const currentModule = school?.modules[moduleName];
      
      await updateSchoolPermissions(schoolId, moduleName, {
        enabled,
        permissions: enabled ? (currentModule?.permissions || ['read']) : []
      });
      
      toast({
        title: 'Success',
        description: `${MODULE_LABELS[moduleName]} ${enabled ? 'enabled' : 'disabled'}`,
      });
      setHasChanges(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handlePermissionToggle = async (
    schoolId: string, 
    moduleName: ModuleName, 
    permission: PermissionLevel, 
    hasPermission: boolean
  ) => {
    setSaving(`${schoolId}-${moduleName}-${permission}`);
    try {
      const school = currentSchool;
      const currentModule = school?.modules[moduleName];
      
      if (!currentModule) return;

      let newPermissions = [...currentModule.permissions];
      
      if (hasPermission) {
        newPermissions = newPermissions.filter(p => p !== permission);
      } else {
        newPermissions.push(permission);
        // Auto-enable read permission when granting write or delete
        if (permission !== 'read' && !newPermissions.includes('read')) {
          newPermissions.push('read');
        }
      }

      await updateSchoolPermissions(schoolId, moduleName, {
        enabled: currentModule.enabled,
        permissions: newPermissions
      });

      toast({
        title: 'Success',
        description: `${PERMISSION_CONFIG[permission].label} permission ${hasPermission ? 'removed' : 'granted'}`,
      });
      setHasChanges(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No school data available for permission management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <AnimatedBackground variant="gradient" />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <AnimatedWrapper variant="fadeInUp">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {isSuperAdmin ? 'Package Features Control' : 'School Package Features'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin 
                    ? 'Enable or disable features based on the school\'s subscription package' 
                    : 'View which features are included in your school\'s package'}
                </p>
              </div>
              {hasChanges && (
                <Alert className="w-full sm:w-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Changes saved successfully
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <ModernCard variant="glass">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{currentSchool.schoolName}</CardTitle>
                  <Badge variant="secondary" className="text-xs w-fit mt-2">
                    {Object.values(currentSchool.modules).filter(m => m.enabled).length} of {Object.keys(currentSchool.modules).length} features enabled
                  </Badge>
                </div>
              </div>
              <CardDescription className="mt-2">
                {isSuperAdmin 
                  ? 'Toggle features and set permissions (View, Edit, Delete) for each module' 
                  : 'These are the features available in your subscription'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-6">
                {Object.entries(MODULE_CATEGORIES).map(([categoryKey, category]) => {
                  const CategoryIcon = category.icon;
                  const categoryModules = category.modules.filter(mod => currentSchool.modules[mod]);
                  
                  if (categoryModules.length === 0) return null;
                  
                  return (
                    <div key={categoryKey} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">{category.label}</h3>
                      </div>
                      
                      {/* Modules in this category */}
                      <div className="space-y-3">
                        {categoryModules.map((moduleName) => {
                          const moduleData = currentSchool.modules[moduleName];
                          const isSaving = saving?.startsWith(`${currentSchool.schoolId}-${moduleName}`);
                          
                          return (
                            <div key={moduleName} className="border border-border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                              {/* Module Header */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  {isSuperAdmin && (
                                    <Switch
                                      checked={moduleData.enabled}
                                      onCheckedChange={(enabled) => handleModuleToggle(currentSchool.schoolId, moduleName, enabled)}
                                      disabled={isSaving}
                                      className="mt-1"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-foreground text-sm sm:text-base">
                                        {MODULE_LABELS[moduleName]}
                                      </p>
                                      {!moduleData.enabled && (
                                        <Badge variant="outline" className="text-xs">Disabled</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {MODULE_DESCRIPTIONS[moduleName]}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Permission Buttons */}
                                {moduleData.enabled && isSuperAdmin && (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">Click to toggle permissions:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {(['read', 'write', 'delete'] as PermissionLevel[]).map((permission) => {
                                        const hasPermission = moduleData.permissions.includes(permission);
                                        const isPermissionSaving = saving === `${currentSchool.schoolId}-${moduleName}-${permission}`;
                                        const config = PERMISSION_CONFIG[permission];
                                        const IconComponent = config.icon;
                                        
                                        return (
                                          <Button
                                            key={permission}
                                            variant={hasPermission ? "default" : "outline"}
                                            size="sm"
                                            className={`h-9 text-xs font-medium transition-all relative ${
                                              hasPermission 
                                                ? config.color + ' shadow-sm'
                                                : 'bg-muted/50 hover:bg-muted border-2 border-dashed opacity-60 hover:opacity-100'
                                            }`}
                                            onClick={() => handlePermissionToggle(currentSchool.schoolId, moduleName, permission, hasPermission)}
                                            disabled={isPermissionSaving || isSaving}
                                            title={hasPermission ? `${config.label} permission is enabled - Click to disable` : `${config.label} permission is disabled - Click to enable`}
                                          >
                                            <IconComponent className="w-3.5 h-3.5 mr-1.5" />
                                            {config.label}
                                            {hasPermission ? (
                                              <Check className="w-3.5 h-3.5 ml-1.5" />
                                            ) : (
                                              <span className="ml-1.5 text-[10px] opacity-50">(Off)</span>
                                            )}
                                          </Button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Read-only badges for non-super admin */}
                                {moduleData.enabled && !isSuperAdmin && (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">Available permissions:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {(['read', 'write', 'delete'] as PermissionLevel[]).map((permission) => {
                                        const hasPermission = moduleData.permissions.includes(permission);
                                        const config = PERMISSION_CONFIG[permission as PermissionLevel];
                                        const IconComponent = config.icon;
                                        
                                        return (
                                          <Badge 
                                            key={permission} 
                                            variant={hasPermission ? "default" : "outline"} 
                                            className={`text-xs py-1 px-3 ${
                                              hasPermission 
                                                ? config.color.replace('hover:bg-', 'bg-') + ' border-none'
                                                : 'opacity-40 line-through'
                                            }`}
                                          >
                                            <IconComponent className="w-3 h-3 mr-1" />
                                            {config.label}
                                            {hasPermission ? ' ✓' : ' ✗'}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </ModernCard>
        </AnimatedWrapper>
      </div>
    </>
  );
}
