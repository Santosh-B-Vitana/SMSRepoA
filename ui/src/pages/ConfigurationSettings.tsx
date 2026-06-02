import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { BoardConfigurationManager } from "@/components/board/BoardConfigurationManager";
import { useToast } from '@/hooks/use-toast';
import roleApi from '@/services/api/roleApi';

// Local types used by this component's permissions UI
interface Permission {
  name: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  permissions: Permission[];
}

// Module categories matching the feature permissions
const MODULE_CATEGORIES = {
  overview: {
    label: 'Overview',
    icon: TrendingUp,
    modules: ['Dashboard']
  },
  people: {
    label: 'People Management',
    icon: Users,
    modules: ['Students', 'Staff', 'Attendance']
  },
  operations: {
    label: 'Operations',
    icon: DollarSign,
    modules: ['Fees', 'Payroll', 'Wallet', 'Store']
  },
  academic: {
    label: 'Academic',
    icon: BookOpen,
    modules: ['Timetable', 'Examinations', 'Admissions', 'Library', 'Certificates', 'Academics', 'Class Management', 'Assignments', 'Grades']
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    modules: ['Announcements', 'Communication', 'Documents']
  },
  analytics: {
    label: 'Reports & Analytics',
    icon: TrendingUp,
    modules: ['Reports', 'Analytics']
  },
  facilities: {
    label: 'Facilities & Services',
    icon: Building,
    modules: ['Transport', 'Hostel', 'Health']
  }
};

type PermissionLevel = 'none' | 'view' | 'edit';

interface RolePermissions {
  [module: string]: PermissionLevel;
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: RolePermissions;
}

