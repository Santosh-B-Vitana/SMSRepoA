import { rateLimiter } from './rateLimiter';

export interface HostelRoom {
  id: string;
  schoolId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupancy: number;
  gender: 'male' | 'female' | 'mixed';
  type: 'standard' | 'deluxe' | 'suite';
  amenities: string[];
  monthlyFee: number;
  status: 'available' | 'full' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface HostelStudent {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  roomId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate?: string;
  monthlyFee: number;
  guardianContact: string;
  emergencyContact: string;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: string;
  updatedAt: string;
}

export interface HostelFilters {
  status?: string;
  gender?: HostelRoom['gender'];
  type?: HostelRoom['type'];
  roomId?: string;
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

function generateMockRooms(schoolId: string): HostelRoom[] {
  const types: HostelRoom['type'][] = ['standard', 'deluxe', 'suite'];
  const genders: HostelRoom['gender'][] = ['male', 'female'];
  const statuses: HostelRoom['status'][] = ['available', 'full', 'maintenance'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `room-${schoolId}-${i + 1}`,
    schoolId,
    roomNumber: `${Math.floor(i / 10) + 1}${(i % 10) + 1}`,
    floor: Math.floor(i / 10) + 1,
    capacity: types[i % types.length] === 'suite' ? 2 : 4,
    occupancy: i % 5 === 0 ? 0 : (i % 4) + 1,
    gender: genders[i % genders.length],
    type: types[i % types.length],
    amenities: ['WiFi', 'AC', 'Attached Bathroom'],
    monthlyFee: 5000 + (i % 3) * 2000,
    status: statuses[i % statuses.length],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockHostelStudents(schoolId: string): HostelStudent[] {
  const statuses: HostelStudent['status'][] = ['active', 'inactive', 'on_leave'];
  
  return Array.from({ length: 80 }, (_, i) => ({
    id: `hostel-stu-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    class: `${(i % 10) + 1}`,
    roomId: `room-${schoolId}-${(i % 50) + 1}`,
    roomNumber: `${Math.floor((i % 50) / 10) + 1}${((i % 50) % 10) + 1}`,
    checkInDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
    monthlyFee: 5000 + (i % 3) * 2000,
    guardianContact: `98765${43210 + i}`,
    emergencyContact: `99876${54321 + i}`,
    status: statuses[i % statuses.length],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const hostelService = {
  async getRooms(
    schoolId: string,
    filters?: HostelFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<HostelRoom>> {
    await rateLimiter.checkLimitAsync(`hostel:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockRooms(schoolId);

    if (filters?.status) {
      data = data.filter(r => r.status === filters.status);
    }
    if (filters?.gender) {
      data = data.filter(r => r.gender === filters.gender);
    }
    if (filters?.type) {
      data = data.filter(r => r.type === filters.type);
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

  async getHostelStudents(
    schoolId: string,
    filters?: HostelFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<HostelStudent>> {
    await rateLimiter.checkLimitAsync(`hostel:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockHostelStudents(schoolId);

    if (filters?.roomId) {
      data = data.filter(s => s.roomId === filters.roomId);
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

  async createRoom(
    schoolId: string,
    room: Omit<HostelRoom, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<HostelRoom> {
    await rateLimiter.checkLimitAsync(`hostel:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `room-${schoolId}-${Date.now()}`,
      schoolId,
      ...room,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async assignStudent(
    schoolId: string,
    student: Omit<HostelStudent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<HostelStudent> {
    await rateLimiter.checkLimitAsync(`hostel:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `hostel-stu-${schoolId}-${Date.now()}`,
      schoolId,
      ...student,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getHostelStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`hostel:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalRooms: 50,
      occupiedRooms: 40,
      totalStudents: 80,
      maleStudents: 45,
      femaleStudents: 35,
      availableCapacity: 20
    };
  }
};
