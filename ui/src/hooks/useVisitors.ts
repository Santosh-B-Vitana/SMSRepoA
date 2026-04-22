import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitorService, Visitor, VisitorFilters, PaginationParams } from '@/services/visitorService';
import { toast } from 'sonner';

const visitorKeys = {
  all: (schoolId: string) => ['visitors', schoolId] as const,
  lists: (schoolId: string) => [...visitorKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: VisitorFilters, pagination: PaginationParams) =>
    [...visitorKeys.lists(schoolId), filters, pagination] as const,
  stats: (schoolId: string) => [...visitorKeys.all(schoolId), 'stats'] as const
};

export function useVisitors(
  schoolId: string,
  filters: VisitorFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: visitorKeys.list(schoolId, filters, pagination),
    queryFn: () => visitorService.getVisitors(schoolId, filters, pagination),
    staleTime: 30 * 1000, // 30 seconds for real-time tracking
    enabled: !!schoolId
  });
}

export function useCheckInVisitor(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Visitor, 'id' | 'schoolId' | 'status' | 'checkIn' | 'createdAt' | 'updatedAt'>) =>
      visitorService.checkInVisitor(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats(schoolId) });
      toast.success('Visitor checked in successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check in visitor');
    }
  });
}

export function useCheckOutVisitor(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visitorId: string) => visitorService.checkOutVisitor(schoolId, visitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: visitorKeys.stats(schoolId) });
      toast.success('Visitor checked out successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check out visitor');
    }
  });
}

export function useUpdateVisitor(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitorId, updates }: { 
      visitorId: string; 
      updates: Partial<Omit<Visitor, 'id' | 'schoolId' | 'createdAt'>> 
    }) => visitorService.updateVisitor(schoolId, visitorId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitorKeys.lists(schoolId) });
      toast.success('Visitor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update visitor');
    }
  });
}

export function useVisitorStats(schoolId: string) {
  return useQuery({
    queryKey: visitorKeys.stats(schoolId),
    queryFn: () => visitorService.getVisitorStats(schoolId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!schoolId
  });
}
