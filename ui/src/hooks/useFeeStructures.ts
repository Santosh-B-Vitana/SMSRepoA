import { useState, useEffect, useCallback } from 'react';
import { feeService, FeeStructure, FeeFilters } from '@/services/feeService';

interface UseFeeStructuresOptions {
  schoolId: string; // REQUIRED for multi-tenancy
  filters?: FeeFilters;
  autoFetch?: boolean;
}

export function useFeeStructures(options: UseFeeStructuresOptions) {
  const { schoolId, filters, autoFetch = true } = options;

  const [data, setData] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const structures = await feeService.getFeeStructures(schoolId, filters);
      setData(structures);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee structures');
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchStructures();
    }
  }, [fetchStructures, autoFetch]);

  const addStructure = useCallback(async (structure: Omit<FeeStructure, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const newStructure = await feeService.addFeeStructure(schoolId, structure);
      setData(prev => [...prev, newStructure]);
      
      return { success: true, structure: newStructure };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add fee structure';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const refresh = useCallback(() => {
    fetchStructures();
  }, [fetchStructures]);

  return {
    data,
    loading,
    error,
    addStructure,
    refresh
  };
}
