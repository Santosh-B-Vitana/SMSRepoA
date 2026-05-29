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
  staffId: string;
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
}

export interface LessonPlanListResponse {
  plans: LessonPlan[];
  total: number;
}

export interface SyllabusCoverageReport {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  totalUnits: number;
  completedUnits: number;
  totalTopics: number;
  completedTopics: number;
  overallCompletionPercentage: number;
  units: SyllabusUnit[];
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

  getLessonPlans(classId?: string, subjectId?: string, teacherId?: string, startDate?: string, endDate?: string): Promise<LessonPlanListResponse> {
    const params: Record<string, unknown> = {};
    if (classId) params.classId = classId;
    if (subjectId) params.subjectId = subjectId;
    if (teacherId) params.teacherId = teacherId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiGet<LessonPlanListResponse>(`${BASE}/lesson-plans`, params);
  },

  createLessonPlan(data: CreateLessonPlanDto): Promise<LessonPlan> {
    return apiPost<LessonPlan>(`${BASE}/lesson-plans`, data);
  },

  updateLessonPlan(id: string, data: Partial<CreateLessonPlanDto>): Promise<LessonPlan> {
    return apiPut<LessonPlan>(`${BASE}/lesson-plans/${id}`, data);
  },

  deleteLessonPlan(id: string): Promise<void> {
    return apiDelete<void>(`${BASE}/lesson-plans/${id}`);
  },

  getCoverage(classId?: string, subjectId?: string, academicYear?: string): Promise<SyllabusCoverageReport[]> {
    const params: Record<string, unknown> = {};
    if (classId) params.classId = classId;
    if (subjectId) params.subjectId = subjectId;
    if (academicYear) params.academicYear = academicYear;
    return apiGet<SyllabusCoverageReport[]>(`${BASE}/coverage`, params);
  },
};
