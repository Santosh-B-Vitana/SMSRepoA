export type UserRole = 'SuperAdmin' | 'Admin' | 'Principal' | 'Teacher' | 'Staff' | 'HRManager' | 'Accountant' | 'Librarian' | 'TransportManager' | 'HostelWarden' | 'Receptionist' | 'Parent' | 'Student';
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    schoolId: string;
    fullName: string;
    linkedEntityId: string;
    profileImageUrl?: string;
}
export interface LoginRequest {
    username: string;
    password: string;
    schoolDomain?: string;
}
export interface LoginResponse {
    token: string;
    refreshToken: string;
    expiration: string;
    user: UserProfile;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface RefreshTokenResponse {
    token: string;
    refreshToken: string;
    expiration: string;
}
export interface TwoFactorLoginRequest {
    username: string;
    code: string;
    schoolDomain?: string;
}
//# sourceMappingURL=auth.d.ts.map