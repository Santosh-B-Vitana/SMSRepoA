/**
 * AcademicYearContext — Global academic year selector
 *
 * Industry-grade approach:
 *  - Loads available years from /api/academics/academic-years on mount
 *  - Defaults to the year with IsCurrent=true (or latest year)
 *  - Persists selection in localStorage so it survives page refreshes
 *  - Exposes `academicYear` string ("2025-2026") and full `currentYearObj`
 *  - Every module reads `useAcademicYear()` and re-fetches when year changes
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { academicApi, type AcademicYearResponse } from '@/services/api/academicApi';
import { useAuth } from '@/contexts/AuthContext';

/** Roles that are always locked to the active academic year */
const LOCKED_ROLES = ['staff', 'parent'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcademicYearContextType {
  /** The selected year object (null while loading) */
  currentYear: AcademicYearResponse | null;
  /** All years available for this school */
  availableYears: AcademicYearResponse[];
  /** Shorthand: "2025-2026" string for passing to API filters */
  academicYear: string;
  loading: boolean;
  /** Change the selected academic year */
  setCurrentYear: (year: AcademicYearResponse) => void;
  /** Re-fetch years list from the server */
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'selectedAcademicYearId';
const STORAGE_NAME_KEY = 'selectedAcademicYearName';

function buildFallbackYears(): AcademicYearResponse[] {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const current: AcademicYearResponse = {
    id: `fallback-${startYear}`,
    name: `${startYear}-${startYear + 1}`,
    startDate: new Date(Date.UTC(startYear, 3, 1)).toISOString(),
    endDate: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59)).toISOString(),
    isCurrent: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const previous: AcademicYearResponse = {
    id: `fallback-${startYear - 1}`,
    name: `${startYear - 1}-${startYear}`,
    startDate: new Date(Date.UTC(startYear - 1, 3, 1)).toISOString(),
    endDate: new Date(Date.UTC(startYear, 2, 31, 23, 59, 59)).toISOString(),
    isCurrent: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [current, previous];
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  children: React.ReactNode;
}

export function AcademicYearProvider({ children }: Props) {
  const { user } = useAuth();
  const [availableYears, setAvailableYears] = useState<AcademicYearResponse[]>([]);
  const [currentYear, setCurrentYearState] = useState<AcademicYearResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const isLocked = LOCKED_ROLES.includes(user?.role as typeof LOCKED_ROLES[number]);

  const load = useCallback(async () => {
    try {
      const resp = await academicApi.listAcademicYears(1, 50);
      const years = resp.academicYears?.length ? resp.academicYears : buildFallbackYears();
      setAvailableYears(years);

      if (years.length === 0) {
        setCurrentYearState(null);
        setLoading(false);
        return;
      }

      // Preference: restored → isCurrent → latest by startDate
      const selected =
        years.find((y) => y.isCurrent) ??
        years.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];

      setCurrentYearState(selected ?? null);
      if (selected) {
        localStorage.setItem(STORAGE_KEY, selected.id);
        localStorage.setItem(STORAGE_NAME_KEY, selected.name);
      }
    } catch {
      // Hard fallback so app remains usable even before DB migrations are applied.
      const fallback = buildFallbackYears();
      const selected = fallback[0];
      setAvailableYears(fallback);
      setCurrentYearState(selected);
      localStorage.setItem(STORAGE_KEY, selected.id);
      localStorage.setItem(STORAGE_NAME_KEY, selected.name);
    } finally {
      setLoading(false);
    }
  }, []);

  // For admin: restore previously selected year from localStorage after years load
  useEffect(() => {
    if (isLocked || availableYears.length === 0) return;
    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = savedId ? availableYears.find((y) => y.id === savedId) : null;
    if (saved && saved.id !== currentYear?.id) {
      setCurrentYearState(saved);
    }
  }, [isLocked, availableYears]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // When user logs in as a locked role, snap to the current/active year immediately
  useEffect(() => {
    if (!isLocked || availableYears.length === 0) return;
    const current =
      availableYears.find((y) => y.isCurrent) ??
      availableYears.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    setCurrentYearState(current ?? null);
    if (current) {
      localStorage.setItem(STORAGE_KEY, current.id);
      localStorage.setItem(STORAGE_NAME_KEY, current.name);
    }
  }, [isLocked, availableYears]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCurrentYear = useCallback(
    (year: AcademicYearResponse) => {
      if (isLocked) return; // staff and parent cannot change the academic year
      setCurrentYearState(year);
      localStorage.setItem(STORAGE_KEY, year.id);
      localStorage.setItem(STORAGE_NAME_KEY, year.name);
    },
    [isLocked],
  );

  const value: AcademicYearContextType = {
    currentYear,
    availableYears,
    academicYear: currentYear?.name ?? '',
    loading,
    setCurrentYear,
    refresh: load,
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAcademicYear(): AcademicYearContextType {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return ctx;
}
