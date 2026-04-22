import api from './apiClient';

export interface GuardianInfo {
  guardianId: string;
  name: string;
  relation: string;
  phone: string;
  email?: string;
  portalUserId?: string; // non-null means they have a parent portal account
}

export interface Student {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  class: string;
  section: string;
  rollNumber: string;
  guardians: GuardianInfo[];
}

export interface SendMessageRequest {
  subject: string;
  message: string;
  parentUserId: string;
  studentId?: string;
  messageType?: string;
}

export interface Message {
  id: string;
  staffId: string;
  staffName: string;
  parentUserId: string;
  parentName: string;
  parentEmail: string;
  studentId?: string;
  studentName: string;
  subject: string;
  message: string;
  messageType: string;
  sentAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface BulkSendRequest {
  subject: string;
  message: string;
  parentUserIds?: string[];
  sendToAllClassParents: boolean;
  messageType?: string;
}

export interface BulkSendResult {
  totalSent: number;
  successCount: number;
  failureCount: number;
  sentAt: string;
  failedParentEmails: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const staffCommunicationApi = {
  // Get students in staff's assigned class
  async getClassStudents(): Promise<Student[]> {
    try {
      const response = await api.get('/communication/staff/class-students');
      return response.data;
    } catch (error) {
      console.error('Error fetching class students:', error);
      throw error;
    }
  },

  // Send message to single parent
  async sendToParent(data: SendMessageRequest): Promise<Message> {
    try {
      const response = await api.post('/communication/staff/send-to-parent', data);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get specific message details
  async getMessage(messageId: string): Promise<Message> {
    try {
      const response = await api.get(`/communication/staff/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  },

  // Get paginated list of sent messages
  async getSentMessages(
    page: number = 1,
    pageSize: number = 10,
    searchQuery?: string
  ): Promise<PaginatedResponse<Message>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchQuery) {
        params.append('searchQuery', searchQuery);
      }
      const response = await api.get(`/communication/staff/messages-sent?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      throw error;
    }
  },

  // Bulk send to multiple parents
  async bulkSendToParents(data: BulkSendRequest): Promise<BulkSendResult> {
    try {
      const response = await api.post('/communication/staff/bulk-send-to-parents', data);
      return response.data;
    } catch (error) {
      console.error('Error bulk sending messages:', error);
      throw error;
    }
  },
};

export default staffCommunicationApi;
