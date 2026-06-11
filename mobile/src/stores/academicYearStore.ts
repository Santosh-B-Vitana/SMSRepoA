import { create } from 'zustand';

interface AcademicYearState {
  academicYear: string | null;
  setAcademicYear: (year: string) => void;
  clearAcademicYear: () => void;
}

export const useAcademicYearStore = create<AcademicYearState>()((set) => ({
  academicYear: null,
  setAcademicYear: (year) => set({ academicYear: year }),
  clearAcademicYear: () => set({ academicYear: null }),
}));
