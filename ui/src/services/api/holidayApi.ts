import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type HolidayType = 'public' | 'school' | 'optional' | 'national' | 'regional';

export interface HolidayBasic {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  type: HolidayType;
  academicYear: string;
  durationDays: number;
}

export interface HolidayFull {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate?: string;
  type: HolidayType;
  description?: string;
  academicYear: string;
  isActive: boolean;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayStats {
  totalHolidays: number;
  totalDaysOff: number;
  upcomingCount: number;
  thisMonthCount: number;
  publicHolidays: number;
  schoolHolidays: number;
  optionalHolidays: number;
  nationalHolidays: number;
  regionalHolidays: number;
  nextHolidayName?: string;
  nextHolidayDate?: string;
}

export interface CreateHolidayDto {
  name: string;
  startDate: string;
  endDate?: string;
  type: HolidayType;
  description?: string;
  academicYear: string;
}

export interface UpdateHolidayDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  type?: HolidayType;
  description?: string;
  isActive?: boolean;
}

export interface HolidayFilters {
  type?: HolidayType;
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
}

export interface PaginatedHolidays {
  items: HolidayBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkCreateHolidaysDto {
  holidays: CreateHolidayDto[];
}

export interface BulkErrorItem {
  index: number;
  name: string;
  message: string;
}

export interface BulkCreateHolidaysResponse {
  created: number;
  failed: number;
  successItems: HolidayFull[];
  errors: BulkErrorItem[];
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// API Functions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const HOLIDAY_TYPES: HolidayType[] = [
  'public', 'school', 'optional', 'national', 'regional'
];

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  public:   'Public',
  school:   'School',
  optional: 'Optional',
  national: 'National',
  regional: 'Regional',
};

export async function getHolidays(
  filters?: HolidayFilters,
  page = 1,
  pageSize = 10
): Promise<PaginatedHolidays> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
  }
  return apiGet<PaginatedHolidays>(`/holidays?${params}`);
}

export async function getHolidayById(id: string): Promise<HolidayFull> {
  return apiGet<HolidayFull>(`/holidays/${id}`);
}

export async function getUpcomingHolidays(days = 30): Promise<HolidayBasic[]> {
  return apiGet<HolidayBasic[]>(`/holidays/upcoming?days=${days}`);
}

export async function getHolidayStats(academicYear?: string): Promise<HolidayStats> {
  const params = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return apiGet<HolidayStats>(`/holidays/stats${params}`);
}

export async function createHoliday(data: CreateHolidayDto): Promise<HolidayFull> {
  return apiPost<HolidayFull>('/holidays', data);
}

export async function updateHoliday(id: string, data: UpdateHolidayDto): Promise<HolidayFull> {
  return apiPut<HolidayFull>(`/holidays/${id}`, data);
}

export async function deleteHoliday(id: string): Promise<void> {
  return apiDelete<void>(`/holidays/${id}`);
}

export async function bulkCreateHolidays(
  data: BulkCreateHolidaysDto
): Promise<BulkCreateHolidaysResponse> {
  return apiPost<BulkCreateHolidaysResponse>('/holidays/bulk', data);
}

export const holidayApi = {
  getHolidays,
  getHolidayById,
  getUpcomingHolidays,
  getHolidayStats,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  bulkCreateHolidays,
};

export default holidayApi;
