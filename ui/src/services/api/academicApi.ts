/**
 * Academic Setup API — connects to /api/academics backend endpoints
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/apiClient';

// =========== Classes ===========
export interface ClassBasic {
  id: string;
  name: string;
  standard: string;
  section: string;
  academicYear: string;
  totalStudents: number;
  classTeacher?: string;
  classTeacherId?: string;
  board?: string;
  boardConfigurationId?: string;
  boardName?: string;
}

export interface ClassResponse extends ClassBasic {
  school?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ClassListResponse {
  classes: ClassResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateClassRequest {
  name?: string;
  standard: string;
  section: string;
  academicYear: string;
  classTeacherId?: string;
  classTeacher?: string;
  schoolId?: string;
  board?: string;
  boardConfigurationId?: string;
}

// =========== Sections ===========
export interface SectionBasic {
  id: string;
  name: string;
  classId: string;
  className: string;
  capacity: number;
  totalStudents: number;
  classTeacherId?: string;
  classTeacherName?: string;
}

export interface SectionResponse extends SectionBasic {
  createdAt: string;
  updatedAt: string;
}

export interface SectionListResponse {
  sections: SectionResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSectionRequest {
  name: string;
  classId: string;
  capacity?: number;
  schoolId?: string;
  classTeacherId?: string;
}

// =========== My Class Assignments (Teacher) ===========
export interface MyClassAssignment {
  assignmentId: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId?: string;
  subjectName?: string;
  isClassTeacher: boolean;
  academicYear: string;
  status: string;
  studentCount?: number;
}

// =========== Subjects ===========
export interface SubjectBasic {
  id: string;
  name: string;
  code: string;
  board?: string;
  type?: string;
}

export interface SubjectResponse extends SubjectBasic {
  description?: string;
  creditHours?: number;
  syllabus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectListResponse {
  subjects: SubjectResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  description?: string;
  board?: string;
  type?: string;
  creditHours?: number;
  schoolId?: string;
}

// =========== Academic Years ===========
export interface AcademicYearBasic {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AcademicYearResponse extends AcademicYearBasic {
  isCurrent?: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYearListResponse {
  academicYears: AcademicYearResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAcademicYearRequest {
  name: string;
  startDate: string;
  endDate: string;
  schoolId?: string;
}

// =========== Class-Subject Assignment ===========
export interface ClassSubjectResponse {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
}

export interface AssignSubjectRequest {
  classId: string;
  subjectId: string;
  teacherId?: string;
  schoolId?: string;
}

// =========== Teacher Assignments ===========
export interface TeacherAssignmentResponse {
  id: string;
  schoolId: string;
  staffId: string;
  staffName: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId?: string;
  subjectName?: string;
  isClassTeacher: boolean;
  academicYear: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignmentListResponse {
  assignments: TeacherAssignmentResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssignTeacherRequest {
  staffId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
  isClassTeacher: boolean;
  academicYear: string;
  schoolId?: string;
}

// =========== API Service ===========
export const academicApi = {
  // ========== Classes ==========
  listClasses: (page = 1, pageSize = 50) =>
    apiGet<ClassListResponse>('/academics/classes', { page, pageSize }),

  getClass: (id: string) =>
    apiGet<ClassResponse>(`/academics/classes/${id}`),

  createClass: (data: CreateClassRequest) =>
    apiPost<ClassResponse>('/academics/classes', data),

  updateClass: (id: string, data: CreateClassRequest) =>
    apiPut<ClassResponse>(`/academics/classes/${id}`, data),

  deleteClass: (id: string) =>
    apiDelete<void>(`/academics/classes/${id}`),

  // ========== Sections ==========
  listSections: (classId?: string, page = 1, pageSize = 50) =>
    apiGet<SectionListResponse>('/academics/sections', {
      classId,
      page,
      pageSize,
    }),

  getSection: (id: string) =>
    apiGet<SectionResponse>(`/academics/sections/${id}`),

  createSection: (data: CreateSectionRequest) =>
    apiPost<SectionResponse>('/academics/sections', data),

  updateSection: (id: string, data: CreateSectionRequest) =>
    apiPut<SectionResponse>(`/academics/sections/${id}`, data),

  deleteSection: (id: string) =>
    apiDelete<void>(`/academics/sections/${id}`),

  // ========== Subjects ==========
  listSubjects: (page = 1, pageSize = 50) =>
    apiGet<SubjectListResponse>('/academics/subjects', { page, pageSize }),

  getSubject: (id: string) =>
    apiGet<SubjectResponse>(`/academics/subjects/${id}`),

  createSubject: (data: CreateSubjectRequest) =>
    apiPost<SubjectResponse>('/academics/subjects', data),

  updateSubject: (id: string, data: CreateSubjectRequest) =>
    apiPut<SubjectResponse>(`/academics/subjects/${id}`, data),

  deleteSubject: (id: string) =>
    apiDelete<void>(`/academics/subjects/${id}`),

  // ========== Academic Years ==========
  listAcademicYears: (page = 1, pageSize = 50) =>
    apiGet<AcademicYearListResponse>('/academics/academic-years', { page, pageSize }),

  getAcademicYear: (id: string) =>
    apiGet<AcademicYearResponse>(`/academics/academic-years/${id}`),

  createAcademicYear: (data: CreateAcademicYearRequest) =>
    apiPost<AcademicYearResponse>('/academics/academic-years', data),

  updateAcademicYear: (id: string, data: CreateAcademicYearRequest) =>
    apiPut<AcademicYearResponse>(`/academics/academic-years/${id}`, data),

  setCurrentAcademicYear: (id: string) =>
    apiPatch<AcademicYearResponse>(`/academics/academic-years/${id}/set-current`, {}),

  deleteAcademicYear: (id: string) =>
    apiDelete<void>(`/academics/academic-years/${id}`),

  // ========== Class-Subject Assignment ==========
  getClassSubjects: (classId: string) =>
    apiGet<ClassSubjectResponse[]>(`/academics/classes/${classId}/subjects`),

  assignSubjectToClass: (data: AssignSubjectRequest) =>
    apiPost<ClassSubjectResponse>('/academics/class-subjects', data),

  removeSubjectFromClass: (id: string) =>
    apiDelete<void>(`/academics/class-subjects/${id}`),

  // ========== Teacher / Staff Assignments (admin) ==========
  getTeacherAssignments: (params: { classId?: string; sectionId?: string; staffId?: string; page?: number; pageSize?: number } = {}) =>
    apiGet<TeacherAssignmentListResponse>('/academics/teacher-assignments', params as Record<string, unknown>),

  assignTeacher: (data: AssignTeacherRequest) =>
    apiPost<TeacherAssignmentResponse>('/academics/teacher-assignments', data),

  removeTeacherAssignment: (id: string) =>
    apiDelete<void>(`/academics/teacher-assignments/${id}`),

  // ========== My Class Assignments (for logged-in teacher) ==========
  getMyClassAssignments: () =>
    apiGet<MyClassAssignment[]>('/academics/my-class-assignments'),

  // ========== All assignments for a specific staff (admin view) ==========
  getTeacherAssignmentsForStaff: (staffId: string) =>
    apiGet<TeacherAssignmentListResponse>('/academics/teacher-assignments', { staffId, pageSize: 100 }),
};
