import apiClient from './apiClient';

const BASE = '/discipline';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisciplineIncidentType =
  | 'warning'
  | 'suspension'
  | 'misconduct'
  | 'detention'
  | 'bullying'
  | 'physical_altercation'
  | 'property_damage'
  | 'academic_dishonesty'
  | 'absenteeism'
  | 'disruption'
  | 'behaviour_concern'
  | 'positive_recognition'
  | 'other';

export type DisciplineSeverity = 'low' | 'medium' | 'high' | 'critical' | 'commendation';

export type DisciplineStatus = 'open' | 'under_review' | 'resolved' | 'appealed' | 'escalated' | 'closed';

export type ParentNotificationStatus = 'pending' | 'notified' | 'not_required';

export interface DisciplineRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentAdmissionNumber?: string;
  studentClass?: string;
  studentSection?: string;
  incidentDate: string;
  incidentType: DisciplineIncidentType;
  severity: DisciplineSeverity;
  title: string;
  description?: string;
  actionTaken?: string;
  status: DisciplineStatus;
  reportedByStaffId?: string;
  reportedByName?: string;
  parentNotificationStatus: ParentNotificationStatus;
  parentNotifiedAt?: string;
  suspensionDays: number;
  notes?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineSummary {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  suspensionDays: number;
  positiveRecognitions: number;
  highSeverityCount: number;
  parentNotifiedCount: number;
}

export interface DisciplineListResponse {
  records: DisciplineRecord[];
  totalCount: number;
  summary: DisciplineSummary;
}

export interface CreateDisciplineRequest {
  studentId: string;
  incidentDate: string;          // ISO date string
  incidentType: DisciplineIncidentType;
  severity: DisciplineSeverity;
  title: string;
  description?: string;
  actionTaken?: string;
  status?: DisciplineStatus;
  reportedByStaffId?: string;
  reportedByName?: string;
  parentNotificationStatus?: ParentNotificationStatus;
  suspensionDays?: number;
  notes?: string;
}

export interface UpdateDisciplineRequest {
  incidentDate?: string;
  incidentType?: DisciplineIncidentType;
  severity?: DisciplineSeverity;
  title?: string;
  description?: string;
  actionTaken?: string;
  status?: DisciplineStatus;
  reportedByStaffId?: string;
  reportedByName?: string;
  parentNotificationStatus?: ParentNotificationStatus;
  suspensionDays?: number;
  notes?: string;
  resolutionNotes?: string;
}

export interface DisciplineQueryParams {
  studentId?: string;
  status?: DisciplineStatus;
  severity?: DisciplineSeverity;
  incidentType?: DisciplineIncidentType;
  fromDate?: string;
  toDate?: string;
  academicYear?: string;
  page?: number;
  pageSize?: number;
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function getDisciplineRecords(params: DisciplineQueryParams): Promise<DisciplineListResponse> {
  const res = await apiClient.get<DisciplineListResponse>(BASE, { params });
  return res.data;
}

export async function getDisciplineById(id: string): Promise<DisciplineRecord> {
  const res = await apiClient.get<DisciplineRecord>(`${BASE}/${id}`);
  return res.data;
}

export async function getStudentDisciplineSummary(studentId: string): Promise<DisciplineSummary> {
  const res = await apiClient.get<DisciplineSummary>(`${BASE}/students/${studentId}/summary`);
  return res.data;
}

export async function createDisciplineRecord(data: CreateDisciplineRequest): Promise<DisciplineRecord> {
  const res = await apiClient.post<DisciplineRecord>(BASE, data);
  return res.data;
}

export async function updateDisciplineRecord(id: string, data: UpdateDisciplineRequest): Promise<DisciplineRecord> {
  const res = await apiClient.patch<DisciplineRecord>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteDisciplineRecord(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
