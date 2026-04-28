import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  generateSessionId, 
  clearRateLimit, 
  recordFailedAttempt, 
  checkRateLimit,
  maskEmail 
} from '@/utils/authValidation';
import axios from 'axios';

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  schoolId?: string;
  staffData?: {
    employeeId: string;
    department: string;
    designation: string;
  };
  parentData?: {
    children: string[];
  };
}

interface AuthSession {
  user: User;
  sessionId: string;
  expiresAt: number;
  createdAt: number;
  token?: string;        // JWT from real backend
  refreshToken?: string; // Refresh token from real backend
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  sessionExpiresAt: number | null;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session configuration
const SESSION_CONFIG = {
  duration: 8 * 60 * 60 * 1000, // 8 hours
  warningThreshold: 15 * 60 * 1000, // 15 minutes before expiry
  storageKey: 'auth_session',
};

// Get session from storage with validation
function getStoredSession(): AuthSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_CONFIG.storageKey);
    if (!stored) return null;

    const session: AuthSession = JSON.parse(stored);
    
    // Validate session structure
    if (!session.user || !session.sessionId || !session.expiresAt) {
      sessionStorage.removeItem(SESSION_CONFIG.storageKey);
      return null;
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_CONFIG.storageKey);
      return null;
    }

    return session;
  } catch {
    sessionStorage.removeItem(SESSION_CONFIG.storageKey);
    return null;
  }
}

// Store session securely
function storeSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(SESSION_CONFIG.storageKey, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to store session');
  }
}

// Clear session — removes all auth state from both storages
function clearSession(): void {
  sessionStorage.removeItem(SESSION_CONFIG.storageKey);
  localStorage.removeItem('authToken');
  localStorage.removeItem('schoolId');
  localStorage.removeItem('currentUser'); // Legacy cleanup
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  // Initialize auth state from stored session
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setSessionExpiresAt(session.expiresAt);
    }
    setLoading(false);
  }, []);

  // Session expiry warning
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const checkExpiry = () => {
      const timeUntilExpiry = sessionExpiresAt - Date.now();
      
      if (timeUntilExpiry <= 0) {
        // Session expired
        logout();
        window.location.href = '/login?expired=true';
      } else if (timeUntilExpiry <= SESSION_CONFIG.warningThreshold) {
        // Could show a warning toast here
        console.warn('Session expiring soon');
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check rate limiting
      const rateLimitCheck = checkRateLimit(normalizedEmail);
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.message || 'Too many login attempts. Please try again later.');
      }

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // -----------------------------------------------------------------------
      // Real API call to backend
      // -----------------------------------------------------------------------
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5092/api';
      let data: any;
      try {
        const response = await axios.post(`${apiBase}/auth/login`, {
          username: normalizedEmail,
          password,
        });
        // Backend wraps every response as { success, data: T }.
        // This axios call uses raw axios (not the interceptor-equipped apiClient),
        // so we manually unwrap the envelope here.
        data = response.data?.data ?? response.data;
      } catch (axiosError: any) {
        recordFailedAttempt(normalizedEmail);
        const msg =
          axiosError?.response?.data?.message ??
          axiosError?.message ??
          'Invalid email or password';
        throw new Error(msg);
      }

      // Clear rate limit on success
      clearRateLimit(normalizedEmail);

      // Map backend UserInfo → our User type
      const backendUser = data.user;
      const roleMap: Record<string, UserRole> = {
        super_admin: 'super_admin',
        superadmin: 'super_admin',
        admin: 'admin',
        staff: 'staff',
        teacher: 'staff',
        parent: 'parent',
      };
      const mappedRole: UserRole = roleMap[backendUser.role?.toLowerCase()] ?? 'staff';

      const userWithoutPassword: User = {
        id: String(backendUser.id),
        name: `${backendUser.firstName ?? ''} ${backendUser.lastName ?? ''}`.trim() || backendUser.email,
        email: backendUser.email,
        role: mappedRole,
        schoolId: backendUser.schoolId ? String(backendUser.schoolId) : undefined,
      };

      // Create session — include token so apiClient.ts can read it
      const expiresAt = data.expiration
        ? new Date(data.expiration).getTime()
        : Date.now() + SESSION_CONFIG.duration;

      const session: AuthSession = {
        user: userWithoutPassword,
        sessionId: generateSessionId(),
        expiresAt,
        createdAt: Date.now(),
        token: data.token,
        refreshToken: data.refreshToken,
      };

      // Store session and update state
      storeSession(session);
      // Also store token in localStorage so the existing real API client (services/api/apiClient.ts) can pick it up
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      if (userWithoutPassword.schoolId) {
        localStorage.setItem('schoolId', userWithoutPassword.schoolId);
      }
      setUser(userWithoutPassword);
      setSessionExpiresAt(session.expiresAt);

      // Log successful login (masked for security)
      console.info(`Login successful for ${maskEmail(normalizedEmail)}`);

      // Navigate to appropriate dashboard
      const dashboardRoutes: Record<UserRole, string> = {
        super_admin: '/super-admin-dashboard',
        admin: '/admin-dashboard',
        staff: '/staff-dashboard',
        parent: '/parent-dashboard',
      };

      window.location.href = dashboardRoutes[userWithoutPassword.role] || '/dashboard';
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    localStorage.removeItem('authToken');
    localStorage.removeItem('schoolId');
    setUser(null);
    setSessionExpiresAt(null);
    window.location.href = '/login';
  }, []);

  const refreshSession = useCallback(() => {
    const session = getStoredSession();
    if (session && user) {
      const newSession: AuthSession = {
        ...session,
        expiresAt: Date.now() + SESSION_CONFIG.duration,
      };
      storeSession(newSession);
      setSessionExpiresAt(newSession.expiresAt);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    sessionExpiresAt,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
