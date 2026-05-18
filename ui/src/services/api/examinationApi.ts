import apiClient from './apiClient';

// ========== TYPE DEFINITIONS ==========

export interface ExamBasic {
  id: string;
  name: string;
  examType?: string;
  class: string;
  section?: string;
  subject: string;
  date: string;
  maxMarks: number;
  passingMarks?: number;
  status: string;
  academicYear?: string;
}

export interface ExamFull {
  id: string;
  schoolId: string;
  name: string;
  examType: string;
  class: string;
  section: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  maxMarks: number;
  passingMarks: number;
  room?: string;
  invigilatorId?: string;
  invigilatorName?: string;
  syllabusTopics: string[];
  instructions?: string;
  status: string;
  academicYear: string;
  totalStudents: number;
  resultsEntered: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExamDto {
  schoolId: string;
  name: string;
  examType: string;
  class: string;
  section?: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  maxMarks: number;
  passingMarks: number;
  room?: string;
  invigilatorId?: string;
  syllabusTopics?: string[];
  instructions?: string;
  academicYear: string;
}

export interface UpdateExamDto {
  name?: string;
  examType?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  maxMarks?: number;
  passingMarks?: number;
  room?: string;
  invigilatorId?: string;
  syllabusTopics?: string[];
  instructions?: string;
  status?: string;
}

export interface ResultBasic {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isAbsent?: boolean;
  percentage?: number;
}

export interface ResultFull {
  id: string;
  schoolId: string;
  examId: string;
  examName: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  subject: string;
  marksObtained: number;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  rank?: number;
  remarks?: string;
  isAbsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResultDto {
  schoolId: string;
  examId: string;
  studentId: string;
  marksObtained?: number;
  theoryMarks?: number;
  practicalMarks?: number;
  internalMarks?: number;
  remarks?: string;
  isAbsent: boolean;
}

export interface BulkResultDto {
  schoolId: string;
  examId: string;
  results: {
    studentId: string;
    marksObtained?: number;
    theoryMarks?: number;
    practicalMarks?: number;
    internalMarks?: number;
    isAbsent: boolean;
    remarks?: string;
  }[];
}

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  rollNumber?: string;
  academicYear: string;
  examType: string;
  subjects: {
    subject: string;
    theoryMarks?: number;
    practicalMarks?: number;
    totalMarks: number;
    maxMarks: number;
    grade: string;
    gradePoint: number;
  }[];
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  attendancePercentage?: number;
  teacherRemarks?: string;
  principalRemarks?: string;
  generatedAt: string;
}

export interface GenerateReportCardDto {
  schoolId: string;
  studentId: string;
  academicYear: string;
  examType: string;
  teacherRemarks?: string;
  principalRemarks?: string;
}

export interface ExamStats {
  totalExams: number;
  scheduledExams: number;
  completedExams: number;
  ongoingExams: number;
  totalResults: number;
  averageMarks: number;
  passPercentage: number;
  topPerformers: {
    studentId: string;
    studentName: string;
    class: string;
    percentage: number;
    rank: number;
  }[];
}

export interface GradeDto {
  grade: string;
  gradePoint: number;
  percentage: number;
  isPassingGrade: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ExamFilters {
  searchTerm?: string;
  class?: string;
  subject?: string;
  examType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  academicYear?: string;
}

export interface ResultFilters {
  examId?: string;
  studentId?: string;
  class?: string;
  section?: string;
  subject?: string;
  searchTerm?: string;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

// ========== API FUNCTIONS ==========

const BASE_PATH = '/examinations';

/**
 * Get paginated list of exams with filters
 */
export const getExams = async (
  filters?: ExamFilters,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<ExamBasic>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
  }

  const response = await apiClient.get(`${BASE_PATH}/exams?${params.toString()}`);
  return response.data;
};

/**
 * Get full exam details by ID
 */
export const getExamById = async (examId: string): Promise<ExamFull> => {
  const response = await apiClient.get(`${BASE_PATH}/exams/${examId}`);
  return response.data;
};

/**
 * Create a new exam
 */
export const createExam = async (data: CreateExamDto): Promise<ExamFull> => {
  const response = await apiClient.post(`${BASE_PATH}/exams`, data);
  return response.data;
};

/**
 * Update an existing exam
 */
export const updateExam = async (examId: string, data: UpdateExamDto): Promise<ExamFull> => {
  const response = await apiClient.put(`${BASE_PATH}/exams/${examId}`, data);
  return response.data;
};

/**
 * Delete an exam
 */
export const deleteExam = async (examId: string): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/exams/${examId}`);
};

/**
 * Finalize exam results — calculates ranks and publishes results
 */
export const finalizeExamResults = async (examId: string): Promise<{ message: string; examId: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/exams/${examId}/finalize`);
  return response.data;
};

