/**
 * Real Student API — connects to sms-api backend at /api/students
 */
import { apiGet, apiPost, apiPut, apiDelete, apiClient } from '@/lib/apiClient';

// ---------------------------------------------------------------------------
// Types — match backend StudentBasicResponse / StudentResponse (camelCase JSON)
// ---------------------------------------------------------------------------

export interface GuardianDto {
  id: string;
  name: string;
  relation: string; // father, mother, guardian, other
  occupation?: string;
  employer?: string;
  phone: string;
  email?: string;
  aadharNumber?: string;
  panNumber?: string;
}

export interface StudentDocumentDto {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName?: string;
  uploadedAt: string;
}

/** Lightweight record returned in paginated list */
export interface StudentBasic {
  id: string;
  admissionNumber: string;
  name: string;
  class: string;
  section: string;
  rollNumber: string;
  status: string;
  photoUrl?: string;
}

/** Full student detail — matches backend StudentResponse (JSON camelCase) */
export interface Student extends StudentBasic {
  schoolId: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  /** ISO date-time string, e.g. "2005-03-15T00:00:00" */
  dateOfBirth: string;
  placeOfBirth?: string;
  gender?: string;
  /** JSON-serialised string array stored as text in backend */
  nationality?: string;
  /** ISO date-time string */
  admissionDate: string;

  // Identification
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  visaType?: string;
  visaExpiry?: string;

  // Contact
  address: string;
  permanentAddress?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;

  // Primary guardian (legacy flat fields)
  guardianName: string;
  guardianPhone: string;

  // Academic history
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
  category: string;

  // Medical
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;

  // Consent flags
  photoConsent: boolean;
  mediaConsent: boolean;
  medicalConsent: boolean;

  // Additional
  /** JSON-serialised string array */
  languageProficiency?: string;
  specialNeeds?: string;
  transportRequired: boolean;
  hostelRequired: boolean;
  /** JSON-serialised array of sibling student IDs */
  siblingIds?: string;

  // Relations
  guardians?: GuardianDto[];
  documents?: StudentDocumentDto[];

  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface StudentListResponse {
  students: StudentBasic[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Profile Summary (cross-module) ────────────────────────────────────────
export interface StudentFeeSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  academicYear: string;
  lastPaymentDate?: string;
  totalRecords: number;
}

export interface StudentAttendanceRecord {
  date: string;
  status: string;
  remarks?: string;
  isManualOverride: boolean;
}

export interface StudentAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
  recentRecords: StudentAttendanceRecord[];
}

export interface StudentExamResult {
  examName: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade?: string;
  isAbsent: boolean;
  examDate: string;
}

export interface StudentExamSummary {
  results: StudentExamResult[];
}

export interface StudentTransportInfo {
  assignmentId: string;
  routeName: string;
  routeNumber: string;
  pickupPoint?: string;
  dropPoint?: string;
  monthlyFee: number;
  status: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface StudentHostelInfo {
  assignmentId: string;
  roomNumber: string;
  roomType?: string;
  floor?: string;
  monthlyFee: number;
  status: string;
  checkInDate: string;
  checkOutDate?: string;
}

export interface StudentHealthInfo {
  recordId: string;
  checkupDate: string;
  height?: number;
  weight?: number;
  bmi?: number;
  bloodGroup?: string;
  visionLeft?: string;
  visionRight?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  vaccinations?: string;
  notes?: string;
  checkedBy?: string;
}

export interface StudentVisitorRecord {
  visitorLogId: string;
  visitorName: string;
  visitorPhone?: string;
  purpose: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
}

export interface StudentProfileSummary {
  student: StudentBasic;
  fee?: StudentFeeSummary;
  attendance?: StudentAttendanceSummary;
  exams?: StudentExamSummary;
  transport?: StudentTransportInfo;
  hostel?: StudentHostelInfo;
  healthRecords: StudentHealthInfo[];
  visitorHistory: StudentVisitorRecord[];
}

export interface StudentFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  classFilter?: string;
  status?: string;
}

export interface CreateStudentRequest {
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  admissionNumber?: string;
  class: string;
  section: string;
  rollNumber?: string;
  /** ISO date string: YYYY-MM-DD */
  dateOfBirth: string;
  placeOfBirth?: string;
  gender?: string;
  nationality?: string;
  /** ISO date string: YYYY-MM-DD */
  admissionDate: string;
  address: string;
  permanentAddress?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
  category?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  photoConsent?: boolean;
  mediaConsent?: boolean;
  medicalConsent?: boolean;
  languageProficiency?: string;
  specialNeeds?: string;
  transportRequired?: boolean;
  hostelRequired?: boolean;
  siblingIds?: string;
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  visaType?: string;
  visaExpiry?: string;
  status?: string;
}

export interface BulkPromoteRequest {
  fromClass: string;
  toClass: string;
  studentIds?: string[];
}

export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export const studentApi = {
  list: (filters?: StudentFilters) =>
    apiGet<StudentListResponse>('/students', filters as Record<string, unknown>),

  getById: (id: string) =>
    apiGet<Student>(`/students/${id}`),

  create: (data: CreateStudentRequest) =>
    apiPost<Student>('/students', data),

  update: (id: string, data: Partial<CreateStudentRequest> & { status?: string }) =>
    apiPut<Student>(`/students/${id}`, data),

  delete: (id: string) =>
    apiDelete<void>(`/students/${id}`),

  getStats: () =>
    apiGet<Record<string, unknown>>('/students/stats'),

  getGuardians: (studentId: string) =>
    apiGet<GuardianDto[]>(`/students/${studentId}/guardians`),

  getSiblings: (studentId: string) =>
    apiGet<StudentBasic[]>(`/students/${studentId}/siblings`),

  /** Parent endpoint — returns students linked to the logged-in parent via guardian email */
  getMyChildren: () =>
    apiGet<StudentBasic[]>('/students/my-children'),

  getDocuments: (studentId: string) =>
    apiGet<StudentDocumentDto[]>(`/students/${studentId}/documents`),

  deleteDocument: (documentId: string) =>
    apiDelete<void>(`/students/documents/${documentId}`),

  uploadPhoto: async (studentId: string, file: File): Promise<{ photoUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/students/${studentId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  uploadDocument: async (studentId: string, documentType: string, file: File): Promise<StudentDocumentDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    const res = await apiClient.post(`/students/${studentId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  bulkPromote: (request: BulkPromoteRequest) =>
    apiPost<BulkOperationResult>('/students/bulk-promote', request),

  bulkUpdate: (data: { studentIds: string[]; class?: string; section?: string; status?: string }) =>
    apiPost<BulkOperationResult>('/students/bulk-update', data),

  profileSummary: (studentId: string) =>
    apiGet<StudentProfileSummary>(`/students/${studentId}/profile-summary`),
};
