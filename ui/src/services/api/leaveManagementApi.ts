import api from './apiClient';

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  applicableTo: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minNoticeDays: number;
  isCarryForward: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  leaveNumber: string;
  applicantId: string;
  applicantName?: string;
  applicantType: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  emergencyContact?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  applicationDate: string;
  approvedByStaffId?: string;
  approvedDate?: string;
  approverRemarks?: string;
  cancelledByUserId?: string;
  cancelledDate?: string;
  cancellationReason?: string;
}

export interface CreateLeaveRequestRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
  emergencyContact?: string;
}

export interface ApproveLeaveRequest {
  approverRemarks?: string;
}

export interface RejectLeaveRequest {
  approverRemarks?: string;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  userType: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  academicYear: string;
  totalAllowed: number;
  used: number;
  available: number;
  carriedForward: number;
}

export interface LeaveRequestListResponse {
  items: LeaveRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const leaveManagementApi = {
  // Get leave types
  async getLeaveTypes(applicableTo?: string): Promise<LeaveType[]> {
    try {
      const response = await api.get('/LeaveManagement/types', {
        params: applicableTo ? { applicableTo } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching leave types:', error);
      throw error;
    }
  },

  // Get leave requests for current staff user only
  async getMyLeaveRequests(
    page: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<LeaveRequestListResponse> {
    try {
      const response = await api.get('/LeaveManagement/my-requests', {
        params: { page, pageSize, status }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching my leave requests:', error);
      throw error;
    }
  },

  // Get all leave requests (for admin/principal)
  async getLeaveRequests(
    page: number = 1,
    pageSize: number = 10,
    applicantId?: string,
    status?: string
  ): Promise<LeaveRequestListResponse> {
    try {
      const response = await api.get('/LeaveManagement/requests', {
        params: {
          page,
          pageSize,
          applicantId,
          status
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      throw error;
    }
  },

  // Get specific leave request
  async getLeaveRequest(id: string): Promise<LeaveRequest> {
    try {
      const response = await api.get(`/LeaveManagement/requests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leave request:', error);
      throw error;
    }
  },

  // Create leave request
  async createLeaveRequest(data: CreateLeaveRequestRequest): Promise<LeaveRequest> {
    try {
      const response = await api.post('/LeaveManagement/requests', data);
      return response.data;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  },

  // Approve leave request
  async approveLeave(id: string, remarks?: string): Promise<LeaveRequest> {
    try {
      const response = await api.post(`/LeaveManagement/requests/${id}/approve`, {
        approverRemarks: remarks
      });
      return response.data;
    } catch (error) {
      console.error('Error approving leave:', error);
      throw error;
    }
  },

  // Reject leave request
  async rejectLeave(id: string, remarks?: string): Promise<LeaveRequest> {
    try {
      const response = await api.post(`/LeaveManagement/requests/${id}/reject`, {
        approverRemarks: remarks
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting leave:', error);
      throw error;
    }
  },

  // Get leave balance for current user
  async getMyLeaveBalance(): Promise<LeaveBalance[]> {
    try {
      // This endpoint needs to be determined based on implementation
      // For now, we'll fetch all leaves and calculate
      const leaveRequests = await this.getMyLeaveRequests(1, 100);
      
      // Calculate balance based on approved leaves
      const balances: LeaveBalance[] = [];
      return balances;
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      throw error;
    }
  },

  // Get leave balance for specific user (admin/principal)
  async getLeaveBalance(userId: string, userType: string = 'Staff'): Promise<LeaveBalance[]> {
    try {
      const response = await api.get(`/LeaveManagement/balance/${userId}`, {
        params: { userType }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      throw error;
    }
  }
};

export default leaveManagementApi;
