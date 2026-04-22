import apiClient from './apiClient';

// ========== TYPES ==========

export interface AlumniBasic {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  graduationYear: string;
  class: string;
  currentOccupation: string;
  designation: string;
  company: string;
  city?: string;
  location: string;
  photoUrl?: string;
  isStarAlumni: boolean;
  isMentor: boolean;
}

export interface AlumniFull {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  graduationYear: string;
  class: string;
  section?: string;
  rollNumber?: string;
  studentId?: string;
  currentOccupation: string;
  designation?: string;
  company: string;
  industry?: string;
  workExperience?: number;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  achievements?: string;
  skills: string[];
  interests: string[];
  photoUrl?: string;
  isStarAlumni: boolean;
  isMentor: boolean;
  mentorAreas: string[];
  willingToHire: boolean;
  willingToSpeak: boolean;
  lastContactDate?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  attendedMeets: AlumniMeetBasic[];
  donations: AlumniDonationBasic[];
  createdAt: string;
  updatedAt: string;
}

export interface AlumniMeetBasic {
  id: string;
  title: string;
  date: string;
  venue: string;
  isVirtual: boolean;
  registeredCount: number;
  status: string;
}

export interface AlumniMeetFull {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  venueAddress?: string;
  isVirtual: boolean;
  virtualLink?: string;
  organizer: string;
  organizerContact?: string;
  expectedAttendees: number;
  registeredCount: number;
  attendedCount: number;
  status: string;
  photoGalleryUrl?: string;
  notes?: string;
  registeredAlumni: AlumniBasic[];
  createdAt: string;
  updatedAt: string;
}

export interface AlumniDonationBasic {
  id: string;
  alumniId: string;
  alumniName: string;
  amount: number;
  donationType: string;
  purpose: string;
  donationDate: string;
  status: string;
}

export interface AlumniStats {
  total: number;
  starAlumni: number;
  mentors: number;
  thisYear: number;
  byYear: Record<string, number>;
  byLocation: Record<string, number>;
  byIndustry: Record<string, number>;
  topCompanies: { company: string; count: number }[];
  recentAlumni: AlumniBasic[];
}

export interface AlumniFilters {
  graduationYear?: string;
  graduationYearFrom?: string;
  graduationYearTo?: string;
  isStarAlumni?: boolean;
  isMentor?: boolean;
  search?: string;
  occupation?: string;
  industry?: string;
  location?: string;
  company?: string;
}

export interface CreateAlumniDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  graduationYear: string;
  class: string;
  section?: string;
  rollNumber?: string;
  studentId?: string;
  currentOccupation?: string;
  designation?: string;
  company?: string;
  industry?: string;
  workExperience?: number;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  achievements?: string;
  skills?: string[];
  interests?: string[];
  photoUrl?: string;
  isStarAlumni: boolean;
  isMentor: boolean;
  mentorAreas?: string[];
  willingToHire: boolean;
  willingToSpeak: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
}

export interface UpdateAlumniDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  currentOccupation?: string;
  designation?: string;
  company?: string;
  industry?: string;
  workExperience?: number;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  achievements?: string;
  skills?: string[];
  interests?: string[];
  photoUrl?: string;
  isStarAlumni?: boolean;
  isMentor?: boolean;
  mentorAreas?: string[];
  willingToHire?: boolean;
  willingToSpeak?: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
}

export interface PaginatedAlumni {
  items: AlumniBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedMeets {
  items: AlumniMeetBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedDonations {
  items: AlumniDonationBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateMeetDto {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  venueAddress?: string;
  isVirtual: boolean;
  virtualLink?: string;
  organizer?: string;
  organizerContact?: string;
  expectedAttendees: number;
}

export interface CreateDonationDto {
  alumniId: string;
  amount: number;
  purpose: string;
  donationDate: string;
  paymentMethod?: string;
  receiptNumber?: string;
  isAnonymous: boolean;
  message?: string;
}

// ========== API FUNCTIONS ==========

const BASE = '/alumni';

export const alumniApi = {
  getAlumni: (filters: AlumniFilters = {}, page = 1, pageSize = 20): Promise<PaginatedAlumni> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.graduationYear) params.set('graduationYear', filters.graduationYear);
    if (filters.graduationYearFrom) params.set('graduationYearFrom', filters.graduationYearFrom);
    if (filters.graduationYearTo) params.set('graduationYearTo', filters.graduationYearTo);
    if (filters.isStarAlumni !== undefined) params.set('isStarAlumni', String(filters.isStarAlumni));
    if (filters.isMentor !== undefined) params.set('isMentor', String(filters.isMentor));
    if (filters.industry) params.set('industry', filters.industry);
    if (filters.location) params.set('location', filters.location);
    if (filters.company) params.set('company', filters.company);
    return apiClient.get<PaginatedAlumni>(`${BASE}?${params}`).then(r => r.data);
  },

  getById: (id: string): Promise<AlumniFull> =>
    apiClient.get<AlumniFull>(`${BASE}/${id}`).then(r => r.data),

  create: (dto: CreateAlumniDto): Promise<AlumniFull> =>
    apiClient.post<AlumniFull>(BASE, dto).then(r => r.data),

  update: (id: string, dto: UpdateAlumniDto): Promise<AlumniFull> =>
    apiClient.put<AlumniFull>(`${BASE}/${id}`, dto).then(r => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined),

  getStats: (): Promise<AlumniStats> =>
    apiClient.get<AlumniStats>(`${BASE}/stats`).then(r => r.data),

  getMeets: (page = 1, pageSize = 20, status?: string): Promise<PaginatedMeets> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set('status', status);
    return apiClient.get<PaginatedMeets>(`${BASE}/meets?${params}`).then(r => r.data);
  },

  getMeetById: (meetId: string): Promise<AlumniMeetFull> =>
    apiClient.get<AlumniMeetFull>(`${BASE}/meets/${meetId}`).then(r => r.data),

  createMeet: (dto: CreateMeetDto): Promise<AlumniMeetFull> =>
    apiClient.post<AlumniMeetFull>(`${BASE}/meets`, dto).then(r => r.data),

  updateMeet: (meetId: string, dto: Partial<CreateMeetDto> & { status?: string }): Promise<AlumniMeetFull> =>
    apiClient.put<AlumniMeetFull>(`${BASE}/meets/${meetId}`, dto).then(r => r.data),

  registerForMeet: (meetId: string, alumniId: string): Promise<void> =>
    apiClient.post(`${BASE}/meets/${meetId}/register`, { meetId, alumniId }).then(() => undefined),

  markAttendance: (meetId: string, alumniIds: string[]): Promise<void> =>
    apiClient.post(`${BASE}/meets/${meetId}/attendance`, { meetId, alumniIds }).then(() => undefined),

  getDonations: (page = 1, pageSize = 20, alumniId?: string): Promise<PaginatedDonations> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (alumniId) params.set('alumniId', alumniId);
    return apiClient.get<PaginatedDonations>(`${BASE}/donations?${params}`).then(r => r.data);
  },

  createDonation: (dto: CreateDonationDto): Promise<AlumniDonationBasic> =>
    apiClient.post<AlumniDonationBasic>(`${BASE}/donations`, dto).then(r => r.data),
};
