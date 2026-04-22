import { rateLimiter } from './rateLimiter';

export interface TimetableSlot {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  section: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  room?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableFilters {
  classId?: string;
  teacherId?: string;
  day?: TimetableSlot['day'];
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

const timetableCache = new Map<string, { data: TimetableSlot[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function generateMockTimetable(schoolId: string): TimetableSlot[] {
  const days: TimetableSlot['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics'];
  const periods = [1, 2, 3, 4, 5, 6, 7];
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  const slots: TimetableSlot[] = [];
  let id = 1;

  days.forEach(day => {
    periods.forEach(period => {
      classes.slice(0, 5).forEach(cls => {
        slots.push({
          id: `slot-${schoolId}-${id++}`,
          schoolId,
          classId: `class-${cls}`,
          className: cls,
          section: 'A',
          day,
          period,
          startTime: `${8 + period}:00`,
          endTime: `${9 + period}:00`,
          subject: subjects[period % subjects.length],
          teacherId: `teacher-${period}`,
          teacherName: `Teacher ${period}`,
          room: `Room ${100 + period}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    });
  });

  return slots;
}

export const timetableService = {
  async getTimetable(
    schoolId: string,
    filters?: TimetableFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TimetableSlot>> {
    await rateLimiter.checkLimitAsync(`timetable:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockTimetable(schoolId);

    if (filters?.classId) {
      data = data.filter(s => s.classId === filters.classId);
    }
    if (filters?.teacherId) {
      data = data.filter(s => s.teacherId === filters.teacherId);
    }
    if (filters?.day) {
      data = data.filter(s => s.day === filters.day);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(s =>
        s.subject.toLowerCase().includes(query) ||
        s.teacherName.toLowerCase().includes(query)
      );
    }

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 50;
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

  async addTimetableSlot(
    schoolId: string,
    slot: Omit<TimetableSlot, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<TimetableSlot> {
    await rateLimiter.checkLimitAsync(`timetable:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newSlot: TimetableSlot = {
      id: `slot-${schoolId}-${Date.now()}`,
      schoolId,
      ...slot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    timetableCache.clear();
    return newSlot;
  },

  async updateTimetableSlot(
    schoolId: string,
    slotId: string,
    updates: Partial<Omit<TimetableSlot, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<TimetableSlot> {
    await rateLimiter.checkLimitAsync(`timetable:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const updatedSlot: TimetableSlot = {
      id: slotId,
      schoolId,
      classId: 'class-1',
      className: '1',
      section: 'A',
      day: 'Monday',
      period: 1,
      startTime: '08:00',
      endTime: '09:00',
      subject: 'Mathematics',
      teacherId: 'teacher-1',
      teacherName: 'Teacher 1',
      ...updates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    timetableCache.clear();
    return updatedSlot;
  },

  async deleteTimetableSlot(schoolId: string, slotId: string): Promise<void> {
    await rateLimiter.checkLimitAsync(`timetable:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    timetableCache.clear();
  }
};
