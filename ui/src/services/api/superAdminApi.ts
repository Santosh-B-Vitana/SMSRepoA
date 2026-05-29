/**
 * Super Admin API Service
 * All calls to /api/school-feature-permissions/* (super admin endpoints)
 */
import { apiClient, apiGet, apiPost, apiPut, apiPatch } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolListItem {
  id: string;
  name: string;
  schoolCode: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive: boolean;
  enabledModulesCount: number;
  totalModulesCount: number;
  isOnboarded: boolean;
}

export interface SchoolDetail {
  id: string;
  name: string;
  schoolCode: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive: boolean;
}

export interface ModulePermission {
  enabled: boolean;
  permissions: string[];
}

export interface SchoolPermissionsResponse {
  schoolId: string;
  schoolName: string;
  modules: Record<string, ModulePermission>;
}

export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

export interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  activeUsers: number;
  totalStudents: number;
  totalStaff: number;
}

// ─── Schools ──────────────────────────────────────────────────────────────────

export const getAllSchools = (): Promise<SchoolListItem[]> =>
  apiGet("/school-feature-permissions/schools");

export const createSchool = (data: {
  name: string;
  schoolCode: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}): Promise<SchoolDetail> =>
  apiPost("/school-feature-permissions/schools", data);

export const updateSchool = (
  schoolId: string,
  data: { name?: string; address?: string; phone?: string; email?: string; logo?: string }
): Promise<SchoolDetail> =>
  apiPut(`/school-feature-permissions/schools/${schoolId}`, data);

export const uploadSchoolLogo = (schoolId: string, file: File): Promise<{ logoUrl: string }> => {
  const form = new FormData();
  form.append('file', file);
  return apiClient
    .post<{ logoUrl: string }>(`/school-feature-permissions/schools/${schoolId}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const toggleSchoolStatus = (schoolId: string): Promise<{ schoolId: string; isActive: boolean }> =>
  apiPatch(`/school-feature-permissions/schools/${schoolId}/toggle-status`);

// ─── Feature Permissions ──────────────────────────────────────────────────────

export const getSchoolPermissions = (schoolId: string): Promise<SchoolPermissionsResponse> =>
  apiGet(`/school-feature-permissions/schools/${schoolId}`);

export const updateModulePermission = (
  schoolId: string,
  moduleName: string,
  isEnabled: boolean
): Promise<unknown> =>
  apiPut(`/school-feature-permissions/schools/${schoolId}/modules/${moduleName}`, { isEnabled });

export const bulkUpdatePermissions = (
  schoolId: string,
  modules: Record<string, { enabled: boolean }>
): Promise<SchoolPermissionsResponse> =>
  apiPut(`/school-feature-permissions/schools/${schoolId}/bulk`, { schoolId, modules });

// ─── Users ────────────────────────────────────────────────────────────────────

export const getAllUsers = (params?: {
  schoolId?: string;
  role?: string;
  search?: string;
}): Promise<PlatformUser[]> =>
  apiGet("/school-feature-permissions/users", params as Record<string, unknown>);

export const createUser = (data: {
  username: string;
  email: string;
  password: string;
  role: string;
  schoolId: string;
}): Promise<PlatformUser> =>
  apiPost("/school-feature-permissions/users", data);

export const toggleUserStatus = (userId: string): Promise<{ userId: string; status: string }> =>
  apiPatch(`/school-feature-permissions/users/${userId}/toggle-status`);

export const resetUserPassword = (userId: string, newPassword: string): Promise<unknown> =>
  apiPost(`/school-feature-permissions/users/${userId}/reset-password`, { newPassword });

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getPlatformStats = (): Promise<PlatformStats> =>
  apiGet("/school-feature-permissions/stats");

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardSchoolRequest {
  name: string;
  schoolCode: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  academicYearName: string;
  academicYearStart: string; // ISO date
  academicYearEnd: string;   // ISO date
  academicYearIsCurrent: boolean;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  moduleOverrides?: Record<string, boolean>;
  boardConfigurationIds?: string[];
  defaultBoardConfigurationId?: string;
}

export interface OnboardSchoolResult {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  adminUserId: string;
  adminEmail: string;
  academicYearId: string;
  academicYearName: string;
  enabledModules: string[];
}

export const onboardSchool = (data: OnboardSchoolRequest): Promise<OnboardSchoolResult> =>
  apiPost("/school-feature-permissions/onboard", data);

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface SchoolBilling {
  schoolId: string;
  schoolName: string;
  billingPlan: string;        // Standard | Pro | Enterprise
  billingStatus: string;      // Active | Inactive | Suspended | Trial
  billingExpiryDate: string | null;
  renewalReminderDays: number;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface UpdateBillingRequest {
  billingPlan?: string;
  billingStatus?: string;
  billingExpiryDate?: string | null;
  renewalReminderDays?: number;
}

export interface BillingNotification {
  hasWarning: boolean;
  message: string;
  severity: "info" | "warning" | "critical";
  daysUntilExpiry: number | null;
  billingPlan: string;
  billingStatus: string;
  billingExpiryDate: string | null;
}

export const getSchoolBilling = (schoolId: string): Promise<SchoolBilling> =>
  apiGet(`/school-feature-permissions/schools/${schoolId}/billing`);

export const updateSchoolBilling = (schoolId: string, data: UpdateBillingRequest): Promise<SchoolBilling> =>
  apiPut(`/school-feature-permissions/schools/${schoolId}/billing`, data);

export const getBillingNotification = (): Promise<BillingNotification> =>
  apiGet("/school-feature-permissions/billing-notification");
