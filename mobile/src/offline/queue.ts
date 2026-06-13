import { db } from './db';
import { offlineQueue } from './schema';
import { eq, and, asc } from 'drizzle-orm';
import { apiClient } from '../api/client';
import { queryClient } from '../api/queryClient';
import { generateUUID } from '../lib/uuid';

export interface ConflictItem {
  id: string;
  operationType: string;
  body: string;
  serverData: unknown;
  createdAt: number;
}

type QueueItem = typeof offlineQueue.$inferSelect;

export class OfflineQueueProcessor {
  private static isProcessing = false;

  static async processQueue(userId: string, schoolId: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pending = await db
        .select()
        .from(offlineQueue)
        .where(
          and(
            eq(offlineQueue.userId, userId),
            eq(offlineQueue.schoolId, schoolId),
            eq(offlineQueue.status, 'pending'),
          ),
        )
        .orderBy(asc(offlineQueue.createdAt))
        .limit(20);

      for (const item of pending) {
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processItem(item: QueueItem): Promise<void> {
    await db
      .update(offlineQueue)
      .set({ status: 'processing' })
      .where(eq(offlineQueue.id, item.id));

    const extraHeaders = item.extraHeaders
      ? (JSON.parse(item.extraHeaders) as Record<string, string>)
      : {};

    try {
      await apiClient.request({
        method: item.method as 'POST' | 'PUT' | 'PATCH',
        url: item.endpoint,
        data: JSON.parse(item.body) as unknown,
        headers: extraHeaders,
      });

      await db
        .update(offlineQueue)
        .set({ status: 'synced', syncedAt: Date.now() })
        .where(eq(offlineQueue.id, item.id));

      void queryClient.invalidateQueries({ queryKey: [item.operationType] });
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    } catch (error: unknown) {
      const retryCount = (item.retryCount ?? 0) + 1;
      const status = (error as { status?: number })?.status;
      const isConflict = status === 409;

      if (isConflict) {
        const serverData = (error as { response?: { data?: unknown } })?.response?.data ?? null;
        await db
          .update(offlineQueue)
          .set({
            status: 'failed',
            errorMessage: JSON.stringify({ type: 'conflict', serverData }),
            retryCount,
          })
          .where(eq(offlineQueue.id, item.id));
      } else if (retryCount >= (item.maxRetries ?? 3)) {
        await db
          .update(offlineQueue)
          .set({
            status: 'failed',
            errorMessage: (error as Error)?.message ?? 'Unknown error',
            retryCount,
          })
          .where(eq(offlineQueue.id, item.id));
      } else {
        await db
          .update(offlineQueue)
          .set({ status: 'pending', retryCount })
          .where(eq(offlineQueue.id, item.id));
      }
    }
  }

  static async enqueue(params: {
    method: string;
    endpoint: string;
    body: object;
    extraHeaders?: Record<string, string>;
    operationType: string;
    userId: string;
    schoolId: string;
  }): Promise<void> {
    await db.insert(offlineQueue).values({
      id: generateUUID(),
      createdAt: Date.now(),
      method: params.method,
      endpoint: params.endpoint,
      body: JSON.stringify(params.body),
      extraHeaders: params.extraHeaders ? JSON.stringify(params.extraHeaders) : null,
      operationType: params.operationType,
      userId: params.userId,
      schoolId: params.schoolId,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    });
  }

  static async getPendingCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(offlineQueue)
      .where(and(eq(offlineQueue.userId, userId), eq(offlineQueue.status, 'pending')));
    return result.length;
  }

  static async getConflictItems(userId: string): Promise<ConflictItem[]> {
    const rows = await db
      .select()
      .from(offlineQueue)
      .where(and(eq(offlineQueue.userId, userId), eq(offlineQueue.status, 'failed')));

    return rows
      .filter((row) => {
        try {
          const parsed = JSON.parse(row.errorMessage ?? '{}') as { type?: string };
          return parsed.type === 'conflict';
        } catch {
          return false;
        }
      })
      .map((row) => {
        const parsed = JSON.parse(row.errorMessage ?? '{}') as { type: string; serverData: unknown };
        return {
          id: row.id,
          operationType: row.operationType,
          body: row.body,
          serverData: parsed.serverData,
          createdAt: row.createdAt,
        };
      });
  }

  static async resolveConflict(
    itemId: string,
    resolution: 'keep_server' | 'use_mine',
    overrideBody?: object,
  ): Promise<void> {
    if (resolution === 'keep_server') {
      await db.update(offlineQueue).set({ status: 'synced', syncedAt: Date.now() }).where(eq(offlineQueue.id, itemId));
    } else {
      await db
        .update(offlineQueue)
        .set({
          status: 'pending',
          retryCount: 0,
          errorMessage: null,
          ...(overrideBody ? { body: JSON.stringify(overrideBody) } : {}),
        })
        .where(eq(offlineQueue.id, itemId));
    }
  }
}
