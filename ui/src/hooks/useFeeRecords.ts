import { useState, useEffect, useCallback } from 'react';
import { feeService, FeeRecord, FeeFilters, PaginationParams } from '@/services/feeService';

interface UseFeeRecordsOptions {
  schoolId: string; // REQUIRED for multi-tenancy
  filters?: FeeFilters;
  pagination?: PaginationParams;
  autoFetch?: boolean;
}

export function useFeeRecords(options: UseFeeRecordsOptions) {
  const { schoolId, filters, pagination, autoFetch = true } = options;

  const [data, setData] = useState<FeeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await feeService.getFeeRecords(schoolId, filters, pagination);
      
      setData(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee records');
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters, pagination]);

  useEffect(() => {
    if (autoFetch) {
      fetchRecords();
    }
  }, [fetchRecords, autoFetch]);

  const refresh = useCallback(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    data,
    total,
    totalPages,
    loading,
    error,
    refresh
  };
}
