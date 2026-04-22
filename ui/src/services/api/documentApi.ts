/**
 * Document API — connects to /api/documents endpoints
 * AllStaff: list categories, list docs, get doc, upload doc, search, increment download
 * Admin/Principal: create/update/delete categories, delete docs, stats
 */
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DocumentCategory {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder: number;
  isActive: boolean;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategoryListResponse {
  categories: DocumentCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentItem {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  categoryId: string;
  categoryName?: string;
  uploadedByStaffId: string;
  uploaderName?: string;
  accessLevel: string;
  relatedClassId?: string;
  relatedSectionId?: string;
  relatedStudentId?: string;
  relatedStaffId?: string;
  tags?: string;
  downloadCount: number;
  isActive: boolean;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentStats {
  totalDocuments: number;
  totalCategories: number;
  totalDownloads: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  addedLast7Days: number;
  addedLast30Days: number;
  byCategory: Record<string, number>;
  byAccessLevel: Record<string, number>;
  byFileType: Record<string, number>;
}

export interface CreateDocumentCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface UpdateDocumentCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateDocumentRequest {
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  categoryId: string;
  accessLevel: string;
  relatedClassId?: string;
  relatedSectionId?: string;
  relatedStudentId?: string;
  relatedStaffId?: string;
  tags?: string;
  expiryDate?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  categoryId?: string;
  accessLevel?: string;
  relatedClassId?: string;
  relatedSectionId?: string;
  relatedStudentId?: string;
  relatedStaffId?: string;
  tags?: string;
  expiryDate?: string;
  isActive?: boolean;
}

// ─── Category API ───────────────────────────────────────────────────────────

export const getCategories = (page = 1, pageSize = 50) =>
  apiGet<DocumentCategoryListResponse>(`/documents/categories?page=${page}&pageSize=${pageSize}`);

export const getCategoryById = (id: string) =>
  apiGet<DocumentCategory>(`/documents/categories/${id}`);

export const createCategory = (data: CreateDocumentCategoryRequest) =>
  apiPost<DocumentCategory>("/documents/categories", data);

export const updateCategory = (id: string, data: UpdateDocumentCategoryRequest) =>
  apiPut<DocumentCategory>(`/documents/categories/${id}`, data);

export const deleteCategory = (id: string) =>
  apiDelete<{ success: boolean; message: string }>(`/documents/categories/${id}`);

// ─── Document API ───────────────────────────────────────────────────────────

export interface GetDocumentsParams {
  categoryId?: string;
  accessLevel?: string;
  relatedClassId?: string;
  relatedSectionId?: string;
  page?: number;
  pageSize?: number;
}

export const getDocuments = (params: GetDocumentsParams = {}) => {
  const query = new URLSearchParams();
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.accessLevel) query.set("accessLevel", params.accessLevel);
  if (params.relatedClassId) query.set("relatedClassId", params.relatedClassId);
  if (params.relatedSectionId) query.set("relatedSectionId", params.relatedSectionId);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return apiGet<DocumentListResponse>(`/documents?${query.toString()}`);
};

export const getDocumentById = (id: string) =>
  apiGet<DocumentItem>(`/documents/${id}`);

export const createDocument = (data: CreateDocumentRequest) =>
  apiPost<DocumentItem>("/documents", data);

export const updateDocument = (id: string, data: UpdateDocumentRequest) =>
  apiPut<DocumentItem>(`/documents/${id}`, data);

export const deleteDocument = (id: string) =>
  apiDelete<{ success: boolean; message: string }>(`/documents/${id}`);

export const incrementDownload = (id: string) =>
  apiPut<{ success: boolean; message: string }>(`/documents/${id}/download`, {});

export const searchDocuments = (searchTerm: string) =>
  apiGet<DocumentItem[]>(`/documents/search?searchTerm=${encodeURIComponent(searchTerm)}`);

export const getDocumentStats = () =>
  apiGet<DocumentStats>("/documents/stats");
