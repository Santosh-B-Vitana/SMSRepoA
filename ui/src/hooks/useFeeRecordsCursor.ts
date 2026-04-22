import { useState, useCallback } from 'react';
import { feeService, FeeRecord, FeeFilters, CursorPaginationParams, CursorPaginatedResponse } from '@/services/feeService';

interface UseFeeRecordsCursorOptions {
  schoolId: string;
  filters?: FeeFilters;
  limit?: number;
}

export function useFeeRecordsCursor(options: UseFeeRecordsCursorOptions) {
  const { schoolId, filters, limit = 20 } = options;

  const [data, setData] = useState<FeeRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [previousCursor, setPreviousCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(
    async (cursor?: string) => {
      try {
        setLoading(true);
        setError(null);

        const pagination: CursorPaginationParams = {
          cursor,
          limit
        };

        const response = await feeService.getFeeRecordsCursor(schoolId, filters, pagination);

        setData(response.data);
        setNextCursor(response.nextCursor);
        setPreviousCursor(response.previousCursor);
        setHasMore(response.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch fee records');
      } finally {
        setLoading(false);
      }
    },
    [schoolId, filters, limit]
  );

  const loadNext = useCallback(() => {
    if (nextCursor && !loading) {
      fetchRecords(nextCursor);
    }
  }, [nextCursor, loading, fetchRecords]);

  const loadPrevious = useCallback(() => {
    if (previousCursor && !loading) {
      fetchRecords(previousCursor);
    }
  }, [previousCursor, loading, fetchRecords]);

  const refresh = useCallback(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadNext,
    loadPrevious,
    refresh,
    fetchRecords
  };
}
