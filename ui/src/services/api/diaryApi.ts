/**
 * Diary API — /api/Diary
 * Student diary entries written by staff, visible to parents.
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DiaryCategory =
  | 'note'
  | 'homework'
  | 'guideline'
  | 'observation'
  | 'achievement'
  | 'concern'
  | 'feedback'
  | 'behavior';

export type DiaryType = 'class' | 'individual';
export type DiaryPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DiaryEntry {
  id: string;
  staffId: string;
  staffName: string | null;
  title: string;
  content: string;
  category: DiaryCategory;
  colorTag: string | null;
  diaryType: DiaryType;
  classId: string | null;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  studentId: string | null;
  studentName: string | null;
  diaryDate: string;         // "yyyy-MM-dd"
  isVisibleToParent: boolean;
  notifyParent: boolean;
  priority: DiaryPriority;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryDto {
  title: string;
  content: string;
  category: DiaryCategory;
  diaryType: DiaryType;
  classId?: string | null;
  sectionId?: string | null;
  studentId?: string | null;
  diaryDate?: string;
  isVisibleToParent: boolean;
  notifyParent: boolean;
  priority?: DiaryPriority;
  colorTag?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface UpdateDiaryDto {
  title?: string;
  content?: string;
  category?: DiaryCategory;
  isVisibleToParent?: boolean;
  notifyParent?: boolean;
  priority?: DiaryPriority;
  colorTag?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface DiaryListResponse {
  total: number;
  page: number;
  pageSize: number;
  entries: DiaryEntry[];
}

// ─── Category metadata ───────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<DiaryCategory, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}> = {
  note:        { label: 'Note',        emoji: '📝', color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-200' },
  homework:    { label: 'Homework',    emoji: '📚', color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200' },
  guideline:   { label: 'Guideline',  emoji: '📋', color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200' },
  observation: { label: 'Observation',emoji: '🔍', color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  achievement: { label: 'Achievement',emoji: '🏆', color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  concern:     { label: 'Concern',    emoji: '⚠️', color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200' },
  feedback:    { label: 'Feedback',   emoji: '💬', color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200' },
  behavior:    { label: 'Behavior',   emoji: '⭐', color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200' },
};

export const PRIORITY_CONFIG: Record<DiaryPriority, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'text-slate-500',   dot: 'bg-slate-400' },
  normal: { label: 'Normal', color: 'text-blue-600',    dot: 'bg-blue-400' },
  high:   { label: 'High',   color: 'text-amber-600',   dot: 'bg-amber-400' },
  urgent: { label: 'Urgent', color: 'text-rose-600',    dot: 'bg-rose-500' },
};

// ─── API service ─────────────────────────────────────────────────────────────

export const diaryApi = {
  /** List entries (staff-facing) */
  list: (params?: {
    classId?: string;
    sectionId?: string;
    studentId?: string;
    category?: string;
    diaryType?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) => apiGet<DiaryListResponse>('/Diary', params as Record<string, unknown>),

  /** Entries for a class (staff) */
  getByClass: (classId: string, params?: {
    sectionId?: string;
    fromDate?: string;
    toDate?: string;
  }) => apiGet<DiaryEntry[]>(`/Diary/class/${classId}`, params as Record<string, unknown>),

  /** Entries for a student (staff) */
  getByStudent: (studentId: string, params?: {
    fromDate?: string;
    toDate?: string;
  }) => apiGet<DiaryEntry[]>(`/Diary/student/${studentId}`, params as Record<string, unknown>),

  /** Entries for parent portal */
  getForParent: (studentId: string, params?: {
    fromDate?: string;
    toDate?: string;
    category?: string;
  }) => apiGet<DiaryEntry[]>(`/Diary/parent/child/${studentId}`, params as Record<string, unknown>),

  /** Get single entry */
  getById: (id: string) => apiGet<DiaryEntry>(`/Diary/${id}`),

  /** Create entry */
  create: (data: CreateDiaryDto) => apiPost<DiaryEntry>('/Diary', data),

  /** Update entry */
  update: (id: string, data: UpdateDiaryDto) => apiPut<DiaryEntry>(`/Diary/${id}`, data),

  /** Delete entry */
  delete: (id: string) => apiDelete(`/Diary/${id}`),
};

export default diaryApi;
