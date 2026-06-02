import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

const BASE = '/syllabus';

// ─── Types (field names match backend DTOs exactly) ───────────────────────────

export interface SyllabusTopic {
  id: string;
  unitId: string;
  topicNumber: number;
  title: string;
  description?: string;
  durationMinutes?: number;
  resourceReferences?: string;
  status: string; // pending | in_progress | completed
  completedDate?: string;
  completedByStaffName?: string;
  completionRemarks?: string;
}

export interface SyllabusUnit {
  id: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  academicYear: string;
  unitNumber: number;
  title: string;
  description?: string;
  plannedHours?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string; // pending | in_progress | completed
  totalTopics: number;
  completedTopics: number;
  completionPercentage: number;
  topics: SyllabusTopic[];
}

export interface LessonPlan {
  id: string;
  staffId?: string;
  staffName?: string;
  classId: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  subjectId: string;
  subjectName?: string;
  topicId?: string;
  topicTitle?: string;
  date: string;
  periodNumber?: number;
  title: string;
  learningObjectives?: string;
  teachingMethods?: string;
  resources?: string;
  classActivities?: string;
  homework?: string;
  notes?: string;
  status: string; // draft | submitted | approved | rejected
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface LessonPlanListResponse {
  plans: LessonPlan[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyllabusCoverageReport {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  pendingUnits: number;
  totalTopics: number;
  completedTopics: number;
  units: SyllabusUnit[];
}

/** Returned by GET /syllabus/my-assignments */
export interface TeacherSubjectAssignment {
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
}

/** Returned by GET /syllabus/section-teachers — for admin to see per-section teacher coverage */
export interface SectionTeacherInfo {
  sectionId?: string;
  sectionName?: string;
  staffId?: string;
  staffName?: string;
}

// ─── Request DTOs (match backend CreateXxxRequest field names) ────────────────

export interface CreateSyllabusUnitDto {
  classId: string;
  subjectId: string;
  academicYear: string;
  unitNumber: number;
  title: string;
  description?: string;
  plannedHours?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface CreateTopicDto {
  unitId: string;
  topicNumber: number;
  title: string;
  description?: string;
  durationMinutes?: number;
  resourceReferences?: string;
}

export interface MarkTopicCompleteDto {
  completedDate: string;
  remarks?: string;
}

export interface CreateLessonPlanDto {
  classId: string;
  sectionId?: string;
  subjectId: string;
  topicId?: string;
  date: string;
  periodNumber?: number;
  title: string;
  learningObjectives?: string;
  teachingMethods?: string;
  resources?: string;
  classActivities?: string;
  homework?: string;
  notes?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const syllabusApi = {
  getUnits(classId: string, subjectId: string, academicYear: string, includeTopics = true): Promise<SyllabusUnit[]> {
    return apiGet<SyllabusUnit[]>(`${BASE}/units`, { classId, subjectId, academicYear, includeTopics });
  },

  createUnit(data: CreateSyllabusUnitDto): Promise<SyllabusUnit> {
    return apiPost<SyllabusUnit>(`${BASE}/units`, data);
  },

  updateUnit(id: string, data: Partial<CreateSyllabusUnitDto>): Promise<SyllabusUnit> {
    return apiPut<SyllabusUnit>(`${BASE}/units/${id}`, data);
  },

  deleteUnit(id: string): Promise<void> {
    return apiDelete<void>(`${BASE}/units/${id}`);
  },

  getTopics(unitId: string): Promise<SyllabusTopic[]> {
    return apiGet<SyllabusTopic[]>(`${BASE}/units/${unitId}/topics`);
  },

  createTopic(data: CreateTopicDto): Promise<SyllabusTopic> {
    return apiPost<SyllabusTopic>(`${BASE}/topics`, data);
  },

  markTopicComplete(id: string, data: MarkTopicCompleteDto): Promise<SyllabusTopic> {
    return apiPost<SyllabusTopic>(`${BASE}/topics/${id}/complete`, data);
  },

  getLessonPlans(
    classId?: string,
    subjectId?: string,
    staffId?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
    page = 1,
    pageSize = 50,
    sectionId?: string,
  ): Promise<LessonPlanListResponse> {
    const params: Record<string, unknown> = { page, pageSize };
    if (classId)   params.classId   = classId;
    if (subjectId) params.subjectId = subjectId;
    if (sectionId) params.sectionId = sectionId;
    if (staffId)   params.staffId   = staffId;
    if (status)    params.status    = status;
    if (fromDate)  params.fromDate  = fromDate;
    if (toDate)    params.toDate    = toDate;
    return apiGet<LessonPlanListResponse>(`${BASE}/lesson-plans`, params);
  },

  createLessonPlan(data: CreateLessonPlanDto): Promise<LessonPlan> {
    return apiPost<LessonPlan>(`${BASE}/lesson-plans`, data);
  },

  updateLessonPlan(id: string, data: Partial<CreateLessonPlanDto>): Promise<LessonPlan> {
    return apiPut<LessonPlan>(`${BASE}/lesson-plans/${id}`, data);
  },

  /** Teacher submits a draft lesson plan for admin/principal review */
  submitLessonPlan(id: string): Promise<LessonPlan> {
    return apiPost<LessonPlan>(`${BASE}/lesson-plans/${id}/submit`, {});
  },

  /** Admin/Principal approves or rejects a submitted lesson plan */
  approveLessonPlan(id: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<LessonPlan> {
    return apiPost<LessonPlan>(`${BASE}/lesson-plans/${id}/approve`, { action, rejectionReason });
  },

  deleteLessonPlan(id: string): Promise<void> {
    return apiDelete<void>(`${BASE}/lesson-plans/${id}`);
  },

  /** Get syllabus coverage report for a class/subject/year */
  getCoverage(classId: string, subjectId: string, academicYear: string): Promise<SyllabusCoverageReport> {
    return apiGet<SyllabusCoverageReport>(`${BASE}/coverage`, { classId, subjectId, academicYear });
  },

  /** Returns the class+subject pairs assigned to the currently logged-in teacher */
  getMyAssignments(): Promise<TeacherSubjectAssignment[]> {
    return apiGet<TeacherSubjectAssignment[]>(`${BASE}/my-assignments`);
  },

  /** Admin: returns which teacher covers which section for a given class+subject */
  getSectionTeachers(classId: string, subjectId: string): Promise<SectionTeacherInfo[]> {
    return apiGet<SectionTeacherInfo[]>(`${BASE}/section-teachers`, { classId, subjectId });
  },
};

