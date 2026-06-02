/**
 * Real API Client — connects the UI to the sms-api backend at localhost:5092
 *
 * All service modules import from here. No magic strings elsewhere.
 */
import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const SESSION_AUTH_KEY = "auth_session";
const TOKEN_KEY = "authToken"; // legacy key used by reference SPA
const ACADEMIC_YEAR_KEY = "selectedAcademicYearName";
const SA_SCHOOL_KEY = "sa_school_override"; // super admin active school context

/** Pull the JWT from wherever AuthContext stored it */
function getToken(): string | null {
  // Primary: sessionStorage (our AuthContext stores the full session object)
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      return session?.token ?? null;
    }
  } catch {
    // ignore
  }
  // Fallback: localStorage (used by reference SPA)
  return localStorage.getItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Inject token on every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Global academic year chosen in navbar/year context.
  const selectedAcademicYear = localStorage.getItem(ACADEMIC_YEAR_KEY);
  if (selectedAcademicYear) {
    config.headers["X-Academic-Year"] = selectedAcademicYear;
  }

  // Super admin school context: when super admin selects a school to "act as",
  // send its ID so the backend scopes all queries to that school.
  try {
    const raw = sessionStorage.getItem("auth_session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.user?.role === "super_admin") {
        const overrideSchoolId = sessionStorage.getItem(SA_SCHOOL_KEY);
        if (overrideSchoolId) {
          config.headers["X-School-Override"] = overrideSchoolId;
        }
      }
    }
  } catch {
    // ignore
  }

  return config;
});

// Auto-logout on 401 + unwrap ApiResponseWrapper envelope
// Backend wraps all success responses: { success: true, data: T, timestamp, correlationId }
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
      // Redirect only if not already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<T>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<T>(url, body);
  return res.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<T>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete<T>(url);
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<T>(url, body);
  return res.data;
}
