import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useAcademicYearStore } from '@/stores/academicYearStore';
import { API_TIMEOUT_MS } from '@/lib/constants';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    const { academicYear } = useAcademicYearStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (academicYear) {
      config.headers['X-Academic-Year'] = academicYear;
    }
    config.headers['X-Correlation-ID'] = generateUUID();

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─── 401 refresh queue ──────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: Error) => void }[] = [];

function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
}

async function handleTokenRefresh(originalError: AxiosError): Promise<unknown> {
  const originalConfig = originalError.config as AxiosRequestConfig & { _retry?: boolean };

  if (originalConfig._retry) {
    return Promise.reject(originalError);
  }

  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((token) => {
      if (originalConfig.headers) {
        originalConfig.headers['Authorization'] = `Bearer ${token}`;
      }
      return apiClient(originalConfig);
    });
  }

  originalConfig._retry = true;
  isRefreshing = true;

  const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();

  try {
    const response = await axios.post<{ token: string; refreshToken: string }>(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );

    const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;
    updateTokens(newAccessToken, newRefreshToken);
    processQueue(null, newAccessToken);

    if (originalConfig.headers) {
      originalConfig.headers['Authorization'] = `Bearer ${newAccessToken}`;
    }
    return apiClient(originalConfig);
  } catch (refreshError) {
    processQueue(refreshError instanceof Error ? refreshError : new Error('Token refresh failed'), null);
    clearAuth();
    router.replace('/(auth)/login');
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}

// ─── Response interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the { success: true, data: ... } envelope
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      return handleTokenRefresh(error);
    }
    return Promise.reject(normalizeApiError(error));
  },
);

// ─── Error normalisation ────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(message: string, status: number, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.traceId = traceId;
  }
}

function normalizeApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const message =
    (data?.message as string) ??
    (data?.title as string) ??
    error.message ??
    'An unexpected error occurred';
  const traceId = (data?.traceId as string) ?? undefined;
  return new ApiError(message, status, traceId);
}
