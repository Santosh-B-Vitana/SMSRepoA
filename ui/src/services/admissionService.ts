import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================

export interface Admission {
  id: string;
  schoolId: string;
  applicationNumber: string;
  studentName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  appliedClass: string;
  academicYear: string;
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'enrolled' | 'interviewed';
  interviewDate?: string;
  rejectionReason?: string;
  previousSchool?: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionFull extends Admission {
  bloodGroup?: string;
  nationality: string;
  religion?: string;
  category?: string;
  fatherName?: string;
  motherName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  previousClass?: string;
  previousMarks?: number;
  interviewNotes?: string;
  documents: AdmissionDocument[];
}

export interface AdmissionDocument {
  id: string;
  admissionId: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface AdmissionFilters {
  searchTerm?: string;
  status?: string;
  class?: string;
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdmissionPaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  enrolled: number;
  interviewed: number;
  byClass: Record<string, number>;
}

export interface CreateAdmissionData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  category?: string;
  bloodGroup?: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail?: string;
  fatherName?: string;
  motherName?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  appliedClass: string;
  academicYear: string;
  previousSchool?: string;
  previousClass?: string;
  previousMarks?: number;
  remarks?: string;
}

export interface UpdateAdmissionData {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  interviewDate?: string;
  interviewNotes?: string;
}

// ==================== API SERVICE ====================

class AdmissionService {
  async getAdmissions(
    filters?: AdmissionFilters,
    pagination?: AdmissionPaginationParams
  ): Promise<PaginatedResponse<Admission>> {
    const params = new URLSearchParams();
    if (filters?.searchTerm) params.set('searchTerm', filters.searchTerm);
    if (filters?.status)     params.set('status', filters.status);
    if (filters?.class)      params.set('class', filters.class);
    if (filters?.academicYear) params.set('academicYear', filters.academicYear);
    if (filters?.dateFrom)   params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo)     params.set('dateTo', filters.dateTo);
    if (pagination?.page)    params.set('page', pagination.page.toString());
    if (pagination?.pageSize) params.set('pageSize', pagination.pageSize.toString());

    const response = await apiClient.get(`/admissions/applications?${params}`);
    return response.data;
  }

  async getAdmissionById(admissionId: string): Promise<AdmissionFull> {
    const response = await apiClient.get(`/admissions/applications/${admissionId}`);
    return response.data;
  }

  async createAdmission(data: CreateAdmissionData): Promise<AdmissionFull> {
    const response = await apiClient.post(`/admissions/applications`, data);
    return response.data;
  }

  async updateAdmission(admissionId: string, data: UpdateAdmissionData): Promise<AdmissionFull> {
    const response = await apiClient.put(`/admissions/applications/${admissionId}`, data);
    return response.data;
  }

  async deleteAdmission(admissionId: string): Promise<void> {
    await apiClient.delete(`/admissions/applications/${admissionId}`);
  }

  async updateStatus(admissionId: string, status: string, remarks?: string): Promise<void> {
    await apiClient.put(`/admissions/applications/${admissionId}/status`, { status, remarks });
  }

  async scheduleInterview(admissionId: string, interviewDate: string, notes?: string): Promise<void> {
    await apiClient.put(`/admissions/applications/${admissionId}/interview`, { interviewDate, notes });
  }

  async approveApplication(admissionId: string): Promise<void> {
    await apiClient.put(`/admissions/applications/${admissionId}/approve`, {});
  }

  async rejectApplication(admissionId: string, rejectionReason: string): Promise<void> {
    await apiClient.put(`/admissions/applications/${admissionId}/reject`, { rejectionReason });
  }

  async enrollApplication(admissionId: string, admissionNumber: string, section?: string): Promise<void> {
    await apiClient.put(`/admissions/applications/${admissionId}/enroll`, { admissionNumber, section });
  }

  async getStats(): Promise<AdmissionStats> {
    const response = await apiClient.get(`/admissions/stats`);
    return response.data;
  }

  async getDocuments(admissionId: string): Promise<AdmissionDocument[]> {
    const response = await apiClient.get(`/admissions/applications/${admissionId}/documents`);
    return response.data;
  }

  async uploadDocument(
    admissionId: string,
    documentType: string,
    documentName: string,
    fileUrl: string
  ): Promise<AdmissionDocument> {
    const response = await apiClient.post(`/admissions/applications/${admissionId}/documents`, {
      documentType,
      documentName,
      fileUrl,
    });
    return response.data;
  }
}

export const admissionService = new AdmissionService();