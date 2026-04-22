import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alumniService, Alumni, AlumniMeet, AlumniFilters, PaginationParams } from '@/services/alumniService';
import { toast } from 'sonner';

const alumniKeys = {
  all: (schoolId: string) => ['alumni', schoolId] as const,
  lists: (schoolId: string) => [...alumniKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: AlumniFilters, pagination: PaginationParams) =>
    [...alumniKeys.lists(schoolId), filters, pagination] as const,
  meets: (schoolId: string) => [...alumniKeys.all(schoolId), 'meets'] as const,
  meetsList: (schoolId: string, pagination: PaginationParams) =>
    [...alumniKeys.meets(schoolId), pagination] as const,
  stats: (schoolId: string) => [...alumniKeys.all(schoolId), 'stats'] as const
};

export function useAlumni(
  schoolId: string,
  filters: AlumniFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: alumniKeys.list(schoolId, filters, pagination),
    queryFn: () => alumniService.getAlumni(schoolId, filters, pagination),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useAddAlumni(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Alumni, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      alumniService.addAlumni(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alumniKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: alumniKeys.stats(schoolId) });
      toast.success('Alumni added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add alumni');
    }
  });
}

export function useUpdateAlumni(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alumniId, updates }: { 
      alumniId: string; 
      updates: Partial<Omit<Alumni, 'id' | 'schoolId' | 'createdAt'>> 
    }) => alumniService.updateAlumni(schoolId, alumniId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alumniKeys.lists(schoolId) });
      toast.success('Alumni updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update alumni');
    }
  });
}

export function useDeleteAlumni(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alumniId: string) => alumniService.deleteAlumni(schoolId, alumniId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alumniKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: alumniKeys.stats(schoolId) });
      toast.success('Alumni deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete alumni');
    }
  });
}

export function useAlumniMeets(
  schoolId: string,
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: alumniKeys.meetsList(schoolId, pagination),
    queryFn: () => alumniService.getAlumniMeets(schoolId, pagination),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateAlumniMeet(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<AlumniMeet, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      alumniService.createMeet(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alumniKeys.meets(schoolId) });
      toast.success('Alumni meet created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create alumni meet');
    }
  });
}

export function useAlumniStats(schoolId: string) {
  return useQuery({
    queryKey: alumniKeys.stats(schoolId),
    queryFn: () => alumniService.getAlumniStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
