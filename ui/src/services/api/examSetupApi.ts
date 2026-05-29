/**
 * Exam Setup API — connects to /api/examinations/exam-setup backend endpoints.
 *
 * Supports the full workflow:
 *   wizard → create → marks entry → finalize → publish
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ──────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ──────────────────────────────────────────────────────────────────────────────

export interface ClassBoardDto {
  classId: string;
  className: string;
  boardConfigurationId: string;
  boardName: string;
}

export interface ClassSubjectForExamDto {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  isElective: boolean;
  defaultStaffId?: string;
  defaultStaffName?: string;
  defaultMaxMarks?: number;
  defaultTheoryMarks?: number;
  defaultPracticalMarks?: number;
}

export interface ExamNamePreviewDto {
  suggestedName: string;
}

export interface ExamSetupSubjectDto {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  isElective: boolean;
  maxTheoryMarks: number;
  maxPracticalMarks: number;
  maxInternalMarks: number;
  maxTotalMarks: number;
  passingMarks: number;
  assignedStaffId?: string;
  assignedStaffName?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  subjectOrder: number;
  status: string;
}

export interface ExamSetupBasicDto {
  id: string;
  name: string;
  examType: string;
  isCustomType: boolean;
  customTypeName?: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  boardConfigurationId?: string;
  boardName?: string;
  academicYear: string;
  term?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  subjectCount: number;
  marksEnteredCount: number;
  createdAt?: string;
  /**
   * True when the requesting staff is the class teacher for this exam's class.
   * Set by the staff-scoped endpoint (GET /exam-setup/my-assignments).
   */
  isClassTeacherForThisClass?: boolean;
  /**
   * Subject IDs within this exam explicitly assigned to the requesting staff.
   * Set by the staff-scoped endpoint. Empty if the staff is the class teacher
   * (class teachers can access all subjects via isClassTeacherForThisClass).
   */
  myAssignedSubjectIds?: string[];
}

export interface ExamSetupDetailDto extends ExamSetupBasicDto {
  subjects: ExamSetupSubjectDto[];
  publishedAt?: string;
}

export interface CreateExamSetupSubjectDto {
  subjectId: string;
  isElective: boolean;
  maxTheoryMarks?: number;
  maxPracticalMarks?: number;
  maxInternalMarks?: number;
  passingMarks?: number;
  assignedStaffId?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  subjectOrder?: number;
}

export interface CreateExamSetupDto {
  examTypeId?: string;
  isCustomType: boolean;
  customTypeName?: string;
  classId: string;
  sectionId?: string;
  boardConfigurationId?: string;
  academicYear: string;
  term?: number;
  startDate?: string;
  endDate?: string;
  subjects: CreateExamSetupSubjectDto[];
}

export interface StudentMarksRowDto {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  admissionNumber?: string;
  marksEntryId?: string;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  obtainedMarks?: number;
  isAbsent: boolean;
  grade?: string;
  percentage?: number;
  isPass: boolean;
  remarks?: string;
  status: string;
}

export interface MarksEntrySheetDto {
  examSetupId: string;
  examSetupSubjectId: string;
  examName: string;
  subjectName: string;
  subjectCode?: string;
  maxTheoryMarks: number;
  maxPracticalMarks: number;
  maxInternalMarks: number;
  maxTotalMarks: number;
  passingMarks: number;
  isLocked: boolean;
  status: string;
  rows: StudentMarksRowDto[];
}

export interface SingleStudentMarksDto {
  studentId: string;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  isAbsent: boolean;
  remarks?: string;
}

