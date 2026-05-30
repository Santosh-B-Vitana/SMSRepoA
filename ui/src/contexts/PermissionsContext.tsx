import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiGet } from '@/lib/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModuleName =
  | 'students'
  | 'staff'
  | 'attendance'
  | 'fees'
  | 'timetable'
  | 'examinations'
  | 'announcements'
  | 'reports'
  | 'documents'
  | 'admissions'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'health'
  | 'payroll'
  | 'communication'
  | 'analytics'
  | 'certificates'
  | 'store'
  | 'wallet';

export type PermissionLevel = 'read' | 'write' | 'delete';

export interface ModulePermissions {
  enabled: boolean;
  permissions: PermissionLevel[];
}

export interface SchoolPermissions {
  schoolId: string;
  schoolName: string;
  modules: Record<ModuleName, ModulePermissions>;
}

interface ApiModuleData {
  enabled: boolean;
  permissionLevels?: string;
}

interface ApiSchoolPermissionsResponse {
  schoolId: string;
  schoolName: string;
  modules: Record<string, ApiModuleData>;
}

interface PermissionsContextType {
  modulePermissions: Partial<Record<ModuleName, ModulePermissions>>;
  loading: boolean;
  /** True once the /permissions/me call has resolved (success or failure). Use this to avoid
   *  showing "Access Denied" during the loading phase. */
  permissionsLoaded: boolean;
  isModuleEnabled: (module: ModuleName) => boolean;
  hasPermission: (module: ModuleName, permission: PermissionLevel) => boolean;
  /** Check a fine-grained role-management permission, e.g. hasUserPermission('Attendance','Create') */
  hasUserPermission: (module: string, action: string) => boolean;
  /** All effective permission strings granted to this user via Role Management */
  userPermissions: Set<string>;
  refreshPermissions: () => Promise<void>;
  // Legacy fields kept for backward compatibility
  schoolPermissions: SchoolPermissions[];
  currentSchoolPermissions: Record<ModuleName, ModulePermissions> | null;
  updateSchoolPermissions: (schoolId: string, moduleName: ModuleName, permissions: ModulePermissions) => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = (): PermissionsContextType => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within a PermissionsProvider');
  return ctx;
};

interface Props { children: React.ReactNode; }

