import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeScaleEntry {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  description: string;
  isPassing: boolean;
}

export interface ExamStructureEntry {
  code: string;
  name: string;
  weightagePercent: number;
  term: number;
  isInternal: boolean;
  defaultMaxMarks: number;
}

export interface BoardConfigurationResponse {
  id: string;
  name: string;
  code: string;
  description?: string;
  boardLevel: string;
  stateCode?: string;
  theoryPassingPercentage: number;
  practicalPassingPercentage: number;
  overallPassingPercentage: number;
  gradingSystem: string;
  maxGradePoint: number;
  gradingScale: GradeScaleEntry[];
  examStructure: ExamStructureEntry[];
  isSystemBoard: boolean;
  isCustomizable: boolean;
  isActive: boolean;
}

export interface BoardListResponse {
  boards: BoardConfigurationResponse[];
  total: number;
}

export interface SchoolBoardConfigResponse {
  id: string;
  schoolId: string;
  boardConfigurationId: string;
  academicYear?: string;
  boardName: string;
  boardCode: string;
  isActive: boolean;
  effectiveGradingScale: GradeScaleEntry[];
  effectiveExamStructure: ExamStructureEntry[];
}

export interface SetSchoolBoardConfigRequest {
  boardConfigurationId: string;
  academicYear?: string;
  customOverallPassingPercentage?: number;
  customTheoryPassingPercentage?: number;
  customPracticalPassingPercentage?: number;
  customGradingScaleJson?: string;
  customExamStructureJson?: string;
}

export interface BoardAwareGradeResult {
  grade: string;
  gradePoint: number;
  isPassing: boolean;
  description: string;
  boardCode: string;
  gradingSystem: string;
}

// ─── API Service ────────────────────────────────────────────────────────────

export const boardApi = {
  // Get all available boards
  async getAllBoards(): Promise<BoardListResponse> {
    const response = await apiClient.get('/board/boards');
    return response.data;
  },

  // Get board by code
  async getBoardByCode(code: string): Promise<BoardConfigurationResponse> {
    const response = await apiClient.get(`/board/boards/code/${code}`);
    return response.data;
  },

  // Get school's current board configuration
  async getSchoolBoardConfig(): Promise<SchoolBoardConfigResponse> {
    const response = await apiClient.get('/board/config');
    return response.data;
  },

  // Set school's board configuration
  async setSchoolBoardConfig(request: SetSchoolBoardConfigRequest): Promise<SchoolBoardConfigResponse> {
    const response = await apiClient.post('/board/config', request);
    return response.data;
  },

  // Calculate grade for a percentage using school's board
  async calculateGrade(percentage: number): Promise<BoardAwareGradeResult> {
    const response = await apiClient.get(`/board/grade?percentage=${percentage}`);
    return response.data;
  },

  // Get effective grading scale for school
  async getGradingScale(): Promise<GradeScaleEntry[]> {
    const response = await apiClient.get('/board/grading-scale');
    return response.data;
  },

  // Get effective exam structure for school
  async getExamStructure(): Promise<ExamStructureEntry[]> {
    const response = await apiClient.get('/board/exam-structure');
    return response.data;
  }
};

export default boardApi;
