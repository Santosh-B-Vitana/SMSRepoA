import apiClient from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuardianAccountStatus {
  guardianId: string;
  guardianName: string;
  relation: string;
  email: string | null;
  phone: string;
  hasAccount: boolean;
  accountStatus: string | null;     // "active" | "inactive" | "locked" | "suspended"
  requirePasswordChange: boolean;
  lastLogin: string | null;
  userLoginId: string | null;
}

export interface ProvisionParentAccountResponse {
  guardianId: string;
  guardianName: string;
  email: string;
  /** Plain-text temporary password — shown once, never stored client-side beyond this response */
  temporaryPassword: string;
  action: string;   // "provisioned" | "reprovisioned" | "reset"
  message: string;
  requirePasswordChange: boolean;
}

export interface StaffAccountStatus {
  staffId: string;
  staffName: string;
  employeeId: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  hasAccount: boolean;
  accountStatus: string | null;
  requirePasswordChange: boolean;
  lastLogin: string | null;
  userLoginId: string | null;
}

export interface ProvisionStaffAccountResponse {
  staffId: string;
  staffName: string;
  employeeId: string;
  email: string;
  /** Plain-text temporary password — shown once, never stored client-side */
  temporaryPassword: string;
  action: string;   // "provisioned" | "reprovisioned" | "reset"
  message: string;
  requirePasswordChange: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * [Admin] Returns parent portal account status for every guardian of a student.
   */
  getStudentParentAccounts: async (studentId: string): Promise<GuardianAccountStatus[]> => {
    const res = await apiClient.get(`/parent-portal/accounts/${studentId}`);
    return res.data?.data ?? res.data;
  },

  /**
   * [Admin] Provisions (or re-provisions) a parent portal account for a guardian.
   * Returns a plain-text temporary password to share with the parent.
   */
  provisionParentAccount: async (
    studentId: string,
    guardianId: string
  ): Promise<ProvisionParentAccountResponse> => {
    const res = await apiClient.post(
      `/parent-portal/provision/${studentId}/guardian/${guardianId}`
    );
    return res.data?.data ?? res.data;
  },

  /**
   * [Admin] Resets a parent's portal password. Returns a new temporary password.
   */
  resetParentPassword: async (
    studentId: string,
    guardianId: string
  ): Promise<ProvisionParentAccountResponse> => {
    const res = await apiClient.post(
      `/parent-portal/reset-password/${studentId}/guardian/${guardianId}`
    );
    return res.data?.data ?? res.data;
  },

  /**
   * [Authenticated] Changes the current user's own password.
   * Works for parents, staff, and admin alike.
   * On success the server clears refresh tokens — the client must re-login.
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
  },

  // ── Staff Portal ────────────────────────────────────────────────────────

  /**
   * [Admin] Returns staff portal account status for a staff member.
   */
  getStaffAccount: async (staffId: string): Promise<StaffAccountStatus> => {
    const res = await apiClient.get(`/staff-portal/account/${staffId}`);
    return res.data?.data ?? res.data;
  },

  /**
   * [Admin] Provisions (or re-provisions) a staff portal account.
   * Returns a plain-text temporary password to share with the staff member.
   */
  provisionStaffAccount: async (staffId: string): Promise<ProvisionStaffAccountResponse> => {
    const res = await apiClient.post(`/staff-portal/provision/${staffId}`);
    return res.data?.data ?? res.data;
  },

  /**
   * [Admin] Resets a staff member's portal password. Returns a new temporary password.
   */
  resetStaffPassword: async (staffId: string): Promise<ProvisionStaffAccountResponse> => {
    const res = await apiClient.post(`/staff-portal/reset-password/${staffId}`);
    return res.data?.data ?? res.data;
  },
};
