import { rateLimiter } from './rateLimiter';

export interface Visitor {
  id: string;
  schoolId: string;
  name: string;
  phone: string;
  email?: string;
  purpose: string;
  personToMeet: string;
  department: string;
  checkIn: string;
  checkOut?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  idProof: string;
  vehicleNumber?: string;
  address?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorFilters {
  status?: string;
  purpose?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
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

const mockVisitorsStore = new Map<string, Visitor[]>();
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

class VisitorService {
  private getSchoolVisitors(schoolId: string): Visitor[] {
    if (!mockVisitorsStore.has(schoolId)) {
      mockVisitorsStore.set(schoolId, this.generateMockVisitors(schoolId, 50));
    }
    return mockVisitorsStore.get(schoolId)!;
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

  async getVisitors(
    schoolId: string,
    filters: VisitorFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<Visitor>> {
    await rateLimiter.checkLimit(`visitors_${schoolId}`);

    const cacheKey = `visitors_${schoolId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.pageSize}`;
    const cached = await this.checkCache<PaginatedResponse<Visitor>>(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    let visitors = this.getSchoolVisitors(schoolId);

    // Apply filters
    if (filters.status) {
      visitors = visitors.filter(v => v.status === filters.status);
    }
    if (filters.purpose) {
      visitors = visitors.filter(v => v.purpose === filters.purpose);
    }
    if (filters.department) {
      visitors = visitors.filter(v => v.department === filters.department);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      visitors = visitors.filter(v => 
        v.name.toLowerCase().includes(search) ||
        v.purpose.toLowerCase().includes(search) ||
        v.personToMeet.toLowerCase().includes(search)
      );
    }
    if (filters.startDate) {
      visitors = visitors.filter(v => v.checkIn >= filters.startDate!);
    }
    if (filters.endDate) {
      visitors = visitors.filter(v => v.checkIn <= filters.endDate!);
    }

    const total = visitors.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const paginatedVisitors = visitors.slice(start, start + pagination.pageSize);

    const response = {
      data: paginatedVisitors,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async checkInVisitor(
    schoolId: string,
    data: Omit<Visitor, 'id' | 'schoolId' | 'status' | 'checkIn' | 'createdAt' | 'updatedAt'>
  ): Promise<Visitor> {
    await rateLimiter.checkLimit(`visitors_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    const visitors = this.getSchoolVisitors(schoolId);
    const newVisitor: Visitor = {
      ...data,
      id: `VIS${String(visitors.length + 1).padStart(6, '0')}`,
      schoolId,
      status: 'in-progress',
      checkIn: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    visitors.unshift(newVisitor);
    return newVisitor;
  }

  async checkOutVisitor(schoolId: string, visitorId: string): Promise<Visitor> {
    await rateLimiter.checkLimit(`visitors_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const visitors = this.getSchoolVisitors(schoolId);
    const visitor = visitors.find(v => v.id === visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    visitor.checkOut = new Date().toISOString();
    visitor.status = 'completed';
    visitor.updatedAt = new Date().toISOString();

    return visitor;
  }

  async updateVisitor(
    schoolId: string,
    visitorId: string,
    updates: Partial<Omit<Visitor, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<Visitor> {
    await rateLimiter.checkLimit(`visitors_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const visitors = this.getSchoolVisitors(schoolId);
    const visitor = visitors.find(v => v.id === visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    Object.assign(visitor, updates, { updatedAt: new Date().toISOString() });
    return visitor;
  }

  async getVisitorStats(schoolId: string): Promise<any> {
    await rateLimiter.checkLimit(`visitors_${schoolId}`);

    const cacheKey = `visitor_stats_${schoolId}`;
    const cached = await this.checkCache(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    const visitors = this.getSchoolVisitors(schoolId);
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = visitors.filter(v => v.checkIn.startsWith(today));

    const stats = {
      todayTotal: todayVisitors.length,
      currentlyInside: visitors.filter(v => v.status === 'in-progress').length,
      completedToday: todayVisitors.filter(v => v.status === 'completed').length,
      thisWeek: visitors.filter(v => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(v.checkIn) > weekAgo;
      }).length,
      byPurpose: this.getVisitorsByPurpose(visitors),
      recentVisitors: visitors.slice(0, 5)
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  private getVisitorsByPurpose(visitors: Visitor[]): Record<string, number> {
    const byPurpose: Record<string, number> = {};
    visitors.forEach(visitor => {
      byPurpose[visitor.purpose] = (byPurpose[visitor.purpose] || 0) + 1;
    });
    return byPurpose;
  }

  private generateMockVisitors(schoolId: string, count: number): Visitor[] {
    const visitors: Visitor[] = [];
    const purposes = ['Parent Meeting', 'Interview', 'Maintenance', 'Delivery', 'Official Business'];
    const departments = ['Administration', 'Grade 5-A', 'Grade 8-B', 'Facilities', 'Finance'];
    const idProofs = ["Driver's License", 'Passport', 'National ID', 'Employee ID'];
    const statuses: ('in-progress' | 'completed' | 'cancelled')[] = ['completed', 'completed', 'completed', 'in-progress'];

    for (let i = 0; i < count; i++) {
      const checkInDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const status = statuses[i % statuses.length];
      const checkOut = status === 'completed' 
        ? new Date(checkInDate.getTime() + Math.random() * 4 * 60 * 60 * 1000).toISOString()
        : undefined;

      visitors.push({
        id: `VIS${String(i + 1).padStart(6, '0')}`,
        schoolId,
        name: `Visitor ${i + 1}`,
        phone: `+91-${Math.floor(Math.random() * 10000000000)}`,
        email: `visitor${i + 1}@email.com`,
        purpose: purposes[i % purposes.length],
        personToMeet: `Staff Member ${Math.floor(Math.random() * 20) + 1}`,
        department: departments[i % departments.length],
        checkIn: checkInDate.toISOString(),
        checkOut,
        status,
        idProof: idProofs[i % idProofs.length],
        vehicleNumber: Math.random() > 0.5 ? `ABC-${Math.floor(Math.random() * 9000) + 1000}` : undefined,
        address: `Address ${i + 1}, City`,
        createdAt: checkInDate.toISOString(),
        updatedAt: checkOut || checkInDate.toISOString()
      });
    }

    return visitors.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }
}

export const visitorService = new VisitorService();
