import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  attendanceService,
  AttendanceRecord,
  AttendanceFilters,
  PaginationParams,
  CursorPaginationParams
} from '@/services/attendanceService';
import { toast } from 'sonner';

export const attendanceKeys = {
  all: (schoolId: string) => ['attendance', schoolId] as const,
  lists: (schoolId: string) => [...attendanceKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: AttendanceFilters, pagination: PaginationParams) =>
    [...attendanceKeys.lists(schoolId), { filters, pagination }] as const,
  listCursor: (schoolId: string, filters: AttendanceFilters, pagination: CursorPaginationParams) =>
    [...attendanceKeys.lists(schoolId), 'cursor', { filters, pagination }] as const,
  stats: (schoolId: string, filters?: AttendanceFilters) =>
    [...attendanceKeys.all(schoolId), 'stats', filters] as const,
};

export function useAttendance(
  schoolId: string,
  filters: AttendanceFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: attendanceKeys.list(schoolId, filters, pagination),
    queryFn: () => attendanceService.getAttendance(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useAttendanceCursor(
  schoolId: string,
  filters: AttendanceFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: attendanceKeys.listCursor(schoolId, filters, pagination),
    queryFn: () => attendanceService.getAttendanceCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useMarkAttendance(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<AttendanceRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      attendanceService.markAttendance(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all(schoolId) });
      toast.success('Attendance marked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark attendance');
    }
  });
}

export function useBulkMarkAttendance(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (records: Omit<AttendanceRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>[]) =>
      attendanceService.bulkMarkAttendance(schoolId, records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all(schoolId) });
      toast.success('Bulk attendance marked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark bulk attendance');
    }
  });
}

export function useAttendanceStats(schoolId: string, filters?: AttendanceFilters) {
  return useQuery({
    queryKey: attendanceKeys.stats(schoolId, filters),
    queryFn: () => attendanceService.getAttendanceStats(schoolId, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
