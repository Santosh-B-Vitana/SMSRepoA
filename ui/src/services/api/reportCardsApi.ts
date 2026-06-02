import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportCardSubjectDto {
  subjectName: string;
  subjectCode: string;
  subjectType?: string;
  t1TheoryMax?: number;
  t1TheoryObtained?: number;
  t1PracticalMax?: number;
  t1PracticalObtained?: number;
  t1Grade?: string;
  t1GradePoint?: number;
  t2TheoryMax?: number;
  t2TheoryObtained?: number;
  t2PracticalMax?: number;
  t2PracticalObtained?: number;
  t2Grade?: string;
  t2GradePoint?: number;
  annualMax?: number;
  annualObtained?: number;
  annualPercentage?: number;
  finalGrade?: string;
  finalGradePoint?: number;
  isPass: boolean;
  remarks?: string;
}

export interface CoScholasticItemDto {
  area: string;
  subArea: string;
  t1Grade?: string;
  t2Grade?: string;
  remarks?: string;
}

export interface AttendanceSummaryDto {
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  attendancePercentage: number;
  t1WorkingDays?: string;
  t1DaysPresent?: string;
  t2WorkingDays?: string;
  t2DaysPresent?: string;
}

export interface ReportCardDocumentDto {
  id: string;
  schoolId: string;
  studentId: string;
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  schoolAffiliationNo?: string;
  studentName: string;
  admissionNo?: string;
  rollNumber?: string;
  dateOfBirth?: string;
  className?: string;
  sectionName?: string;
  fatherName?: string;
  motherName?: string;
  studentPhotoUrl?: string;
  houseColor?: string;
  academicYear: string;
  term: string;
  examName?: string;
  boardType: string;
  boardAffiliationNo?: string;
  templateStyle: string;
  orientation: string;
  subjects: ReportCardSubjectDto[];
  coScholasticItems: CoScholasticItemDto[];
  attendance?: AttendanceSummaryDto;
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  overallGrade?: string;
  cgpa?: number;
  classRank?: number;
  totalStudentsInClass?: number;
  resultStatus: string;
  teacherRemarks?: string;
  principalRemarks?: string;
  classTeacherName?: string;
  principalName?: string;
  issueDate?: string;
  isEdited: boolean;
  editRemarks?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportCardListResponse {
  items: ReportCardDocumentDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReportCardStatsResponse {
  totalGenerated: number;
  totalDistributed: number;
  totalDraft: number;
  totalEdited: number;
  totalPassed: number;
  totalFailed: number;
  classAveragePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  byBoardType: Record<string, number>;
  byGrade: Record<string, number>;
}

export interface TemplatePreviewResponse {
  templateStyle: string;
  displayName: string;
  description: string;
  boardCompatibility: string;
  primaryColor: string;
  previewImageUrl: string;
  sampleHtml: string;
}

export interface GenerateReportCardRequest {
  studentId: string;
  examSetupId?: string;
  academicYear: string;
  term: string;
  boardType?: string;
  templateStyle?: string;
  orientation?: string;
  customLogoUrl?: string;
  includeCoScholastic?: boolean;
  includeAttendance?: boolean;
}

export interface BulkGenerateRequest {
  classId?: string;
  sectionId?: string;
  studentIds?: string[];
  academicYear: string;
  term: string;
  boardType?: string;
  templateStyle?: string;
  orientation?: string;
  includeCoScholastic?: boolean;
  includeAttendance?: boolean;
}

export interface EditReportCardRequest {
  correctedSubjects?: ReportCardSubjectDto[];
  teacherRemarks?: string;
  principalRemarks?: string;
  overridePercentage?: number;
  overrideOverallGrade?: string;
  overrideCGPA?: number;
  overrideResultStatus?: string;
  editRemarks: string;
  templateStyle?: string;
}

export interface EditCertificateRequest {
  title?: string;
  content?: string;
  metadata?: string;
  validUntil?: string;
  editReason: string;
}

// ─── Board & template constants ────────────────────────────────────────────────

export const BOARD_TYPES = ['CBSE', 'ICSE', 'ISC', 'StateBoard', 'IGCSE', 'IB', 'Custom'] as const;
export const TEMPLATE_STYLES = [
  { value: 'CBSE_Classic',     label: 'CBSE Classic',      color: '#800020' },
  { value: 'CBSE_Modern',      label: 'CBSE Modern',       color: '#1565c0' },
  { value: 'ICSE_Standard',    label: 'ICSE Standard',     color: '#1b5e20' },
  { value: 'StateBoard_Elite', label: 'State Board Elite', color: '#ff6f00' },
  { value: 'Modern_Premium',   label: 'Modern Premium',    color: '#4a148c' },
] as const;

export const DOWNLOAD_FORMATS = [
  { value: 'PDF',   label: 'PDF Document (.pdf)',                icon: '📄' },
  { value: 'Excel', label: 'Excel Workbook (.xlsx)',             icon: '📊' },
  { value: 'HTML',  label: 'HTML (Print to PDF)',                icon: '🌐' },
  { value: 'CSV',   label: 'CSV Spreadsheet (.csv)',             icon: '📋' },
] as const;

// ─── API helpers ───────────────────────────────────────────────────────────────

const BASE = '/report-card-documents';

// Trigger browser download from a blob
function triggerDownload(bytes: Blob, filename: string) {
  const url = URL.createObjectURL(bytes);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const reportCardDocumentsApi = {
  // ── Template gallery
  getTemplateGallery: () =>
    apiGet<TemplatePreviewResponse[]>(`${BASE}/templates/gallery`),

  // ── List
  list: (params?: {
    page?: number; pageSize?: number; classId?: string; sectionId?: string;
    academicYear?: string; term?: string; status?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page)         q.set('page', String(params.page));
    if (params?.pageSize)     q.set('pageSize', String(params.pageSize));
    if (params?.classId)      q.set('classId', params.classId);
    if (params?.sectionId)    q.set('sectionId', params.sectionId);
    if (params?.academicYear) q.set('academicYear', params.academicYear);
    if (params?.term)         q.set('term', params.term);
    if (params?.status)       q.set('status', params.status);
    return apiGet<ReportCardListResponse>(`${BASE}?${q}`);
  },

  // ── Get single
  get: (id: string) =>
    apiGet<ReportCardDocumentDto>(`${BASE}/${id}`),

  // ── Stats
  getStats: (academicYear?: string, term?: string) => {
    const q = new URLSearchParams();
    if (academicYear) q.set('academicYear', academicYear);
    if (term)         q.set('term', term);
    return apiGet<ReportCardStatsResponse>(`${BASE}/stats?${q}`);
  },

  // ── Generate
  generate: (req: GenerateReportCardRequest) =>
    apiPost<ReportCardDocumentDto>(`${BASE}/generate`, req),

  // ── Bulk generate
  bulkGenerate: (req: BulkGenerateRequest) =>
    apiPost<{ count: number; items: ReportCardDocumentDto[] }>(`${BASE}/generate/bulk`, req),

  // ── Edit/correct
  edit: (id: string, req: EditReportCardRequest) =>
    apiPut<ReportCardDocumentDto>(`${BASE}/${id}/edit`, req),

  // ── Delete
  delete: (id: string) =>
    apiDelete(`${BASE}/${id}`),

  // ── Mark distributed
  markDistributed: (id: string) =>
    apiPost(`${BASE}/${id}/distribute`, {}),

  // ── Download (returns file blob)
  downloadUrl: (id: string, format: string, templateStyle?: string) => {
    const q = new URLSearchParams({ format });
    if (templateStyle) q.set('templateStyle', templateStyle);
    return `${BASE}/${id}/download?${q}`;
  },

  // ── Bulk download URL
  bulkDownloadUrl: (params: {
    academicYear: string; term: string;
    classId?: string; sectionId?: string; format?: string;
  }) => {
    const q = new URLSearchParams({ academicYear: params.academicYear, term: params.term, format: params.format ?? 'Excel' });
    if (params.classId)   q.set('classId', params.classId);
    if (params.sectionId) q.set('sectionId', params.sectionId);
    return `${BASE}/download/bulk?${q}`;
  },

  // ── Edit certificate
  editCertificate: (certId: string, req: EditCertificateRequest) =>
    apiPut(`/report-card-documents/certificates/${certId}/edit`, req),

  // ── Download certificate URL
  downloadCertificateUrl: (certId: string, format: string, templateStyle?: string) => {
    const q = new URLSearchParams({ format });
    if (templateStyle) q.set('templateStyle', templateStyle);
    return `/report-card-documents/certificates/${certId}/download?${q}`;
  },
};
