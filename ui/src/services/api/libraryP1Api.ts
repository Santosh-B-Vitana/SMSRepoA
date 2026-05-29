import apiClient from './apiClient';

const BASE = '/library';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BookReservation {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberType: string;
  reservedAt: string;
  expiresAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  notes?: string;
  createdAt: string;
}

export interface CreateBookReservationDto {
  bookId: string;
  memberId: string;
  memberType: 'student' | 'staff';
  notes?: string;
}

export interface Periodical {
  id: string;
  schoolId: string;
  title: string;
  periodicalType: string;
  issn?: string;
  publisher?: string;
  frequency?: string;
  currentIssue?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  coverImageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePeriodicalDto {
  title: string;
  periodicalType: string;
  issn?: string;
  publisher?: string;
  frequency?: string;
  currentIssue?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  coverImageUrl?: string;
}

export interface LibraryMember {
  id: string;
  schoolId: string;
  memberType: string;
  memberId: string;
  memberName: string;
  cardNumber: string;
  validFrom: string;
  validTo: string;
  maxBooksAllowed: number;
  loanDays: number;
  status: string;
  createdAt: string;
}

export interface CreateLibraryMemberDto {
  memberType: string;
  memberId: string;
  validFrom?: string;
  validTo?: string;
  maxBooksAllowed: number;
  loanDays?: number;
}

export interface UpdateLibraryMemberDto {
  validFrom?: string;
  validTo?: string;
  maxBooksAllowed?: number;
  loanDays?: number;
}

export interface OverdueBook {
  issueId: string;
  bookId: string;
  bookTitle: string;
  bookIsbn?: string;
  studentId?: string;
  studentName?: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  fineAmount: number;
}

// ─── Reservations ────────────────────────────────────────────────────────────

export const getReservations = async (params?: { bookId?: string; status?: string }): Promise<BookReservation[]> => {
  const q = new URLSearchParams();
  if (params?.bookId) q.set('bookId', params.bookId);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<BookReservation[]>(`${BASE}/reservations?${q}`);
  return r.data;
};

export const reserveBook = async (dto: CreateBookReservationDto): Promise<BookReservation> => {
  const r = await apiClient.post<BookReservation>(`${BASE}/reservations`, dto);
  return r.data;
};

export const cancelReservation = async (id: string): Promise<BookReservation> => {
  const r = await apiClient.put<BookReservation>(`${BASE}/reservations/${id}/cancel`, {});
  return r.data;
};

export const fulfillReservation = async (id: string): Promise<BookReservation> => {
  const r = await apiClient.put<BookReservation>(`${BASE}/reservations/${id}/fulfill`, {});
  return r.data;
};

// ─── Periodicals ─────────────────────────────────────────────────────────────

export const getPeriodicals = async (type?: string): Promise<Periodical[]> => {
  const q = new URLSearchParams();
  if (type && type !== 'all') q.set('type', type);
  const r = await apiClient.get<Periodical[]>(`${BASE}/periodicals?${q}`);
  return r.data;
};

export const createPeriodical = async (dto: CreatePeriodicalDto): Promise<Periodical> => {
  const r = await apiClient.post<Periodical>(`${BASE}/periodicals`, dto);
  return r.data;
};

export const updatePeriodical = async (id: string, dto: CreatePeriodicalDto): Promise<Periodical> => {
  const r = await apiClient.put<Periodical>(`${BASE}/periodicals/${id}`, dto);
  return r.data;
};

export const deletePeriodical = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/periodicals/${id}`);
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const getMembers = async (memberType?: string): Promise<LibraryMember[]> => {
  const q = new URLSearchParams();
  if (memberType && memberType !== 'all') q.set('memberType', memberType);
  const r = await apiClient.get<LibraryMember[]>(`${BASE}/members?${q}`);
  return r.data;
};

export const getMemberById = async (id: string): Promise<LibraryMember> => {
  const r = await apiClient.get<LibraryMember>(`${BASE}/members/${id}`);
  return r.data;
};

export const createMember = async (dto: CreateLibraryMemberDto): Promise<LibraryMember> => {
  const r = await apiClient.post<LibraryMember>(`${BASE}/members`, dto);
  return r.data;
};

export const updateMember = async (id: string, dto: UpdateLibraryMemberDto): Promise<LibraryMember> => {
  const r = await apiClient.put<LibraryMember>(`${BASE}/members/${id}`, dto);
  return r.data;
};

export const revokeMember = async (id: string): Promise<LibraryMember> => {
  const r = await apiClient.put<LibraryMember>(`${BASE}/members/${id}/revoke`);
  return r.data;
};

// ─── Overdue ─────────────────────────────────────────────────────────────────

export const getOverdueItems = async (): Promise<OverdueBook[]> => {
  const r = await apiClient.get<OverdueBook[]>(`${BASE}/overdue`);
  return r.data;
};
