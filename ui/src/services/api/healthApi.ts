import apiClient from './apiClient';

const BASE = '/health';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthRecordBasic {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  checkupDate: string;
  height: number;
  weight: number;
  bmi: number;
  bmiCategory: string;
  bloodGroup?: string;
  status: string;
}

export interface HealthRecordFull {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  checkupDate: string;
  height: number;
  weight: number;
  bmi: number;
  bmiCategory: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  bloodGroup?: string;
  allergies: string[];
  medicalConditions: string[];
  currentMedications: string[];
  visionLeft?: string;
  visionRight?: string;
  hearingLeft?: string;
  hearingRight?: string;
  dentalStatus?: string;
  dentalRemarks?: string;
  doctorName: string;
  doctorNotes?: string;
  recommendations?: string;
  nextCheckupDate?: string;
  status: string;
  vaccinations: VaccinationDto[];
  activeAlerts: HealthAlertDto[];
  createdAt: string;
  updatedAt: string;
}

export interface VaccinationDto {
  id: string;
  studentId: string;
  vaccineName: string;
  vaccinationDate: string;
  nextDueDate?: string;
  batchNumber?: string;
  administeredBy?: string;
  createdAt: string;
}

export interface HealthAlertDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  alertType: string;
  severity: string;
  description: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface HealthStatsDto {
  totalRecords: number;
  normalStatus: number;
  attentionRequired: number;
  critical: number;
  followUp: number;
  avgBMI: number;
  upcomingCheckups: number;
  vaccinationsDue: number;
  bmiDistribution: {
    underweight: number;
    normal: number;
    overweight: number;
    obese: number;
  };
}

export interface HealthRecordListResponse {
  items: HealthRecordBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateHealthRecordDto {
  studentId: string;
  checkupDate: string;
  height: number;
  weight: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
  currentMedications?: string[];
  visionLeft?: string;
  visionRight?: string;
  hearingLeft?: string;
  hearingRight?: string;
  dentalStatus?: string;
  dentalRemarks?: string;
  doctorName: string;
  doctorNotes?: string;
  recommendations?: string;
  nextCheckupDate?: string;
  status: string;
}

export interface UpdateHealthRecordDto {
  checkupDate?: string;
  height?: number;
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
  currentMedications?: string[];
  visionLeft?: string;
  visionRight?: string;
  hearingLeft?: string;
  hearingRight?: string;
  dentalStatus?: string;
  dentalRemarks?: string;
  doctorName?: string;
  doctorNotes?: string;
  recommendations?: string;
  nextCheckupDate?: string;
  status?: string;
}

export interface CreateVaccinationDto {
  studentId: string;
  vaccineName: string;
  vaccinationDate: string;
  nextDueDate?: string;
  batchNumber?: string;
  administeredBy?: string;
}

export interface CreateHealthAlertDto {
  studentId: string;
  alertType: string;
  severity: string;
  description: string;
}

export interface BmiResult {
  height: number;
  weight: number;
  bmi: number;
  category: string;
  recommendation?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getRecords = async (params?: { page?: number; pageSize?: number; studentId?: string; bloodGroup?: string; searchQuery?: string }): Promise<HealthRecordListResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.bloodGroup) q.set('bloodGroup', params.bloodGroup);
  if (params?.searchQuery) q.set('searchQuery', params.searchQuery);
  const r = await apiClient.get<HealthRecordListResponse>(`${BASE}/records?${q}`);
  return r.data;
};

const getRecordById = async (id: string): Promise<HealthRecordFull> => {
  const r = await apiClient.get<HealthRecordFull>(`${BASE}/records/${id}`);
  return r.data;
};

const createRecord = async (data: CreateHealthRecordDto): Promise<HealthRecordFull> => {
  const r = await apiClient.post<HealthRecordFull>(`${BASE}/records`, data);
  return r.data;
};

const updateRecord = async (id: string, data: UpdateHealthRecordDto): Promise<HealthRecordFull> => {
  const r = await apiClient.put<HealthRecordFull>(`${BASE}/records/${id}`, data);
  return r.data;
};

const deleteRecord = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/records/${id}`);
};

const addVaccination = async (data: CreateVaccinationDto): Promise<void> => {
  await apiClient.post(`${BASE}/vaccinations`, data);
};

const getVaccinations = async (studentId: string): Promise<VaccinationDto[]> => {
  const r = await apiClient.get<VaccinationDto[]>(`${BASE}/vaccinations/${studentId}`);
  return r.data;
};

const getUpcomingVaccinations = async (): Promise<VaccinationDto[]> => {
  const r = await apiClient.get<VaccinationDto[]>(`${BASE}/vaccinations/upcoming`);
  return r.data;
};

const createAlert = async (data: CreateHealthAlertDto): Promise<HealthAlertDto> => {
  const r = await apiClient.post<HealthAlertDto>(`${BASE}/alerts`, data);
  return r.data;
};

const getAlerts = async (severity?: string, isAcknowledged?: boolean): Promise<HealthAlertDto[]> => {
  const q = new URLSearchParams();
  if (severity) q.set('severity', severity);
  if (isAcknowledged !== undefined) q.set('isAcknowledged', String(isAcknowledged));
  const r = await apiClient.get<HealthAlertDto[]>(`${BASE}/alerts?${q}`);
  return r.data;
};

const acknowledgeAlert = async (id: string): Promise<void> => {
  await apiClient.put(`${BASE}/alerts/${id}/acknowledge`, {});
};

const getStats = async (): Promise<HealthStatsDto> => {
  const r = await apiClient.get<HealthStatsDto>(`${BASE}/stats`);
  return r.data;
};

const calculateBmi = async (height: number, weight: number): Promise<BmiResult> => {
  const r = await apiClient.post<BmiResult>(`${BASE}/bmi/calculate`, { height, weight });
  return r.data;
};

export const healthApi = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  addVaccination,
  getVaccinations,
  getUpcomingVaccinations,
  createAlert,
  getAlerts,
  acknowledgeAlert,
  getStats,
  calculateBmi,
};
