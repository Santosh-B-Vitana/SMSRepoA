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
  subjectId: string;
  subjectName: string;
  isElective: boolean;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  obtainedMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
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
