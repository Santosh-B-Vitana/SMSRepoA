import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Edit, Trash2, ArrowLeft, Eye, Edit2, Users, DollarSign, BookOpen, MessageSquare, TrendingUp, Building } from 'lucide-react';
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { mockApi } from '@/services/mockApi';
import type { SchoolRole } from '@/services/mockApi';

interface RoleManagementProps {
  schoolId?: string;
}

// Module categories matching the feature permissions
const MODULE_CATEGORIES = {
  overview: {
    label: 'Overview',
    icon: TrendingUp,
    modules: ['dashboard']
  },
  people: {
    label: 'People Management',
    icon: Users,
    modules: ['students', 'staff', 'attendance']
  },
  operations: {
    label: 'Operations',
    icon: DollarSign,
    modules: ['fees', 'payroll', 'wallet', 'store']
  },
  academic: {
    label: 'Academic',
    icon: BookOpen,
    modules: ['timetable', 'examinations', 'admissions', 'library', 'certificates']
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    modules: ['announcements', 'communication', 'documents']
  },
  analytics: {
    label: 'Reports & Analytics',
    icon: TrendingUp,
    modules: ['reports', 'analytics']
  },
  facilities: {
    label: 'Facilities & Services',
    icon: Building,
    modules: ['transport', 'hostel', 'health']
  }
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  staff: 'Staff',
  attendance: 'Attendance',
  fees: 'Fee Management',
  payroll: 'Payroll',
  wallet: 'Wallet',
  store: 'Store',
  timetable: 'Timetable',
  examinations: 'Examinations',
  admissions: 'Admissions',
  library: 'Library',
  certificates: 'Certificates',
  announcements: 'Announcements',
  communication: 'Communication',
  documents: 'Documents',
  reports: 'Reports',
  analytics: 'Analytics',
  transport: 'Transport',
  hostel: 'Hostel',
  health: 'Health'
};

type PermissionLevel = 'none' | 'view' | 'edit';

interface RolePermissions {
  [module: string]: PermissionLevel;
}

interface RoleFormData {
  roleName: string;
  description: string;
  permissions: RolePermissions;
}

