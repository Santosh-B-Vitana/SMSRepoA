import apiClient from './apiClient';

const BASE = '/library';

// ─── Types ─────────────────────────────────────────────────

export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  category?: string;
  location?: string;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  status: 'available' | 'low' | 'unavailable';
  createdAt: string;
  updatedAt: string;
}

export interface BookIssue {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  bookIsbn?: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  studentSection?: string;
  studentAdmissionNumber?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'overdue' | 'returned';
  fine: number;
  finePaid: boolean;
  daysOverdue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCount: number;
  totalFinesPending: number;
  totalIssuedToday: number;
  totalReturnedToday: number;
}

export interface BookListResponse {
  books: Book[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookIssueListResponse {
  issues: BookIssue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBookDto {
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  category?: string;
  location?: string;
  description?: string;
  totalCopies: number;
  availableCopies?: number;
}

export interface CreateIssueDto {
  bookId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
}

// ─── Books ──────────────────────────────────────────────────

export const getBooks = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
}): Promise<BookListResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.search) q.set('search', params.search);
  if (params?.category && params.category !== 'all') q.set('category', params.category);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<BookListResponse>(`${BASE}/books?${q}`);
  return r.data;
};

export const getBookById = async (id: string): Promise<Book> => {
  const r = await apiClient.get<Book>(`${BASE}/books/${id}`);
  return r.data;
};

export const createBook = async (dto: CreateBookDto): Promise<Book> => {
  const r = await apiClient.post<Book>(`${BASE}/books`, dto);
  return r.data;
};

export const updateBook = async (id: string, dto: CreateBookDto): Promise<Book> => {
  const r = await apiClient.put<Book>(`${BASE}/books/${id}`, dto);
  return r.data;
};

export const deleteBook = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/books/${id}`);
};

// ─── Issues ─────────────────────────────────────────────────

export const getIssues = async (params?: {
  page?: number;
  pageSize?: number;
  bookId?: string;
  studentId?: string;
  status?: string;
}): Promise<BookIssueListResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.bookId) q.set('bookId', params.bookId);
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<BookIssueListResponse>(`${BASE}/issues?${q}`);
  return r.data;
};

export const issueBook = async (dto: CreateIssueDto): Promise<BookIssue> => {
  const r = await apiClient.post<BookIssue>(`${BASE}/issues`, dto);
  return r.data;
};

export const returnBook = async (issueId: string): Promise<BookIssue> => {
  const r = await apiClient.put<BookIssue>(`${BASE}/issues/${issueId}/return`);
  return r.data;
};

export const markFinePaid = async (issueId: string): Promise<BookIssue> => {
  const r = await apiClient.put<BookIssue>(`${BASE}/issues/${issueId}/fine-paid`);
  return r.data;
};

// ─── Stats ──────────────────────────────────────────────────

export const getLibraryStats = async (): Promise<LibraryStats> => {
  const r = await apiClient.get<LibraryStats>(`${BASE}/stats`);
  return r.data;
};

export default {
  getBooks, getBookById, createBook, updateBook, deleteBook,
  getIssues, issueBook, returnBook, markFinePaid, getLibraryStats,
};