export default function ConfigurationSettings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await roleApi.getRoles();
      const list = data.roles ?? data.items ?? [];
      setRoles(list.map(r => ({
        id: r.id,
        name: r.displayName ?? r.name,
        description: r.description,
        active: r.isActive,
        permissions: []
      })));
    } catch (error) {
      console.error('Error loading roles:', error);
    }
    setLoading(false);
  };

  /** Fetch real permissions for a role and map to internal Permission[] format */
  const fetchRolePermissions = async (roleId: string): Promise<Permission[]> => {
    const [grouped, rolePermIds] = await Promise.all([
      roleApi.getPermissionsGrouped(),
      roleApi.getRolePermissionIds(roleId)
    ]);
    const permIdSet = new Set(rolePermIds);
    return grouped.map(group => {
      const modulePerms = group.permissions;
      const viewPerm = modulePerms.find(p => p.action === 'View');
      const createPerm = modulePerms.find(p => p.action === 'Create');
      const editPerm = modulePerms.find(p => p.action === 'Edit');
      const deletePerm = modulePerms.find(p => p.action === 'Delete');
      return {
        name: group.module,
        canView: viewPerm ? permIdSet.has(viewPerm.id) : false,
        canAdd: createPerm ? permIdSet.has(createPerm.id) : false,
        canEdit: editPerm ? permIdSet.has(editPerm.id) : false,
        canDelete: deletePerm ? permIdSet.has(deletePerm.id) : false
      };
    });
  };

  // Convert old permission format to new format
  const convertPermissionsToLevels = (permissions: Permission[]): RolePermissions => {
    const result: RolePermissions = {};
    permissions.forEach(perm => {
      if (perm.canEdit || perm.canAdd || perm.canDelete) {
        result[perm.name] = 'edit';
      } else if (perm.canView) {
        result[perm.name] = 'view';
      } else {
        result[perm.name] = 'none';
      }
    });
    return result;
  };

  const handleViewPermissions = async (role: Role) => {
    const permissions = await fetchRolePermissions(role.id);
    setSelectedRole({ ...role, permissions });
    setIsEditing(false);
    setAddDialogOpen(false);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: convertPermissionsToLevels(permissions)
    });
  };

  const handleEditPermissions = async (role: Role) => {
    const permissions = await fetchRolePermissions(role.id);
    setSelectedRole({ ...role, permissions });
    setIsEditing(true);
    setAddDialogOpen(false);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: convertPermissionsToLevels(permissions)
    });
  };

  const handleDelete = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await roleApi.deleteRole(roleId);
        loadRoles();
        toast({
          title: "Success",
          description: "Role deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete role",
          variant: "destructive",
        });
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
      if (addDialogOpen) {
        if (selectedRole) {
          // Update existing role name/description
          await roleApi.updateRole(selectedRole.id, {
            displayName: formData.name,
            description: formData.description
          });
          toast({ title: "Success", description: "Role updated successfully" });
        } else {
          // Create new role
          await roleApi.createRole({
            name: formData.name,
            displayName: formData.name,
            description: formData.description
          });
          toast({ title: "Success", description: "Role created successfully" });
        }
      } else {
        // Save permissions changes
        const permissions: Permission[] = Object.entries(formData.permissions).map(([name, level]) => ({
          name,
          canView: level === 'view' || level === 'edit',
          canAdd: level === 'edit',
          canEdit: level === 'edit',
          canDelete: level === 'edit'
        }));

        // Map internal permissions to real permission IDs
        const grouped = await roleApi.getPermissionsGrouped();
        const nameToId: Record<string, string> = {};
        grouped.forEach(g => g.permissions.forEach(p => {
          nameToId[`${g.module}.${p.action}`] = p.id;
        }));

        const selectedIds: string[] = [];
        permissions.forEach(perm => {
          if (perm.canView && nameToId[`${perm.name}.View`]) selectedIds.push(nameToId[`${perm.name}.View`]);
          if (perm.canAdd && nameToId[`${perm.name}.Create`]) selectedIds.push(nameToId[`${perm.name}.Create`]);
          if (perm.canEdit && nameToId[`${perm.name}.Edit`]) selectedIds.push(nameToId[`${perm.name}.Edit`]);
          if (perm.canDelete && nameToId[`${perm.name}.Delete`]) selectedIds.push(nameToId[`${perm.name}.Delete`]);
        });

        await roleApi.setRolePermissions(selectedRole!.id, selectedIds);
        toast({ title: "Success", description: "Permissions updated successfully" });
      }

      loadRoles();
      setSelectedRole(null);
      setAddDialogOpen(false);
      setFormData({ name: '', description: '', permissions: {} });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleAddRole = () => {
    // Get all modules from categories
    const allModules = Object.values(MODULE_CATEGORIES).flatMap(cat => cat.modules);
    const permissions: RolePermissions = {};
    allModules.forEach(module => {
      permissions[module] = 'none';
    });
    setFormData({
      name: '',
      description: '',
      permissions
    });
    setSelectedRole(null);
    setAddDialogOpen(true);
    setIsEditing(true);
  };

  const handleEditRole = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: {}
    });
    setSelectedRole(role);
    setAddDialogOpen(true);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Show add/edit role dialog
  if (addDialogOpen) {
    return (
      <div className="p-6">
        <AnimatedBackground variant="gradient" />
        <div className="space-y-4 sm:space-y-6">
          <AnimatedWrapper variant="fadeInUp">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedRole(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Roles
              </Button>
            </div>
          </AnimatedWrapper>

          <AnimatedWrapper variant="fadeInUp" delay={0.1}>
            <ModernCard variant="glass" className="max-w-2xl mx-auto">
              <CardHeader className="p-6">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  {selectedRole ? 'Edit Role' : 'Add New Role'}
                </CardTitle>
                <CardDescription>
                  {selectedRole ? 'Update the role name and description' : 'Create a new role with a name and description'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., School Admin, Teacher, Librarian"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roleDesc">Description</Label>
                  <Textarea
                    id="roleDesc"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this role is for..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddDialogOpen(false);
                      setSelectedRole(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.name.trim()}>
                    {selectedRole ? 'Update Role' : 'Create Role'}
                  </Button>
                </div>
              </CardContent>
            </ModernCard>
          </AnimatedWrapper>
        </div>
      </div>
    );
  }

  // Show permission detail/edit view
  if (selectedRole) {
    return (
      <div className="p-6">
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
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{formData.name}</CardTitle>
                      <CardDescription>{formData.description || 'No description'}</CardDescription>
                    </div>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Permissions
                    </Button>
                  ) : (
                    <Button onClick={handleSave}>
                      Save Permissions
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-6">
                {Object.entries(MODULE_CATEGORIES).map(([categoryKey, category]) => {
                  const CategoryIcon = category.icon;
                  
                  return (
                    <div key={categoryKey} className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-foreground">{category.label}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {category.modules.length} modules
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {category.modules.map((module) => {
                          const currentPermission = formData.permissions[module] || 'none';
                          
                          return (
                            <div key={module} className="grid grid-cols-[1fr_auto] gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div>
                                <p className="font-medium text-sm">{module}</p>
                                {!isEditing && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    Current Access: {currentPermission.charAt(0).toUpperCase() + currentPermission.slice(1)}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center">
                                {isEditing ? (
                                  <RadioGroup
                                    value={currentPermission}
                                    onValueChange={(value) => handlePermissionChange(module, value as PermissionLevel)}
                                    className="flex gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="none" id={`${module}-none`} />
                                      <Label htmlFor={`${module}-none`} className="text-sm cursor-pointer font-medium">
                                        <span className="text-muted-foreground">🚫 None</span>
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="view" id={`${module}-view`} />
                                      <Label htmlFor={`${module}-view`} className="text-sm cursor-pointer font-medium flex items-center gap-1">
                                        <Eye className="w-3 h-3 text-blue-600" /> View Only
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="edit" id={`${module}-edit`} />
                                      <Label htmlFor={`${module}-edit`} className="text-sm cursor-pointer font-medium flex items-center gap-1">
                                        <Edit2 className="w-3 h-3 text-green-600" /> Full Access
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                ) : (
                                  <div className="flex gap-4">
                                    <Badge variant={currentPermission === 'none' ? 'default' : 'outline'} className="text-xs">
                                      ✕ None
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
      </div>
    );
  }

  // Main roles list view
  return (
    <div className="p-6">
      <AnimatedBackground variant="gradient" />
      <div className="space-y-4 sm:space-y-6">
        <AnimatedWrapper variant="fadeInUp">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                Role & Permissions Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Create roles and control what each role can access in your school
              </p>
            </div>
            <Button onClick={handleAddRole} size="lg">
              <Shield className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </div>
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.05}>
          <BoardConfigurationManager />
        </AnimatedWrapper>

        <AnimatedWrapper variant="fadeInUp" delay={0.1}>
          <ModernCard variant="glass">
            <CardHeader className="p-6">
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Each role determines what users can see and do. Click the shield icon to manage permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Modified</TableHead>
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
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || 'No description provided'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          12/20/2024
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPermissions(role);
                              }}
                              title="Manage Permissions"
                              className="hover:bg-primary/10"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRole(role);
                              }}
                              title="Edit Role Name"
                              className="hover:bg-blue-500/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(role.id);
                              }}
                              title="Delete Role"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  );
}