export function RoleManagement({ schoolId }: RoleManagementProps) {
  const [roles, setRoles] = useState<SchoolRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<SchoolRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    description: '',
    permissions: {}
  });

  useEffect(() => {
    loadRoles();
  }, [schoolId]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const effectiveSchoolId = schoolId || 'school1'; // Default school for demo
      const rolesData = await mockApi.getSchoolRoles(effectiveSchoolId);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
    setLoading(false);
  };

  const handleViewPermissions = (role: SchoolRole) => {
    setSelectedRole(role);
    setIsEditing(false);
    // Parse permissions from mock data if available
    const permissions: RolePermissions = {};
    Object.keys(MODULE_LABELS).forEach(module => {
      permissions[module] = 'view'; // Default to view for existing roles
    });
    setFormData({
      roleName: role.roleName,
      description: role.description || '',
      permissions
    });
  };

  const handleEdit = (role: SchoolRole) => {
    setSelectedRole(role);
    setIsEditing(true);
    const permissions: RolePermissions = {};
    Object.keys(MODULE_LABELS).forEach(module => {
      permissions[module] = 'edit'; // Parse from actual data in real implementation
    });
    setFormData({
      roleName: role.roleName,
      description: role.description || '',
      permissions
    });
  };

  const handleDelete = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await mockApi.deleteSchoolRole(roleId);
        loadRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const handlePermissionChange = (module: string, level: PermissionLevel) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: level
      }
    }));
  };

  const handleSave = async () => {
    try {
      const roleData = {
        roleName: formData.roleName,
        description: formData.description,
        permissions: formData.permissions
      };

      if (selectedRole && isEditing) {
        await mockApi.updateSchoolRole(selectedRole.id, roleData);
      } else if (addDialogOpen) {
        await mockApi.addSchoolRole({ ...roleData, schoolId: schoolId || 'school1' });
      }

      loadRoles();
      setSelectedRole(null);
      setAddDialogOpen(false);
      setFormData({ roleName: '', description: '', permissions: {} });
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleAddRole = () => {
    const permissions: RolePermissions = {};
    Object.keys(MODULE_LABELS).forEach(module => {
      permissions[module] = 'none';
    });
    setFormData({
      roleName: '',
      description: '',
      permissions
    });
    setAddDialogOpen(true);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Show role detail/edit view
  if (selectedRole || addDialogOpen) {
    return (
      <>
        <AnimatedBackground variant="gradient" />
        <div className="space-y-4 sm:space-y-6">
          <AnimatedWrapper variant="fadeInUp">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRole(null);
                  setAddDialogOpen(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Roles
              </Button>
            </div>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.1}>
            <ModernCard variant="glass">
              <CardHeader className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={formData.roleName}
                            onChange={(e) => setFormData(prev => ({ ...prev, roleName: e.target.value }))}
                            placeholder="Role name (e.g., School Admin)"
                            className="text-xl font-bold"
                          />
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Role description"
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-xl">{formData.roleName}</CardTitle>
                          <CardDescription>{formData.description}</CardDescription>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-6">
                {Object.entries(MODULE_CATEGORIES).map(([categoryKey, category]) => {
                  const CategoryIcon = category.icon;
                  
                  return (
                    <div key={categoryKey} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">{category.label}</h3>
                        <p className="text-xs text-muted-foreground ml-2">
                          Manage permissions for {category.label.toLowerCase()} features
                        </p>
                      </div>

                      <div className="space-y-3">
                        {category.modules.map((module) => {
                          const currentPermission = formData.permissions[module] || 'none';
                          
                          return (
                            <div key={module} className="grid grid-cols-2 gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div>
                                <p className="font-medium text-sm">{MODULE_LABELS[module]}</p>
                                {!isEditing && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    Current Access: {currentPermission.charAt(0).toUpperCase() + currentPermission.slice(1)}
                                  </Badge>
                                )}
                              </div>

                              <div>
                                {isEditing ? (
                                  <RadioGroup
                                    value={currentPermission}
                                    onValueChange={(value) => handlePermissionChange(module, value as PermissionLevel)}
                                    className="flex gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="none" id={`${module}-none`} />
                                      <Label htmlFor={`${module}-none`} className="text-sm cursor-pointer">
                                        <span className="text-muted-foreground">✕ None</span>
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="view" id={`${module}-view`} />
                                      <Label htmlFor={`${module}-view`} className="text-sm cursor-pointer flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> View
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="edit" id={`${module}-edit`} />
                                      <Label htmlFor={`${module}-edit`} className="text-sm cursor-pointer flex items-center gap-1">
                                        <Edit2 className="w-3 h-3" /> Edit
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                ) : (
                                  <div className="flex gap-4">
                                    <Badge variant={currentPermission === 'none' ? 'default' : 'outline'} className="text-xs">
                                      <span className="text-muted-foreground">✕ None</span>
                                    </Badge>
                                    <Badge variant={currentPermission === 'view' ? 'default' : 'outline'} className="text-xs">
                                      <Eye className="w-3 h-3 mr-1" /> View
                                    </Badge>
                                    <Badge variant={currentPermission === 'edit' ? 'default' : 'outline'} className="text-xs">
                                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                                    </Badge>
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
              </CardContent>
            </ModernCard>
          </AnimatedWrapper>
        </div>
      </>
    );
  }

  // Main roles list view
  return (
    <>
      <AnimatedBackground variant="gradient" />
      <div className="space-y-4 sm:space-y-6">
        <AnimatedWrapper variant="fadeInUp">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Management
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage roles and their permissions
              </p>
            </div>
            <Button onClick={handleAddRole}>
              <Shield className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <ModernCard variant="glass">
            <CardHeader className="p-6">
              <CardTitle>Roles</CardTitle>
              <CardDescription>Click on a role to view and manage its permissions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No roles found. Create a new role to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{role.roleName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || 'No description provided'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(role.lastUpdated || Date.now()).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPermissions(role)}
                              title="View Permissions"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(role)}
                              title="Edit Role"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(role.id)}
                              title="Delete Role"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </ModernCard>
        </AnimatedWrapper>
      </div>
    </>
  );
}