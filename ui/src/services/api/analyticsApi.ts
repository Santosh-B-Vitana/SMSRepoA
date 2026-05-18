/**
 * Analytics API — connects to sms-api /api/analytics
 * Mirrors AnalyticsDTOs.cs 1:1 (camelCase JSON serialisation by ASP.NET Core)
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ── Constants (mirrors AnalyticsConstants in AnalyticsDTOs.cs) ───────────────

export const WIDGET_TYPES = ['chart', 'metric', 'table', 'map', 'gauge', 'list'] as const;
export const CHART_TYPES  = ['line', 'bar', 'pie', 'area', 'scatter', 'bubble', 'donut'] as const;
export const WIDGET_SIZES = ['small', 'medium', 'large', 'full'] as const;
export const VISIBILITIES = ['all', 'admin', 'teacher', 'parent', 'student'] as const;
export const REFRESH_INTERVALS = ['manual', '1min', '5min', '15min', '30min', '1hour'] as const;
export const PERIODS      = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;
export const METRIC_TYPES = ['Enrollment', 'Attendance', 'Revenue', 'Performance', 'Library', 'Health', 'Transport', 'Hostel'] as const;

export type WidgetType      = typeof WIDGET_TYPES[number];
export type ChartType       = typeof CHART_TYPES[number];
export type WidgetSize      = typeof WIDGET_SIZES[number];
export type Visibility      = typeof VISIBILITIES[number];
export type RefreshInterval = typeof REFRESH_INTERVALS[number];
export type Period          = typeof PERIODS[number];
export type MetricType      = typeof METRIC_TYPES[number];

// ── Dashboard Widget types ────────────────────────────────────────────────────

export interface DashboardWidgetResponse {
  id: string;
  schoolId: string;
  name: string;
  widgetType: WidgetType;
  dataSource: string;
  description?: string;
  configuration?: string;
  chartType?: ChartType;
  displayOrder: number;
  size: WidgetSize;
  refreshInterval: RefreshInterval;
  visibility: Visibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidgetListResponse {
  items: DashboardWidgetResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateDashboardWidgetRequest {
  name: string;
  widgetType: WidgetType;
  dataSource: string;
  description?: string;
  configuration?: string;
  chartType?: ChartType;
  displayOrder?: number;
  size?: WidgetSize;
  refreshInterval?: RefreshInterval;
  visibility?: Visibility;
}

export interface UpdateDashboardWidgetRequest {
  name?: string;
  description?: string;
  configuration?: string;
  chartType?: ChartType | null;
  displayOrder?: number;
  size?: WidgetSize;
  refreshInterval?: RefreshInterval;
  visibility?: Visibility;
  isActive?: boolean;
}

// ── Raw Analytics Record types ────────────────────────────────────────────────

export interface AnalyticsResponse {
  id: string;
  schoolId: string;
  metricType: MetricType;
  metricName: string;
  value: number;
  unit?: string;
  period: Period;
  periodStart: string;
  periodEnd: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  metadata?: string;
  createdAt: string;
}

export interface AnalyticsListResponse {
  items: AnalyticsResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateAnalyticsRequest {
  metricType: MetricType;
  metricName: string;
  value: number;
  unit?: string;
  period: Period;
  periodStart: string;
  periodEnd: string;
  classId?: string;
  sectionId?: string;
  metadata?: string;
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export interface DashboardSummaryResponse {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  todayAttendancePercentage: number;
  pendingFees: number;
  totalCollected: number;
  totalFees: number;
  upcomingExams: number;
  pendingAssignments: number;
  unreadNotifications: number;
  todayAbsentStudents: number;
  todayAbsentStaff: number;
  recentMetrics: AnalyticsResponse[];
}

// ── Chart Data ────────────────────────────────────────────────────────────────

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartDataResponse {
  labels: string[];
  datasets: ChartDataset[];
}

// ── Computed Analytics — Attendance ──────────────────────────────────────────

export interface AttendanceDayDataPoint {
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
}

export interface AttendanceAnalyticsResponse {
  totalDays: number;
  averageAttendancePercentage: number;
  highestAttendancePercentage: number;
  lowestAttendancePercentage: number;
  perfectAttendanceDays: number;
  dailyData: AttendanceDayDataPoint[];
}

// ── Computed Analytics — Enrollment ──────────────────────────────────────────

export interface ClassEnrollmentDto {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  capacity?: number;
  fillPercentage?: number;
}

export interface EnrollmentAnalyticsResponse {
  totalActiveStudents: number;
  totalInactiveStudents: number;
  totalClasses: number;
  averageClassSize: number;
  byClass: ClassEnrollmentDto[];
}

// ── Computed Analytics — Performance ─────────────────────────────────────────

export interface SubjectPerformanceDto {
  subject: string;
  totalResults: number;
  averagePercentage: number;
  passCount: number;
  failCount: number;
  passRate: number;
}

export interface PerformanceAnalyticsResponse {
  academicYear?: string;
  totalExams: number;
  totalResults: number;
  overallAveragePercentage: number;
  overallPassRate: number;
  bySubject: SubjectPerformanceDto[];
}

// ── Computed Analytics — Fee Collection ──────────────────────────────────────

export interface FeeMonthDataPoint {
  month: string;
  year: number;
  collected: number;
  pending: number;
  overdue: number;
  totalRecords: number;
}

export interface FeeAnalyticsResponse {
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  monthlyData: FeeMonthDataPoint[];
}

// ── Overview Stats ────────────────────────────────────────────────────────────

export interface SchoolOverviewStatsResponse {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  activeStaff: number;
  totalClasses: number;
  totalBooks: number;
  booksIssued: number;
  pendingAdmissions: number;
  openHealthAlerts: number;
  hostelOccupied: number;
  transportStudents: number;
  todayAttendancePercentage: number;
}

// ── API Client ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  // ── Computed Analytics ────────────────────────────────────────────────────

  /** GET /api/analytics/overview */
  getOverviewStats: (): Promise<SchoolOverviewStatsResponse> =>
    apiGet<SchoolOverviewStatsResponse>('/analytics/overview'),

  /** GET /api/analytics/dashboard/summary?force=true */
  getDashboardSummary: (force = false): Promise<DashboardSummaryResponse> =>
    apiGet<DashboardSummaryResponse>(`/analytics/dashboard/summary${force ? '?force=true' : ''}`),

  /** GET /api/analytics/attendance?days=30 */
  getAttendanceAnalytics: (days = 30): Promise<AttendanceAnalyticsResponse> =>
    apiGet<AttendanceAnalyticsResponse>(`/analytics/attendance?days=${days}`),

  /** GET /api/analytics/enrollment */
  getEnrollmentAnalytics: (): Promise<EnrollmentAnalyticsResponse> =>
    apiGet<EnrollmentAnalyticsResponse>('/analytics/enrollment'),

  /** GET /api/analytics/performance?academicYear=2025-26 */
  getPerformanceAnalytics: (academicYear?: string): Promise<PerformanceAnalyticsResponse> =>
    apiGet<PerformanceAnalyticsResponse>(
      `/analytics/performance${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ''}`
    ),

  /** GET /api/analytics/fees?months=6 */
  getFeeAnalytics: (months = 6): Promise<FeeAnalyticsResponse> =>
    apiGet<FeeAnalyticsResponse>(`/analytics/fees?months=${months}`),

  /** GET /api/analytics/charts/:metricType?period=Daily&dataPoints=7 */
  getChartData: (metricType: MetricType, period: Period = 'Daily', dataPoints = 7): Promise<ChartDataResponse> =>
    apiGet<ChartDataResponse>(
      `/analytics/charts/${metricType}?period=${period}&dataPoints=${dataPoints}`
    ),

  /** GET /api/analytics/metrics/period?metricType=Attendance&startDate=…&endDate=… */
  getMetricsByPeriod: (metricType: MetricType, startDate: string, endDate: string): Promise<AnalyticsResponse[]> =>
    apiGet<AnalyticsResponse[]>(
      `/analytics/metrics/period?metricType=${metricType}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),

  // ── Dashboard Widgets ─────────────────────────────────────────────────────

  /** GET /api/analytics/widgets?visibility=all */
  getWidgets: (visibility?: Visibility): Promise<DashboardWidgetListResponse> =>
    apiGet<DashboardWidgetListResponse>(
      `/analytics/widgets${visibility ? `?visibility=${visibility}` : ''}`
    ),

  /** GET /api/analytics/widgets/:id */
  getWidget: (id: string): Promise<DashboardWidgetResponse> =>
    apiGet<DashboardWidgetResponse>(`/analytics/widgets/${id}`),

  /** POST /api/analytics/widgets */
  createWidget: (data: CreateDashboardWidgetRequest): Promise<DashboardWidgetResponse> =>
    apiPost<DashboardWidgetResponse>('/analytics/widgets', data),

  /** PUT /api/analytics/widgets/:id */
  updateWidget: (id: string, data: UpdateDashboardWidgetRequest): Promise<DashboardWidgetResponse> =>
    apiPut<DashboardWidgetResponse>(`/analytics/widgets/${id}`, data),

  /** DELETE /api/analytics/widgets/:id */
  deleteWidget: (id: string): Promise<void> =>
    apiDelete<void>(`/analytics/widgets/${id}`),

  // ── Raw Analytics Records ─────────────────────────────────────────────────

  /** GET /api/analytics/metrics?page=1&pageSize=20&metricType=Attendance&period=Daily */
  getMetrics: (params?: {
    page?: number;
    pageSize?: number;
    metricType?: MetricType;
    period?: Period;
  }): Promise<AnalyticsListResponse> => {
    const q = new URLSearchParams();
    if (params?.page)       q.set('page',       String(params.page));
    if (params?.pageSize)   q.set('pageSize',   String(params.pageSize));
    if (params?.metricType) q.set('metricType', params.metricType);
    if (params?.period)     q.set('period',     params.period);
    const qs = q.toString();
    return apiGet<AnalyticsListResponse>(`/analytics/metrics${qs ? `?${qs}` : ''}`);
  },

  /** GET /api/analytics/metrics/:id */
  getMetric: (id: string): Promise<AnalyticsResponse> =>
    apiGet<AnalyticsResponse>(`/analytics/metrics/${id}`),

  /** POST /api/analytics/metrics */
  createMetric: (data: CreateAnalyticsRequest): Promise<AnalyticsResponse> =>
    apiPost<AnalyticsResponse>('/analytics/metrics', data),

  /** DELETE /api/analytics/metrics/:id */
  deleteMetric: (id: string): Promise<void> =>
    apiDelete<void>(`/analytics/metrics/${id}`),
};

