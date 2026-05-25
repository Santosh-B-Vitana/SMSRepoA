
import React, { createContext, useContext, useEffect, useState } from 'react';
import { settingsApi } from '../services/api/settingsApi';
import { useAuth } from './AuthContext';

/** Minimal school profile available throughout the app. */
export interface SchoolInfo {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  /** Legacy fields kept for backward compatibility with components that read them */
  principalName?: string;
  boardAffiliation?: string;
  websiteUrl?: string;
  description?: string;
  plan?: string;
  totalStudents?: number;
  totalStaff?: number;
  establishmentDate?: string;
}

interface SchoolContextType {
  schoolInfo: SchoolInfo | null;
  loading: boolean;
  error: string | null;
  refreshSchoolInfo: () => Promise<void>;
}

const SCHOOL_BRANDING_CACHE_KEY = 'school_branding_cache';

function readCachedSchoolInfo(): SchoolInfo | null {
  try {
    const raw = localStorage.getItem(SCHOOL_BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolInfo;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSchoolInfo(info: SchoolInfo): void {
  try {
    localStorage.setItem(SCHOOL_BRANDING_CACHE_KEY, JSON.stringify(info));
  } catch {
    // Non-blocking cache write.
  }
}

const defaultSchoolContext: SchoolContextType = {
  schoolInfo: null,
  loading: false,
  error: null,
  refreshSchoolInfo: async () => {},
};

const SchoolContext = createContext<SchoolContextType>(defaultSchoolContext);

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === defaultSchoolContext) {
    // Fail-safe for unexpected provider composition issues.
    // Keeps the app usable instead of crashing the whole UI.
    console.warn('useSchool called outside SchoolProvider; using default fallback context.');
  }
  return context;
};

interface SchoolProviderProps {
  children: React.ReactNode;
}

export const SchoolProvider: React.FC<SchoolProviderProps> = ({ children }) => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(() => readCachedSchoolInfo());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  const refreshSchoolInfo = async () => {
    // Only fetch when authenticated; while logged out retain cached branding
    // so login pages can still show school name/logo after session expiry.
    if (!auth?.user) {
      try {
        setLoading(true);
        const url = new URL(window.location.href);
        const schoolCodeFromQuery = url.searchParams.get('schoolCode') || url.searchParams.get('school');
        const branding = await settingsApi.getPublicSchoolBranding({
          schoolCode: schoolCodeFromQuery || undefined,
          host: window.location.hostname,
        });

        if (branding?.id && branding?.name) {
          const publicInfo: SchoolInfo = {
            id: branding.id,
            name: branding.name,
            logoUrl: branding.logoUrl,
            status: branding.status,
          };
          setSchoolInfo(publicInfo);
          writeCachedSchoolInfo(publicInfo);
        } else {
          setSchoolInfo(prev => prev ?? readCachedSchoolInfo());
        }
      } catch {
        setSchoolInfo(prev => prev ?? readCachedSchoolInfo());
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const info = await settingsApi.getSchoolInfo();
      const typedInfo = info as SchoolInfo;
      setSchoolInfo(typedInfo);
      writeCachedSchoolInfo(typedInfo);
    } catch (err) {
      setError('Failed to load school information');
      console.error('Error fetching school info:', err);
      setSchoolInfo(prev => prev ?? readCachedSchoolInfo());
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever the authenticated user changes (login / logout / school switch)
  useEffect(() => {
    refreshSchoolInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.id]);

  // When super admin switches the active school, refresh so the sidebar shows the correct name/logo
  useEffect(() => {
    const handleSchoolChange = () => {
      if (auth?.user?.role === 'super_admin') {
        refreshSchoolInfo();
      }
    };
    window.addEventListener('sa-school-changed', handleSchoolChange);
    return () => window.removeEventListener('sa-school-changed', handleSchoolChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.role]);

  const value: SchoolContextType = {
    schoolInfo,
    loading,
    error,
    refreshSchoolInfo
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};
