/**
 * SyncStatusScreen component smoke tests.
 *
 * BLOCKED: @testing-library/react-native@14 requires react>=19 + react-native>=0.78.
 * Excluded from CI via testPathIgnorePatterns until project upgrades to RN 0.78.
 *
 * Verifies: empty state, pending count display, failed section with Retry All.
 * Native dependencies are fully mocked.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockDbSelect = jest.fn();
const mockDbUpdate = jest.fn();
jest.mock('@/offline/db', () => ({ db: { select: mockDbSelect, update: mockDbUpdate } }));
jest.mock('@/offline/schema', () => ({
  offlineQueue: 'offlineQueue',
  diaryEntryQueue: 'diaryEntryQueue',
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(() => ({})),
  and: jest.fn(() => ({})),
}));

const mockProcessQueue = jest.fn().mockResolvedValue(undefined);
jest.mock('@/offline/queue', () => ({
  OfflineQueueProcessor: {
    processQueue: mockProcessQueue,
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn((selector: (s: { user: unknown }) => unknown) =>
    selector({ user: { id: 'user-1', schoolId: 'school-1' } }),
  ),
}));

jest.mock('@/theme/useSchoolTheme', () => ({
  useSchoolTheme: jest.fn(() => ({ primaryColor: '#1e40af' })),
}));

jest.mock('@/theme/tokens', () => ({
  VITANA_COLORS: {
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    surface: '#f9fafb',
    warning: '#f59e0b',
    error: '#dc2626',
    errorLight: '#fee2e2',
    success: '#16a34a',
    successLight: '#dcfce7',
    info: '#3b82f6',
  },
}));

jest.mock('@/offline/bundleLoader', () => ({
  isBundleFresh: jest.fn().mockResolvedValue(false),
}));

// ─── Import component after mocks ────────────────────────────────────────────

import SyncStatusScreen from '../../../app/(teacher)/sync-status';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSelectChain(items: unknown[]) {
  const whereResult = { where: jest.fn().mockResolvedValue(items) };
  const fromResult = { from: jest.fn().mockReturnValue(whereResult) };
  return jest.fn().mockReturnValue(fromResult);
}

function buildSelectChainForBoth(queueItems: unknown[], diaryItems: unknown[]) {
  let callCount = 0;
  return jest.fn().mockImplementation(() => {
    callCount++;
    const items = callCount === 1 ? queueItems : diaryItems;
    return {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(items),
      }),
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SyncStatusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "All synced" empty state when queue is empty', async () => {
    mockDbSelect.mockImplementation(buildSelectChainForBoth([], []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('All synced');
    await findByText('No pending or failed items');
  });

  it('shows Sync Status heading', () => {
    mockDbSelect.mockImplementation(buildSelectChainForBoth([], []));
    const { getByText } = render(<SyncStatusScreen />);
    expect(getByText('Sync Status')).toBeTruthy();
  });

  it('renders pending items count correctly', async () => {
    const pendingItems = [
      { id: 'q1', operationType: 'attendance', status: 'pending', createdAt: Date.now() - 120000, errorMessage: null },
      { id: 'q2', operationType: 'marks_entry', status: 'pending', createdAt: Date.now() - 60000, errorMessage: null },
    ];
    mockDbSelect.mockImplementation(buildSelectChainForBoth(pendingItems, []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('Pending (2)');
  });

  it('renders failed items with Retry All button', async () => {
    const failedItems = [
      { id: 'f1', operationType: 'attendance', status: 'failed', createdAt: Date.now() - 5000, errorMessage: 'Network Error' },
    ];
    mockDbSelect.mockImplementation(buildSelectChainForBoth(failedItems, []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('Failed (1)');
    await findByText('Retry All');
  });

  it('calls processQueue when Retry All is tapped', async () => {
    const failedItems = [
      { id: 'f1', operationType: 'marks_entry', status: 'failed', createdAt: Date.now(), errorMessage: 'Timeout' },
    ];
    mockDbSelect.mockImplementation(buildSelectChainForBoth(failedItems, []));
    mockDbUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });

    const { findByText } = render(<SyncStatusScreen />);
    const retryBtn = await findByText('Retry All');
    fireEvent.press(retryBtn);

    await waitFor(() => {
      expect(mockProcessQueue).toHaveBeenCalledWith('user-1', 'school-1');
    });
  });

  it('shows conflict error label for conflict-type failures', async () => {
    const conflictItems = [
      {
        id: 'c1',
        operationType: 'attendance',
        status: 'failed',
        createdAt: Date.now(),
        errorMessage: JSON.stringify({ type: 'conflict' }),
      },
    ];
    mockDbSelect.mockImplementation(buildSelectChainForBoth(conflictItems, []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('Conflict — data already submitted by another user');
  });

  it('shows synced count section', async () => {
    const syncedItems = [
      { id: 's1', operationType: 'attendance', status: 'synced', createdAt: Date.now() - 3600000, errorMessage: null },
    ];
    mockDbSelect.mockImplementation(buildSelectChainForBoth(syncedItems, []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('1 item synced today');
  });

  it('shows diary pending section when diary queue has items', async () => {
    mockDbSelect.mockImplementation(buildSelectChainForBoth([], [{ id: 'd1', status: 'pending' }]));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('Diary Entries (1 pending)');
  });

  it('shows morning bundle status card', async () => {
    const { isBundleFresh } = jest.requireMock('@/offline/bundleLoader') as { isBundleFresh: jest.Mock };
    isBundleFresh.mockResolvedValueOnce(true);
    mockDbSelect.mockImplementation(buildSelectChainForBoth([], []));

    const { findByText } = render(<SyncStatusScreen />);
    await findByText('Morning bundle loaded');
  });
});
