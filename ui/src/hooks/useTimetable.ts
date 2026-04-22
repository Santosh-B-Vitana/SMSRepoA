import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  timetableService,
  TimetableSlot,
  TimetableFilters,
  PaginationParams
} from '@/services/timetableService';
import { toast } from 'sonner';

export const timetableKeys = {
  all: (schoolId: string) => ['timetable', schoolId] as const,
  lists: (schoolId: string) => [...timetableKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: TimetableFilters, pagination: PaginationParams) =>
    [...timetableKeys.lists(schoolId), { filters, pagination }] as const,
};

export function useTimetable(
  schoolId: string,
  filters: TimetableFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
) {
  return useQuery({
    queryKey: timetableKeys.list(schoolId, filters, pagination),
    queryFn: () => timetableService.getTimetable(schoolId, filters, pagination),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useAddTimetableSlot(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TimetableSlot, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      timetableService.addTimetableSlot(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.success('Timetable slot added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add timetable slot');
    }
  });
}

export function useUpdateTimetableSlot(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, updates }: { slotId: string; updates: Partial<Omit<TimetableSlot, 'id' | 'schoolId' | 'createdAt'>> }) =>
      timetableService.updateTimetableSlot(schoolId, slotId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.success('Timetable slot updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update timetable slot');
    }
  });
}

export function useDeleteTimetableSlot(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => timetableService.deleteTimetableSlot(schoolId, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.success('Timetable slot deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete timetable slot');
    }
  });
}
