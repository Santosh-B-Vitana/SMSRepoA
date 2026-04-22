import { rateLimiter } from './rateLimiter';

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'students' | 'parents' | 'staff' | 'specific';
  targetGroups?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived';
  publishedBy: string;
  publishDate?: string;
  expiryDate?: string;
  attachments?: string[];
  readCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  schoolId: string;
  from: string;
  to: string[];
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'notification';
  status: 'sent' | 'failed' | 'pending';
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationFilters {
  targetAudience?: Announcement['targetAudience'];
  priority?: Announcement['priority'];
  status?: Announcement['status'];
  type?: Message['type'];
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

function generateMockAnnouncements(schoolId: string): Announcement[] {
  const priorities: Announcement['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const statuses: Announcement['status'][] = ['draft', 'published', 'archived'];
  const audiences: Announcement['targetAudience'][] = ['all', 'students', 'parents', 'staff'];
  
  return Array.from({ length: 30 }, (_, i) => ({
    id: `ann-${schoolId}-${i + 1}`,
    schoolId,
    title: `Announcement ${i + 1}`,
    content: `This is the content of announcement ${i + 1}`,
    targetAudience: audiences[i % audiences.length],
    priority: priorities[i % priorities.length],
    status: statuses[i % statuses.length],
    publishedBy: 'Admin',
    publishDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    readCount: Math.floor(Math.random() * 100),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockMessages(schoolId: string): Message[] {
  const types: Message['type'][] = ['email', 'sms', 'notification'];
  const statuses: Message['status'][] = ['sent', 'failed', 'pending'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `msg-${schoolId}-${i + 1}`,
    schoolId,
    from: 'admin@school.com',
    to: [`user${i}@example.com`],
    subject: `Message ${i + 1}`,
    content: `This is message content ${i + 1}`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const communicationService = {
  async getAnnouncements(
    schoolId: string,
    filters?: CommunicationFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Announcement>> {
    await rateLimiter.checkLimitAsync(`communication:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockAnnouncements(schoolId);

    if (filters?.targetAudience) {
      data = data.filter(a => a.targetAudience === filters.targetAudience);
    }
    if (filters?.priority) {
      data = data.filter(a => a.priority === filters.priority);
    }
    if (filters?.status) {
      data = data.filter(a => a.status === filters.status);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query)
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

  async getMessages(
    schoolId: string,
    filters?: CommunicationFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Message>> {
    await rateLimiter.checkLimitAsync(`communication:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockMessages(schoolId);

    if (filters?.type) {
      data = data.filter(m => m.type === filters.type);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(m =>
        m.subject.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query)
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

  async createAnnouncement(
    schoolId: string,
    announcement: Omit<Announcement, 'id' | 'schoolId' | 'readCount' | 'createdAt' | 'updatedAt'>
  ): Promise<Announcement> {
    await rateLimiter.checkLimitAsync(`communication:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newAnnouncement: Announcement = {
      id: `ann-${schoolId}-${Date.now()}`,
      schoolId,
      ...announcement,
      readCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newAnnouncement;
  },

  async sendMessage(
    schoolId: string,
    message: Omit<Message, 'id' | 'schoolId' | 'status' | 'sentAt' | 'createdAt' | 'updatedAt'>
  ): Promise<Message> {
    await rateLimiter.checkLimitAsync(`communication:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newMessage: Message = {
      id: `msg-${schoolId}-${Date.now()}`,
      schoolId,
      ...message,
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newMessage;
  }
};
