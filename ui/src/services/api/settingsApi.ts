import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolSettingResponse {
  id: string;
  schoolId: string;
  settingKey: string;
  settingValue: string;
  dataType?: string;
  category?: string;
  description?: string;
  isEncrypted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingResponse {
  id: string;
  userId: string;
  settingKey: string;
  settingValue: string;
  dataType?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsListResponse {
  settings: SchoolSettingResponse[];
  userSettings: UserSettingResponse[];
  systemConfigs: SystemConfigResponse[];
  totalCount: number;
}

export interface SystemConfigResponse {
  id: string;
  configKey: string;
  configValue: string;
  dataType?: string;
  module?: string;
  description?: string;
  isReadOnly: boolean;
  requiresRestart: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSettingRequest {
  schoolId?: string;
  settingKey: string;
  settingValue: string;
  dataType?: string;
  category?: string;
  description?: string;
  isEncrypted?: boolean;
}

export interface UserSettingRequest {
  userId?: string;
  settingKey: string;
  settingValue: string;
  dataType?: string;
  category?: string;
}

export interface BulkSettingsRequest {
  schoolSettings?: SchoolSettingRequest[];
  userSettings?: UserSettingRequest[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ─── Helper: extract value from settings list ─────────────────────────────────

export function getSetting(
  settings: (SchoolSettingResponse | UserSettingResponse)[],
  key: string,
  fallback = ''
): string {
  return settings.find((s) => s.settingKey === key)?.settingValue ?? fallback;
}

export function buildSchoolSetting(
  key: string,
  value: string,
  category: string,
  dataType = 'string'
): SchoolSettingRequest {
  return { settingKey: key, settingValue: value, category, dataType };
}

export function buildUserSetting(
  key: string,
  value: string,
  category: string,
  dataType = 'string'
): UserSettingRequest {
  return { settingKey: key, settingValue: value, category, dataType };
}

export interface UpdateSchoolContactRequest {
  name?:    string;
  logo?:    string;
  phone?:   string;
  email?:   string;
  address?: string;
  website?: string;
  tagline?: string;
}

// ─── API methods ──────────────────────────────────────────────────────────────

const settingsApi = {
  /** GET basic profile info for the current user's school (name, logo, address, etc.) */
  getSchoolInfo(): Promise<{ id: string; name: string; logoUrl?: string; address?: string; phone?: string; email?: string; status: 'active' | 'inactive' }> {
    return apiClient.get('/settings/school/me').then((r) => r.data);
  },

  /** GET all school settings, optionally filtered by category */
  getSchoolSettings(schoolId: string, category?: string): Promise<SettingsListResponse> {
    const params = category ? { category } : undefined;
    return apiClient
      .get<SettingsListResponse>(`/settings/school/${schoolId}`, { params })
      .then((r) => r.data);
  },

  /** POST upsert a single school setting */
  setSchoolSetting(req: SchoolSettingRequest): Promise<SchoolSettingResponse> {
    return apiClient.post<SchoolSettingResponse>('/settings/school', req).then((r) => r.data);
  },

  /** DELETE a school setting by id */
  deleteSchoolSetting(id: string): Promise<void> {
    return apiClient.delete(`/settings/school/${id}`).then(() => undefined);
  },

  /** GET all user settings for a user */
  getUserSettings(userId: string): Promise<SettingsListResponse> {
    return apiClient
      .get<SettingsListResponse>(`/settings/user/${userId}`)
      .then((r) => r.data);
  },

  /** POST upsert a single user setting */
  setUserSetting(req: UserSettingRequest): Promise<UserSettingResponse> {
    return apiClient.post<UserSettingResponse>('/settings/user', req).then((r) => r.data);
  },

  /** POST bulk save school + user settings in one call */
  bulkUpdate(req: BulkSettingsRequest): Promise<void> {
    return apiClient.post('/settings/bulk', req).then(() => undefined);
  },

  /** PATCH update contact/operational fields on the School entity (admin + super_admin) */
  updateSchoolContact(schoolId: string, req: UpdateSchoolContactRequest): Promise<void> {
    return apiClient.patch(`/settings/school/${schoolId}/contact`, req).then(() => undefined);
  },

  /** PUT update current user's own first/last name in the UserLogin record */
  updateMyProfile(data: { firstName: string; lastName: string }): Promise<void> {
    return apiClient.put('/user-management/me', data).then(() => undefined);
  },

  /** POST change the authenticated user's password */
  changePassword(req: ChangePasswordRequest): Promise<{ message: string }> {
    return apiClient
      .post<{ message: string }>('/auth/change-password', req)
      .then((r) => r.data);
  },
};

export { settingsApi };
export default settingsApi;
