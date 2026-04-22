import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/apiClient';

// Types
export interface CertificateTemplateResponse {
  id: string;
  schoolId: string;
  name: string;
  certificateType: string;
  description?: string;
  template: string;
  orientation: string;
  pageSize: string;
  styles?: string;
  headerImage?: string;
  footerImage?: string;
  watermarkImage?: string;
  isActive: boolean;
  isDefault: boolean;
  certificatesIssuedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateTemplateListResponse {
  items: CertificateTemplateResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CertificateResponse {
  id: string;
  schoolId: string;
  certificateNumber: string;
  certificateType: string;
  title: string;
  studentId: string;
  studentName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  templateId: string;
  templateName?: string;
  content?: string;
  issueDate: string;
  validUntil?: string;
  issuedByStaffId: string;
  issuedByStaffName?: string;
  fileUrl?: string;
  status: string;
  metadata?: string;
  isPrinted: boolean;
  printedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateListResponse {
  items: CertificateResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CertificateStatsResponse {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  expiredCertificates: number;
  printedCertificates: number;
  certificateTemplates: number;
  totalIDCards: number;
  activeIDCards: number;
  expiredIDCards: number;
  lostIDCards: number;
  printedIDCards: number;
  idCardTemplates: number;
  byType: Record<string, number>;
}

export interface CreateCertificateTemplateRequest {
  name: string;
  certificateType: string;
  description?: string;
  template: string;
  orientation?: string;
  pageSize?: string;
  styles?: string;
  headerImage?: string;
  footerImage?: string;
  watermarkImage?: string;
  isDefault?: boolean;
}

export interface UpdateCertificateTemplateRequest {
  name?: string;
  description?: string;
  template?: string;
  orientation?: string;
  pageSize?: string;
  styles?: string;
  headerImage?: string;
  footerImage?: string;
  watermarkImage?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface CreateCertificateRequest {
  certificateNumber: string;
  certificateType: string;
  title: string;
  studentId: string;
  classId?: string;
  sectionId?: string;
  templateId: string;
  content?: string;
  issueDate: string;
  validUntil?: string;
  issuedByStaffId: string;
  metadata?: string;
}

export interface UpdateCertificateRequest {
  title?: string;
  content?: string;
  validUntil?: string;
  status?: string;
  metadata?: string;
}

export interface IDCardTemplateResponse {
  id: string;
  schoolId: string;
  name: string;
  cardType: string;
  description?: string;
  frontTemplate: string;
  backTemplate?: string;
  cardSize: string;
  styles?: string;
  backgroundImage?: string;
  showBarcode: boolean;
  showQRCode: boolean;
  isActive: boolean;
  isDefault: boolean;
  cardsIssuedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDCardTemplateListResponse {
  items: IDCardTemplateResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IDCardResponse {
  id: string;
  schoolId: string;
  cardNumber: string;
  cardType: string;
  holderId: string;
  holderType: string;
  holderName?: string;
  templateId: string;
  templateName?: string;
  photoUrl?: string;
  barcodeData?: string;
  qrCodeData?: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  fileUrl?: string;
  isPrinted: boolean;
  printedAt?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDCardListResponse {
  items: IDCardResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateIDCardTemplateRequest {
  name: string;
  cardType: string;
  description?: string;
  frontTemplate: string;
  backTemplate?: string;
  cardSize?: string;
  styles?: string;
  backgroundImage?: string;
  showBarcode?: boolean;
  showQRCode?: boolean;
  isDefault?: boolean;
}

export interface UpdateIDCardTemplateRequest {
  name?: string;
  description?: string;
  frontTemplate?: string;
  backTemplate?: string;
  cardSize?: string;
  styles?: string;
  backgroundImage?: string;
  showBarcode?: boolean;
  showQRCode?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface CreateIDCardRequest {
  cardNumber: string;
  cardType: string;
  holderId: string;
  holderType: string;
  templateId: string;
  photoUrl?: string;
  barcodeData?: string;
  qrCodeData?: string;
  issueDate: string;
  expiryDate: string;
  metadata?: string;
}

export interface UpdateIDCardRequest {
  cardNumber?: string;
  status?: string;
  expiryDate?: string;
  photoUrl?: string;
  metadata?: string;
}

// Certificate Template APIs
export const certificateTemplatesApi = {
  list: (page: number = 1, pageSize: number = 10, certificateType?: string, isActive?: boolean) =>
    apiGet<CertificateTemplateListResponse>(
      `/api/certificates/templates?page=${page}&pageSize=${pageSize}${certificateType ? `&certificateType=${certificateType}` : ''}${isActive !== undefined ? `&isActive=${isActive}` : ''}`
    ),

  getById: (id: string) =>
    apiGet<CertificateTemplateResponse>(`/api/certificates/templates/${id}`),

  create: (data: CreateCertificateTemplateRequest) =>
    apiPost<CertificateTemplateResponse>('/api/certificates/templates', data),

  update: (id: string, data: UpdateCertificateTemplateRequest) =>
    apiPut<CertificateTemplateResponse>(`/api/certificates/templates/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/api/certificates/templates/${id}`),
};

// Certificate APIs
export const certificatesApi = {
  list: (page: number = 1, pageSize: number = 10, certificateType?: string, status?: string, studentId?: string) =>
    apiGet<CertificateListResponse>(
      `/api/certificates?page=${page}&pageSize=${pageSize}${certificateType ? `&certificateType=${certificateType}` : ''}${status ? `&status=${status}` : ''}${studentId ? `&studentId=${studentId}` : ''}`
    ),

  getById: (id: string) =>
    apiGet<CertificateResponse>(`/api/certificates/${id}`),

  getByStudent: (studentId: string, page: number = 1, pageSize: number = 50) =>
    apiGet<CertificateListResponse>(`/api/certificates/student/${studentId}?page=${page}&pageSize=${pageSize}`),

  getStats: () =>
    apiGet<CertificateStatsResponse>('/api/certificates/stats'),

  create: (data: CreateCertificateRequest) =>
    apiPost<CertificateResponse>('/api/certificates', data),

  update: (id: string, data: UpdateCertificateRequest) =>
    apiPut<CertificateResponse>(`/api/certificates/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/api/certificates/${id}`),

  generate: (id: string) =>
    apiPost<CertificateResponse>(`/api/certificates/${id}/generate`, {}),

  markAsPrinted: (id: string) =>
    apiPost<CertificateResponse>(`/api/certificates/${id}/print`, {}),

  revoke: (id: string) =>
    apiPost<CertificateResponse>(`/api/certificates/${id}/revoke`, {}),
};

// ID Card Template APIs
export const idCardTemplatesApi = {
  list: (page: number = 1, pageSize: number = 10, cardType?: string, isActive?: boolean) =>
    apiGet<IDCardTemplateListResponse>(
      `/api/certificates/idcard-templates?page=${page}&pageSize=${pageSize}${cardType ? `&cardType=${cardType}` : ''}${isActive !== undefined ? `&isActive=${isActive}` : ''}`
    ),

  getById: (id: string) =>
    apiGet<IDCardTemplateResponse>(`/api/certificates/idcard-templates/${id}`),

  create: (data: CreateIDCardTemplateRequest) =>
    apiPost<IDCardTemplateResponse>('/api/certificates/idcard-templates', data),

  update: (id: string, data: UpdateIDCardTemplateRequest) =>
    apiPut<IDCardTemplateResponse>(`/api/certificates/idcard-templates/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/api/certificates/idcard-templates/${id}`),
};

// ID Card APIs
export const idCardsApi = {
  list: (page: number = 1, pageSize: number = 10, cardType?: string, status?: string) =>
    apiGet<IDCardListResponse>(
      `/api/certificates/idcards?page=${page}&pageSize=${pageSize}${cardType ? `&cardType=${cardType}` : ''}${status ? `&status=${status}` : ''}`
    ),

  getById: (id: string) =>
    apiGet<IDCardResponse>(`/api/certificates/idcards/${id}`),

  getByHolder: (holderId: string, holderType: string = 'Student') =>
    apiGet<IDCardListResponse>(`/api/certificates/idcards/holder/${holderId}?holderType=${holderType}`),

  create: (data: CreateIDCardRequest) =>
    apiPost<IDCardResponse>('/api/certificates/idcards', data),

  update: (id: string, data: UpdateIDCardRequest) =>
    apiPut<IDCardResponse>(`/api/certificates/idcards/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/api/certificates/idcards/${id}`),

  generate: (id: string) =>
    apiPost<IDCardResponse>(`/api/certificates/idcards/${id}/generate`, {}),

  markAsPrinted: (id: string) =>
    apiPost<IDCardResponse>(`/api/certificates/idcards/${id}/print`, {}),
};
