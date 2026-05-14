import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentResponse {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  content: string;
  likesCount: number;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  isLikedByCurrentUser: boolean;
  replies: CommentResponse[];
}

export interface CommentListResponse {
  comments: CommentResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PostResponse {
  id: string;
  schoolId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  content: string;
  mediaType?: 'image' | 'video' | 'document' | 'link';
  mediaUrl?: string;
  visibility: 'public' | 'class' | 'group' | 'staff' | 'parent' | 'private';
  targetClassId?: string;
  targetGroupId?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isPinned: boolean;
  pinnedAt?: string;
  isScheduled: boolean;
  scheduledPublishAt?: string;
  isPublished: boolean;
  isReported: boolean;
  reportCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isLikedByCurrentUser: boolean;
  recentComments: CommentResponse[];
}

export interface PostListResponse {
  posts: PostResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreatePostDto {
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  mediaType?: 'image' | 'video' | 'document' | 'link';
  mediaUrl?: string;
  visibility: 'public' | 'class' | 'group' | 'staff' | 'parent' | 'private';
  targetClassId?: string;
  tags?: string[];
  isScheduled?: boolean;
  scheduledPublishAt?: string;
}

export interface UploadMediaResponse {
  url: string;
  mediaType: 'image' | 'document';
  fileName: string;
  fileSizeBytes: number;
}

export interface UpdatePostDto {
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  visibility?: string;
  tags?: string[];
}

export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

export interface LikeResponse {
  isLiked: boolean;
  totalLikes: number;
}

export interface AnalyticsResponse {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  totalActiveUsers: number;
  postsThisWeek: number;
  postsThisMonth: number;
  engagementRate: number;
  totalReach: number;
  pendingReports: number;
  topPosts: { postId: string; content: string; authorName: string; engagement: number }[];
  topAuthors: { authorId: string; authorName: string; authorRole: string; postCount: number; totalEngagement: number }[];
}

export interface ReportDto {
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  details?: string;
}

export interface PostFilters {
  page?: number;
  pageSize?: number;
  visibility?: string;
  authorId?: string;
  authorRole?: string;
  isPinned?: boolean;
  searchTerm?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const BASE = '/schoolconnect';

export const schoolConnectApi = {
  // Posts
  getPosts: (params?: PostFilters) =>
    apiClient.get<PostListResponse>(`${BASE}/posts`, { params }).then(r => r.data),

  getMyPosts: (params?: { page?: number; pageSize?: number; searchTerm?: string }) =>
    apiClient.get<PostListResponse>(`${BASE}/posts/mine`, { params }).then(r => r.data),

  getPost: (id: string) =>
    apiClient.get<PostResponse>(`${BASE}/posts/${id}`).then(r => r.data),

  createPost: (dto: CreatePostDto) =>
    apiClient.post<PostResponse>(`${BASE}/posts`, dto).then(r => r.data),

  updatePost: (id: string, dto: UpdatePostDto) =>
    apiClient.put<PostResponse>(`${BASE}/posts/${id}`, dto).then(r => r.data),

  deletePost: (id: string) =>
    apiClient.delete(`${BASE}/posts/${id}`),

  getPinnedPosts: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PostListResponse>(`${BASE}/posts/pinned`, { params }).then(r => r.data),

  getScheduledPosts: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PostListResponse>(`${BASE}/posts/scheduled`, { params }).then(r => r.data),

  // Comments
  getComments: (postId: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<CommentListResponse>(`${BASE}/posts/${postId}/comments`, { params }).then(r => r.data),

  createComment: (postId: string, dto: CreateCommentDto) =>
    apiClient.post<CommentResponse>(`${BASE}/posts/${postId}/comments`, dto).then(r => r.data),

  updateComment: (commentId: string, content: string) =>
    apiClient.put<CommentResponse>(`${BASE}/comments/${commentId}`, { content }).then(r => r.data),

  deleteComment: (commentId: string) =>
    apiClient.delete(`${BASE}/comments/${commentId}`),

  // Likes
  likePost: (postId: string) =>
    apiClient.post<LikeResponse>(`${BASE}/posts/${postId}/like`).then(r => r.data),

  likeComment: (commentId: string) =>
    apiClient.post<LikeResponse>(`${BASE}/comments/${commentId}/like`).then(r => r.data),

  // Pin
  pinPost: (postId: string, isPinned: boolean) =>
    apiClient.post(`${BASE}/posts/${postId}/pin`, { isPinned }).then(r => r.data),

  // Share
  sharePost: (postId: string) =>
    apiClient.post(`${BASE}/posts/${postId}/share`, { shareType: 'internal' }).then(r => r.data),

  // Report
  reportPost: (postId: string, dto: ReportDto) =>
    apiClient.post(`${BASE}/posts/${postId}/report`, dto).then(r => r.data),

  // Analytics (admin)
  getAnalytics: () =>
    apiClient.get<AnalyticsResponse>(`${BASE}/analytics`).then(r => r.data),

  // Moderation (admin)
  getModerationQueue: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiClient.get(`${BASE}/moderation`, { params }).then(r => r.data),

  reviewReport: (reportId: string, status: string, hidePost?: boolean) =>
    apiClient.post(`${BASE}/moderation/${reportId}/review`, { status, hidePost }).then(r => r.data),

  // Media upload
  uploadMedia: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<UploadMediaResponse>(`${BASE}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
