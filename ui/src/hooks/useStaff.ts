// Custom hooks for Staff module with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStaff,
  getStaffCursor,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  bulkUpdateStaff,
  getStaffStats,
  Staff,
  StaffFilters,
  PaginatedStaffResponse,
  CursorPaginatedStaffResponse,
  StaffStats
} from '@/services/staffService';

// Query keys
export const staffKeys = {
  all: (schoolId: string) => ['staff', schoolId] as const,
  lists: (schoolId: string) => [...staffKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: StaffFilters, page: number, limit: number) => 
    [...staffKeys.lists(schoolId), { filters, page, limit }] as const,
  listCursor: (schoolId: string, filters: StaffFilters, cursor?: string, limit?: number) =>
    [...staffKeys.lists(schoolId), 'cursor', { filters, cursor, limit }] as const,
  details: (schoolId: string) => [...staffKeys.all(schoolId), 'detail'] as const,
  detail: (schoolId: string, staffId: string) => 
    [...staffKeys.details(schoolId), staffId] as const,
  stats: (schoolId: string) => [...staffKeys.all(schoolId), 'stats'] as const,
};

// Get staff with offset pagination
export function useStaff(
  schoolId: string,
  page: number = 1,
  limit: number = 20,
  filters: StaffFilters = {}
) {
  return useQuery<PaginatedStaffResponse, Error>({
    queryKey: staffKeys.list(schoolId, filters, page, limit),
    queryFn: () => getStaff(schoolId, page, limit, filters),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get staff with cursor pagination (recommended for large datasets)
export function useStaffCursor(
  schoolId: string,
  limit: number = 20,
  cursor?: string,
  filters: StaffFilters = {}
) {
  return useQuery<CursorPaginatedStaffResponse, Error>({
    queryKey: staffKeys.listCursor(schoolId, filters, cursor, limit),
    queryFn: () => getStaffCursor(schoolId, limit, cursor, filters),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

// Get single staff member
export function useStaffMember(schoolId: string, staffId: string) {
  return useQuery<Staff | null, Error>({
    queryKey: staffKeys.detail(schoolId, staffId),
    queryFn: () => getStaffById(schoolId, staffId),
    enabled: !!staffId,
    staleTime: 60000, // 1 minute
  });
}

// Get staff statistics
export function useStaffStats(schoolId: string) {
  return useQuery<StaffStats, Error>({
    queryKey: staffKeys.stats(schoolId),
    queryFn: () => getStaffStats(schoolId),
    staleTime: 60000,
  });
}

// Create staff member
export function useCreateStaff(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation<Staff, Error, Omit<Staff, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>>({
    mutationFn: (staffData) => createStaff(schoolId, staffData),
    onSuccess: () => {
      // Invalidate all staff lists and stats
      queryClient.invalidateQueries({ queryKey: staffKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: staffKeys.stats(schoolId) });
    },
  });
}

// Update staff member
export function useUpdateStaff(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Staff,
    Error,
    { staffId: string; updates: Partial<Omit<Staff, 'id' | 'schoolId' | 'createdAt'>> }
  >({
    mutationFn: ({ staffId, updates }) => updateStaff(schoolId, staffId, updates),
    onSuccess: (updatedStaff) => {
      // Update the specific staff member in cache
      queryClient.setQueryData(
        staffKeys.detail(schoolId, updatedStaff.id),
        updatedStaff
      );
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: staffKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: staffKeys.stats(schoolId) });
    },
  });
}

// Delete staff member
export function useDeleteStaff(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (staffId) => deleteStaff(schoolId, staffId),
    onSuccess: (_, staffId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: staffKeys.detail(schoolId, staffId) });
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: staffKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: staffKeys.stats(schoolId) });
    },
  });
}

// Bulk update staff
export function useBulkUpdateStaff(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { updated: number; failed: number },
    Error,
    { staffIds: string[]; updates: Partial<Omit<Staff, 'id' | 'schoolId' | 'createdAt'>> }
  >({
    mutationFn: ({ staffIds, updates }) => bulkUpdateStaff(schoolId, staffIds, updates),
    onSuccess: () => {
      // Invalidate all staff-related queries
      queryClient.invalidateQueries({ queryKey: staffKeys.all(schoolId) });
    },
  });
}