/**
 * Get paginated list of results with filters
 */
export const getResults = async (
  filters?: ResultFilters,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<ResultBasic>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
  }

  const response = await apiClient.get(`${BASE_PATH}/results?${params.toString()}`);
  return response.data;
};

/**
 * Get full result details by ID
 */
export const getResultById = async (resultId: string): Promise<ResultFull> => {
  const response = await apiClient.get(`${BASE_PATH}/results/${resultId}`);
  return response.data;
};

/**
 * Create a single result
 */
export const createResult = async (data: CreateResultDto): Promise<ResultFull> => {
  const response = await apiClient.post(`${BASE_PATH}/results`, data);
  return response.data;
};

/**
 * Create multiple results in bulk
 */
export const bulkCreateResults = async (data: BulkResultDto): Promise<BulkOperationResult> => {
  const response = await apiClient.post(`${BASE_PATH}/results/bulk`, data);
  return response.data;
};

/**
 * Get student report cards for an academic year
 */
export const getStudentReportCards = async (
  studentId: string,
  academicYear?: string
): Promise<ReportCard[]> => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);

  const queryStr = params.toString();
  const response = await apiClient.get(`${BASE_PATH}/report-cards/${studentId}${queryStr ? `?${queryStr}` : ''}`);
  return response.data;
};

/**
 * Generate a new report card
 */
export const generateReportCard = async (data: GenerateReportCardDto): Promise<ReportCard> => {
  const response = await apiClient.post(`${BASE_PATH}/report-cards`, data);
  return response.data;
};

/**
 * Get exam statistics
 */
export const getExamStats = async (filters?: ExamFilters): Promise<ExamStats> => {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
  }

  const response = await apiClient.get(`${BASE_PATH}/stats?${params.toString()}`);
  return response.data;
};

/**
 * Calculate grade for a given percentage
 */
export const calculateGrade = async (percentage: number): Promise<GradeDto> => {
  const response = await apiClient.post(`${BASE_PATH}/calculate-grade`, { percentage });
  return response.data;
};

// ========== HALL TICKETS ==========

export interface HallTicket {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  hallTicketNumber: string;
  rollNumber?: string;
  class: string;
  section?: string;
  generatedAt: string;
}

export interface GenerateHallTicketsDto {
  prefix?: string;
}

export const generateHallTickets = async (examId: string, data?: GenerateHallTicketsDto): Promise<HallTicket[]> => {
  const response = await apiClient.post(`${BASE_PATH}/exams/${examId}/generate-hall-tickets`, data ?? {});
  return response.data;
};

export const getHallTicket = async (examId: string, studentId: string): Promise<HallTicket> => {
  const response = await apiClient.get(`${BASE_PATH}/exams/${examId}/hall-tickets/${studentId}`);
  return response.data;
};

export const getHallTickets = async (examId: string): Promise<HallTicket[]> => {
  const response = await apiClient.get(`${BASE_PATH}/exams/${examId}/hall-tickets`);
  return response.data;
};

// ========== PROMOTE EXAM STRUCTURE ==========

export interface PromoteExamStructureDto {
  sourceAcademicYear: string;
  targetAcademicYear: string;
  force?: boolean;
}

export const promoteExamStructure = async (data: PromoteExamStructureDto): Promise<{ promoted: number; skipped: number }> => {
  const response = await apiClient.post(`${BASE_PATH}/exams/promote`, data);
  return response.data;
};

// ========== CO-SCHOLASTIC ==========

export type CoScholasticCategory = "co_scholastic_activities" | "attitudes_values" | "life_skills" | "discipline";

export const CO_SCHOLASTIC_CATEGORY_LABELS: Record<string, string> = {
  co_scholastic_activities: "Co-Scholastic Activities",
  attitudes_values: "Attitudes & Values",
  life_skills: "Life Skills",
  discipline: "Discipline",
};

