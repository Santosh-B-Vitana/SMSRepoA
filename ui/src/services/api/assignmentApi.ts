/**
 * Assignment & Grades API — connects to /api/assignments and /api/grades backend endpoints
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// =========== Assignment Types ===========

export interface AssignmentResponse {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  assignedById: string;
  assignedByName: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  maxMarks: number;
  status: string;
  attachmentUrl?: string;
  submissionCount: number;
  gradedCount: number;
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
  assignmentTitle?: string;
  assignmentMaxMarks?: number;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
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

// =========== Staff Grading Roster Types ===========

export interface AssignmentRosterEntry {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  hasSubmitted: boolean;
  /** null | "submitted" | "graded" | "not_submitted" */
  submissionStatus?: string;
  marksObtained?: number;
  feedback?: string;
  submissionDate?: string;
  submissionId?: string;
}

export interface AssignmentRosterResponse {
  assignment: AssignmentResponse;
  students: AssignmentRosterEntry[];
}

export interface StaffMarkPayload {
  studentId: string;
  submitted: boolean;
  marksObtained?: number;
  feedback?: string;
}

// =========== Parent Portal — Child Assignment Types ===========

export interface ChildSubmissionSnapshot {
  id: string;
  submissionDate: string;
  marksObtained?: number;
  status: string;
  feedback?: string;
  gradedDate?: string;
}

export interface ChildAssignmentView {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  assignedDate: string;
  dueDate: string;
  maxMarks: number;
  assignmentStatus: string;
  attachmentUrl?: string;
  isOverdue: boolean;
  /** Null when the student has not yet submitted */
  submission: ChildSubmissionSnapshot | null;
}

export interface ChildAssignmentListResponse {
  data: ChildAssignmentView[];
  total: number;
  page: number;
  pageSize: number;
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
  getAssignments: (classId?: string, sectionId?: string, subjectId?: string, page = 1, pageSize = 50) =>
    apiGet<AssignmentListResponse>('/assignments', { classId, sectionId, subjectId, page, pageSize }),

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

  getStudentSubmissions: (studentId: string, page = 1, pageSize = 50) =>
    apiGet<{ data: SubmissionResponse[]; total: number }>('/assignments/student-submissions', { studentId, page, pageSize }),

  /** Parent portal: all assignments for a child's class with per-student submission status. */
  getAssignmentsForChild: (studentId: string, page = 1, pageSize = 50) =>
    apiGet<ChildAssignmentListResponse>('/assignments/for-child', { studentId, page, pageSize }),

  /** Staff: get full class roster with submission status for an assignment. */
  getAssignmentRoster: (assignmentId: string) =>
    apiGet<AssignmentRosterResponse>(`/assignments/${assignmentId}/roster`),

  /** Staff: record or update a student's submission / marks. */
  staffMark: (assignmentId: string, data: StaffMarkPayload) =>
    apiPost<AssignmentRosterEntry>(`/assignments/${assignmentId}/roster/mark`, data),

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
