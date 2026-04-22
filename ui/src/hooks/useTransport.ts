import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  transportService,
  TransportRoute,
  TransportStudent,
  TransportFilters,
  PaginationParams
} from '@/services/transportService';
import { toast } from 'sonner';

export const transportKeys = {
  all: (schoolId: string) => ['transport', schoolId] as const,
  routes: (schoolId: string) => [...transportKeys.all(schoolId), 'routes'] as const,
  routesList: (schoolId: string, filters: TransportFilters, pagination: PaginationParams) =>
    [...transportKeys.routes(schoolId), { filters, pagination }] as const,
  students: (schoolId: string) => [...transportKeys.all(schoolId), 'students'] as const,
  studentsList: (schoolId: string, filters: TransportFilters, pagination: PaginationParams) =>
    [...transportKeys.students(schoolId), { filters, pagination }] as const,
};

export function useTransportRoutes(
  schoolId: string,
  filters: TransportFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: transportKeys.routesList(schoolId, filters, pagination),
    queryFn: () => transportService.getRoutes(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useTransportStudents(
  schoolId: string,
  filters: TransportFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: transportKeys.studentsList(schoolId, filters, pagination),
    queryFn: () => transportService.getTransportStudents(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useAddRoute(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TransportRoute, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      transportService.addRoute(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.routes(schoolId) });
      toast.success('Route added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add route');
    }
  });
}

export function useAssignTransportStudent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TransportStudent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      transportService.assignStudent(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.all(schoolId) });
      toast.success('Student assigned to transport successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign student');
    }
  });
}
