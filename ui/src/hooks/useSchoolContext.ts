import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Provides school context: schoolId, current academic year, etc.
 * Auto-detects from JWT claims rather than hardcoding.
 */
export function useSchoolContext() {
  const { authSession } = useAuth();
  const [academicYear, setAcademicYear] = useState('');
  const [schoolId, setSchoolId] = useState('');

  useEffect(() => {
    if (!authSession?.user) return;

    // Get schoolId from auth context
    const sid = authSession.user.schoolId || '550e8400-e29b-41d4-a716-446655440000';
    setSchoolId(sid);

    // Auto-detect academic year based on current date
    // School year typically: April 1 - March 31
    const now = new Date();
    const currentYear = now.getFullYear();
    const fiscalYear = now.getMonth() >= 3 ? currentYear : currentYear - 1; // April = month 3
    const nextYear = fiscalYear + 1;
    const detectedYear = `${fiscalYear}-${nextYear}`;
    
    setAcademicYear(detectedYear);
  }, [authSession]);

  return { schoolId, academicYear };
}

/**
 * Get list of available academic years (current + 2 previous)
 */
export function getAcademicYearsArray() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  
  return [
    `${fiscalYear}-${fiscalYear + 1}`,
    `${fiscalYear - 1}-${fiscalYear}`,
    `${fiscalYear - 2}-${fiscalYear - 1}`,
  ];
}

/**
 * Format academic year for display (2025-26 → "2025-26" or "2025-2026")
 */
export function formatAcademicYear(year: string, long = false) {
  if (!year) return '';
  if (long) {
    const [first, second] = year.split('-');
    return `${first}-20${second}`;
  }
  return year;
}
