/**
 * Assignment & Grades API — connects to /api/assignments and /api/grades backend endpoints
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// =========== Assignment Types ===========

export interface AssignmentResponse {
  id: string;
  schoolId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  assignedById: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  maxMarks: number;
  status: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentListResponse {
  assignments: AssignmentResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/** Only required fields are sent — schoolId and assignedById are injected server-side from JWT */
export interface CreateAssignmentPayload {
  classId: string;
  sectionId?: string;
  subjectId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  maxMarks: number;
  attachmentUrl?: string;
  status?: string;
}

export interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  dueDate?: string;
  maxMarks?: number;
  attachmentUrl?: string;
  status?: string;
}

export interface SubmissionResponse {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionDate: string;
  content: string;
  attachmentUrl?: string;
  marksObtained?: number;
  status: string;
  feedback?: string;
  gradedById?: string;
  gradedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionListResponse {
  submissions: SubmissionResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GradeSubmissionPayload {
  marksObtained: number;
  feedback?: string;
  gradedById: string;
  status?: string;
}

// =========== Grade Category Types ===========

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

// =========== Grade Item Types (exam / test definitions) ===========

export interface GradeItemResponse {
  id: string;
  schoolId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  categoryId: string;
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

/** schoolId injected server-side from JWT */
export interface CreateGradeItemPayload {
  classId: string;
  sectionId?: string;
  subjectId: string;
  categoryId: string;
  name: string;
  maxMarks: number;
  date: string;
  description?: string;
  status?: string;
}

// =========== Student Grade Types (marks per student per grade item) ===========

export interface StudentGradeResponse {
  id: string;
  gradeItemId: string;
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  status: string;
  enteredById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGradeListResponse {
  grades: StudentGradeResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/** enteredById injected server-side from JWT */
export interface CreateStudentGradePayload {
  gradeItemId: string;
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  status?: string;
}

export interface UpdateStudentGradePayload {
  marksObtained?: number;
  grade?: string;
  remarks?: string;
  status?: string;
}

// =========== API Service ===========

export const assignmentApi = {
  // --- Assignments ---
  getAssignments: (classId?: string, subjectId?: string, page = 1, pageSize = 50) =>
    apiGet<AssignmentListResponse>('/assignments', { classId, subjectId, page, pageSize }),

  getAssignment: (id: string) =>
    apiGet<AssignmentResponse>(`/assignments/${id}`),

  createAssignment: (data: CreateAssignmentPayload) =>
    apiPost<AssignmentResponse>('/assignments', data),

  updateAssignment: (id: string, data: UpdateAssignmentPayload) =>
    apiPut<AssignmentResponse>(`/assignments/${id}`, data),

  deleteAssignment: (id: string) =>
    apiDelete<void>(`/assignments/${id}`),

  // --- Submissions ---
  getSubmissions: (assignmentId: string, page = 1, pageSize = 200) =>
    apiGet<SubmissionListResponse>(`/assignments/${assignmentId}/submissions`, { page, pageSize }),

  gradeSubmission: (submissionId: string, data: GradeSubmissionPayload) =>
    apiPut<SubmissionResponse>(`/assignments/submissions/${submissionId}/grade`, data),

  // --- Grade Categories ---
  getGradeCategories: (page = 1, pageSize = 50) =>
    apiGet<GradeCategoryListResponse>('/grades/categories', { page, pageSize }),

  // --- Grade Items (test / exam definitions) ---
  getGradeItems: (classId?: string, subjectId?: string, page = 1, pageSize = 100) =>
    apiGet<GradeItemListResponse>('/grades/items', { classId, subjectId, page, pageSize }),

  createGradeItem: (data: CreateGradeItemPayload) =>
    apiPost<GradeItemResponse>('/grades/items', data),

  // --- Student Grades (marks) ---
  getStudentGrades: (gradeItemId?: string, studentId?: string, page = 1, pageSize = 300) =>
    apiGet<StudentGradeListResponse>('/grades/student-grades', { gradeItemId, studentId, page, pageSize }),

  createStudentGrade: (data: CreateStudentGradePayload) =>
    apiPost<StudentGradeResponse>('/grades/student-grades', data),

  updateStudentGrade: (id: string, data: UpdateStudentGradePayload) =>
    apiPut<StudentGradeResponse>(`/grades/student-grades/${id}`, data),
};

export default assignmentApi;
