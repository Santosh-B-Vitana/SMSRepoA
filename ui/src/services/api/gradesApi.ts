import apiClient from './apiClient';

// ========== TYPES ==========

export interface GradeCategoryResponse {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  weightage: number;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeCategoryListResponse {
  categories: GradeCategoryResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GradeItemResponse {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  sectionId?: string;
  subjectId: string;
  subjectName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  maxMarks: number;
  date: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeItemListResponse {
  items: GradeItemResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentGradeResponse {
  id: string;
  gradeItemId: string;
  gradeItemName?: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  marksObtained: number;
  maxMarks?: number;
  grade?: string;
  remarks?: string;
  status: string;
  enteredById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGradeListResponse {
  studentGrades: StudentGradeResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStudentGradeRequest {
  gradeItemId: string;
  studentId: string;
  marksObtained: number;
  remarks?: string;
  status: string;
}

export interface BulkGradeEntry {
  studentId: string;
  marksObtained: number;
  remarks?: string;
}

export interface BulkCreateStudentGradeRequest {
  gradeItemId: string;
  grades: BulkGradeEntry[];
}

export interface BulkCreateStudentGradeResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface CCEAssessmentResponse {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  sectionId?: string;
  academicYear: string;
  term: string;
  skillArea: string;
  grade: string;
  remarks?: string;
  assessedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CCEAssessmentListResponse {
  assessments: CCEAssessmentResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClassGradeSummary {
  classId: string;
  className: string;
  studentCount: number;
  averageMarks: number;
  passRate: number;
}

export interface GradeStatsResponse {
  schoolId: string;
  totalGradeItems: number;
  totalStudentGrades: number;
  averageMarks: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  byClass: ClassGradeSummary[];
}

export interface CreateGradeCategoryRequest {
  name: string;
  code?: string;
  weightage: number;
  description?: string;
  status: string;
}

export interface CreateGradeItemRequest {
  classId: string;
  subjectId: string;
  categoryId: string;
  name: string;
  maxMarks: number;
  date: string;
  status: string;
  description?: string;
}

export interface UpdateStudentGradeRequest {
  marksObtained?: number;
  remarks?: string;
  status?: string;
}

export interface CreateCCEAssessmentRequest {
  studentId: string;
  classId: string;
  sectionId?: string;
  academicYear: string;
  term: string;
  skillArea: string;
  grade: string;
  remarks?: string;
}

// ========== API FUNCTIONS ==========

export const gradesApi = {
  // Stats
  getStats: () =>
    apiClient.get<GradeStatsResponse>('/grades/stats').then(r => r.data),

  // Categories
  getCategories: (page = 1, pageSize = 50) =>
    apiClient.get<GradeCategoryListResponse>('/grades/categories', { params: { page, pageSize } }).then(r => r.data),

  createCategory: (data: CreateGradeCategoryRequest) =>
    apiClient.post<GradeCategoryResponse>('/grades/categories', data).then(r => r.data),

  deleteCategory: (id: string) =>
    apiClient.delete(`/grades/categories/${id}`),

  // Grade Items
  getGradeItems: (classId?: string, subjectId?: string, page = 1, pageSize = 50) =>
    apiClient.get<GradeItemListResponse>('/grades/items', { params: { classId, subjectId, page, pageSize } }).then(r => r.data),

  createGradeItem: (data: CreateGradeItemRequest) =>
    apiClient.post<GradeItemResponse>('/grades/items', data).then(r => r.data),

  deleteGradeItem: (id: string) =>
    apiClient.delete(`/grades/items/${id}`),

  // Student Grades
  getStudentGrades: (gradeItemId?: string, studentId?: string, page = 1, pageSize = 50) =>
    apiClient.get<StudentGradeListResponse>('/grades/student-grades', { params: { gradeItemId, studentId, page, pageSize } }).then(r => r.data),

  createStudentGrade: (data: CreateStudentGradeRequest) =>
    apiClient.post<StudentGradeResponse>('/grades/student-grades', data).then(r => r.data),

  updateStudentGrade: (id: string, data: UpdateStudentGradeRequest) =>
    apiClient.put<StudentGradeResponse>(`/grades/student-grades/${id}`, data).then(r => r.data),

  deleteStudentGrade: (id: string) =>
    apiClient.delete(`/grades/student-grades/${id}`),

  bulkCreateStudentGrades: (data: BulkCreateStudentGradeRequest) =>
    apiClient.post<BulkCreateStudentGradeResult>('/grades/student-grades/bulk', data).then(r => r.data),

  // CCE Assessments
  getCCEAssessments: (studentId?: string, academicYear?: string, page = 1, pageSize = 50) =>
    apiClient.get<CCEAssessmentListResponse>('/grades/cce', { params: { studentId, academicYear, page, pageSize } }).then(r => r.data),

  createCCEAssessment: (data: CreateCCEAssessmentRequest) =>
    apiClient.post<CCEAssessmentResponse>('/grades/cce', data).then(r => r.data),

  deleteCCEAssessment: (id: string) =>
    apiClient.delete(`/grades/cce/${id}`),
};
