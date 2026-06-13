import { db } from './db';
import { marksDrafts } from './schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '../lib/uuid';

export interface MarksEntry {
  studentId: string;
  theory: number | null;
  practical: number | null;
  isAbsent: boolean;
}

export interface MarksDraft {
  marks: MarksEntry[];
  idempotencyKey: string;
  lastModified: number;
}

function draftId(examId: string, classId: string, subjectId: string): string {
  return `${examId}-${classId}-${subjectId}`;
}

export const marksDraftService = {
  async saveDraft(
    examId: string,
    classId: string,
    subjectId: string,
    marks: MarksEntry[],
    markedBy: string,
    schoolId: string,
  ): Promise<void> {
    const id = draftId(examId, classId, subjectId);
    const existing = await db.select().from(marksDrafts).where(eq(marksDrafts.id, id)).limit(1);
    const idempotencyKey = existing[0]?.idempotencyKey ?? generateUUID();

    await db
      .insert(marksDrafts)
      .values({
        id,
        examId,
        classId,
        subjectId,
        marks: JSON.stringify(marks),
        idempotencyKey,
        lastModified: Date.now(),
        isSubmitted: false,
        schoolId,
        markedBy,
      })
      .onConflictDoUpdate({
        target: marksDrafts.id,
        set: {
          marks: JSON.stringify(marks),
          lastModified: Date.now(),
        },
      });
  },

  async loadDraft(examId: string, classId: string, subjectId: string): Promise<MarksDraft | null> {
    const id = draftId(examId, classId, subjectId);
    const result = await db.select().from(marksDrafts).where(eq(marksDrafts.id, id)).limit(1);
    if (!result[0] || result[0].isSubmitted) return null;
    return {
      marks: JSON.parse(result[0].marks) as MarksEntry[],
      idempotencyKey: result[0].idempotencyKey,
      lastModified: result[0].lastModified,
    };
  },

  async markSubmitted(examId: string, classId: string, subjectId: string): Promise<void> {
    const id = draftId(examId, classId, subjectId);
    await db.update(marksDrafts).set({ isSubmitted: true }).where(eq(marksDrafts.id, id));
  },
};
