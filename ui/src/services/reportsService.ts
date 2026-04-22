import { rateLimiter } from './rateLimiter';

export interface Report {
  id: string;
  schoolId: string;
  type: string;
  title: string;
  format: 'pdf' | 'excel' | 'csv';
  generatedAt: string;
  generatedBy: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  fileSize?: number;
  parameters?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilters {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  generatedBy?: string;
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

// Mock data store
const mockReportsStore = new Map<string, Report[]>();
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

class ReportsService {
  private getSchoolReports(schoolId: string): Report[] {
    if (!mockReportsStore.has(schoolId)) {
      mockReportsStore.set(schoolId, this.generateMockReports(schoolId, 20));
    }
    return mockReportsStore.get(schoolId)!;
  }

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

  async getReports(
    schoolId: string,
    filters: ReportFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<Report>> {
    await rateLimiter.checkLimit(`reports_${schoolId}`);

    const cacheKey = `reports_${schoolId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.pageSize}`;
    const cached = await this.checkCache<PaginatedResponse<Report>>(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    let reports = this.getSchoolReports(schoolId);

    // Apply filters
    if (filters.type) {
      reports = reports.filter(r => r.type === filters.type);
    }
    if (filters.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    if (filters.generatedBy) {
      reports = reports.filter(r => r.generatedBy === filters.generatedBy);
    }
    if (filters.startDate) {
      reports = reports.filter(r => r.generatedAt >= filters.startDate!);
    }
    if (filters.endDate) {
      reports = reports.filter(r => r.generatedAt <= filters.endDate!);
    }

    const total = reports.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const paginatedReports = reports.slice(start, start + pagination.pageSize);

    const response = {
      data: paginatedReports,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async getReportsCursor(
    schoolId: string,
    filters: ReportFilters = {},
    pagination: CursorPaginationParams = { limit: 20 }
  ): Promise<CursorPaginatedResponse<Report>> {
    await rateLimiter.checkLimit(`reports_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    let reports = this.getSchoolReports(schoolId);

    if (filters.type) {
      reports = reports.filter(r => r.type === filters.type);
    }
    if (filters.status) {
      reports = reports.filter(r => r.status === filters.status);
    }

    const paginatedReports = reports.slice(0, pagination.limit);
    const hasMore = reports.length > pagination.limit;

    return {
      data: paginatedReports,
      nextCursor: hasMore ? `cursor_${Date.now()}` : undefined,
      previousCursor: pagination.cursor ? `cursor_prev_${Date.now()}` : undefined,
      hasMore
    };
  }

  async generateReport(
    schoolId: string,
    data: Omit<Report, 'id' | 'schoolId' | 'status' | 'generatedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<Report> {
    await rateLimiter.checkLimit(`reports_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const reports = this.getSchoolReports(schoolId);
    const newReport: Report = {
      ...data,
      id: `REP${String(reports.length + 1).padStart(6, '0')}`,
      schoolId,
      status: 'generating',
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reports.unshift(newReport);

    // Simulate async report generation
    setTimeout(() => {
      const index = reports.findIndex(r => r.id === newReport.id);
      if (index !== -1) {
        reports[index] = {
          ...reports[index],
          status: 'completed',
          downloadUrl: `https://example.com/reports/${schoolId}/${newReport.id}.${newReport.format}`,
          fileSize: Math.floor(Math.random() * 5000000) + 100000,
          updatedAt: new Date().toISOString()
        };
      }
    }, 3000);

    return newReport;
  }

  async deleteReport(schoolId: string, reportId: string): Promise<void> {
    await rateLimiter.checkLimit(`reports_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const reports = this.getSchoolReports(schoolId);
    const index = reports.findIndex(r => r.id === reportId);
    
    if (index === -1) {
      throw new Error('Report not found');
    }

    reports.splice(index, 1);
  }

  async getReportStats(schoolId: string): Promise<any> {
    await rateLimiter.checkLimit(`reports_${schoolId}`);

    const cacheKey = `report_stats_${schoolId}`;
    const cached = await this.checkCache(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    const reports = this.getSchoolReports(schoolId);
    const stats = {
      total: reports.length,
      completed: reports.filter(r => r.status === 'completed').length,
      generating: reports.filter(r => r.status === 'generating').length,
      failed: reports.filter(r => r.status === 'failed').length,
      byType: this.getReportsByType(reports),
      recentReports: reports.slice(0, 5)
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  private getReportsByType(reports: Report[]): Record<string, number> {
    const byType: Record<string, number> = {};
    reports.forEach(report => {
      byType[report.type] = (byType[report.type] || 0) + 1;
    });
    return byType;
  }

  private generateMockReports(schoolId: string, count: number): Report[] {
    const reports: Report[] = [];
    const types = ['student-attendance', 'fee-collection', 'exam-results', 'staff-performance', 'transport-usage'];
    const formats: ('pdf' | 'excel' | 'csv')[] = ['pdf', 'excel', 'csv'];
    const statuses: ('generating' | 'completed' | 'failed')[] = ['completed', 'completed', 'completed', 'generating', 'failed'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const format = formats[i % formats.length];
      const status = statuses[i % statuses.length];
      const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      reports.push({
        id: `REP${String(i + 1).padStart(6, '0')}`,
        schoolId,
        type,
        title: `${type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`,
        format,
        generatedAt: date.toISOString(),
        generatedBy: `User ${Math.floor(Math.random() * 10) + 1}`,
        status,
        downloadUrl: status === 'completed' ? `https://example.com/reports/${schoolId}/${i + 1}.${format}` : undefined,
        fileSize: status === 'completed' ? Math.floor(Math.random() * 5000000) + 100000 : undefined,
        parameters: { month: Math.floor(Math.random() * 12) + 1, year: 2024 },
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      });
    }

    return reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }
}

export const reportsService = new ReportsService();
