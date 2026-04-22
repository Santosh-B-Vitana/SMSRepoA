import apiClient from './api/apiClient';
import {
  GradeDefinitionFull,
  GradeDefinitionListResponse,
  GradeDefinitionResponse,
  CreateGradeDefinitionRequest,
  UpdateGradeDefinitionRequest,
  GradeRangeDto,
  CreateGradeRangeRequest,
  UpdateGradeRangeRequest,
  ExamGradeConfigurationResponse,
  CreateExamGradeConfigurationRequest,
  UpdateExamGradeConfigurationRequest,
  GradeCalculationResponse,
} from './api/gradeDefinitionApi';

interface GradeDefinition {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  description?: string;
  isDefault: boolean;
  status: string;
  gradeRanges: GradeRangeDto[];
}

interface ExamGradeConfig {
  id: string;
  examId: string;
  gradeDefinitionId: string;
  autoCalculateGrades: boolean;
}

class GradeDefinitionService {
  // ========== GRADE DEFINITIONS ==========

  async getGradeDefinitions(page = 1, pageSize = 10): Promise<GradeDefinitionListResponse> {
    try {
      const response = await apiClient.get<GradeDefinitionListResponse>('/gradedefinitions', {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch grade definitions:', error);
      throw error;
    }
  }

  async getGradeDefinitionById(id: string): Promise<GradeDefinitionResponse | null> {
    try {
      const response = await apiClient.get<GradeDefinitionResponse>(
        `/gradedefinitions/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch grade definition ${id}:`, error);
      throw error;
    }
  }

  async getDefaultGradeDefinition(): Promise<GradeDefinitionResponse | null> {
    try {
      const response = await apiClient.get<GradeDefinitionResponse>(
        '/gradedefinitions/default/current'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch default grade definition:', error);
      return null;
    }
  }

  async createGradeDefinition(data: CreateGradeDefinitionRequest): Promise<GradeDefinitionResponse> {
    try {
      const response = await apiClient.post<GradeDefinitionResponse>(
        '/gradedefinitions',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create grade definition:', error);
      throw error;
    }
  }

  async updateGradeDefinition(
    id: string,
    data: UpdateGradeDefinitionRequest
  ): Promise<GradeDefinitionResponse | null> {
    try {
      const response = await apiClient.put<GradeDefinitionResponse>(
        `/gradedefinitions/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update grade definition ${id}:`, error);
      throw error;
    }
  }

  async deleteGradeDefinition(id: string): Promise<void> {
    try {
      await apiClient.delete(`/gradedefinitions/${id}`);
    } catch (error) {
      console.error(`Failed to delete grade definition ${id}:`, error);
      throw error;
    }
  }

  async setAsDefault(id: string): Promise<GradeDefinitionResponse | null> {
    try {
      const response = await apiClient.put<GradeDefinitionResponse>(
        `/gradedefinitions/${id}/set-default`,
        {}
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to set grade definition ${id} as default:`, error);
      throw error;
    }
  }

  // ========== GRADE RANGES ==========

  async addGradeRange(
    gradeDefinitionId: string,
    data: CreateGradeRangeRequest
  ): Promise<GradeRangeDto> {
    try {
      const response = await apiClient.post<GradeRangeDto>(
        `/gradedefinitions/${gradeDefinitionId}/ranges`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to add grade range:', error);
      throw error;
    }
  }

  async updateGradeRange(
    rangeId: string,
    data: UpdateGradeRangeRequest
  ): Promise<GradeRangeDto | null> {
    try {
      const response = await apiClient.put<GradeRangeDto>(
        `/gradedefinitions/ranges/${rangeId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update grade range ${rangeId}:`, error);
      throw error;
    }
  }

  async deleteGradeRange(rangeId: string): Promise<void> {
    try {
      await apiClient.delete(`/gradedefinitions/ranges/${rangeId}`);
    } catch (error) {
      console.error(`Failed to delete grade range ${rangeId}:`, error);
      throw error;
    }
  }

  // ========== EXAM GRADE CONFIGURATION ==========

  async configureExamGrading(
    data: CreateExamGradeConfigurationRequest
  ): Promise<ExamGradeConfigurationResponse> {
    try {
      const response = await apiClient.post<ExamGradeConfigurationResponse>(
        '/gradedefinitions/exam-configuration',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to configure exam grading:', error);
      throw error;
    }
  }

  async getExamGradeConfig(examId: string): Promise<ExamGradeConfigurationResponse | null> {
    try {
      const response = await apiClient.get<ExamGradeConfigurationResponse>(
        `/gradedefinitions/exam/${examId}/configuration`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch exam grade configuration for ${examId}:`, error);
      return null;
    }
  }

  async updateExamGradeConfig(
    examId: string,
    data: UpdateExamGradeConfigurationRequest
  ): Promise<ExamGradeConfigurationResponse | null> {
    try {
      const response = await apiClient.put<ExamGradeConfigurationResponse>(
        `/gradedefinitions/exam/${examId}/configuration`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update exam grade configuration for ${examId}:`, error);
      throw error;
    }
  }

  async removeExamGradeConfig(examId: string): Promise<void> {
    try {
      await apiClient.delete(`/gradedefinitions/exam/${examId}/configuration`);
    } catch (error) {
      console.error(`Failed to remove exam grade configuration for ${examId}:`, error);
      throw error;
    }
  }

  // ========== GRADE CALCULATION ==========

  async calculateGrade(
    gradeDefinitionId: string,
    percentage: number
  ): Promise<GradeCalculationResponse> {
    try {
      const response = await apiClient.post<GradeCalculationResponse>(
        '/gradedefinitions/calculate',
        { gradeDefinitionId, percentage }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to calculate grade:', error);
      throw error;
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Validate grade ranges (no overlaps, proper sequence)
   */
  validateGradeRanges(ranges: CreateGradeRangeRequest[]): { valid: boolean; error?: string } {
    if (ranges.length === 0) {
      return { valid: false, error: 'At least one grade range is required' };
    }

    const sorted = [...ranges].sort((a, b) => a.minMarks - b.minMarks);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (current.minMarks < 0 || current.maxMarks > 100) {
        return {
          valid: false,
          error: `Grade range must be between 0 and 100. Found: ${current.minMarks}-${current.maxMarks}`,
        };
      }

      if (current.minMarks > current.maxMarks) {
        return {
          valid: false,
          error: `Invalid range: min (${current.minMarks}) cannot be greater than max (${current.maxMarks})`,
        };
      }

      if (i > 0) {
        const previous = sorted[i - 1];
        if (current.minMarks <= previous.maxMarks) {
          return {
            valid: false,
            error: `Grade ranges overlap: ${previous.grade} (${previous.minMarks}-${previous.maxMarks}) and ${current.grade} (${current.minMarks}-${current.maxMarks})`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Format grade for display
   */
  formatGrade(gradeRange: GradeRangeDto): string {
    return `${gradeRange.grade} (${gradeRange.minMarks}-${gradeRange.maxMarks}%)`;
  }

  /**
   * Get grade color for display (useful for UI)
   */
  getGradeColor(grade: string): string {
    const colorMap: { [key: string]: string } = {
      'A+': '#00C853',
      'A': '#1DE9B6',
      'B+': '#4FC3F7',
      'B': '#42A5F5',
      'C+': '#FFD54F',
      'C': '#FFC176',
      'D': '#FF9800',
      'F': '#F44336',
    };
    return colorMap[grade] || '#999999';
  }

  /**
   * Pre-populate standard grading scales including Indian standards (CBSE, State, ICSE)
   */
  getStandardGradingScales() {
    return {
      // Indian Standards - Default
      cbse: {
        name: 'CBSE (Central Board)',
        description: 'Central Board of Secondary Education grading system',
        code: 'CBSE',
        ranges: [
          { grade: 'A+', minMarks: 91, maxMarks: 100, gradePoint: 10, displayOrder: 1, description: 'Outstanding' },
          { grade: 'A', minMarks: 81, maxMarks: 90, gradePoint: 9, displayOrder: 2, description: 'Excellent' },
          { grade: 'B+', minMarks: 71, maxMarks: 80, gradePoint: 8, displayOrder: 3, description: 'Very Good' },
          { grade: 'B', minMarks: 61, maxMarks: 70, gradePoint: 7, displayOrder: 4, description: 'Good' },
          { grade: 'C+', minMarks: 51, maxMarks: 60, gradePoint: 6, displayOrder: 5, description: 'Satisfactory' },
          { grade: 'C', minMarks: 41, maxMarks: 50, gradePoint: 5, displayOrder: 6, description: 'Fair' },
          { grade: 'D', minMarks: 33, maxMarks: 40, gradePoint: 4, displayOrder: 7, description: 'Needs Improvement' },
          { grade: 'E', minMarks: 0, maxMarks: 32, gradePoint: 0, displayOrder: 8, description: 'Not Satisfactory' },
        ],
      },
      state: {
        name: 'State Board (General)',
        description: 'State Board of Education grading system',
        code: 'STATE',
        ranges: [
          { grade: 'A', minMarks: 80, maxMarks: 100, gradePoint: 9, displayOrder: 1, description: 'Excellent' },
          { grade: 'B', minMarks: 70, maxMarks: 79, gradePoint: 7, displayOrder: 2, description: 'Good' },
          { grade: 'C', minMarks: 60, maxMarks: 69, gradePoint: 5, displayOrder: 3, description: 'Satisfactory' },
          { grade: 'D', minMarks: 50, maxMarks: 59, gradePoint: 3, displayOrder: 4, description: 'Fair' },
          { grade: 'E', minMarks: 35, maxMarks: 49, gradePoint: 1, displayOrder: 5, description: 'Pass' },
          { grade: 'F', minMarks: 0, maxMarks: 34, gradePoint: 0, displayOrder: 6, description: 'Fail' },
        ],
      },
      icse: {
        name: 'ICSE (Indian Certificate)',
        description: 'Indian Certificate of Secondary Education grading system',
        code: 'ICSE',
        ranges: [
          { grade: 'A*', minMarks: 90, maxMarks: 100, gradePoint: 10, displayOrder: 1, description: 'Outstanding' },
          { grade: 'A', minMarks: 80, maxMarks: 89, gradePoint: 9, displayOrder: 2, description: 'Excellent' },
          { grade: 'B', minMarks: 70, maxMarks: 79, gradePoint: 8, displayOrder: 3, description: 'Very Good' },
          { grade: 'C', minMarks: 60, maxMarks: 69, gradePoint: 7, displayOrder: 4, description: 'Good' },
          { grade: 'D', minMarks: 50, maxMarks: 59, gradePoint: 6, displayOrder: 5, description: 'Satisfactory' },
          { grade: 'E', minMarks: 40, maxMarks: 49, gradePoint: 5, displayOrder: 6, description: 'Fair' },
          { grade: 'F', minMarks: 0, maxMarks: 39, gradePoint: 0, displayOrder: 7, description: 'Fail' },
        ],
      },
      // International Standards
      standard: [
        { grade: 'A+', minMarks: 90, maxMarks: 100, gradePoint: 4.0, displayOrder: 1 },
        { grade: 'A', minMarks: 80, maxMarks: 89, gradePoint: 3.8, displayOrder: 2 },
        { grade: 'B+', minMarks: 70, maxMarks: 79, gradePoint: 3.5, displayOrder: 3 },
        { grade: 'B', minMarks: 60, maxMarks: 69, gradePoint: 3.0, displayOrder: 4 },
        { grade: 'C+', minMarks: 50, maxMarks: 59, gradePoint: 2.5, displayOrder: 5 },
        { grade: 'C', minMarks: 40, maxMarks: 49, gradePoint: 2.0, displayOrder: 6 },
        { grade: 'D', minMarks: 33, maxMarks: 39, gradePoint: 1.0, displayOrder: 7 },
        { grade: 'F', minMarks: 0, maxMarks: 32, gradePoint: 0.0, displayOrder: 8 },
      ],
      simple: [
        { grade: 'A', minMarks: 75, maxMarks: 100, gradePoint: 4.0, displayOrder: 1 },
        { grade: 'B', minMarks: 60, maxMarks: 74, gradePoint: 3.0, displayOrder: 2 },
        { grade: 'C', minMarks: 45, maxMarks: 59, gradePoint: 2.0, displayOrder: 3 },
        { grade: 'D', minMarks: 30, maxMarks: 44, gradePoint: 1.0, displayOrder: 4 },
        { grade: 'F', minMarks: 0, maxMarks: 29, gradePoint: 0.0, displayOrder: 5 },
      ],
      international: [
        { grade: 'A*', minMarks: 90, maxMarks: 100, gradePoint: 4.0, displayOrder: 1 },
        { grade: 'A', minMarks: 80, maxMarks: 89, gradePoint: 3.7, displayOrder: 2 },
        { grade: 'B', minMarks: 70, maxMarks: 79, gradePoint: 3.3, displayOrder: 3 },
        { grade: 'C', minMarks: 60, maxMarks: 69, gradePoint: 3.0, displayOrder: 4 },
        { grade: 'D', minMarks: 50, maxMarks: 59, gradePoint: 2.0, displayOrder: 5 },
        { grade: 'E', minMarks: 0, maxMarks: 49, gradePoint: 0.0, displayOrder: 6 },
      ],
    };
  }

  /**
   * Get Indian grading standards
   */
  getIndianGradingStandards() {
    const scales = this.getStandardGradingScales();
    return {
      cbse: scales.cbse,
      state: scales.state,
      icse: scales.icse,
    };
  }

  /**
   * Convert scale object to CreateGradeRangeRequest array
   */
  convertScaleToRanges(
    scale: CreateGradeRangeRequest[] | any
  ): CreateGradeRangeRequest[] {
    if (Array.isArray(scale)) {
      return scale;
    }
    return scale.ranges || [];
  }
}

export default new GradeDefinitionService();
