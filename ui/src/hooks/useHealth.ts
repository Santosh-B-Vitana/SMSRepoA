import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthService, HealthRecord, HealthFilters, PaginationParams, CursorPaginationParams } from '@/services/healthService';
import { toast } from 'sonner';

const healthKeys = {
  all: (schoolId: string) => ['health', schoolId] as const,
  lists: (schoolId: string) => [...healthKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: HealthFilters, pagination: PaginationParams) => 
    [...healthKeys.lists(schoolId), filters, pagination] as const,
  listCursor: (schoolId: string, filters: HealthFilters, pagination: CursorPaginationParams) =>
    [...healthKeys.lists(schoolId), 'cursor', filters, pagination] as const,
  details: (schoolId: string) => [...healthKeys.all(schoolId), 'detail'] as const,
  detail: (schoolId: string, recordId: string) => [...healthKeys.details(schoolId), recordId] as const,
  stats: (schoolId: string) => [...healthKeys.all(schoolId), 'stats'] as const
};

export function useHealthRecords(
  schoolId: string,
  filters: HealthFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: healthKeys.list(schoolId, filters, pagination),
    queryFn: () => healthService.getHealthRecords(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useHealthRecordsCursor(
  schoolId: string,
  filters: HealthFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: healthKeys.listCursor(schoolId, filters, pagination),
    queryFn: () => healthService.getHealthRecordsCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateHealthRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<HealthRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      healthService.createHealthRecord(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: healthKeys.stats(schoolId) });
      toast.success('Health record created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create health record');
    }
  });
}

export function useUpdateHealthRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }: { recordId: string; updates: Partial<Omit<HealthRecord, 'id' | 'schoolId' | 'createdAt'>> }) =>
      healthService.updateHealthRecord(schoolId, recordId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: healthKeys.stats(schoolId) });
      toast.success('Health record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update health record');
    }
  });
}

export function useDeleteHealthRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => healthService.deleteHealthRecord(schoolId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: healthKeys.stats(schoolId) });
      toast.success('Health record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete health record');
    }
  });
}

export function useHealthStats(schoolId: string) {
  return useQuery({
    queryKey: healthKeys.stats(schoolId),
    queryFn: () => healthService.getHealthStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
