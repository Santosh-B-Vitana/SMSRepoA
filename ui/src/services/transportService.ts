import { rateLimiter } from './rateLimiter';

export interface TransportRoute {
  id: string;
  schoolId: string;
  routeName: string;
  routeNumber: string;
  vehicleNumber: string;
  driverName: string;
  driverContact: string;
  stops: string[];
  startTime: string;
  endTime: string;
  fare: number;
  capacity: number;
  studentsAssigned: number;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface TransportStudent {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  routeId: string;
  routeName: string;
  pickupPoint: string;
  dropPoint: string;
  fare: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TransportFilters {
  status?: TransportRoute['status'];
  routeId?: string;
  searchQuery?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const routesCache = new Map<string, { data: TransportRoute[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function generateMockRoutes(schoolId: string): TransportRoute[] {
  const statuses: TransportRoute['status'][] = ['active', 'inactive', 'maintenance'];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `route-${schoolId}-${i + 1}`,
    schoolId,
    routeName: `Route ${i + 1}`,
    routeNumber: `R${100 + i}`,
    vehicleNumber: `KA-${10 + i}-AB-${1000 + i}`,
    driverName: `Driver ${i + 1}`,
    driverContact: `98765${43210 + i}`,
    stops: [`Stop A`, `Stop B`, `Stop C`, `School`],
    startTime: '07:00',
    endTime: '08:30',
    fare: 500 + (i * 100),
    capacity: 40 + (i % 20),
    studentsAssigned: 20 + (i % 30),
    status: statuses[i % statuses.length],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockTransportStudents(schoolId: string): TransportStudent[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `trans-stu-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    class: `${(i % 10) + 1}`,
    routeId: `route-${schoolId}-${(i % 20) + 1}`,
    routeName: `Route ${(i % 20) + 1}`,
    pickupPoint: `Stop ${String.fromCharCode(65 + (i % 4))}`,
    dropPoint: `Stop ${String.fromCharCode(65 + (i % 4))}`,
    fare: 500 + ((i % 20) * 100),
    status: i % 10 === 0 ? 'inactive' : 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const transportService = {
  async getRoutes(
    schoolId: string,
    filters?: TransportFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TransportRoute>> {
    await rateLimiter.checkLimitAsync(`transport:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockRoutes(schoolId);

    if (filters?.status) {
      data = data.filter(r => r.status === filters.status);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(r =>
        r.routeName.toLowerCase().includes(query) ||
        r.routeNumber.toLowerCase().includes(query) ||
        r.vehicleNumber.toLowerCase().includes(query)
      );
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

  async getTransportStudents(
    schoolId: string,
    filters?: TransportFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TransportStudent>> {
    await rateLimiter.checkLimitAsync(`transport:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockTransportStudents(schoolId);

    if (filters?.routeId) {
      data = data.filter(s => s.routeId === filters.routeId);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(s => s.studentName.toLowerCase().includes(query));
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

  async addRoute(
    schoolId: string,
    route: Omit<TransportRoute, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<TransportRoute> {
    await rateLimiter.checkLimitAsync(`transport:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newRoute: TransportRoute = {
      id: `route-${schoolId}-${Date.now()}`,
      schoolId,
      ...route,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    routesCache.clear();
    return newRoute;
  },

  async assignStudent(
    schoolId: string,
    student: Omit<TransportStudent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<TransportStudent> {
    await rateLimiter.checkLimitAsync(`transport:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newAssignment: TransportStudent = {
      id: `trans-stu-${schoolId}-${Date.now()}`,
      schoolId,
      ...student,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newAssignment;
  }
};
