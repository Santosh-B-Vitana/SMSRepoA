import { rateLimiter } from './rateLimiter';

export interface AnalyticsDashboardData {
  totalStudents: number;
  totalStaff: number;
  attendanceRate: number;
  feeCollection: number;
  recentActivities: Activity[];
  trends: TrendData[];
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

export interface TrendData {
  label: string;
  value: number;
  change: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  department?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasMore: boolean;
}

// Mock data cache
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class AnalyticsService {
  private async checkCache<T>(key: string): Promise<T | null> {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    dataCache.set(key, { data, timestamp: Date.now() });
  }

  async getDashboardAnalytics(schoolId: string, filters: AnalyticsFilters = {}): Promise<AnalyticsDashboardData> {
    await rateLimiter.checkLimit(`analytics_${schoolId}`);
    
    const cacheKey = `dashboard_${schoolId}_${JSON.stringify(filters)}`;
    const cached = await this.checkCache<AnalyticsDashboardData>(cacheKey);
    if (cached) return cached;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const data: AnalyticsDashboardData = {
      totalStudents: Math.floor(Math.random() * 1000) + 500,
      totalStaff: Math.floor(Math.random() * 100) + 50,
      attendanceRate: Math.random() * 20 + 80,
      feeCollection: Math.random() * 1000000 + 500000,
      recentActivities: this.generateMockActivities(10),
      trends: this.generateMockTrends()
    };

    this.setCache(cacheKey, data);
    return data;
  }

  async getModuleAnalytics(
    schoolId: string,
    module: string,
    filters: AnalyticsFilters = {}
  ): Promise<any> {
    await rateLimiter.checkLimit(`analytics_${schoolId}`);
    
    const cacheKey = `module_${schoolId}_${module}_${JSON.stringify(filters)}`;
    const cached = await this.checkCache(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 100));

    const data = {
      module,
      metrics: this.generateModuleMetrics(module),
      charts: this.generateChartData(module),
      summary: this.generateSummary(module)
    };

    this.setCache(cacheKey, data);
    return data;
  }

  async getActivityLogs(
    schoolId: string,
    filters: AnalyticsFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<Activity>> {
    await rateLimiter.checkLimit(`analytics_${schoolId}`);

    const cacheKey = `activities_${schoolId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.pageSize}`;
    const cached = await this.checkCache<PaginatedResponse<Activity>>(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    const totalActivities = 1000;
    const activities = this.generateMockActivities(pagination.pageSize, pagination.page);

    const response: PaginatedResponse<Activity> = {
      data: activities,
      total: totalActivities,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalActivities / pagination.pageSize)
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async getActivityLogsCursor(
    schoolId: string,
    filters: AnalyticsFilters = {},
    pagination: CursorPaginationParams = { limit: 20 }
  ): Promise<CursorPaginatedResponse<Activity>> {
    await rateLimiter.checkLimit(`analytics_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    const activities = this.generateMockActivities(pagination.limit);
    const hasMore = Math.random() > 0.3;

    return {
      data: activities,
      nextCursor: hasMore ? `cursor_${Date.now()}` : undefined,
      previousCursor: pagination.cursor ? `cursor_prev_${Date.now()}` : undefined,
      hasMore
    };
  }

  async exportAnalytics(
    schoolId: string,
    type: string,
    filters: AnalyticsFilters = {},
    format: 'csv' | 'pdf' | 'excel' = 'pdf'
  ): Promise<{ downloadUrl: string; filename: string }> {
    await rateLimiter.checkLimit(`analytics_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      downloadUrl: `https://example.com/reports/${schoolId}/${type}.${format}`,
      filename: `analytics_${type}_${Date.now()}.${format}`
    };
  }

  private generateMockActivities(count: number, page: number = 1): Activity[] {
    const activities: Activity[] = [];
    const types = ['student_admission', 'fee_payment', 'attendance_marked', 'exam_created', 'staff_added'];
    
    for (let i = 0; i < count; i++) {
      const offset = (page - 1) * count + i;
      activities.push({
        id: `ACT${String(offset + 1).padStart(6, '0')}`,
        type: types[Math.floor(Math.random() * types.length)],
        description: `Activity ${offset + 1} description`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        user: `User ${Math.floor(Math.random() * 100)}`
      });
    }
    
    return activities;
  }

  private generateMockTrends(): TrendData[] {
    return [
      { label: 'Student Enrollment', value: 850, change: 5.2 },
      { label: 'Attendance Rate', value: 92.5, change: 2.1 },
      { label: 'Fee Collection', value: 85.3, change: -1.5 },
      { label: 'Staff Retention', value: 94.8, change: 3.7 }
    ];
  }

  private generateModuleMetrics(module: string): any {
    return {
      totalRecords: Math.floor(Math.random() * 1000) + 100,
      activeRecords: Math.floor(Math.random() * 800) + 50,
      completionRate: Math.random() * 30 + 70,
      averageTime: Math.floor(Math.random() * 60) + 10
    };
  }

  private generateChartData(module: string): any[] {
    const data = [];
    for (let i = 0; i < 12; i++) {
      data.push({
        month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        value: Math.floor(Math.random() * 100) + 50
      });
    }
    return data;
  }

  private generateSummary(module: string): string {
    return `Summary for ${module} module showing positive trends across all metrics.`;
  }
}

export const analyticsService = new AnalyticsService();
