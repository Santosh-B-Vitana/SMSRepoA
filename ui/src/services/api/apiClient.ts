import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5092/api';
const ACADEMIC_YEAR_KEY = 'selectedAcademicYearName';

//Extract token from sessionStorage or localStorage
function getAuthToken(): string | null {
  // Primary: sessionStorage (where AuthContext stores the full session object)
  try {
    const sessionKey = 'auth_session';
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) return session.token;
    }
  } catch {
    // ignore parsing errors
  }
  
  // Fallback: localStorage (where AuthContext also stores the token)
  return localStorage.getItem('authToken');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SA_SCHOOL_KEY = 'sa_school_override'; // super admin active school context

// Request interceptor - Add auth token and school ID
apiClient.interceptors.request.use(
  (config) => {
    // Get auth token from sessionStorage or localStorage
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Get school ID from localStorage
    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      config.headers['X-School-Id'] = schoolId;
    }

    const selectedAcademicYear = localStorage.getItem(ACADEMIC_YEAR_KEY);
    if (selectedAcademicYear) {
      config.headers['X-Academic-Year'] = selectedAcademicYear;
    }

    // Super admin school context: send selected school ID so backend scopes queries correctly
    try {
      const raw = sessionStorage.getItem('auth_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.user?.role === 'super_admin') {
          const overrideSchoolId = sessionStorage.getItem(SA_SCHOOL_KEY);
          if (overrideSchoolId) {
            config.headers['X-School-Override'] = overrideSchoolId;
          }
        }
      }
    } catch {
      // ignore
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Unwrap ApiResponseWrapper envelope + handle errors globally
// Backend wraps all success responses: { success: true, data: T, timestamp, correlationId }
apiClient.interceptors.response.use(
  (response) => {
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
    if (error.response) {
      // Server responded with error status
      const { status } = error.response;

      if (status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('schoolId');
        window.location.href = '/login';
      } else if (status === 403) {
        console.error('Access forbidden:', error.response.data);
      } else if (status === 404) {
        console.error('Resource not found:', error.response.data);
      } else if (status >= 500) {
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
