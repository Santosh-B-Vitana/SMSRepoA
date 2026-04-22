/**
 * Real Staff API — connects to sms-api backend at /api/staff
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ---------------------------------------------------------------------------
// Types — match backend StaffBasicResponse / StaffResponse (camelCase JSON)
// ---------------------------------------------------------------------------

export interface StaffDocumentDto {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

/** Lightweight record returned in paginated list */
export interface StaffBasic {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  email: string;
  phone?: string;
  status: string;
  profilePhoto?: string;
  // Computed for UI convenience
  name?: string;
}

/** Full staff detail — matches backend StaffResponse (JSON camelCase) */
export interface Staff extends StaffBasic {
  schoolId: string;
  gender: string;
  dateOfBirth: string;
  joiningDate: string;
  qualification?: string;
  experience: number;

  // Address
  address?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Contact
  phone: string;
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;

  // Professional
  specialization?: string;
  employmentType: string;
  reportingToId?: string;
  reportingToName?: string;
  subjects?: string;
  classes?: string;

  // Banking
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;

  // PF/ESI
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;

  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  salary?: number;

  documents?: StaffDocumentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffListResponse {
  staff: StaffBasic[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StaffStatsResponse {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  onLeave: number;
  byDepartment: Record<string, number>;
  byDesignation: Record<string, number>;
  byEmploymentType: Record<string, number>;
}

export interface StaffFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  designation: string;
  department: string;
  joiningDate: string;
  phone: string;
  email: string;
  employeeId?: string;
  qualification?: string;
  experience?: number;
  address?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  specialization?: string;
  employmentType?: string;
  subjects?: string;
  classes?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  status?: string;
  salary?: number;
  profilePhoto?: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export const staffApi = {
  list: (filters?: StaffFilters) =>
    apiGet<StaffListResponse>('/staff', filters as Record<string, unknown>).then(r => ({
      ...r,
      staff: (r.staff ?? []).map(s => ({ ...s, name: `${s.firstName} ${s.lastName}`.trim() })),
    })),

  getById: (id: string) =>
    apiGet<Staff>(`/staff/${id}`).then(s => ({ ...s, name: `${s.firstName} ${s.lastName}`.trim() })),

  create: (data: CreateStaffRequest) =>
    apiPost<Staff>('/staff', data),

  update: (id: string, data: Partial<CreateStaffRequest> & { status?: string }) =>
    apiPut<Staff>(`/staff/${id}`, data),

  delete: (id: string) =>
    apiDelete<void>(`/staff/${id}`),

  getStats: () =>
    apiGet<StaffStatsResponse>('/staff/stats'),

  /** Returns only teaching staff (eligible class teachers) */
  getTeachingStaff: () =>
    apiGet<StaffListResponse>('/staff/teaching').then(r => ({
      ...r,
      staff: (r.staff ?? []).map(s => ({ ...s, name: `${s.firstName} ${s.lastName}`.trim() })),
    })),

  /** Reset a staff member's login password (Admin/Principal only) */
  resetPassword: (id: string, newPassword: string) =>
    apiPost<{ message: string }>(`/staff/${id}/reset-password`, { newPassword }),
};
