import { rateLimiter } from './rateLimiter';

// ==================== TYPES ====================

export interface Exam {
  id: string;
  schoolId: string;
  name: string;
  class: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  maxMarks: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface Result {
  id: string;
  schoolId: string;
  examId: string;
  studentId: string;
  studentName: string;
  marks: number;
  grade: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamFilters {
  searchTerm?: string;
  class?: string;
  subject?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ResultFilters {
  examId?: string;
  studentId?: string;
  searchTerm?: string;
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

export interface ExamStats {
  totalExams: number;
  scheduledExams: number;
  completedExams: number;
  ongoingExams: number;
  totalResults: number;
  averageMarks: number;
}

// ==================== MOCK DATA GENERATOR ====================

class ExaminationService {
  private mockExams: Map<string, Exam[]> = new Map();
  private mockResults: Map<string, Result[]> = new Map();
  private schoolCaches: Map<string, { timestamp: number; data: any }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Generate mock data for different schools
    for (let schoolNum = 1; schoolNum <= 10; schoolNum++) {
      const schoolId = `SCHOOL${schoolNum.toString().padStart(3, '0')}`;
      const exams = this.generateMockExams(schoolId, 30);
      const results = this.generateMockResults(schoolId, exams, 100);
      this.mockExams.set(schoolId, exams);
      this.mockResults.set(schoolId, results);
    }
  }

  private generateMockExams(schoolId: string, count: number): Exam[] {
    const examNames = ['Mid-term', 'Final', 'Unit Test', 'Quarterly', 'Half-Yearly'];
    const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
    const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'Physical Education'];
    const statuses: Exam['status'][] = ['scheduled', 'ongoing', 'completed', 'paused'];

    return Array.from({ length: count }, (_, i) => {
      const id = `EX${(i + 1).toString().padStart(6, '0')}`;
      const year = 2024;
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      return {
        id,
        schoolId,
        name: examNames[Math.floor(Math.random() * examNames.length)],
        class: classes[Math.floor(Math.random() * classes.length)],
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        date,
        time: `${8 + Math.floor(Math.random() * 4)}:00`,
        duration: `${1 + Math.floor(Math.random() * 3)} hours`,
        maxMarks: [50, 75, 100][Math.floor(Math.random() * 3)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: date,
        updatedAt: date
      };
    });
  }

  private generateMockResults(schoolId: string, exams: Exam[], count: number): Result[] {
    const firstNames = ['Ananya', 'Aarav', 'Priya', 'Arjun', 'Diya', 'Vivaan', 'Aisha', 'Reyansh', 'Sara', 'Kabir'];
    const lastNames = ['Sharma', 'Gupta', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Yadav', 'Joshi', 'Mehta', 'Nair'];

    return Array.from({ length: count }, (_, i) => {
      const id = `RES${(i + 1).toString().padStart(6, '0')}`;
      const exam = exams[Math.floor(Math.random() * exams.length)];
      const marks = Math.floor(Math.random() * exam.maxMarks);
      const percentage = (marks / exam.maxMarks) * 100;
      
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else if (percentage >= 40) grade = 'E';

      return {
        id,
        schoolId,
        examId: exam.id,
        studentId: `STU${(i + 1).toString().padStart(6, '0')}`,
        studentName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        marks,
        grade,
        createdAt: exam.date,
        updatedAt: exam.date
      };
    });
  }

  // ==================== EXAM API METHODS ====================

  async getExams(
    schoolId: string,
    filters?: ExamFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Exam>> {
    const rateLimitKey = `exams:list:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 100)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    let exams = this.mockExams.get(schoolId) || [];

    // Apply filters
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      exams = exams.filter(exam =>
        exam.name.toLowerCase().includes(term) ||
        exam.subject.toLowerCase().includes(term) ||
        exam.id.toLowerCase().includes(term)
      );
    }

    if (filters?.class && filters.class !== 'all') {
      exams = exams.filter(exam => exam.class === filters.class);
    }

    if (filters?.subject && filters.subject !== 'all') {
      exams = exams.filter(exam => exam.subject === filters.subject);
    }

    if (filters?.status && filters.status !== 'all') {
      exams = exams.filter(exam => exam.status === filters.status);
    }

    if (filters?.dateFrom) {
      exams = exams.filter(exam => exam.date >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      exams = exams.filter(exam => exam.date <= filters.dateTo!);
    }

    const total = exams.length;

    // Apply pagination
    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      exams = exams.slice(start, end);
    }

    return {
      data: exams,
      total,
      page: pagination?.page || 1,
      pageSize: pagination?.pageSize || total,
      totalPages: pagination ? Math.ceil(total / pagination.pageSize) : 1
    };
  }

  async getExamsCursor(
    schoolId: string,
    filters?: ExamFilters,
    pagination?: CursorPaginationParams
  ): Promise<CursorPaginatedResponse<Exam>> {
    const rateLimitKey = `exams:cursor:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 100)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    let exams = this.mockExams.get(schoolId) || [];

    // Apply filters (same as above)
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      exams = exams.filter(exam =>
        exam.name.toLowerCase().includes(term) ||
        exam.subject.toLowerCase().includes(term)
      );
    }

    if (filters?.class && filters.class !== 'all') {
      exams = exams.filter(exam => exam.class === filters.class);
    }

    if (filters?.status && filters.status !== 'all') {
      exams = exams.filter(exam => exam.status === filters.status);
    }

    // Cursor-based pagination
    const limit = pagination?.limit || 20;
    let startIndex = 0;

    if (pagination?.cursor) {
      const cursorIndex = exams.findIndex(e => e.id === pagination.cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const paginatedData = exams.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < exams.length;
    const nextCursor = hasMore ? paginatedData[paginatedData.length - 1]?.id : undefined;
    const previousCursor = startIndex > 0 ? exams[startIndex - 1]?.id : undefined;

    return {
      data: paginatedData,
      nextCursor,
      previousCursor,
      hasMore
    };
  }

  async addExam(schoolId: string, exam: Omit<Exam, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const rateLimitKey = `exams:add:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 20)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    const exams = this.mockExams.get(schoolId) || [];
    const newExam: Exam = {
      ...exam,
      id: `EX${(exams.length + 1).toString().padStart(6, '0')}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    exams.push(newExam);
    this.mockExams.set(schoolId, exams);
    this.clearSchoolCache(schoolId);

    return newExam;
  }

  async updateExam(schoolId: string, examId: string, updates: Partial<Exam>): Promise<Exam> {
    const rateLimitKey = `exams:update:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 50)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const exams = this.mockExams.get(schoolId) || [];
    const index = exams.findIndex(e => e.id === examId);

    if (index === -1) {
      throw new Error('Exam not found');
    }

    exams[index] = {
      ...exams[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.mockExams.set(schoolId, exams);
    this.clearSchoolCache(schoolId);

    return exams[index];
  }

  async deleteExam(schoolId: string, examId: string): Promise<void> {
    const rateLimitKey = `exams:delete:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 20)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const exams = this.mockExams.get(schoolId) || [];
    const filtered = exams.filter(e => e.id !== examId);
    this.mockExams.set(schoolId, filtered);
    
    // Also delete related results
    const results = this.mockResults.get(schoolId) || [];
    const filteredResults = results.filter(r => r.examId !== examId);
    this.mockResults.set(schoolId, filteredResults);
    
    this.clearSchoolCache(schoolId);
  }

  // ==================== RESULT API METHODS ====================

  async getResults(
    schoolId: string,
    filters?: ResultFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Result>> {
    const rateLimitKey = `results:list:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 100)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    let results = this.mockResults.get(schoolId) || [];

    // Apply filters
    if (filters?.examId) {
      results = results.filter(result => result.examId === filters.examId);
    }

    if (filters?.studentId) {
      results = results.filter(result => result.studentId === filters.studentId);
    }

    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(result =>
        result.studentName.toLowerCase().includes(term) ||
        result.id.toLowerCase().includes(term)
      );
    }

    const total = results.length;

    // Apply pagination
    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      results = results.slice(start, end);
    }

    return {
      data: results,
      total,
      page: pagination?.page || 1,
      pageSize: pagination?.pageSize || total,
      totalPages: pagination ? Math.ceil(total / pagination.pageSize) : 1
    };
  }

  async addResult(schoolId: string, result: Omit<Result, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<Result> {
    const rateLimitKey = `results:add:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 20)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    const results = this.mockResults.get(schoolId) || [];
    const newResult: Result = {
      ...result,
      id: `RES${(results.length + 1).toString().padStart(6, '0')}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    results.push(newResult);
    this.mockResults.set(schoolId, results);
    this.clearSchoolCache(schoolId);

    return newResult;
  }

  async updateResult(schoolId: string, resultId: string, updates: Partial<Result>): Promise<Result> {
    const rateLimitKey = `results:update:${schoolId}`;
    if (!rateLimiter.checkLimit(rateLimitKey, 50)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const results = this.mockResults.get(schoolId) || [];
    const index = results.findIndex(r => r.id === resultId);

    if (index === -1) {
      throw new Error('Result not found');
    }

    results[index] = {
      ...results[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.mockResults.set(schoolId, results);
    this.clearSchoolCache(schoolId);

    return results[index];
  }

  // ==================== STATS ====================

  async getExamStats(schoolId: string): Promise<ExamStats> {
    const cacheKey = `stats:${schoolId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    const exams = this.mockExams.get(schoolId) || [];
    const results = this.mockResults.get(schoolId) || [];

    const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);

    const stats: ExamStats = {
      totalExams: exams.length,
      scheduledExams: exams.filter(e => e.status === 'scheduled').length,
      completedExams: exams.filter(e => e.status === 'completed').length,
      ongoingExams: exams.filter(e => e.status === 'ongoing').length,
      totalResults: results.length,
      averageMarks: results.length > 0 ? totalMarks / results.length : 0
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  // ==================== CACHE METHODS ====================

  private getFromCache(key: string): any {
    const cached = this.schoolCaches.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.schoolCaches.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.schoolCaches.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  clearSchoolCache(schoolId: string): void {
    const keysToDelete: string[] = [];
    this.schoolCaches.forEach((_, key) => {
      if (key.includes(schoolId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.schoolCaches.delete(key));
  }
}

export const examinationService = new ExaminationService();
