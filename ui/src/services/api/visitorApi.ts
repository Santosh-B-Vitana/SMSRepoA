import apiClient from './apiClient';

const BASE = '/visitor';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitorBasic {
  id: string;
  visitorId?: string;
  visitNumber?: string;
  name?: string;
  visitorName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  purpose: string;
  personToMeet?: string;
  department?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;          // "checked_in" | "checked_out" | "cancelled"
  visitDuration?: number;  // minutes
  hasVehicle?: boolean;
  vehicleNumber?: string;
  isBlacklisted?: boolean;
  createdAt: string;
}

export interface VisitorFull extends VisitorBasic {
  schoolId: string;
  address?: string;
  company?: string;
  designation?: string;
  purposeDetails?: string;
  personToMeetId?: string;
  staffMeetingId?: string;
  itemsCarried?: string;
  passNumber?: string;
  idProof?: string;
  idProofNumber?: string;
  idType?: string;
  idNumber?: string;
  vehicleType?: string;
  photoUrl?: string;
  badgeNumber?: string;
  remarks?: string;
  expectedDuration?: number;
  checkedInBy?: string;
  checkedInByName?: string;
  checkedOutBy?: string;
  checkedOutByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  isRecurring?: boolean;
  updatedAt?: string;
}

export interface VisitorPreRegistration {
  id: string;
  schoolId: string;
  visitorName: string;
  visitorPhone: string;
  phone?: string;
  visitorEmail?: string;
  email?: string;
  organization?: string;
  purpose: string;
  personToMeet: string;
  department?: string;
  expectedDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: string;  // "pending" | "approved" | "arrived" | "cancelled"
  createdAt: string;
}

export interface VisitorStats {
  todayTotal: number;
  currentlyInside: number;
  completedToday: number;
  cancelledToday: number;
  thisWeek?: number;
  thisMonth?: number;
  averageVisitDuration: number;
  purposeBreakdown: Record<string, number>;
}

export interface PaginatedVisitors {
  items: VisitorBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VisitorFilters {
  status?: string;
  purpose?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CheckInDto {
  name: string;
  phone: string;
  email?: string;
  purpose: string;
  personToMeet: string;
  idProof?: string;
  idProofNumber?: string;
  hasVehicle?: boolean;
  vehicleNumber?: string;
  studentId?: string;
}

export interface PreRegisterDto {
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  personToMeet: string;
  expectedDate: string;
  expectedTime?: string;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const visitorApi = {
  /** GET /api/visitor — paginated list with filters */
  getVisitors: (filters: VisitorFilters = {}, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.status)      params.append('status', filters.status);
    if (filters.purpose)     params.append('purpose', filters.purpose);
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters.dateFrom)    params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo)      params.append('dateTo', filters.dateTo);
    return apiClient.get<PaginatedVisitors>(`${BASE}?${params}`).then(r => r.data);
  },

  /** GET /api/visitor/{id} */
  getById: (id: string) =>
    apiClient.get<VisitorFull>(`${BASE}/${id}`).then(r => r.data),

  /** POST /api/visitor/check-in */
  checkIn: (dto: CheckInDto) =>
    apiClient.post<VisitorFull>(`${BASE}/check-in`, dto).then(r => r.data),

  /** PUT /api/visitor/{id}/check-out */
  checkOut: (id: string) =>
    apiClient.put(`${BASE}/${id}/check-out`, {}).then(r => r.data),

  /** PUT /api/visitor/{id}/cancel */
  cancelVisit: (id: string, reason: string) =>
    apiClient.put(`${BASE}/${id}/cancel`, { reason }).then(r => r.data),

  /** GET /api/visitor/currently-inside */
  getCurrentlyInside: () =>
    apiClient.get<VisitorBasic[]>(`${BASE}/currently-inside`).then(r => r.data),

  /** GET /api/visitor/today */
  getToday: () =>
    apiClient.get<VisitorBasic[]>(`${BASE}/today`).then(r => r.data),

  /** GET /api/visitor/stats */
  getStats: (startDate?: string) => {
    const params = startDate ? `?startDate=${startDate}` : '';
    return apiClient.get<VisitorStats>(`${BASE}/stats${params}`).then(r => r.data);
  },

  /** GET /api/visitor/history/{phone} */
  getHistory: (phone: string) =>
    apiClient.get<VisitorBasic[]>(`${BASE}/history/${encodeURIComponent(phone)}`).then(r => r.data),

  /** GET /api/visitor/pre-registrations */
  getPreRegistrations: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiClient.get<VisitorPreRegistration[]>(`${BASE}/pre-registrations${params}`).then(r => r.data);
  },

  /** POST /api/visitor/pre-registrations */
  createPreRegistration: (dto: PreRegisterDto) =>
    apiClient.post<VisitorPreRegistration>(`${BASE}/pre-registrations`, dto).then(r => r.data),

  /** PUT /api/visitor/pre-registrations/{id}/approve */
  approvePreRegistration: (id: string) =>
    apiClient.put(`${BASE}/pre-registrations/${id}/approve`, {}).then(r => r.data),
};

export default visitorApi;
