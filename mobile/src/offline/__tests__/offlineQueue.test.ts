/**
 * OfflineQueueProcessor unit tests.
 *
 * SQLite db, apiClient, and queryClient are fully mocked. All mock factories
 * use jest.fn() inline — no outer const references in TDZ.
 */

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: jest.fn((...conditions: unknown[]) => ({ conditions, op: 'and' })),
  asc: jest.fn((col: unknown) => ({ col, op: 'asc' })),
}));

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock('../schema', () => ({
  offlineQueue: 'offlineQueue_table',
}));

jest.mock('../../lib/uuid', () => ({
  generateUUID: jest.fn(() => 'new-uuid'),
}));

jest.mock('../../api/client', () => ({
  apiClient: { request: jest.fn() },
}));

jest.mock('../../api/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

import { OfflineQueueProcessor } from '../queue';

// ─── Typed accessors ──────────────────────────────────────────────────────────

function getMockDb() {
  return jest.requireMock('../db').db as {
    select: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
  };
}

function getMockApiClient() {
  return jest.requireMock('../../api/client').apiClient as { request: jest.Mock };
}

function getMockQueryClient() {
  return jest.requireMock('../../api/queryClient').queryClient as { invalidateQueries: jest.Mock };
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

type QueueRow = {
  id: string;
  method: string;
  endpoint: string;
  body: string;
  extraHeaders: string | null;
  operationType: string;
  userId: string;
  schoolId: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  syncedAt: number | null;
  createdAt: number;
};

function makeRow(overrides: Partial<QueueRow> = {}): QueueRow {
  return {
    id: 'item-1',
    method: 'POST',
    endpoint: '/attendance',
    body: JSON.stringify({ classId: 'c1', date: '2026-06-01' }),
    extraHeaders: null,
    operationType: 'attendance',
    userId: 'user-1',
    schoolId: 'school-1',
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    errorMessage: null,
    syncedAt: null,
    createdAt: Date.now() - 60000,
    ...overrides,
  };
}

// ─── Captured update calls ────────────────────────────────────────────────────

type UpdateArgs = { id: string; updates: Record<string, unknown> };
const dbUpdates: UpdateArgs[] = [];

function setupUpdateCapture() {
  getMockDb().update.mockImplementation(() => ({
    set: jest.fn().mockImplementation((updates: Record<string, unknown>) => ({
      where: jest.fn().mockImplementation((clause: { val: string }) => {
        dbUpdates.push({ id: clause.val as string, updates });
        return Promise.resolve(undefined);
      }),
    })),
  }));
}

function getLastUpdateForId(id: string): Record<string, unknown> | undefined {
  const calls = dbUpdates.filter((u) => u.id === id);
  return calls[calls.length - 1]?.updates;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OfflineQueueProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbUpdates.length = 0;
    // Reset static flag
    (OfflineQueueProcessor as unknown as { isProcessing: boolean }).isProcessing = false;

    // Default select chain — empty result set
    getMockDb().select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    // Default insert
    getMockDb().insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    setupUpdateCapture();
  });

  // ── processQueue ─────────────────────────────────────────────────────────

  describe('processQueue', () => {
    it('does not process if already processing', async () => {
      (OfflineQueueProcessor as unknown as { isProcessing: boolean }).isProcessing = true;
      await OfflineQueueProcessor.processQueue('user-1', 'school-1');
      expect(getMockApiClient().request).not.toHaveBeenCalled();
    });

    it('sets item to synced on successful API call', async () => {
      const row = makeRow();
      getMockDb().select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      });
      getMockApiClient().request.mockResolvedValueOnce({ data: {} });

      await OfflineQueueProcessor.processQueue('user-1', 'school-1');

      const finalUpdate = getLastUpdateForId('item-1');
      expect(finalUpdate?.status).toBe('synced');
      expect(finalUpdate?.syncedAt).toBeDefined();
    });

    it('invalidates query cache on successful sync', async () => {
      const row = makeRow({ operationType: 'attendance' });
      getMockDb().select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      });
      getMockApiClient().request.mockResolvedValueOnce({});

      await OfflineQueueProcessor.processQueue('user-1', 'school-1');

      expect(getMockQueryClient().invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['attendance'] }),
      );
    });

    it('increments retryCount on transient failure (non-409)', async () => {
      const row = makeRow({ retryCount: 0, maxRetries: 3 });
      getMockDb().select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      });
      getMockApiClient().request.mockRejectedValueOnce(new Error('Network Error'));

      await OfflineQueueProcessor.processQueue('user-1', 'school-1');

      const finalUpdate = getLastUpdateForId('item-1');
      expect(finalUpdate?.retryCount).toBe(1);
      expect(finalUpdate?.status).toBe('pending');
    });

    it('dead-letters the item when retryCount reaches maxRetries', async () => {
      const row = makeRow({ retryCount: 2, maxRetries: 3 });
      getMockDb().select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      });
      getMockApiClient().request.mockRejectedValueOnce(new Error('Timeout'));

      await OfflineQueueProcessor.processQueue('user-1', 'school-1');

      const finalUpdate = getLastUpdateForId('item-1');
      expect(finalUpdate?.status).toBe('failed');
      expect(finalUpdate?.retryCount).toBe(3);
      expect(finalUpdate?.errorMessage).toBe('Timeout');
    });

    it('marks conflict items as failed with JSON error on 409', async () => {
      const row = makeRow();
      getMockDb().select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      });
      getMockApiClient().request.mockRejectedValueOnce({
        status: 409,
        response: { data: { serverRecord: { id: 'server-1', version: 2 } } },
      });

      await OfflineQueueProcessor.processQueue('user-1', 'school-1');

      const finalUpdate = getLastUpdateForId('item-1');
      expect(finalUpdate?.status).toBe('failed');
      const parsed = JSON.parse(finalUpdate?.errorMessage as string) as { type: string };
      expect(parsed.type).toBe('conflict');
    });
  });

  // ── enqueue ───────────────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('inserts a row with pending status and retryCount=0', async () => {
      await OfflineQueueProcessor.enqueue({
        method: 'POST',
        endpoint: '/marks',
        body: { marks: [] },
        operationType: 'marks_entry',
        userId: 'user-1',
        schoolId: 'school-1',
      });

      const valuesCall = (getMockDb().insert('').values as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(valuesCall.status).toBe('pending');
      expect(valuesCall.retryCount).toBe(0);
      expect(valuesCall.maxRetries).toBe(3);
      expect(valuesCall.operationType).toBe('marks_entry');
    });

    it('serialises extraHeaders to JSON when provided', async () => {
      await OfflineQueueProcessor.enqueue({
        method: 'PUT',
        endpoint: '/attendance',
        body: { date: '2026-06-01' },
        extraHeaders: { 'X-Idempotency-Key': 'abc-123' },
        operationType: 'attendance',
        userId: 'u1',
        schoolId: 's1',
      });

      const valuesCall = (getMockDb().insert('').values as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(valuesCall.extraHeaders).toBe('{"X-Idempotency-Key":"abc-123"}');
    });
  });

  // ── getConflictItems ──────────────────────────────────────────────────────

  describe('getConflictItems', () => {
    it('returns items whose errorMessage has type=conflict', async () => {
      const conflictRow = makeRow({
        status: 'failed',
        errorMessage: JSON.stringify({ type: 'conflict', serverData: { id: 'srv-1' } }),
      });
      const normalFailRow = makeRow({
        id: 'item-2',
        status: 'failed',
        errorMessage: 'Network timeout',
      });

      getMockDb().select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([conflictRow, normalFailRow]),
        }),
      });

      const conflicts = await OfflineQueueProcessor.getConflictItems('user-1');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('item-1');
      expect((conflicts[0].serverData as { id: string }).id).toBe('srv-1');
    });
  });

  // ── resolveConflict ───────────────────────────────────────────────────────

  describe('resolveConflict', () => {
    it("keep_server sets status=synced with a syncedAt timestamp", async () => {
      await OfflineQueueProcessor.resolveConflict('item-1', 'keep_server');

      const update = getLastUpdateForId('item-1');
      expect(update?.status).toBe('synced');
      expect(update?.syncedAt).toBeDefined();
    });

    it('use_mine resets to pending with retryCount=0 and clears errorMessage', async () => {
      await OfflineQueueProcessor.resolveConflict('item-1', 'use_mine');

      const update = getLastUpdateForId('item-1');
      expect(update?.status).toBe('pending');
      expect(update?.retryCount).toBe(0);
      expect(update?.errorMessage).toBeNull();
    });

    it('use_mine with overrideBody updates the body field', async () => {
      const override = { classId: 'c1', correctedField: 'fixed' };
      await OfflineQueueProcessor.resolveConflict('item-1', 'use_mine', override);

      const update = getLastUpdateForId('item-1');
      expect(update?.body).toBe(JSON.stringify(override));
    });
  });
});
