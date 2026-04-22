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
export interface TransportRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  startTime: string;
  endTime: string;
  capacity: number;
  studentsAssigned: number;
  monthlyFee?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransportRouteRequest {
  routeNumber: string;
  routeName: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  startTime?: string;
  endTime?: string;
  capacity: number;
  monthlyFee?: number;
  status: string;
}

export interface TransportStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  routeId: string;
  routeName: string;
  routeNumber: string;
  pickupPoint?: string;
  dropPoint?: string;
  monthlyFee?: number;
  status: string;
  createdAt: string;
}

export interface CreateTransportStudentRequest {
  studentId: string;
  routeId: string;
  pickupPoint?: string;
  dropPoint?: string;
  monthlyFee?: number;
  status: string;
}

export interface TransportRouteListResponse {
  routes: TransportRoute[];
  total: number;
  page: number;
  pageSize: number;
}

// API Service
export const transportApi = {
  // Routes
  async getRoutes(page = 1, pageSize = 10): Promise<TransportRouteListResponse> {
    const response = await apiClient.get<TransportRouteListResponse>(
      `/transport/routes?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  },

  async getRouteById(id: string): Promise<TransportRoute> {
    const response = await apiClient.get<TransportRoute>(`/transport/routes/${id}`);
    return response.data;
  },

  async createRoute(data: CreateTransportRouteRequest): Promise<TransportRoute> {
    const response = await apiClient.post<TransportRoute>('/transport/routes', data);
    return response.data;
  },

  async updateRoute(id: string, data: CreateTransportRouteRequest): Promise<TransportRoute> {
    const response = await apiClient.put<TransportRoute>(`/transport/routes/${id}`, data);
    return response.data;
  },

  async deleteRoute(id: string): Promise<void> {
    await apiClient.delete(`/transport/routes/${id}`);
  },

  // Students
  async getStudentsByRoute(routeId: string): Promise<TransportStudent[]> {
    const response = await apiClient.get<TransportStudent[]>(
      `/transport/routes/${routeId}/students`
    );
    return response.data;
  },

  async getAllTransportStudents(): Promise<TransportStudent[]> {
    const response = await apiClient.get<TransportStudent[]>('/transport/students');
    return response.data;
  },

  async assignStudentToRoute(data: CreateTransportStudentRequest): Promise<TransportStudent> {
    const response = await apiClient.post<TransportStudent>('/transport/students', data);
    return response.data;
  },

  async removeStudentFromRoute(id: string): Promise<void> {
    await apiClient.delete(`/transport/students/${id}`);
  },
};
