import apiClient from './apiClient';

const BASE = '/transport';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface TransportRouteListResponse {
  routes: TransportRoute[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRouteDto {
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

export interface AssignStudentDto {
  studentId: string;
  routeId: string;
  pickupPoint?: string;
  dropPoint?: string;
  monthlyFee?: number;
  status: string;
}

export interface UpdateTransportStudentDto {
  routeId: string;
  pickupPoint?: string;
  dropPoint?: string;
  monthlyFee?: number;
  status: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getRoutes = async (page = 1, pageSize = 50): Promise<TransportRouteListResponse> => {
  const r = await apiClient.get<TransportRouteListResponse>(`${BASE}/routes?page=${page}&pageSize=${pageSize}`);
  return r.data;
};

const getRouteById = async (id: string): Promise<TransportRoute> => {
  const r = await apiClient.get<TransportRoute>(`${BASE}/routes/${id}`);
  return r.data;
};

const createRoute = async (data: CreateRouteDto): Promise<TransportRoute> => {
  const r = await apiClient.post<TransportRoute>(`${BASE}/routes`, data);
  return r.data;
};

const updateRoute = async (id: string, data: CreateRouteDto): Promise<TransportRoute> => {
  const r = await apiClient.put<TransportRoute>(`${BASE}/routes/${id}`, data);
  return r.data;
};

const deleteRoute = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/routes/${id}`);
};

const getStudentsByRoute = async (routeId: string): Promise<TransportStudent[]> => {
  const r = await apiClient.get<TransportStudent[]>(`${BASE}/routes/${routeId}/students`);
  return r.data;
};

const getAllTransportStudents = async (): Promise<TransportStudent[]> => {
  const r = await apiClient.get<TransportStudent[]>(`${BASE}/students`);
  return r.data;
};

const assignStudentToRoute = async (data: AssignStudentDto): Promise<TransportStudent> => {
  const r = await apiClient.post<TransportStudent>(`${BASE}/students`, data);
  return r.data;
};

const updateTransportStudent = async (id: string, data: UpdateTransportStudentDto): Promise<TransportStudent> => {
  const r = await apiClient.put<TransportStudent>(`${BASE}/students/${id}`, data);
  return r.data;
};

const removeStudentFromRoute = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/students/${id}`);
};

export const transportApi = {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getStudentsByRoute,
  getAllTransportStudents,
  assignStudentToRoute,
  updateTransportStudent,
  removeStudentFromRoute,
};
