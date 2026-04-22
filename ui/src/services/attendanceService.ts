import { rateLimiter } from './rateLimiter';
import { jobQueue } from './jobQueue';

// Types
export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  markedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceFilters {
  studentId?: string;
  class?: string;
  section?: string;
  status?: AttendanceRecord['status'];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
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

export interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  attendanceRate: number;
  averageAttendance: number;
}

// Mock data cache
const attendanceCache = new Map<string, { data: AttendanceRecord[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Mock data generator
function generateMockAttendance(schoolId: string, count: number = 50): AttendanceRecord[] {
  const statuses: AttendanceRecord['status'][] = ['present', 'absent', 'late', 'excused'];
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const sections = ['A', 'B', 'C'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `att-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    class: classes[Math.floor(Math.random() * classes.length)],
    section: sections[Math.floor(Math.random() * sections.length)],
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    checkInTime: '08:00',
    checkOutTime: '15:00',
    markedBy: 'Teacher',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

// Service implementation
export const attendanceService = {
  async getAttendance(
    schoolId: string,
    filters?: AttendanceFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<AttendanceRecord>> {
    await rateLimiter.checkLimitAsync(`attendance:${schoolId}`);

    // Check cache
    const cacheKey = `${schoolId}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
    const cached = attendanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const paginatedData = cached.data.slice(start, start + pageSize);
      
      return {
        data: paginatedData,
        total: cached.data.length,
        page,
        pageSize,
        totalPages: Math.ceil(cached.data.length / pageSize)
      };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockAttendance(schoolId, 100);

    // Apply filters
    if (filters) {
      if (filters.studentId) {
        data = data.filter(r => r.studentId === filters.studentId);
      }
      if (filters.class) {
        data = data.filter(r => r.class === filters.class);
      }
      if (filters.section) {
        data = data.filter(r => r.section === filters.section);
      }
      if (filters.status) {
        data = data.filter(r => r.status === filters.status);
      }
      if (filters.dateFrom) {
        data = data.filter(r => r.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        data = data.filter(r => r.date <= filters.dateTo!);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        data = data.filter(r => 
          r.studentName.toLowerCase().includes(query) ||
          r.class.toLowerCase().includes(query)
        );
      }
    }

    // Cache the filtered results
    attendanceCache.set(cacheKey, { data, timestamp: Date.now() });

    // Apply pagination
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedData = data.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize)
    };
  },

  async getAttendanceCursor(
    schoolId: string,
    filters?: AttendanceFilters,
    pagination?: CursorPaginationParams
  ): Promise<CursorPaginatedResponse<AttendanceRecord>> {
    await rateLimiter.checkLimitAsync(`attendance:${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockAttendance(schoolId, 100);

    // Apply filters (same as above)
    if (filters) {
      if (filters.studentId) data = data.filter(r => r.studentId === filters.studentId);
      if (filters.class) data = data.filter(r => r.class === filters.class);
      if (filters.section) data = data.filter(r => r.section === filters.section);
      if (filters.status) data = data.filter(r => r.status === filters.status);
      if (filters.dateFrom) data = data.filter(r => r.date >= filters.dateFrom!);
      if (filters.dateTo) data = data.filter(r => r.date <= filters.dateTo!);
    }

    const limit = pagination?.limit || 20;
    const cursor = pagination?.cursor;
    
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = data.findIndex(r => r.id === cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const paginatedData = data.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < data.length;

    return {
      data: paginatedData,
      nextCursor: hasMore ? paginatedData[paginatedData.length - 1]?.id : undefined,
      previousCursor: startIndex > 0 ? data[startIndex - 1]?.id : undefined,
      hasMore
    };
  },

  async markAttendance(
    schoolId: string,
    attendance: Omit<AttendanceRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<AttendanceRecord> {
    await rateLimiter.checkLimitAsync(`attendance:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newRecord: AttendanceRecord = {
      id: `att-${schoolId}-${Date.now()}`,
      schoolId,
      ...attendance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    attendanceCache.clear();
    return newRecord;
  },

  async bulkMarkAttendance(
    schoolId: string,
    records: Omit<AttendanceRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ success: number; failed: number }> {
    await rateLimiter.checkLimitAsync(`attendance:${schoolId}`);
    
    const job = await jobQueue.addJob('bulk-attendance-mark', { schoolId, records });
    
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const updated = jobQueue.getJob(job.id);
        if (updated?.status === 'completed') {
          clearInterval(interval);
          attendanceCache.clear();
          resolve({ success: records.length, failed: 0 });
        } else if (updated?.status === 'failed') {
          clearInterval(interval);
          resolve({ success: 0, failed: records.length });
        }
      }, 500);
    });
  },

  async getAttendanceStats(schoolId: string, filters?: AttendanceFilters): Promise<AttendanceStats> {
    await rateLimiter.checkLimitAsync(`attendance:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const data = generateMockAttendance(schoolId, 100);
    
    const totalPresent = data.filter(r => r.status === 'present').length;
    const totalAbsent = data.filter(r => r.status === 'absent').length;
    const totalLate = data.filter(r => r.status === 'late').length;
    const totalExcused = data.filter(r => r.status === 'excused').length;

    return {
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      attendanceRate: (totalPresent / data.length) * 100,
      averageAttendance: totalPresent / data.length
    };
  }
};
