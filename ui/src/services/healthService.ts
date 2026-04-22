import { rateLimiter } from './rateLimiter';

export interface HealthRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  checkupDate: string;
  height: number;
  weight: number;
  bmi: number;
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
  vaccinations?: string[];
  doctorName: string;
  doctorNotes?: string;
  nextCheckupDate?: string;
  status: 'normal' | 'attention_required' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface HealthFilters {
  status?: HealthRecord['status'];
  class?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
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

const healthCache = new Map<string, { data: HealthRecord[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function generateMockHealthRecords(schoolId: string): HealthRecord[] {
  const statuses: HealthRecord['status'][] = ['normal', 'attention_required', 'critical'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: `health-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    class: `${(i % 10) + 1}`,
    checkupDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    height: 120 + (i % 50),
    weight: 30 + (i % 40),
    bmi: 18 + (i % 10),
    bloodGroup: bloodGroups[i % bloodGroups.length],
    allergies: i % 5 === 0 ? ['Peanuts', 'Dust'] : [],
    medicalConditions: i % 7 === 0 ? ['Asthma'] : [],
    vaccinations: ['COVID-19', 'MMR', 'DPT'],
    doctorName: `Dr. Smith ${(i % 5) + 1}`,
    doctorNotes: i % 3 === 0 ? 'Regular checkup completed' : undefined,
    nextCheckupDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const healthService = {
  async getHealthRecords(
    schoolId: string,
    filters?: HealthFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<HealthRecord>> {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockHealthRecords(schoolId);

    if (filters?.status) {
      data = data.filter(r => r.status === filters.status);
    }
    if (filters?.class) {
      data = data.filter(r => r.class === filters.class);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(r => r.studentName.toLowerCase().includes(query));
    }
    if (filters?.dateFrom) {
      data = data.filter(r => r.checkupDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      data = data.filter(r => r.checkupDate <= filters.dateTo!);
    }

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

  async getHealthRecordsCursor(
    schoolId: string,
    filters?: HealthFilters,
    pagination?: CursorPaginationParams
  ): Promise<CursorPaginatedResponse<HealthRecord>> {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockHealthRecords(schoolId);

    if (filters?.status) {
      data = data.filter(r => r.status === filters.status);
    }
    if (filters?.class) {
      data = data.filter(r => r.class === filters.class);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(r => r.studentName.toLowerCase().includes(query));
    }

    const limit = pagination?.limit || 20;
    const cursor = pagination?.cursor;
    const cursorIndex = cursor ? data.findIndex(r => r.id === cursor) : -1;
    const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const paginatedData = data.slice(start, start + limit);

    return {
      data: paginatedData,
      nextCursor: paginatedData.length === limit ? paginatedData[paginatedData.length - 1].id : undefined,
      previousCursor: start > 0 ? data[Math.max(0, start - limit)].id : undefined,
      hasMore: start + limit < data.length
    };
  },

  async createHealthRecord(
    schoolId: string,
    record: Omit<HealthRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<HealthRecord> {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newRecord: HealthRecord = {
      id: `health-${schoolId}-${Date.now()}`,
      schoolId,
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    healthCache.delete(schoolId);
    return newRecord;
  },

  async updateHealthRecord(
    schoolId: string,
    recordId: string,
    updates: Partial<Omit<HealthRecord, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<HealthRecord> {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const updatedRecord: HealthRecord = {
      id: recordId,
      schoolId,
      studentId: 'stu-1',
      studentName: 'Student 1',
      class: '1',
      checkupDate: new Date().toISOString(),
      height: 120,
      weight: 30,
      bmi: 18,
      doctorName: 'Dr. Smith',
      status: 'normal',
      ...updates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    healthCache.delete(schoolId);
    return updatedRecord;
  },

  async deleteHealthRecord(schoolId: string, recordId: string): Promise<void> {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    healthCache.delete(schoolId);
  },

  async getHealthStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`health:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalRecords: 100,
      normalStatus: 80,
      attentionRequired: 15,
      critical: 5,
      avgBMI: 19.5,
      upcomingCheckups: 25
    };
  }
};
