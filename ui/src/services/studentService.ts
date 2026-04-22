// Student Service - Mock Implementation with Multi-tenant Support
// Production: Replace with actual database queries and controllers

import { checkRateLimit, rateLimiter } from './rateLimiter';

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  class: string;
  section: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address: string;
  bloodGroup?: string;
  status: 'active' | 'inactive' | 'transferred' | 'graduated';
  admissionDate: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFilters {
  searchTerm?: string;
  class?: string;
  section?: string;
  status?: Student['status'];
  gender?: Student['gender'];
  bloodGroup?: string;
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
  hasMore: boolean;
}

class StudentService {
  private mockData: Map<string, Student[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Generate mock data for multiple schools
    const schoolIds = ['school-1', 'school-2', 'school-3'];
    const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const sections = ['A', 'B', 'C'];
    const statuses: Student['status'][] = ['active', 'inactive', 'transferred', 'graduated'];
    const genders: Student['gender'][] = ['male', 'female', 'other'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    schoolIds.forEach(schoolId => {
      const students: Student[] = [];
      
      // Generate 50-100 students per school for testing
      const studentCount = 50 + Math.floor(Math.random() * 50);
      
      for (let i = 0; i < studentCount; i++) {
        const classGrade = classes[Math.floor(Math.random() * classes.length)];
        const section = sections[Math.floor(Math.random() * sections.length)];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        students.push({
          id: `student-${schoolId}-${i + 1}`,
          schoolId,
          admissionNumber: `ADM${schoolId.slice(-1)}${String(i + 1).padStart(4, '0')}`,
          firstName: `Student${i + 1}`,
          lastName: `LastName${i + 1}`,
          dateOfBirth: new Date(2005 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          gender,
          class: classGrade,
          section,
          rollNumber: String(i + 1),
          email: `student${i + 1}@${schoolId}.edu`,
          phone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          parentName: `Parent${i + 1}`,
          parentPhone: `97${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          parentEmail: `parent${i + 1}@email.com`,
          address: `Address ${i + 1}, City, State - ${100000 + i}`,
          bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
          status,
          admissionDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      this.mockData.set(schoolId, students);
    });
  }

  private getCacheKey(schoolId: string, key: string): string {
    return `${schoolId}:${key}`;
  }

  private getFromCache<T>(schoolId: string, key: string): T | null {
    const cacheKey = this.getCacheKey(schoolId, key);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    
    this.cache.delete(cacheKey);
    return null;
  }

  private setCache(schoolId: string, key: string, data: any): void {
    const cacheKey = this.getCacheKey(schoolId, key);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  private invalidateCache(schoolId: string, pattern?: string): void {
    if (pattern) {
      const prefix = this.getCacheKey(schoolId, pattern);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${schoolId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  private applyFilters(students: Student[], filters: StudentFilters): Student[] {
    let filtered = [...students];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.firstName.toLowerCase().includes(term) ||
        student.lastName.toLowerCase().includes(term) ||
        student.admissionNumber.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.parentName.toLowerCase().includes(term)
      );
    }

    if (filters.class) {
      filtered = filtered.filter(student => student.class === filters.class);
    }

    if (filters.section) {
      filtered = filtered.filter(student => student.section === filters.section);
    }

    if (filters.status) {
      filtered = filtered.filter(student => student.status === filters.status);
    }

    if (filters.gender) {
      filtered = filtered.filter(student => student.gender === filters.gender);
    }

    if (filters.bloodGroup) {
      filtered = filtered.filter(student => student.bloodGroup === filters.bloodGroup);
    }

    return filtered;
  }

  // Get students with offset pagination
  async getStudents(
    schoolId: string,
    filters: StudentFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<Student>> {
    await checkRateLimit(schoolId, rateLimiter);

    const cacheKey = `students:${JSON.stringify(filters)}:${pagination.page}:${pagination.pageSize}`;
    const cached = this.getFromCache<PaginatedResponse<Student>>(schoolId, cacheKey);
    if (cached) return cached;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const filtered = this.applyFilters(schoolStudents, filters);
    
    const total = filtered.length;
    const totalPages = Math.ceil(total / pagination.pageSize);
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    const data = filtered.slice(start, end);

    const result = {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages
    };

    this.setCache(schoolId, cacheKey, result);
    return result;
  }

  // Get students with cursor-based pagination
  async getStudentsCursor(
    schoolId: string,
    filters: StudentFilters = {},
    pagination: CursorPaginationParams = { limit: 20 }
  ): Promise<CursorPaginatedResponse<Student>> {
    await checkRateLimit(schoolId, rateLimiter);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const filtered = this.applyFilters(schoolStudents, filters);
    
    // Find cursor position
    let startIndex = 0;
    if (pagination.cursor) {
      const cursorIndex = filtered.findIndex(s => s.id === pagination.cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const data = filtered.slice(startIndex, startIndex + pagination.limit);
    const hasMore = startIndex + pagination.limit < filtered.length;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return {
      data,
      nextCursor,
      hasMore
    };
  }

  // Get single student
  async getStudent(schoolId: string, studentId: string): Promise<Student | null> {
    await checkRateLimit(schoolId, rateLimiter);

    const cacheKey = `student:${studentId}`;
    const cached = this.getFromCache<Student>(schoolId, cacheKey);
    if (cached) return cached;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const student = schoolStudents.find(s => s.id === studentId) || null;

    if (student) {
      this.setCache(schoolId, cacheKey, student);
    }

    return student;
  }

  // Create student
  async createStudent(schoolId: string, studentData: Omit<Student, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    await checkRateLimit(schoolId, rateLimiter);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const newStudent: Student = {
      ...studentData,
      id: `student-${schoolId}-${Date.now()}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const schoolStudents = this.mockData.get(schoolId) || [];
    schoolStudents.push(newStudent);
    this.mockData.set(schoolId, schoolStudents);

    this.invalidateCache(schoolId, 'students');
    return newStudent;
  }

  // Update student
  async updateStudent(schoolId: string, studentId: string, updates: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>>): Promise<Student> {
    await checkRateLimit(schoolId, rateLimiter);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const index = schoolStudents.findIndex(s => s.id === studentId);

    if (index === -1) {
      throw new Error('Student not found');
    }

    const updatedStudent: Student = {
      ...schoolStudents[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    schoolStudents[index] = updatedStudent;
    this.mockData.set(schoolId, schoolStudents);

    this.invalidateCache(schoolId, 'students');
    this.invalidateCache(schoolId, `student:${studentId}`);

    return updatedStudent;
  }

  // Delete student
  async deleteStudent(schoolId: string, studentId: string): Promise<void> {
    await checkRateLimit(schoolId, rateLimiter);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const filtered = schoolStudents.filter(s => s.id !== studentId);
    this.mockData.set(schoolId, filtered);

    this.invalidateCache(schoolId, 'students');
    this.invalidateCache(schoolId, `student:${studentId}`);
  }

  // Bulk operations
  async bulkUpdateStudents(schoolId: string, studentIds: string[], updates: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>>): Promise<Student[]> {
    await checkRateLimit(schoolId, rateLimiter);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const schoolStudents = this.mockData.get(schoolId) || [];
    const updatedStudents: Student[] = [];

    for (const studentId of studentIds) {
      const index = schoolStudents.findIndex(s => s.id === studentId);
      if (index !== -1) {
        const updated = {
          ...schoolStudents[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        schoolStudents[index] = updated;
        updatedStudents.push(updated);
      }
    }

    this.mockData.set(schoolId, schoolStudents);
    this.invalidateCache(schoolId);

    return updatedStudents;
  }

  // Get student statistics
  async getStudentStats(schoolId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    transferred: number;
    graduated: number;
    byClass: Record<string, number>;
    byGender: Record<string, number>;
  }> {
    await checkRateLimit(schoolId, rateLimiter);

    const cacheKey = 'stats';
    const cached = this.getFromCache<any>(schoolId, cacheKey);
    if (cached) return cached;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const schoolStudents = this.mockData.get(schoolId) || [];
    
    const stats = {
      total: schoolStudents.length,
      active: schoolStudents.filter(s => s.status === 'active').length,
      inactive: schoolStudents.filter(s => s.status === 'inactive').length,
      transferred: schoolStudents.filter(s => s.status === 'transferred').length,
      graduated: schoolStudents.filter(s => s.status === 'graduated').length,
      byClass: {} as Record<string, number>,
      byGender: {} as Record<string, number>
    };

    schoolStudents.forEach(student => {
      stats.byClass[student.class] = (stats.byClass[student.class] || 0) + 1;
      stats.byGender[student.gender] = (stats.byGender[student.gender] || 0) + 1;
    });

    this.setCache(schoolId, cacheKey, stats);
    return stats;
  }

  // Clear cache for a school
  clearSchoolCache(schoolId: string): void {
    this.invalidateCache(schoolId);
  }
}

export const studentService = new StudentService();
