import apiClient from './apiClient';

const BASE = '/hostel';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HostelBlock {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  wardenName?: string;
  wardenContact?: string;
  wardenStaffId?: string;
  gender: string;
  status: string;
  totalRooms: number;
  totalCapacity: number;
  totalOccupied: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHostelBlockDto {
  name: string;
  description?: string;
  wardenName?: string;
  wardenContact?: string;
  wardenStaffId?: string;
  gender?: string;
}

export interface HostelMessBilling {
  id: string;
  schoolId: string;
  hostelStudentId: string;
  studentName: string;
  month: string; // "YYYY-MM"
  amount: number;
  description?: string;
  isPaid: boolean;
  paidDate?: string;
  /** Present when isPaid=true — use with feeApi.generateReceipt() to print the payment receipt. */
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessBillingDto {
  hostelStudentId: string;
  month: string; // "YYYY-MM"
  amount: number;
  description?: string;
}

export interface HostelVisitorLog {
  id: string;
  schoolId: string;
  hostelStudentId: string;
  studentName: string;
  visitorName: string;
  visitorContact?: string;
  relationship?: string;
  purpose?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitorLogDto {
  hostelStudentId: string;
  visitorName: string;
  visitorContact?: string;
  relationship?: string;
  purpose?: string;
  checkInTime?: string;
  notes?: string;
}

export interface HostelLeave {
  id: string;
  schoolId: string;
  hostelStudentId: string;
  studentName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  contactDuringLeave?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHostelLeaveDto {
  hostelStudentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  contactDuringLeave?: string;
}

export interface ApproveHostelLeaveDto {
  status: 'approved' | 'rejected';
  remarks?: string;
}

// Hostel student (enrolled student with room assignment)
export interface HostelStudentDetail {
  id: string;          // hostelStudentId — use this for HostelStudentId in billing/visitor/leave
  studentId: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  gender: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor?: string;
  checkInDate: string;
  checkOutDate?: string;
  monthlyFee: number;
  status: string;
  createdAt: string;
}

// ─── Blocks ─────────────────────────────────────────────────────────────────

export const getBlocks = async (): Promise<HostelBlock[]> => {
  const r = await apiClient.get<HostelBlock[]>(`${BASE}/blocks`);
  return r.data;
};

export const getBlockById = async (id: string): Promise<HostelBlock> => {
  const r = await apiClient.get<HostelBlock>(`${BASE}/blocks/${id}`);
  return r.data;
};

export const createBlock = async (dto: CreateHostelBlockDto): Promise<HostelBlock> => {
  const r = await apiClient.post<HostelBlock>(`${BASE}/blocks`, dto);
  return r.data;
};

export const updateBlock = async (id: string, dto: CreateHostelBlockDto): Promise<HostelBlock> => {
  const r = await apiClient.put<HostelBlock>(`${BASE}/blocks/${id}`, dto);
  return r.data;
};

export const deleteBlock = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/blocks/${id}`);
};

// ─── Hostel Students (enrolled) ──────────────────────────────────────────────

export const getHostelStudents = async (): Promise<HostelStudentDetail[]> => {
  const r = await apiClient.get<HostelStudentDetail[]>(`${BASE}/students`);
  return r.data;
};

// ─── Mess Billing ────────────────────────────────────────────────────────────

export const getMessBillings = async (params?: { hostelStudentId?: string; month?: string }): Promise<HostelMessBilling[]> => {
  const q = new URLSearchParams();
  if (params?.hostelStudentId) q.set('hostelStudentId', params.hostelStudentId);
  if (params?.month) q.set('month', params.month);
  const r = await apiClient.get<HostelMessBilling[]>(`${BASE}/mess-billings?${q}`);
  return r.data;
};

export const createMessBilling = async (dto: CreateMessBillingDto): Promise<HostelMessBilling> => {
  const r = await apiClient.post<HostelMessBilling>(`${BASE}/mess-billings`, dto);
  return r.data;
};

export const markMessBillingPaid = async (id: string): Promise<HostelMessBilling> => {
  const r = await apiClient.put<HostelMessBilling>(`${BASE}/mess-billings/${id}/pay`, {});
  return r.data;
};

// ─── Visitor Logs ────────────────────────────────────────────────────────────

export const getVisitorLogs = async (params?: { hostelStudentId?: string }): Promise<HostelVisitorLog[]> => {
  const q = new URLSearchParams();
  if (params?.hostelStudentId) q.set('hostelStudentId', params.hostelStudentId);
  const r = await apiClient.get<HostelVisitorLog[]>(`${BASE}/visitor-logs?${q}`);
  return r.data;
};

export const createVisitorLog = async (dto: CreateVisitorLogDto): Promise<HostelVisitorLog> => {
  const r = await apiClient.post<HostelVisitorLog>(`${BASE}/visitor-logs`, dto);
  return r.data;
};

export const checkOutVisitor = async (id: string): Promise<HostelVisitorLog> => {
  const r = await apiClient.put<HostelVisitorLog>(`${BASE}/visitor-logs/${id}/checkout`, {});
  return r.data;
};

// ─── Hostel Leaves ───────────────────────────────────────────────────────────

export const getHostelLeaves = async (params?: { hostelStudentId?: string; status?: string }): Promise<HostelLeave[]> => {
  const q = new URLSearchParams();
  if (params?.hostelStudentId) q.set('hostelStudentId', params.hostelStudentId);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<HostelLeave[]>(`${BASE}/leaves?${q}`);
  return r.data;
};

export const createHostelLeave = async (dto: CreateHostelLeaveDto): Promise<HostelLeave> => {
  const r = await apiClient.post<HostelLeave>(`${BASE}/leaves`, dto);
  return r.data;
};

export const approveHostelLeave = async (id: string, dto: ApproveHostelLeaveDto): Promise<HostelLeave> => {
  const r = await apiClient.put<HostelLeave>(`${BASE}/leaves/${id}/approve`, dto);
  return r.data;
};
