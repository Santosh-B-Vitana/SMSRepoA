import { rateLimiter } from './rateLimiter';

export interface Parent {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  occupation?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  children: {
    studentId: string;
    studentName: string;
    class: string;
    section: string;
    rollNumber: string;
  }[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ParentCommunication {
  id: string;
  schoolId: string;
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  subject: string;
  message: string;
  type: 'sms' | 'email' | 'notification' | 'call';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentBy: string;
  sentByName: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentMeeting {
  id: string;
  schoolId: string;
  parentId: string;
  parentName: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  purpose: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  createdAt: string;
  updatedAt: string;
}

export interface ParentFilters {
  status?: Parent['status'];
  studentId?: string;
  searchQuery?: string;
  city?: string;
  state?: string;
}

export interface CommunicationFilters {
  parentId?: string;
  studentId?: string;
  type?: ParentCommunication['type'];
  status?: ParentCommunication['status'];
  priority?: ParentCommunication['priority'];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface MeetingFilters {
  parentId?: string;
  teacherId?: string;
  studentId?: string;
  status?: ParentMeeting['status'];
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

function generateMockParents(schoolId: string): Parent[] {
  const statuses: Parent['status'][] = ['active', 'inactive'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: `parent-${schoolId}-${i + 1}`,
    schoolId,
    firstName: `Parent${i + 1}`,
    lastName: `Surname${i + 1}`,
    email: `parent${i + 1}@email.com`,
    phone: `97${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    alternatePhone: i % 3 === 0 ? `96${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}` : undefined,
    occupation: ['Engineer', 'Doctor', 'Teacher', 'Business', 'Others'][i % 5],
    address: `House ${i + 1}, Street ${Math.floor(i / 10) + 1}`,
    city: cities[i % cities.length],
    state: states[i % states.length],
    pincode: String(400000 + i).padStart(6, '0'),
    children: [
      {
        studentId: `stu-${i + 1}`,
        studentName: `Student ${i + 1}`,
        class: `${(i % 10) + 1}`,
        section: 'A',
        rollNumber: String(i + 1)
      }
    ],
    emergencyContact: i % 2 === 0 ? {
      name: `Emergency ${i + 1}`,
      phone: `95${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      relationship: 'Relative'
    } : undefined,
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockCommunications(schoolId: string): ParentCommunication[] {
  const types: ParentCommunication['type'][] = ['sms', 'email', 'notification', 'call'];
  const priorities: ParentCommunication['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const statuses: ParentCommunication['status'][] = ['sent', 'delivered', 'read', 'failed'];
  
  return Array.from({ length: 200 }, (_, i) => ({
    id: `comm-${schoolId}-${i + 1}`,
    schoolId,
    parentId: `parent-${schoolId}-${(i % 100) + 1}`,
    parentName: `Parent${(i % 100) + 1} Surname${(i % 100) + 1}`,
    studentId: `stu-${(i % 100) + 1}`,
    studentName: `Student ${(i % 100) + 1}`,
    subject: ['Fee Reminder', 'Exam Schedule', 'Parent Meeting', 'Attendance Alert'][i % 4],
    message: `Message content ${i + 1}`,
    type: types[i % types.length],
    priority: priorities[i % priorities.length],
    status: statuses[i % statuses.length],
    sentBy: `staff-${(i % 20) + 1}`,
    sentByName: `Staff ${(i % 20) + 1}`,
    sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    deliveredAt: i % 4 !== 3 ? new Date(Date.now() - Math.random() * 29 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    readAt: i % 3 === 0 ? new Date(Date.now() - Math.random() * 28 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockMeetings(schoolId: string): ParentMeeting[] {
  const statuses: ParentMeeting['status'][] = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `meeting-${schoolId}-${i + 1}`,
    schoolId,
    parentId: `parent-${schoolId}-${(i % 100) + 1}`,
    parentName: `Parent${(i % 100) + 1} Surname${(i % 100) + 1}`,
    teacherId: `staff-${(i % 20) + 1}`,
    teacherName: `Teacher ${(i % 20) + 1}`,
    studentId: `stu-${(i % 100) + 1}`,
    studentName: `Student ${(i % 100) + 1}`,
    meetingDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    meetingTime: `${9 + (i % 8)}:00`,
    duration: 30,
    purpose: ['Academic Progress', 'Behavior Discussion', 'Fee Discussion', 'General Meeting'][i % 4],
    notes: i % 2 === 0 ? `Notes for meeting ${i + 1}` : undefined,
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const parentService = {
  async getParents(
    schoolId: string,
    filters?: ParentFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Parent>> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockParents(schoolId);

    if (filters?.status) {
      data = data.filter(p => p.status === filters.status);
    }
    if (filters?.studentId) {
      data = data.filter(p => p.children.some(c => c.studentId === filters.studentId));
    }
    if (filters?.city) {
      data = data.filter(p => p.city === filters.city);
    }
    if (filters?.state) {
      data = data.filter(p => p.state === filters.state);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(p => 
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone.includes(query)
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

  async getParentsCursor(
    schoolId: string,
    filters?: ParentFilters,
    pagination?: CursorPaginationParams
  ): Promise<CursorPaginatedResponse<Parent>> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockParents(schoolId);

    if (filters?.status) {
      data = data.filter(p => p.status === filters.status);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(p => 
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query)
      );
    }

    const limit = pagination?.limit || 20;
    const cursor = pagination?.cursor;
    const cursorIndex = cursor ? data.findIndex(p => p.id === cursor) : -1;
    const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const paginatedData = data.slice(start, start + limit);

    return {
      data: paginatedData,
      nextCursor: paginatedData.length === limit ? paginatedData[paginatedData.length - 1].id : undefined,
      previousCursor: start > 0 ? data[Math.max(0, start - limit)].id : undefined,
      hasMore: start + limit < data.length
    };
  },

  async getParent(schoolId: string, parentId: string): Promise<Parent | null> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const parents = generateMockParents(schoolId);
    return parents.find(p => p.id === parentId) || null;
  },

  async createParent(
    schoolId: string,
    parent: Omit<Parent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<Parent> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `parent-${schoolId}-${Date.now()}`,
      schoolId,
      ...parent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async updateParent(
    schoolId: string,
    parentId: string,
    updates: Partial<Omit<Parent, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<Parent> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const existing = await this.getParent(schoolId, parentId);
    if (!existing) throw new Error('Parent not found');

    return {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  },

  async deleteParent(schoolId: string, parentId: string): Promise<void> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  async getCommunications(
    schoolId: string,
    filters?: CommunicationFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ParentCommunication>> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockCommunications(schoolId);

    if (filters?.parentId) {
      data = data.filter(c => c.parentId === filters.parentId);
    }
    if (filters?.studentId) {
      data = data.filter(c => c.studentId === filters.studentId);
    }
    if (filters?.type) {
      data = data.filter(c => c.type === filters.type);
    }
    if (filters?.status) {
      data = data.filter(c => c.status === filters.status);
    }
    if (filters?.priority) {
      data = data.filter(c => c.priority === filters.priority);
    }
    if (filters?.dateFrom) {
      data = data.filter(c => c.sentAt >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      data = data.filter(c => c.sentAt <= filters.dateTo!);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(c => 
        c.subject.toLowerCase().includes(query) ||
        c.message.toLowerCase().includes(query)
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

  async sendCommunication(
    schoolId: string,
    communication: Omit<ParentCommunication, 'id' | 'schoolId' | 'status' | 'sentAt' | 'createdAt' | 'updatedAt'>
  ): Promise<ParentCommunication> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `comm-${schoolId}-${Date.now()}`,
      schoolId,
      ...communication,
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getMeetings(
    schoolId: string,
    filters?: MeetingFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ParentMeeting>> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockMeetings(schoolId);

    if (filters?.parentId) {
      data = data.filter(m => m.parentId === filters.parentId);
    }
    if (filters?.teacherId) {
      data = data.filter(m => m.teacherId === filters.teacherId);
    }
    if (filters?.studentId) {
      data = data.filter(m => m.studentId === filters.studentId);
    }
    if (filters?.status) {
      data = data.filter(m => m.status === filters.status);
    }
    if (filters?.dateFrom) {
      data = data.filter(m => m.meetingDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      data = data.filter(m => m.meetingDate <= filters.dateTo!);
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

  async scheduleMeeting(
    schoolId: string,
    meeting: Omit<ParentMeeting, 'id' | 'schoolId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<ParentMeeting> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `meeting-${schoolId}-${Date.now()}`,
      schoolId,
      ...meeting,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async updateMeeting(
    schoolId: string,
    meetingId: string,
    updates: Partial<Omit<ParentMeeting, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<ParentMeeting> {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const meetings = generateMockMeetings(schoolId);
    const existing = meetings.find(m => m.id === meetingId);
    if (!existing) throw new Error('Meeting not found');

    return {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  },

  async getParentStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`parent:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalParents: 100,
      activeParents: 95,
      totalCommunications: 200,
      pendingMeetings: 15,
      completedMeetings: 30,
      avgChildren: 1.2
    };
  }
};
