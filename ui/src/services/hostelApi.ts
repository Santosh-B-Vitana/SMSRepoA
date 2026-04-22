import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types matching backend DTOs
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

export interface CreateHostelRoomRequest {
  roomNumber: string;
  roomType: string;
  capacity: number;
  occupied?: number;
  rentPerBed: number;
  floor?: string;
  status: string;
  facilities?: string;
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

export interface CreateHostelStudentRequest {
  studentId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate?: string;
  monthlyFee: number;
  status: string;
}

export interface HostelRoomListResponse {
  rooms: HostelRoom[];
  total: number;
  page: number;
  pageSize: number;
}

// API Service
export const hostelApi = {
  // Rooms
  async getRooms(page = 1, pageSize = 100): Promise<HostelRoomListResponse> {
    const response = await apiClient.get<HostelRoomListResponse>(
      `/hostel/rooms?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  },

  async getRoomById(id: string): Promise<HostelRoom> {
    const response = await apiClient.get<HostelRoom>(`/hostel/rooms/${id}`);
    return response.data;
  },

  async createRoom(data: CreateHostelRoomRequest): Promise<HostelRoom> {
    const response = await apiClient.post<HostelRoom>('/hostel/rooms', data);
    return response.data;
  },

  async updateRoom(id: string, data: CreateHostelRoomRequest): Promise<HostelRoom> {
    const response = await apiClient.put<HostelRoom>(`/hostel/rooms/${id}`, data);
    return response.data;
  },

  async deleteRoom(id: string): Promise<void> {
    await apiClient.delete(`/hostel/rooms/${id}`);
  },

  // Students
  async getStudentsByRoom(roomId: string): Promise<HostelStudent[]> {
    const response = await apiClient.get<HostelStudent[]>(
      `/hostel/rooms/${roomId}/students`
    );
    return response.data;
  },

  async getAllHostelStudents(): Promise<HostelStudent[]> {
    const response = await apiClient.get<HostelStudent[]>('/hostel/students');
    return response.data;
  },

  async assignStudentToRoom(data: CreateHostelStudentRequest): Promise<HostelStudent> {
    const response = await apiClient.post<HostelStudent>('/hostel/students', data);
    return response.data;
  },

  async removeStudentFromRoom(id: string): Promise<void> {
    await apiClient.delete(`/hostel/students/${id}`);
  },
};
