/**
 * marksDraftService unit tests.
 *
 * Drizzle ORM and the SQLite db instance are fully mocked so these tests run
 * without a real SQLite file. All mock variables use jest.fn() inline inside
 * jest.mock() factories (no outer const references that would be in TDZ).
 */

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col: string, val: unknown) => ({ col, val, op: 'eq' })),
}));

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../schema', () => ({
  marksDrafts: 'marksDrafts_table',
}));

jest.mock('../../lib/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-1234'),
}));

import { marksDraftService } from '../marksDraftService';

// ─── Row type for type assertions ─────────────────────────────────────────────

type Row = {
  id: string;
  examId: string;
  classId: string;
  subjectId: string;
  marks: string;
  idempotencyKey: string;
  lastModified: number;
  isSubmitted: boolean;
  schoolId: string;
  markedBy: string;
};

// ─── Helper to access the db mock after import ────────────────────────────────

function getMockDb() {
  return jest.requireMock('../db').db as {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
}

// ─── Test data ────────────────────────────────────────────────────────────────

const sampleMarks = [
  { studentId: 'student-1', theory: 78, practical: null, isAbsent: false },
  { studentId: 'student-2', theory: 82, practical: null, isAbsent: false },
  { studentId: 'student-3', theory: null, practical: null, isAbsent: true },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('marksDraftService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const db = getMockDb();

    // Default select chain → returns empty array
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Default insert chain
    db.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      }),
    });

    // Default update chain
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });
  });

  // ── saveDraft ─────────────────────────────────────────────────────────────

  describe('saveDraft', () => {
    it('inserts a new draft when no existing row', async () => {
      await marksDraftService.saveDraft('exam1', 'class1', 'sub1', sampleMarks, 'teacher1', 'school1');

      const db = getMockDb();
      expect(db.insert).toHaveBeenCalled();
      const valuesCall = (db.insert('').values as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(valuesCall.id).toBe('exam1-class1-sub1');
      expect(valuesCall.examId).toBe('exam1');
      expect(valuesCall.classId).toBe('class1');
      expect(valuesCall.subjectId).toBe('sub1');
      expect(valuesCall.marks).toBe(JSON.stringify(sampleMarks));
      expect(valuesCall.idempotencyKey).toBe('test-uuid-1234');
      expect(valuesCall.isSubmitted).toBe(false);
    });

    it('preserves the existing idempotencyKey on upsert', async () => {
      const existingRow: Partial<Row> = {
        id: 'exam1-class1-sub1',
        idempotencyKey: 'existing-key-abcd',
        isSubmitted: false,
      };
      const db = getMockDb();
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingRow]),
          }),
        }),
      });

      await marksDraftService.saveDraft('exam1', 'class1', 'sub1', sampleMarks, 'teacher1', 'school1');

      const valuesCall = (db.insert('').values as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(valuesCall.idempotencyKey).toBe('existing-key-abcd');
    });

    it('updates marks and lastModified via onConflictDoUpdate', async () => {
      await marksDraftService.saveDraft('exam1', 'class1', 'sub1', sampleMarks, 'teacher1', 'school1');

      const db = getMockDb();
      const onConflictCall = db.insert('').values('').onConflictDoUpdate as jest.Mock;
      expect(onConflictCall).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            marks: JSON.stringify(sampleMarks),
          }),
        }),
      );
    });
  });

  // ── loadDraft ─────────────────────────────────────────────────────────────

  describe('loadDraft', () => {
    it('returns null when no row exists', async () => {
      const result = await marksDraftService.loadDraft('exam1', 'class1', 'sub1');
      expect(result).toBeNull();
    });

    it('returns null when isSubmitted is true', async () => {
      const submittedRow: Partial<Row> = {
        id: 'exam1-class1-sub1',
        marks: JSON.stringify(sampleMarks),
        idempotencyKey: 'key-xyz',
        lastModified: Date.now(),
        isSubmitted: true,
      };
      getMockDb().select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([submittedRow]),
          }),
        }),
      });

      const result = await marksDraftService.loadDraft('exam1', 'class1', 'sub1');
      expect(result).toBeNull();
    });

    it('returns parsed marks when draft is not submitted', async () => {
      const now = Date.now();
      const row: Partial<Row> = {
        id: 'exam1-class1-sub1',
        marks: JSON.stringify(sampleMarks),
        idempotencyKey: 'key-abc',
        lastModified: now,
        isSubmitted: false,
      };
      getMockDb().select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([row]),
          }),
        }),
      });

      const result = await marksDraftService.loadDraft('exam1', 'class1', 'sub1');
      expect(result).not.toBeNull();
      expect(result!.marks).toEqual(sampleMarks);
      expect(result!.idempotencyKey).toBe('key-abc');
      expect(result!.lastModified).toBe(now);
    });
  });

  // ── markSubmitted ─────────────────────────────────────────────────────────

  describe('markSubmitted', () => {
    it('sets isSubmitted to true without touching marks', async () => {
      await marksDraftService.markSubmitted('exam1', 'class1', 'sub1');

      const db = getMockDb();
      expect(db.update).toHaveBeenCalled();
      const setCall = (db.update('').set as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(setCall.isSubmitted).toBe(true);
      expect(setCall.marks).toBeUndefined();
    });

    it('uses correct composite id for the WHERE clause', async () => {
      await marksDraftService.markSubmitted('examA', 'classB', 'subC');

      const { eq } = jest.requireMock('drizzle-orm') as { eq: jest.Mock };
      // The second argument must be the composite key; first arg is the schema column (undefined in mock).
      const calls = (eq as jest.Mock).mock.calls as unknown[][];
      expect(calls.some((c) => c[1] === 'examA-classB-subC')).toBe(true);
    });
  });
});
