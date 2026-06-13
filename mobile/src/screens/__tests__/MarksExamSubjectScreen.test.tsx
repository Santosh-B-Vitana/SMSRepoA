/**
 * ExamSubjectSelection (marks index) component smoke tests.
 *
 * BLOCKED: @testing-library/react-native@14 requires react>=19 + react-native>=0.78.
 * Excluded from CI via testPathIgnorePatterns until project upgrades to RN 0.78.
 *
 * Verifies: loading skeleton, empty state for missing exam, subject card list
 * rendering, locked subject card behaviour.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ examSetupId: 'exam-001' })),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/theme/tokens', () => ({
  VITANA_COLORS: {
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    surface: '#f9fafb',
    primary: '#1e40af',
    success: '#16a34a',
  },
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

jest.mock('@/api/endpoints/teacher', () => ({
  teacherApi: {
    getMyExamAssignments: jest.fn().mockResolvedValue([]),
    getMarksSheet: jest.fn().mockResolvedValue(null),
  },
}));

// ─── Import component after mocks ────────────────────────────────────────────

import ExamSubjectSelection from '../../../app/(teacher)/marks/[examSetupId]/index';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleExam = {
  id: 'exam-001',
  name: 'Unit Test 1',
  className: 'Class 8A',
  academicYear: '2025-26',
  myAssignedSubjectIds: ['sub-math', 'sub-english'],
};

const sampleSheet = {
  subjectName: 'Mathematics',
  status: 'marks_entry',
  isLocked: false,
  maxTheoryMarks: 80,
  maxPracticalMarks: 0,
  rows: [
    { studentId: 's1', obtainedMarks: null, isAbsent: false },
    { studentId: 's2', obtainedMarks: null, isAbsent: false },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExamSubjectSelection (marks index)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows exam name and class in the header', async () => {
    // First call: getMyExamAssignments (outer screen query)
    // Inner SubjectCard queries use the same useQuery
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { data: [sampleExam], isLoading: false, refetch: jest.fn(), isRefetching: false };
      }
      return { data: sampleSheet, isLoading: false };
    });

    const { getByText } = render(<ExamSubjectSelection />);
    await waitFor(() => {
      expect(getByText('Unit Test 1')).toBeTruthy();
      expect(getByText('Class 8A · 2025-26')).toBeTruthy();
    });
  });

  it('shows loading skeleton when exam data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, refetch: jest.fn(), isRefetching: false });

    const { queryByText } = render(<ExamSubjectSelection />);
    // No exam content visible
    expect(queryByText('Unit Test 1')).toBeNull();
  });

  it('shows "Exam not found" when examSetupId does not match any exam', async () => {
    mockUseQuery.mockReturnValue({
      data: [{ ...sampleExam, id: 'different-exam' }],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { findByText } = render(<ExamSubjectSelection />);
    await findByText('Exam not found');
  });

  it('shows "No subjects assigned" when myAssignedSubjectIds is empty', async () => {
    mockUseQuery.mockReturnValue({
      data: [{ ...sampleExam, myAssignedSubjectIds: [] }],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { findByText } = render(<ExamSubjectSelection />);
    await findByText('No subjects assigned');
  });

  it('renders a SubjectCard for each assigned subject', async () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { data: [sampleExam], isLoading: false, refetch: jest.fn(), isRefetching: false };
      }
      // SubjectCard queries — one per subject
      return { data: sampleSheet, isLoading: false };
    });

    const { getAllByText } = render(<ExamSubjectSelection />);
    await waitFor(() => {
      // "Enter Marks" label appears once per unlocked subject card
      expect(getAllByText('Enter Marks').length).toBe(sampleExam.myAssignedSubjectIds.length);
    });
  });

  it('shows Locked badge for locked subjects', async () => {
    const lockedSheet = { ...sampleSheet, isLocked: true };
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          data: [{ ...sampleExam, myAssignedSubjectIds: ['sub-locked'] }],
          isLoading: false,
          refetch: jest.fn(),
          isRefetching: false,
        };
      }
      return { data: lockedSheet, isLoading: false };
    });

    const { findByText } = render(<ExamSubjectSelection />);
    await findByText('Locked');
  });
});