export interface CoScholasticArea {
  id: string;
  name: string;
  code: string;
  description?: string;
  gradeScale: string;
  category?: CoScholasticCategory;
  applicableFromGrade?: number;
  applicableToGrade?: number;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateCoScholasticAreaDto {
  name: string;
  code?: string;
  description?: string;
  gradeScale?: string;
  category?: string;
  applicableFromGrade?: number;
  applicableToGrade?: number;
  displayOrder?: number;
}

export interface UpdateCoScholasticAreaDto {
  name?: string;
  code?: string;
  description?: string;
  gradeScale?: string;
  category?: string;
  applicableFromGrade?: number;
  applicableToGrade?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CoScholasticAssessment {
  id: string;
  studentId: string;
  coScholasticAreaId: string;
  area: { id: string; name: string; code: string; gradeScale: string };
  academicYear: string;
  term: number;
  grade: string;
  remarks?: string;
}

/** Single row sent to POST /coscholastic/assessments (matches backend flat list format) */
export interface SaveCoScholasticEntryDto {
  studentId: string;
  coScholasticAreaId: string;
  academicYear: string;
  term: number;
  grade: string;
  remarks?: string;
  examId?: string;
}

/** Class-level grid response from GET /coscholastic/class/{classId} */
export interface ClassCoScholasticGrid {
  academicYear: string;
  term: number;
  areas: CoScholasticArea[];
  students: {
    studentId: string;
    name: string;
    rollNumber?: string;
    grades: Record<string, { grade: string; remarks?: string }>;
  }[];
}

export const getCoScholasticAreas = async (): Promise<CoScholasticArea[]> => {
  const response = await apiClient.get(`${BASE_PATH}/coscholastic/areas`);
  return response.data;
};

export const createCoScholasticArea = async (data: CreateCoScholasticAreaDto): Promise<CoScholasticArea> => {
  const response = await apiClient.post(`${BASE_PATH}/coscholastic/areas`, data);
  return response.data;
};

export const updateCoScholasticArea = async (id: string, data: UpdateCoScholasticAreaDto): Promise<CoScholasticArea> => {
  const response = await apiClient.put(`${BASE_PATH}/coscholastic/areas/${id}`, data);
  return response.data;
};

export const deleteCoScholasticArea = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/coscholastic/areas/${id}`);
};

export const seedCoScholasticAreas = async (): Promise<{ created: number; skipped: number; message: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/coscholastic/areas/seed`);
  return response.data;
};

export const getStudentCoScholastic = async (studentId: string, academicYear?: string, term?: number): Promise<CoScholasticAssessment[]> => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  if (term !== undefined) params.append('term', term.toString());
  const response = await apiClient.get(`${BASE_PATH}/coscholastic/students/${studentId}?${params.toString()}`);
  return response.data;
};

export const getClassCoScholastic = async (classId: string, academicYear?: string, term?: number, sectionId?: string): Promise<ClassCoScholasticGrid> => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  if (term !== undefined) params.append('term', term.toString());
  if (sectionId) params.append('sectionId', sectionId);
  const response = await apiClient.get(`${BASE_PATH}/coscholastic/class/${classId}?${params.toString()}`);
  return response.data;
};

/** Save a flat list of co-scholastic entries (upsert). Used for class bulk entry. */
export const saveCoScholasticAssessments = async (entries: SaveCoScholasticEntryDto[]): Promise<void> => {
  await apiClient.post(`${BASE_PATH}/coscholastic/assessments`, entries);
};

// Export all functions as a single object for convenience
export const examinationApi = {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  getResults,
  getResultById,
  createResult,
  bulkCreateResults,
  getStudentReportCards,
  generateReportCard,
  getExamStats,
  calculateGrade,
  // New
  generateHallTickets,
  getHallTicket,
  getHallTickets,
  promoteExamStructure,
  getCoScholasticAreas,
  createCoScholasticArea,
  updateCoScholasticArea,
  deleteCoScholasticArea,
  seedCoScholasticAreas,
  getStudentCoScholastic,
  getClassCoScholastic,
  saveCoScholasticAssessments,
};

export default examinationApi;
