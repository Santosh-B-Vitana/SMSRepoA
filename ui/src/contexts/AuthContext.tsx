import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  generateSessionId, 
  clearRateLimit, 
  recordFailedAttempt, 
  checkRateLimit,
  maskEmail 
} from '@/utils/authValidation';
import axios from 'axios';
import { toast } from 'sonner';

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'parent';

/**
 * Canonical role designations. The `role` field holds the portal type
 * (admin / staff / parent), while `designation` holds the specific role
 * exactly as configured in Role Management (e.g. "Principal", "Class Teacher").
 */
export const STAFF_DESIGNATIONS = [
  'Principal', 'Vice Principal', 'Head of Department',
  'Class Teacher', 'Teacher', 'Accountant', 'HR Manager',
  'Librarian', 'Transport Manager', 'Hostel Warden',
  'Admissions Officer', 'Counselor', 'Receptionist', 'Front Desk Officer', 'Staff',
] as const;

export type StaffDesignation = typeof STAFF_DESIGNATIONS[number];

/** Normalize a raw role string from the backend into a canonical designation. */
export function normalizeDesignation(rawRole: string): string {
  const map: Record<string, string> = {
    admin:               'Admin',
    principal:           'Principal',
    'vice principal':    'Vice Principal',
    viceprincipal:       'Vice Principal',
    'head of department':'Head of Department',
    hod:                 'Head of Department',
    'class teacher':     'Class Teacher',
    classteacher:        'Class Teacher',
    teacher:             'Teacher',
    accountant:          'Accountant',
    'hr manager':        'HR Manager',
    hrmanager:           'HR Manager',
    librarian:           'Librarian',
    'transport manager': 'Transport Manager',
    transportmanager:    'Transport Manager',
    'hostel warden':     'Hostel Warden',
    warden:              'Hostel Warden',
    'admissions officer':'Admissions Officer',
    counselor:           'Counselor',
    receptionist:        'Receptionist',
    'front desk officer':'Front Desk Officer',
    'front desk':        'Front Desk Officer',
    parent:              'Parent',
    student:             'Student',
    staff:               'Staff',
  };
  const lower = rawRole?.toLowerCase() ?? '';
  return map[lower] ?? (rawRole
    ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1)
    : 'Staff');
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Specific role designation e.g. "Principal", "Class Teacher", "Librarian" */
  designation?: string;
  avatar?: string;
  schoolId?: string;
  requirePasswordChange?: boolean;
  /** For staff accounts: the StaffMember.Id (used for attendance/balance lookups) */
  linkedEntityId?: string;
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
  refreshCurrentUser: () => Promise<void>;
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
  localStorage.removeItem('currentUserId');
  window.dispatchEvent(new Event('vitanaUserChanged'));
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
  // Initialize synchronously from sessionStorage to avoid a loading flash on page load
  const [user, setUser] = useState<User | null>(() => getStoredSession()?.user ?? null);
  const [loading, setLoading] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(
    () => getStoredSession()?.expiresAt ?? null
  );

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

  // Backfill avatar: when a stored session doesn't have the photo yet (e.g. sessions
  // created before the profilePhoto field was added), call /auth/me once to get it.
  useEffect(() => {
    if (!user || user.avatar) return; // already has avatar, nothing to do
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
    axios.get(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const me = res.data?.data ?? res.data;
        const photo: string | undefined = me?.profilePhoto || undefined;
        if (photo) {
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, avatar: photo };
            // Persist into sessionStorage so this survives page refreshes
            const stored = getStoredSession();
            if (stored) storeSession({ ...stored, user: updated });
            return updated;
          });
        }
      })
      .catch(() => { /* silently ignore — avatar is cosmetic */ });
  }, [user?.id]);

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
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
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
        let msg =
          axiosError?.response?.data?.message ??
          axiosError?.message ??
          'Invalid email or password';

        const normalized = String(msg).toLowerCase();
        const isBillingBlocked =
          normalized.includes('subscription') ||
          normalized.includes('billing') ||
          normalized.includes('suspended beyond grace period') ||
          normalized.includes('account suspended due to') ||
          normalized.includes('school account is inactive');

        if (isBillingBlocked) {
          msg = 'Account suspended due to billing. Please pay or renew your plan to continue.';
          toast.error(msg, { description: 'Admin login is revoked until billing is made active.' });
        }

        throw new Error(msg);
      }

      // Clear rate limit on success
      clearRateLimit(normalizedEmail);

      // Map backend UserInfo → our User type
      const backendUser = data.user;
      // Determine portal type from role
      const rawRole: string = backendUser.role ?? '';
      const rawLower = rawRole.toLowerCase();
      const ADMIN_ROLES = new Set(['admin', 'administrator']);
      const PARENT_ROLES = new Set(['parent', 'guardian']);
      const SUPER_ROLES  = new Set(['super_admin', 'superadmin']);

      let mappedRole: UserRole;
      if (SUPER_ROLES.has(rawLower)) mappedRole = 'super_admin';
      else if (ADMIN_ROLES.has(rawLower)) mappedRole = 'admin';
      else if (PARENT_ROLES.has(rawLower)) mappedRole = 'parent';
      else mappedRole = 'staff'; // Principal, Teacher, Warden, Accountant, etc.

      const userWithoutPassword: User = {
        id: String(backendUser.id),
        name: `${backendUser.firstName ?? ''} ${backendUser.lastName ?? ''}`.trim() || backendUser.email,
        email: backendUser.email,
        role: mappedRole,
        // Prefer the actual Staff.Designation from the backend over inferred-from-role
        designation: backendUser.designation
          ? backendUser.designation
          : normalizeDesignation(rawRole),
        avatar: backendUser.profilePhoto || undefined,
        schoolId: backendUser.schoolId ? String(backendUser.schoolId) : undefined,
        requirePasswordChange: backendUser.requirePasswordChange === true,
        linkedEntityId: backendUser.linkedEntityId ? String(backendUser.linkedEntityId) : undefined,
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
      // Store userId so user-scoped preference keys work in contexts outside AuthProvider
      localStorage.setItem('currentUserId', userWithoutPassword.id);
      window.dispatchEvent(new Event('vitanaUserChanged'));
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
    clearSession(); // also removes currentUserId and dispatches vitanaUserChanged
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

  const refreshCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
    const res = await axios.get(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = res.data?.data ?? res.data;

    const roleRaw = String(me?.role ?? '').toLowerCase();
    const mappedRole: UserRole = roleRaw === 'super_admin' || roleRaw === 'superadmin'
      ? 'super_admin'
      : roleRaw === 'admin' || roleRaw === 'administrator'
        ? 'admin'
        : roleRaw === 'parent' || roleRaw === 'guardian'
          ? 'parent'
          : 'staff';

    setUser((prev) => {
      const updated: User = {
        id: String(me.id),
        name: `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email,
        email: me.email,
        role: mappedRole,
        designation: me.designation ? me.designation : normalizeDesignation(String(me.role ?? '')),
        avatar: me.profilePhoto || undefined,
        schoolId: me.schoolId ? String(me.schoolId) : prev?.schoolId,
        requirePasswordChange: me.requirePasswordChange === true,
        linkedEntityId: me.linkedEntityId ? String(me.linkedEntityId) : undefined,
      };

      const stored = getStoredSession();
      if (stored) {
        storeSession({ ...stored, user: updated });
      }
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    sessionExpiresAt,
    refreshSession,
    refreshCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
