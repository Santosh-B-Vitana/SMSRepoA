import { useMutation } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../../offline/db';
import { diaryEntryQueue } from '../../../offline/schema';
import { apiClient } from '../../../api/client';
import { queryClient } from '../../../api/queryClient';
import { useAuthStore } from '../../../stores/authStore';
import { generateUUID } from '../../../lib/uuid';

export interface DiaryEntryInput {
  classId: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
}

export interface DiaryEntryResult {
  queued: boolean;
  data?: unknown;
}

export function useDiaryEntry() {
  const user = useAuthStore((s) => s.user);

  return useMutation<DiaryEntryResult, Error, DiaryEntryInput>({
    mutationFn: async (input: DiaryEntryInput): Promise<DiaryEntryResult> => {
      const idempotencyKey = generateUUID();
      const netState = await NetInfo.fetch();

      if (netState.isConnected && netState.isInternetReachable) {
        const data = await apiClient.post('/diary', input, {
          headers: { 'X-Idempotency-Key': idempotencyKey },
        });
        void queryClient.invalidateQueries({ queryKey: ['diary', input.classId] });
        return { queued: false, data };
      }

      if (!user) throw new Error('Not authenticated');

      await db
        .insert(diaryEntryQueue)
        .values({
          id: generateUUID(),
          idempotencyKey,
          classId: input.classId,
          date: input.date,
          title: input.title,
          content: input.content,
          createdAt: Date.now(),
          status: 'pending',
          schoolId: user.schoolId,
          userId: user.id,
        })
        .onConflictDoNothing();

      return { queued: true };
    },
  });
}
