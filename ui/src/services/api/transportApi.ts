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
  totalPages?: number;
}

export interface TransportStudentListResponse {
  students: TransportStudent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

const getAllTransportStudents = async (page = 1, pageSize = 20, search?: string): Promise<TransportStudentListResponse> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  const r = await apiClient.get<TransportStudentListResponse>(`${BASE}/students?${params}`);
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

// ─── Vehicle Types ────────────────────────────────────────────────────────────

export interface VehicleComplianceAlert {
  documentType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'expired' | 'expiring_soon' | 'ok';
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  vehicleType: string;
  seatingCapacity: number;
  color?: string;
  fuelType?: string;
  fitnessCertExpiry?: string;
  insuranceExpiry?: string;
  pucExpiry?: string;
  roadTaxExpiry?: string;
  permitExpiry?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  odometerKm?: number;
  driverName?: string;
  driverPhone?: string;
  driverLicenseNumber?: string;
  driverLicenseExpiry?: string;
  status: string;
  notes?: string;
  assignedRouteName?: string;
  complianceAlerts: VehicleComplianceAlert[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  total: number;
  alertCount: number;
}

export interface CreateVehicleDto {
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  vehicleType?: string;
  seatingCapacity: number;
  color?: string;
  fuelType?: string;
  driverName?: string;
  driverPhone?: string;
  driverLicenseNumber?: string;
  notes?: string;
  status?: string;
}

// ─── Vehicle API ──────────────────────────────────────────────────────────────

const getVehicles = async (status?: string, type?: string): Promise<VehicleListResponse> => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  const query = params.toString();
  const r = await apiClient.get<VehicleListResponse>(`${BASE}/vehicles${query ? '?' + query : ''}`);
  return r.data;
};

const createVehicle = async (data: CreateVehicleDto): Promise<Vehicle> => {
  const r = await apiClient.post<Vehicle>(`${BASE}/vehicles`, data);
  return r.data;
};

const updateVehicle = async (id: string, data: Partial<CreateVehicleDto> & { status?: string }): Promise<Vehicle> => {
  const r = await apiClient.put<Vehicle>(`${BASE}/vehicles/${id}`, data);
  return r.data;
};

const deleteVehicle = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/vehicles/${id}`);
};

// ─── Stop Types ───────────────────────────────────────────────────────────────

export interface TransportStop {
  id: string;
  schoolId: string;
  routeId: string;
  stopName: string;
  stopOrder: number;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  morningArrivalTime?: string;
  eveningDepartureTime?: string;
  distanceKm?: number;
  status: string;
  studentsPickupCount: number;
  studentsDropCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransportStopDto {
  stopName: string;
  stopOrder: number;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  morningArrivalTime?: string;
  eveningDepartureTime?: string;
  distanceKm?: number;
}

// ─── Stop API ─────────────────────────────────────────────────────────────────

const getStops = async (routeId: string): Promise<TransportStop[]> => {
  const r = await apiClient.get<TransportStop[]>(`${BASE}/routes/${routeId}/stops`);
  return r.data;
};

const createStop = async (routeId: string, data: CreateTransportStopDto): Promise<TransportStop> => {
  const r = await apiClient.post<TransportStop>(`${BASE}/routes/${routeId}/stops`, data);
  return r.data;
};

const updateStop = async (id: string, data: Partial<CreateTransportStopDto> & { status?: string }): Promise<TransportStop> => {
  const r = await apiClient.put<TransportStop>(`${BASE}/stops/${id}`, data);
  return r.data;
};

const deleteStop = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/stops/${id}`);
};

const reorderStops = async (routeId: string, orderedStopIds: string[]): Promise<void> => {
  await apiClient.post(`${BASE}/routes/${routeId}/stops/reorder`, { orderedStopIds });
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
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getStops,
  createStop,
  updateStop,
  deleteStop,
  reorderStops,
};
