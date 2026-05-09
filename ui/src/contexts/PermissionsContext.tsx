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
  isModuleEnabled: (module: ModuleName) => boolean;
  hasPermission: (module: ModuleName, permission: PermissionLevel) => boolean;
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
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    // Super admin manages schools but has no school of their own — all modules enabled
    if (!user || user.role === 'super_admin') {
      setLoading(false);
      return;
    }

    const schoolId = user.schoolId;
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<ApiSchoolPermissionsResponse>(
        `/school-feature-permissions/schools/${schoolId}`
      );

      const parsed: Partial<Record<ModuleName, ModulePermissions>> = {};
      for (const [name, mod] of Object.entries(data.modules ?? {})) {
        parsed[name as ModuleName] = {
          enabled: mod.enabled,
          permissions: (mod.permissionLevels?.split(',').filter(Boolean) as PermissionLevel[]) ?? ['read', 'write', 'delete'],
        };
      }
      setModulePermissions(parsed);
    } catch (err) {
      // On error default to all-enabled so users are not locked out
      console.warn('[PermissionsProvider] Could not load permissions, defaulting to all-enabled:', err);
      setModulePermissions({});
    } finally {
      setLoading(false);
    }
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
    isModuleEnabled,
    hasPermission,
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
