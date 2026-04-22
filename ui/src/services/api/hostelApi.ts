import apiClient from './apiClient';

const BASE = '/hostel';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HostelRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  occupied: number;
  rentPerBed: number;
  floor?: string;
  status: string;
  facilities?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostelStudent {
  id: string;
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

export interface HostelRoomListResponse {
  rooms: HostelRoom[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRoomDto {
  roomNumber: string;
  roomType: string;
  capacity: number;
  occupied?: number;
  rentPerBed: number;
  floor?: string;
  status: string;
  facilities?: string;
}

export interface AssignStudentDto {
  studentId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate?: string;
  monthlyFee: number;
  status: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getRooms = async (page = 1, pageSize = 100): Promise<HostelRoomListResponse> => {
  const r = await apiClient.get<HostelRoomListResponse>(`${BASE}/rooms?page=${page}&pageSize=${pageSize}`);
  return r.data;
};

const getRoomById = async (id: string): Promise<HostelRoom> => {
  const r = await apiClient.get<HostelRoom>(`${BASE}/rooms/${id}`);
  return r.data;
};

const createRoom = async (data: CreateRoomDto): Promise<HostelRoom> => {
  const r = await apiClient.post<HostelRoom>(`${BASE}/rooms`, data);
  return r.data;
};

const updateRoom = async (id: string, data: CreateRoomDto): Promise<HostelRoom> => {
  const r = await apiClient.put<HostelRoom>(`${BASE}/rooms/${id}`, data);
  return r.data;
};

const deleteRoom = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/rooms/${id}`);
};

const getStudentsByRoom = async (roomId: string): Promise<HostelStudent[]> => {
  const r = await apiClient.get<HostelStudent[]>(`${BASE}/rooms/${roomId}/students`);
  return r.data;
};

const getAllHostelStudents = async (): Promise<HostelStudent[]> => {
  const r = await apiClient.get<HostelStudent[]>(`${BASE}/students`);
  return r.data;
};

const assignStudentToRoom = async (data: AssignStudentDto): Promise<HostelStudent> => {
  const r = await apiClient.post<HostelStudent>(`${BASE}/students`, data);
  return r.data;
};

const removeStudentFromRoom = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/students/${id}`);
};

export const hostelApiClient = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getStudentsByRoom,
  getAllHostelStudents,
  assignStudentToRoom,
  removeStudentFromRoom,
};
