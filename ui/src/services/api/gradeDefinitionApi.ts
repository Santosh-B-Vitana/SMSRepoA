import apiClient from './apiClient';

// ========== TYPE DEFINITIONS ==========

export interface GradeRangeDto {
  id: string;
  grade: string;
  minMarks: number;
  maxMarks: number;
  gradePoint: number;
  displayOrder: number;
  description?: string;
}

export interface CreateGradeRangeRequest {
  grade: string;
  minMarks: number;
  maxMarks: number;
  gradePoint: number;
  displayOrder?: number;
  description?: string;
}

export interface UpdateGradeRangeRequest {
  grade?: string;
  minMarks?: number;
  maxMarks?: number;
  gradePoint?: number;
  displayOrder?: number;
  description?: string;
}

export interface GradeDefinitionBasic {
  id: string;
  name: string;
  code?: string;
  isDefault: boolean;
  status: string;
}

export interface GradeDefinitionFull {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  description?: string;
  isDefault: boolean;
  status: string;
  gradeRanges: GradeRangeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeDefinitionRequest {
  schoolId: string;
  name: string;
  code?: string;
  description?: string;
  isDefault?: boolean;
  status?: string;
  gradeRanges: CreateGradeRangeRequest[];
}

export interface UpdateGradeDefinitionRequest {
  name?: string;
  code?: string;
  description?: string;
  isDefault?: boolean;
  status?: string;
}

export interface GradeDefinitionResponse {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  description?: string;
  isDefault: boolean;
  status: string;
  gradeRanges: GradeRangeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GradeDefinitionListResponse {
  definitions: GradeDefinitionResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== EXAM GRADE CONFIGURATION DTOs ==========

export interface CreateExamGradeConfigurationRequest {
  schoolId: string;
  examId: string;
  gradeDefinitionId: string;
  autoCalculateGrades?: boolean;
}

export interface UpdateExamGradeConfigurationRequest {
  gradeDefinitionId?: string;
  autoCalculateGrades?: boolean;
}

export interface ExamGradeConfigurationResponse {
  id: string;
  examId: string;
  examName: string;
  gradeDefinitionId: string;
  gradeDefinitionName: string;
  autoCalculateGrades: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== GRADE CALCULATION DTOs ==========

export interface GradeCalculationRequest {
  gradeDefinitionId: string;
  percentage: number;
}

export interface GradeCalculationResponse {
  grade: string;
  gradePoint: number;
  minMarks: number;
  maxMarks: number;
  description?: string;
}

// ========== API METHODS ==========

export const gradeDefinitionApi = {
  // Grade Definitions
  getGradeDefinitions: (page = 1, pageSize = 10) =>
    apiClient.get<GradeDefinitionListResponse>('/gradedefinitions', {
      params: { page, pageSize }
    }),

  getGradeDefinitionById: (id: string) =>
    apiClient.get<GradeDefinitionResponse>(`/gradedefinitions/${id}`),

  getDefaultGradeDefinition: () =>
    apiClient.get<GradeDefinitionResponse>('/gradedefinitions/default/current'),

  createGradeDefinition: (data: CreateGradeDefinitionRequest) =>
    apiClient.post<GradeDefinitionResponse>('/gradedefinitions', data),

  updateGradeDefinition: (id: string, data: UpdateGradeDefinitionRequest) =>
    apiClient.put<GradeDefinitionResponse>(`/gradedefinitions/${id}`, data),

  deleteGradeDefinition: (id: string) =>
    apiClient.delete(`/gradedefinitions/${id}`),

  setAsDefault: (id: string) =>
    apiClient.put<GradeDefinitionResponse>(`/gradedefinitions/${id}/set-default`, {}),

  // Grade Ranges
  addGradeRange: (gradeDefinitionId: string, data: CreateGradeRangeRequest) =>
    apiClient.post<GradeRangeDto>(
      `/gradedefinitions/${gradeDefinitionId}/ranges`,
      data
    ),

  updateGradeRange: (rangeId: string, data: UpdateGradeRangeRequest) =>
    apiClient.put<GradeRangeDto>(`/gradedefinitions/ranges/${rangeId}`, data),

  deleteGradeRange: (rangeId: string) =>
    apiClient.delete(`/gradedefinitions/ranges/${rangeId}`),

  // Exam Grade Configuration
  configureExamGrading: (data: CreateExamGradeConfigurationRequest) =>
    apiClient.post<ExamGradeConfigurationResponse>(
      '/gradedefinitions/exam-configuration',
      data
    ),

  getExamGradeConfig: (examId: string) =>
    apiClient.get<ExamGradeConfigurationResponse>(
      `/gradedefinitions/exam/${examId}/configuration`
    ),

  updateExamGradeConfig: (examId: string, data: UpdateExamGradeConfigurationRequest) =>
    apiClient.put<ExamGradeConfigurationResponse>(
      `/gradedefinitions/exam/${examId}/configuration`,
      data
    ),

  removeExamGradeConfig: (examId: string) =>
    apiClient.delete(`/gradedefinitions/exam/${examId}/configuration`),

  // Grade Calculation
  calculateGrade: (data: GradeCalculationRequest) =>
    apiClient.post<GradeCalculationResponse>('/gradedefinitions/calculate', data),
};

export default gradeDefinitionApi;
