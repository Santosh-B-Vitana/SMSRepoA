import { apiClient, ApiError } from '../client';
import type { LoginRequest, LoginResponse, RefreshTokenResponse } from '@vitana/shared-types';

// Discriminated union for login response — backend returns different shapes for 2FA
export type LoginApiResponse =
  | (LoginResponse & { requiresTwoFactor?: false })
  | { requiresTwoFactor: true; email: string };

export interface PublicBrandingResponse {
  schoolName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export const authApi = {
  login: (data: LoginRequest): Promise<LoginApiResponse> =>
    apiClient.post('/auth/login', data),

  refresh: (accessToken: string, refreshToken: string): Promise<RefreshTokenResponse> =>
    apiClient.post('/auth/refresh', { accessToken, refreshToken }),

  refreshToken: (refreshToken: string): Promise<{ token: string; refreshToken: string }> =>
    apiClient.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string): Promise<void> =>
    apiClient.post('/auth/logout', { refreshToken }),

  twoFactorLogin: (email: string, totp: string): Promise<LoginResponse> =>
    apiClient.post('/auth/2fa/login', { email, totp }),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),

  getPublicBranding: async (domain: string): Promise<PublicBrandingResponse> => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
    const response = await fetch(
      `${baseUrl}/settings/public-branding?domain=${encodeURIComponent(domain)}`,
    );
    const json = (await response.json()) as { success: boolean; data: PublicBrandingResponse; message?: string };
    if (!json.success) {
      throw new ApiError(json.message ?? 'School not found', response.status);
    }
    return json.data;
  },
};