export const PermissionsProvider: React.FC<Props> = ({ children }) => {
  const { user, loading: authLoading } = useAuth() ?? {};
  const [modulePermissions, setModulePermissions] = useState<Partial<Record<ModuleName, ModulePermissions>>>({});
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  // isRoleManaged: true = admin has configured roles for this user (fail-closed for missing perms)
  // isRoleManaged: false = never configured → fall back to designation defaults
  const [isRoleManaged, setIsRoleManaged] = useState(false);
  // Track whether the /permissions/me fetch has completed (success or failure)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [permissionsFetchFailed, setPermissionsFetchFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    // Super admin manages schools but has no school of their own — all modules enabled
    if (!user || user.role === 'super_admin') {
      setUserPermissions(new Set(['*']));
      setIsRoleManaged(true);
      setPermissionsLoaded(true);
      setLoading(false);
      return;
    }

    if (user.role === 'admin') {
      setUserPermissions(new Set(['*']));
      setIsRoleManaged(true);
      setPermissionsLoaded(true);
    }

    const schoolId = user.schoolId;
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch school-level module toggles.
      // Admin/SuperAdmin use the school-scoped endpoint; staff & parent use /my-school
      // (the school-scoped endpoint is admin-only and returns 403 for other roles).
      const moduleEndpoint = (user.role === 'admin' || user.role === 'super_admin')
        ? `/school-feature-permissions/schools/${schoolId}`
        : `/school-feature-permissions/my-school`;
      const data = await apiGet<ApiSchoolPermissionsResponse>(moduleEndpoint);

      const parsed: Partial<Record<ModuleName, ModulePermissions>> = {};
      for (const [name, mod] of Object.entries(data.modules ?? {})) {
        parsed[name as ModuleName] = {
          enabled: mod.enabled,
          permissions: (mod.permissionLevels?.split(',').filter(Boolean) as PermissionLevel[]) ?? ['read', 'write', 'delete'],
        };
      }
      setModulePermissions(parsed);
    } catch (err) {
      console.warn('[PermissionsProvider] Could not load module permissions, defaulting to all-enabled:', err);
      setModulePermissions({});
    }

    // Fetch user's role-based effective permissions (staff only)
    if (user.role === 'staff') {
      try {
        const resp = await apiGet<{ permissions: string[]; isRoleManaged: boolean }>('/permissions/me');
        setUserPermissions(new Set(resp.permissions));
        setIsRoleManaged(resp.isRoleManaged);
        setPermissionsLoaded(true);
        setPermissionsFetchFailed(false);
      } catch {
        // API error — fail-open: don't lock the user out due to a network issue
        setPermissionsFetchFailed(true);
        setPermissionsLoaded(false);
      }
    } else {
      // For admin, super_admin, parent, student: no /permissions/me needed
      // (admin/super_admin already set permissionsLoaded=true above; parent/student have no role checks)
      setPermissionsLoaded(true);
    }

    setLoading(false);
  }, [user?.schoolId, user?.role]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    fetchPermissions();
  }, [authLoading, fetchPermissions]);

  // Re-check permissions on every route navigation so super-admin module
  // enable/disable takes effect without requiring a full re-login
  const location = useLocation();
  useEffect(() => {
    if (!authLoading && user && user.role !== 'super_admin') {
      fetchPermissions();
    }
  }, [location.pathname]);

  const isModuleEnabled = useCallback((module: ModuleName): boolean => {
    if (user?.role === 'super_admin') return true;
    const perm = modulePermissions[module];
    if (perm === undefined) return true; // no record = default enabled
    return perm.enabled;
  }, [user?.role, modulePermissions]);

  const hasPermission = useCallback((module: ModuleName, permission: PermissionLevel): boolean => {
    if (user?.role === 'super_admin') return true;
    const perm = modulePermissions[module];
    if (!perm) return true;
    return perm.enabled && perm.permissions.includes(permission);
  }, [user?.role, modulePermissions]);

  /** Fine-grained role-management permission check.
   *
   * Decision tree:
   * 1. Admin / super-admin → always true
   * 2. Wildcard in set → always true
   * 3. Still loading (first paint) → true (prevent flash of disabled state)
   * 4. API call failed (network down) → true (fail-open, don't lock out due to outage)
   * 5. isRoleManaged = true (user has/had explicit role assignments) → strict check
   * 6. isRoleManaged = false, permissions non-empty → those permissions apply (auto-assign result)
   * 7. isRoleManaged = false, permissions empty → designation-based fallback
   *    (only for users that were NEVER touched by Role Management)
   */
  const hasUserPermission = useCallback((module: string, action: string): boolean => {
    if (!user || user.role === 'admin' || user.role === 'super_admin') return true;
    if (userPermissions.has('*')) return true;

    // While the permissions call is in-flight, don't flash a disabled state
    if (!permissionsLoaded && !permissionsFetchFailed) return true;

    // If the API was unreachable, fail-open to avoid locking staff out during downtime
    if (permissionsFetchFailed) return true;

    // Explicit role assignments exist (or did exist) → strict enforcement — no fallback
    if (isRoleManaged) {
      return userPermissions.has(`${module}.${action}`);
    }

    // User has some permissions loaded but isRoleManaged = false
    // (edge case: permissions seeded without formal UserRole record)
    if (userPermissions.size > 0) {
      return userPermissions.has(`${module}.${action}`);
    }

    // User has NEVER been touched by Role Management AND has no permissions
    // → use designation-based defaults (fresh/unconfigured users)
    return checkDesignationPermission(user?.designation, module, action);
  }, [user?.role, user?.designation, userPermissions, isRoleManaged, permissionsLoaded, permissionsFetchFailed]);

  /** Designation-based permission defaults (used only when Role Management has never been
   *  configured for the user — i.e. isRoleManaged = false AND permissions are empty).
   *
   *  Write-level actions (Create / Edit / Delete) always require an explicit role assignment.
   *  Designation only grants View-level access as a safety net for fresh/unconfigured systems.
   */
  function checkDesignationPermission(designation: string | undefined, module: string, action: string): boolean {
    // Block all write operations — these MUST come from an explicit role
    if (['Create', 'Edit', 'Delete'].includes(action)) return false;

    const d = (designation ?? '').toLowerCase().trim();
    // Principals / VP / HOD can view everything except Certificates (admin-only module)
    if (['principal', 'vice principal', 'head of department'].includes(d)) return module !== 'Certificates';
    // Class teachers can view their teaching modules including Health for their class
    // Note: Students is intentionally excluded — teachers access student info via My Classes.
    // Library access is not a default for teachers; grant it via Role Management if needed.
    if (d === 'class teacher') {
      return ['Attendance', 'Grades', 'Assignments', 'Health'].includes(module);
    }
    // Subject/general teachers: no Attendance (they are not class in-charge)
    if (d === 'teacher' || d === 'subject teacher') {
      return ['Grades', 'Assignments'].includes(module);
    }
    return false;
  }

  // Legacy: build SchoolPermissions array from flat modulePermissions for backward compat
  const legacySchoolPermissions: SchoolPermissions[] = user?.schoolId
    ? [{
        schoolId: user.schoolId,
        schoolName: '',
        modules: Object.fromEntries(
          (Object.keys(modulePermissions).length > 0 ? Object.entries(modulePermissions) : []).map(
            ([k, v]) => [k, v ?? { enabled: true, permissions: ['read', 'write', 'delete'] as PermissionLevel[] }]
          )
        ) as Record<ModuleName, ModulePermissions>,
      }]
    : [];

  const value: PermissionsContextType = {
    modulePermissions,
    loading: !!authLoading || loading,
    permissionsLoaded,
    isModuleEnabled,
    hasPermission,
    hasUserPermission,
    userPermissions,
    refreshPermissions: fetchPermissions,
    schoolPermissions: legacySchoolPermissions,
    currentSchoolPermissions: null,
    updateSchoolPermissions: async () => {},
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