export interface BulkMarksEntryDto {
  examSetupId: string;
  examSetupSubjectId: string;
  entries: SingleStudentMarksDto[];
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface PublishResultsResponseDto {
  examSetupId: string;
  studentsNotified: number;
  reportCardsGenerated: number;
  message: string;
}

export interface SubjectResultSummaryDto {
  subjectId?: string;
  subjectName: string;
  isElective: boolean;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  obtainedMarks: number;
  /** Backend serializes as maxMarks (SubjectResultSummaryDto.MaxMarks) */
  maxMarks: number;
  percentage: number;
  grade?: string;
  gradePoint?: number;
  isPass: boolean;
  isAbsent: boolean;
}

export interface StudentExamResultSummaryDto {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  examName?: string;
  academicYear?: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
  cgpa: number;
  rank?: number;
  isPass: boolean;
  subjects: SubjectResultSummaryDto[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// WIZARD HELPERS
// ──────────────────────────────────────────────────────────────────────────────

export const previewExamName = (params: {
  examTypeId?: string;
  isCustomType?: boolean;
  customTypeName?: string;
  classId: string;
  sectionId?: string;
  academicYear: string;
}): Promise<ExamNamePreviewDto> =>
  apiGet('/examinations/exam-setup/name-preview', params as unknown as Record<string, unknown>);

export const getClassBoards = (classId: string): Promise<ClassBoardDto[]> =>
  apiGet(`/examinations/exam-setup/class-boards/${classId}`);

export const getClassSubjectsForExam = (params: {
  classId: string;
  boardConfigurationId?: string;
  academicYear?: string;
}): Promise<ClassSubjectForExamDto[]> =>
  apiGet('/examinations/exam-setup/class-subjects', params as unknown as Record<string, unknown>);

// ──────────────────────────────────────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────────────────────────────────────

export const getExamSetups = (params?: {
  academicYear?: string;
  classId?: string;
  boardConfigurationId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<ExamSetupBasicDto>> =>
  apiGet('/examinations/exam-setup', params as unknown as Record<string, unknown>);

export const getExamSetupById = (id: string): Promise<ExamSetupDetailDto> =>
  apiGet(`/examinations/exam-setup/${id}`);

export const createExamSetup = (dto: CreateExamSetupDto): Promise<ExamSetupDetailDto> =>
  apiPost('/examinations/exam-setup', dto);

export const updateExamSetup = (id: string, dto: CreateExamSetupDto): Promise<ExamSetupDetailDto> =>
  apiPut(`/examinations/exam-setup/${id}`, dto);

export const deleteExamSetup = (id: string): Promise<void> =>
  apiDelete(`/examinations/exam-setup/${id}`);

// ──────────────────────────────────────────────────────────────────────────────
// MARKS ENTRY
// ──────────────────────────────────────────────────────────────────────────────

export const getMarksEntrySheet = (
  examSetupId: string,
  examSetupSubjectId: string
): Promise<MarksEntrySheetDto> =>
  apiGet(`/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/marks`);

export const saveBulkMarks = (
  examSetupId: string,
  examSetupSubjectId: string,
  dto: BulkMarksEntryDto
): Promise<BulkOperationResult> =>
  apiPost(`/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/marks`, dto);

export const unlockSubjectForEdit = (
  examSetupId: string,
  examSetupSubjectId: string
): Promise<void> =>
  apiPut(`/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/unlock`);

export const reopenExamForEditing = (id: string): Promise<ExamSetupDetailDto> =>
  apiPost(`/examinations/exam-setup/${id}/reopen`);

// ──────────────────────────────────────────────────────────────────────────────
// FINALIZE & PUBLISH
// ──────────────────────────────────────────────────────────────────────────────

export const finalizeExamSetup = (id: string): Promise<ExamSetupDetailDto> =>
  apiPost(`/examinations/exam-setup/${id}/finalize`);

export const publishExamSetupResults = (id: string): Promise<PublishResultsResponseDto> =>
  apiPost(`/examinations/exam-setup/${id}/publish`);

// ──────────────────────────────────────────────────────────────────────────────
// RESULTS
// ──────────────────────────────────────────────────────────────────────────────

export const getExamSetupResults = (id: string): Promise<StudentExamResultSummaryDto[]> =>
  apiGet(`/examinations/exam-setup/${id}/results`);

export const getStudentExamSetupResult = (
  id: string,
  studentId: string
): Promise<StudentExamResultSummaryDto> =>
  apiGet(`/examinations/exam-setup/${id}/results/${studentId}`);

// ──────────────────────────────────────────────────────────────────────────────
// STAFF VIEW
// ──────────────────────────────────────────────────────────────────────────────

export const getMyExamAssignments = (academicYear?: string): Promise<ExamSetupBasicDto[]> =>
  apiGet('/examinations/exam-setup/my-assignments', academicYear ? { academicYear } : undefined);

// ── Staff grades dashboard ────────────────────────────────────────────────────

export interface StaffExamStatsDto {
  totalExams: number;
  publishedExams: number;
  totalMarksEntries: number;
  averagePercentage: number;
  passRate: number;
}

export interface ClassSectionFilterOption {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
}

export interface StaffStudentMarkDto {
  examMarksEntryId: string;
  examSetupId: string;
  examName: string;
  academicYear: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  studentId: string;
  studentName: string;
  rollNumber?: string;
  subjectId: string;
  subjectName: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage?: number;
  grade?: string;
  isPass: boolean;
  isAbsent: boolean;
}

export interface StaffStudentMarksPageDto {
  total: number;
  page: number;
  pageSize: number;
  items: StaffStudentMarkDto[];
  classes: ClassSectionFilterOption[];
}

export const getMyExamStats = (): Promise<StaffExamStatsDto> =>
  apiGet('/examinations/exam-setup/my-stats');

export const getMyStudentMarks = (
  classId?: string,
  sectionId?: string,
  page = 1,
  pageSize = 100,
): Promise<StaffStudentMarksPageDto> =>
  apiGet('/examinations/exam-setup/my-student-marks', {
    ...(classId   ? { classId }   : {}),
    ...(sectionId ? { sectionId } : {}),
    page,
    pageSize,
  });

// ──────────────────────────────────────────────────────────────────────────────
// HALL TICKETS
// ──────────────────────────────────────────────────────────────────────────────

export interface HallTicketStudentDto {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: string;
  hallTicketNo: string;
  className: string;
  sectionName: string | null;
}

/** Fetches the list of students eligible for hall tickets (for the dialog). */
export async function getHallTicketStudents(examSetupId: string): Promise<HallTicketStudentDto[]> {
  const { apiClient } = await import('@/lib/apiClient');
  const response = await apiClient.get<HallTicketStudentDto[]>(
    `/examinations/exam-setup/${examSetupId}/hall-ticket-students`
  );
  return response.data;
}

/** Triggers a browser download for a single student's hall ticket PDF. */
export async function downloadSingleHallTicket(
  examSetupId: string,
  enrollmentId: string,
  studentName: string,
): Promise<void> {
  const { apiClient } = await import('@/lib/apiClient');
  const response = await apiClient.get(
    `/examinations/exam-setup/${examSetupId}/hall-tickets/${enrollmentId}`,
    { responseType: 'blob' }
  );
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  a.download = match ? match[1].replace(/['"]/g, '') : `HallTicket_${studentName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads hall tickets for all enrolled students as a PDF blob and
 * triggers a browser file download automatically.
 */
export async function downloadHallTickets(examSetupId: string, examName: string): Promise<void> {
  const { apiClient } = await import('@/lib/apiClient');
  const response = await apiClient.get(
    `/examinations/exam-setup/${examSetupId}/hall-tickets`,
    { responseType: 'blob' }
  );
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Try to get filename from Content-Disposition header, fallback to generated name
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, '') : `HallTickets_${examName}.pdf`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
