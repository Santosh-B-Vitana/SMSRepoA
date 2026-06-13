export type AnnouncementAudience = 'All' | 'Parents' | 'Students' | 'Teachers' | 'Staff' | 'Admin';
export type AnnouncementPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export interface Announcement {
    id: string;
    title: string;
    content: string;
    audience: AnnouncementAudience[];
    priority: AnnouncementPriority;
    publishedAt: string;
    expiresAt?: string;
    publishedBy: string;
    schoolId: string;
    attachmentUrl?: string;
    isRead?: boolean;
    imageUrl?: string;
    tags?: string[];
}
export interface CreateAnnouncementRequest {
    title: string;
    content: string;
    audience: AnnouncementAudience[];
    priority: AnnouncementPriority;
    expiresAt?: string;
    attachmentUrl?: string;
    tags?: string[];
}
//# sourceMappingURL=announcements.d.ts.map