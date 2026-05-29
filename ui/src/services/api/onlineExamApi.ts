import apiClient from './apiClient';

const BASE = '/online-exam';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuestionBank {
  id: string;
  schoolId: string;
  subjectId: string;
  subjectName?: string;
  questionText: string;
  questionType: 'mcq' | 'subjective' | 'true_false';
  options?: string[];
  correctAnswer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string;
  explanation?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateQuestionDto {
  subjectId: string;
  questionText: string;
  questionType: 'mcq' | 'subjective' | 'true_false';
  options?: string[];
  correctAnswer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string;
  explanation?: string;
}

export interface OnlineExam {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  sectionId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  instructions?: string;
  questions: ExamQuestionItem[];
  createdAt: string;
}

export interface ExamQuestionItem {
  questionId: string;
  questionOrder: number;
  marksOverride?: number;
}

export interface CreateOnlineExamDto {
  title: string;
  description?: string;
  subjectId: string;
  classId: string;
  sectionId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  passingMarks: number;
  instructions?: string;
  questions: ExamQuestionItem[];
}

export interface ExamSession {
  id: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName?: string;
  startedAt?: string;
  submittedAt?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'graded' | 'absent';
  totalMarks?: number;
  obtainedMarks?: number;
  percentage?: number;
  isPassed?: boolean;
  teacherRemarks?: string;
  responses: ExamResponseItem[];
}

export interface ExamResponseItem {
  questionId: string;
  questionText?: string;
  questionType?: string;
  responseText?: string;
  isCorrect?: boolean;
  marksAwarded?: number;
  graderRemarks?: string;
}

export interface SubmitExamDto {
  answers: { questionId: string; responseText: string }[];
}

export interface GradeResponseDto {
  sessionId: string;
  questionId: string;
  marksAwarded: number;
  remarks?: string;
}

export interface ExamStats {
  examId: string;
  totalStudents: number;
  appeared: number;
  absent: number;
  passed: number;
  failed: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
}

// ─── Question Bank ───────────────────────────────────────────────────────────

export const getQuestions = async (params?: { subjectId?: string; type?: string; difficulty?: string }): Promise<QuestionBank[]> => {
  const q = new URLSearchParams();
  if (params?.subjectId) q.set('subjectId', params.subjectId);
  if (params?.type && params.type !== 'all') q.set('type', params.type);
  if (params?.difficulty && params.difficulty !== 'all') q.set('difficulty', params.difficulty);
  const r = await apiClient.get<QuestionBank[]>(`${BASE}/questions?${q}`);
  return r.data;
};

export const createQuestion = async (dto: CreateQuestionDto): Promise<QuestionBank> => {
  const r = await apiClient.post<QuestionBank>(`${BASE}/questions`, dto);
  return r.data;
};

export const updateQuestion = async (id: string, dto: CreateQuestionDto): Promise<QuestionBank> => {
  const r = await apiClient.put<QuestionBank>(`${BASE}/questions/${id}`, dto);
  return r.data;
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/questions/${id}`);
};

// ─── Exams ───────────────────────────────────────────────────────────────────

export const getExams = async (params?: { classId?: string; status?: string }): Promise<OnlineExam[]> => {
  const q = new URLSearchParams();
  if (params?.classId) q.set('classId', params.classId);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<OnlineExam[]>(`${BASE}?${q}`);
  return r.data;
};

export const getExamById = async (id: string): Promise<OnlineExam> => {
  const r = await apiClient.get<OnlineExam>(`${BASE}/${id}`);
  return r.data;
};

export const createExam = async (dto: CreateOnlineExamDto): Promise<OnlineExam> => {
  const r = await apiClient.post<OnlineExam>(`${BASE}`, dto);
  return r.data;
};

export const updateExam = async (id: string, dto: Partial<CreateOnlineExamDto>): Promise<OnlineExam> => {
  const r = await apiClient.put<OnlineExam>(`${BASE}/${id}`, dto);
  return r.data;
};

export const deleteExam = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/${id}`);
};

// ─── Sessions ────────────────────────────────────────────────────────────────

export const startExamSession = async (examId: string, studentId: string): Promise<ExamSession> => {
  const r = await apiClient.post<ExamSession>(`${BASE}/${examId}/start`, { studentId });
  return r.data;
};

export const submitExam = async (sessionId: string, dto: SubmitExamDto): Promise<ExamSession> => {
  const r = await apiClient.post<ExamSession>(`${BASE}/sessions/${sessionId}/submit`, dto);
  return r.data;
};

export const getSession = async (sessionId: string): Promise<ExamSession> => {
  const r = await apiClient.get<ExamSession>(`${BASE}/sessions/${sessionId}`);
  return r.data;
};

export const getExamSessions = async (examId: string): Promise<ExamSession[]> => {
  const r = await apiClient.get<ExamSession[]>(`${BASE}/${examId}/sessions`);
  return r.data;
};

export const gradeResponse = async (dto: GradeResponseDto): Promise<void> => {
  await apiClient.post(`${BASE}/grade`, dto);
};

export const getExamStats = async (examId: string): Promise<ExamStats> => {
  const r = await apiClient.get<ExamStats>(`${BASE}/${examId}/stats`);
  return r.data;
};
