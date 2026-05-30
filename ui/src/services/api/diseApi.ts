/**
 * DISE / UDISE Report API — connects to sms-api /api/reports/dise
 *
 * DISE (District Information System for Education) is the annual government
 * data submission required of all Indian schools. It covers enrollment counts
 * by category (SC/ST/OBC/General), gender, minority, BPL, and disability status.
 */
import { apiGet } from '@/lib/apiClient';

// ── DTOs (mirror DISEReportService.cs DTOs 1:1 in camelCase) ──────────────────

export interface DISEStudentRecord {
  studentId: string;
  penNumber: string | null;
  udiseNumber: string | null;
  aadharNumber: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  motherName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  className: string;
  sectionName: string;
  category: string | null;
  isMinority: boolean;
  isBPL: boolean;
  isDifferentlyAbled: boolean;
  differentlyAbledType: string | null;
  differentlyAbledPercentage: number | null;
  religion: string | null;
  boardRollNumber: string | null;
  address: string | null;
}

export interface DISEClassSummary {
  className: string;
  totalStudents: number;
  boys: number;
  girls: number;
  generalCategory: number;
  obcCategory: number;
  scCategory: number;
  stCategory: number;
  minorityStudents: number;
  bplStudents: number;
  differentlyAbledStudents: number;
}

export interface DISESchoolSummary {
  schoolId: string;
  schoolName: string;
  udiseCode: string | null;
  academicYear: string;
  totalStudents: number;
  totalBoys: number;
  totalGirls: number;
  generalCategory: number;
  obcCategory: number;
  scCategory: number;
  stCategory: number;
  minorityStudents: number;
  bplStudents: number;
  differentlyAbledStudents: number;
  studentsWithPEN: number;
  studentsWithAadhar: number;
  classBreakdown: DISEClassSummary[];
  generatedAt: string;
}

export interface DISEStudentsResponse {
  records: DISEStudentRecord[];
  count: number;
}

// ── API functions ──────────────────────────────────────────────────────────────

/**
 * School-level DISE summary: totals, category breakdowns, class-wise table.
 */
export function getDISESummary(academicYear: string): Promise<DISESchoolSummary> {
  return apiGet<DISESchoolSummary>('/reports/dise/summary', { academicYear });
}

/**
 * Student-level DISE records for review. Optionally filtered by class name.
 */
export function getDISEStudents(academicYear: string, className?: string): Promise<DISEStudentsResponse> {
  return apiGet<DISEStudentsResponse>('/reports/dise/students', {
    academicYear,
    ...(className ? { className } : {}),
  });
}

/**
 * Triggers a server-side CSV export download.
 * Returns the auth-decorated fetch Response so the caller can stream it as a Blob.
 */
export async function downloadDISECsv(academicYear: string, className?: string): Promise<void> {
  const params = new URLSearchParams({ academicYear });
  if (className) params.set('className', className);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5092/api';
  const url = `${apiBase}/reports/dise/export/csv?${params.toString()}`;

  // Retrieve auth token from session/local storage (same logic as apiClient.ts)
  let token: string | null = null;
  try {
    const raw = sessionStorage.getItem('auth_session');
    if (raw) token = JSON.parse(raw)?.token ?? null;
  } catch { /* ignore */ }
  if (!token) token = localStorage.getItem('authToken');

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `CSV export failed: ${res.status}`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const filename = className
    ? `DISE_Export_${academicYear}_${className}.csv`
    : `DISE_Export_${academicYear}.csv`;

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

// ── Staff Summary ──────────────────────────────────────────────────────────────

export interface DISEDesignationCount {
  designation: string;
  total: number;
  male: number;
  female: number;
  trained: number;
}

export interface DISEStaffSummary {
  totalTeachingStaff: number;
  maleTeachers: number;
  femaleTeachers: number;
  trainedTeachers: number;
  untrainedTeachers: number;
  contractTeachers: number;
  permanentTeachers: number;
  staffWithAadhar: number;
  staffWithPAN: number;
  byDesignation: DISEDesignationCount[];
  generatedAt: string;
}

/**
 * DISE staff summary: teaching staff counts by gender, training status,
 * employment type, and designation — for the DISE ASR Staff section.
 */
export function getDISEStaffSummary(): Promise<DISEStaffSummary> {
  return apiGet<DISEStaffSummary>('/reports/dise/staff');
}
