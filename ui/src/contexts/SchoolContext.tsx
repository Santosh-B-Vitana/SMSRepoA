
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

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};

interface SchoolProviderProps {
  children: React.ReactNode;
}

export const SchoolProvider: React.FC<SchoolProviderProps> = ({ children }) => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  const refreshSchoolInfo = async () => {
    // Only fetch when authenticated; clear while logged out
    if (!auth?.user) {
      setSchoolInfo(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const info = await settingsApi.getSchoolInfo();
      setSchoolInfo(info as SchoolInfo);
    } catch (err) {
      setError('Failed to load school information');
      console.error('Error fetching school info:', err);
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
