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
  sectionFilter?: string;
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
  /** Guardian email — used as the parent portal login username. Required for parent portal access. */
  guardianEmail?: string;
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
  studentIds: string[];
  newClass: string;
  newSection: string;
  academicYear?: string;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors?: string[];
}

export interface GuardianStaffDto {
  id: string;
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  profilePhoto?: string;
}

export interface StaffChildDto {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  section: string;
  rollNumber?: string;
  status: string;
  photoUrl?: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export const studentApi = {
  list: (filters?: StudentFilters) =>
    apiGet<StudentListResponse>('/students', filters as Record<string, unknown>),

  /** Get the logged-in student's own record (Student role only — resolved via JWT email). */
  getMe: () =>
    apiGet<StudentResponse>('/students/me'),

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

  addSibling: (studentId: string, siblingStudentId: string) =>
    apiPost<{ message: string }>(`/students/${studentId}/siblings`, { siblingStudentId }),

  removeSibling: (studentId: string, siblingId: string) =>
    apiDelete<void>(`/students/${studentId}/siblings/${siblingId}`),

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

  getGuardianStaff: (studentId: string) =>
    apiGet<GuardianStaffDto | null>(`/students/${studentId}/guardian-staff`),

  setGuardianStaff: (studentId: string, staffId: string | null) =>
    apiPost<{ message: string }>(`/students/${studentId}/guardian-staff`, { staffId }),

  // ── Exit (Dropout / Passout) ─────────────────────────────────────────────
  getExitClearance: (studentId: string) =>
    apiGet<ExitClearanceResponse>(`/students/${studentId}/exit-clearance`),

  processDropout: (studentId: string, data: StudentDropoutRequest) =>
    apiPost<StudentExitResponse>(`/students/${studentId}/dropout`, data),

  processPassout: (studentId: string, data: StudentPassoutRequest) =>
    apiPost<StudentExitResponse>(`/students/${studentId}/passout`, data),
};

// ── Exit feature types ───────────────────────────────────────────────────────

export interface ExitPendingFee {
  feeRecordId: string;
  feeType: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate?: string;
}

export interface ExitDocument {
  documentKey: string;
  title: string;
  isMandatory: boolean;
  fields: Record<string, string>;
}

export interface ExitClearanceResponse {
  studentId: string;
  studentName: string;
  currentClass: string;
  currentSection: string;
  academicYear: string;
  isFeeClear: boolean;
  totalPendingAmount: number;
  pendingFees: ExitPendingFee[];
  availableDocuments: ExitDocument[];
}

export interface StudentDropoutRequest {
  dropoutType: 'transfer' | 'detain';
  destinationSchool?: string;
  reason?: string;
  conduct?: string;
  feeClearanceConfirmed: boolean;
  documentsToGenerate: Array<{ documentKey: string; fields: Record<string, string> }>;
  remarks?: string;
}

export interface StudentPassoutRequest {
  academicYear?: string;
  passingClass?: string;
  destinationSchool?: string;
  reason?: string;
  conduct?: string;
  feeClearanceConfirmed: boolean;
  documentsToGenerate: Array<{ documentKey: string; fields: Record<string, string> }>;
  remarks?: string;
}

export interface GeneratedDocumentInfo {
  documentKey: string;
  title: string;
  fields: Record<string, string>;
  fileUrl?: string;
}

export interface StudentExitResponse {
  studentId: string;
  studentName: string;
  exitType: string;
  subType?: string;
  newStatus: string;
  alumniId?: string;
  alumniMessage?: string;
  generatedDocuments: GeneratedDocumentInfo[];
  message: string;
}
