import { db } from './db';
import { offlineQueue, attendanceDrafts, diaryEntryQueue, marksDrafts } from './schema';
import { eq, and, lt } from 'drizzle-orm';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function performDatabaseMaintenance(): Promise<void> {
  const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;

  try {
    await db.delete(offlineQueue).where(eq(offlineQueue.status, 'synced'));

    await db
      .delete(offlineQueue)
      .where(and(eq(offlineQueue.status, 'failed'), lt(offlineQueue.createdAt, sevenDaysAgo)));

    await db.delete(attendanceDrafts).where(eq(attendanceDrafts.isSubmitted, true));

    await db.delete(diaryEntryQueue).where(eq(diaryEntryQueue.status, 'synced'));

    await db
      .delete(diaryEntryQueue)
      .where(and(eq(diaryEntryQueue.status, 'failed'), lt(diaryEntryQueue.createdAt, sevenDaysAgo)));

    await db.delete(marksDrafts).where(eq(marksDrafts.isSubmitted, true));

    // Database cleanup complete
  } catch (err) {
    console.warn('[Maintenance] Database cleanup failed:', err);
  }
}
