import axios, { type AxiosRequestConfig } from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const ACADEMIC_YEAR_KEY = 'selectedAcademicYearName';
const AUTH_SESSION_KEY = 'auth_session';
const SA_SCHOOL_KEY = 'sa_school_override';

interface StoredSession {
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: { role?: string };
}

function getStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (raw) return JSON.parse(raw) as StoredSession;
  } catch {
    // ignore parsing errors
  }
  return null;
}

function getAuthToken(): string | null {
  const session = getStoredSession();
  if (session?.token) return session.token;
  // Fallback: localStorage (legacy path)
  return localStorage.getItem('authToken');
}

function getRefreshToken(): string | null {
  const session = getStoredSession();
  return session?.refreshToken ?? null;
}

/** Wipes all auth state from both storages — used on logout and terminal 401. */
export function clearAuthSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem('authToken');
  localStorage.removeItem('schoolId');
  localStorage.removeItem('currentUser');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track in-flight token refresh to avoid parallel refresh storms
let _refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  const accessToken = getAuthToken();
  const refreshToken = getRefreshToken();
  if (!refreshToken || !accessToken) return null;

  _refreshPromise = axios
    .post<{ data?: { token?: string; refreshToken?: string } } | { token?: string; refreshToken?: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { accessToken, refreshToken },
    )
    .then((res) => {
      // Backend may return envelope { success, data } or raw
      const payload =
        res.data && 'data' in res.data && res.data.data
          ? res.data.data
          : (res.data as { token?: string; refreshToken?: string });

      const newToken = payload.token;
      if (!newToken) return null;

      // Persist updated tokens into session
      try {
        const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
        if (raw) {
          const session: StoredSession = JSON.parse(raw);
          session.token = newToken;
          if (payload.refreshToken) session.refreshToken = payload.refreshToken;
          sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        }
        localStorage.setItem('authToken', newToken);
      } catch {
        // ignore storage errors
      }

      return newToken;
    })
    .catch(() => null)
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

// ── Request interceptor — attach auth headers ──────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      config.headers['X-School-Id'] = schoolId;
    }

    const selectedAcademicYear = localStorage.getItem(ACADEMIC_YEAR_KEY);
    if (selectedAcademicYear) {
      config.headers['X-Academic-Year'] = selectedAcademicYear;
    }

    // Super admin school context
    const session = getStoredSession();
    if (session?.user?.role === 'super_admin') {
      const overrideSchoolId = sessionStorage.getItem(SA_SCHOOL_KEY);
      if (overrideSchoolId) {
        config.headers['X-School-Override'] = overrideSchoolId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — unwrap envelope + auto-refresh on 401 ───────────
// Backend wraps all success responses: { success: true, data: T, timestamp, correlationId }
apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = (response.data as { data: unknown }).data;
    }
    return response;
  },
  async (error) => {
    const originalConfig = error.config as AxiosRequestConfig & { _retried?: boolean };

    if (error.response?.status === 401 && !originalConfig._retried) {
      originalConfig._retried = true;

      const newToken = await attemptTokenRefresh();
      if (newToken) {
        // Retry with the fresh token
        if (originalConfig.headers) {
          (originalConfig.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalConfig);
      }

      // Refresh failed — clear all auth state and redirect to login
      clearAuthSession();
      window.location.href = '/login?expired=true';
      return Promise.reject(error);
    }

    if (error.response) {
      const { status } = error.response as { status: number };
      if (status === 403) {
        console.warn('Access forbidden:', (error.response as { data: unknown }).data);
      } else if (status >= 500) {
        console.error('Server error:', (error.response as { data: unknown }).data);
      }
    } else if (error.request) {
      console.error('No response from server — possible network issue');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
