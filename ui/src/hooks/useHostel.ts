import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostelService, HostelRoom, HostelStudent, HostelFilters, PaginationParams } from '@/services/hostelService';
import { toast } from 'sonner';

const hostelKeys = {
  all: (schoolId: string) => ['hostel', schoolId] as const,
  rooms: (schoolId: string, filters: HostelFilters, pagination: PaginationParams) => 
    [...hostelKeys.all(schoolId), 'rooms', filters, pagination] as const,
  students: (schoolId: string, filters: HostelFilters, pagination: PaginationParams) =>
    [...hostelKeys.all(schoolId), 'students', filters, pagination] as const,
  stats: (schoolId: string) => [...hostelKeys.all(schoolId), 'stats'] as const
};

export function useHostelRooms(
  schoolId: string,
  filters: HostelFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: hostelKeys.rooms(schoolId, filters, pagination),
    queryFn: () => hostelService.getRooms(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useHostelStudents(
  schoolId: string,
  filters: HostelFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: hostelKeys.students(schoolId, filters, pagination),
    queryFn: () => hostelService.getHostelStudents(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateHostelRoom(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<HostelRoom, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      hostelService.createRoom(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hostelKeys.all(schoolId) });
      toast.success('Room created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create room');
    }
  });
}

export function useAssignHostelStudent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<HostelStudent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      hostelService.assignStudent(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hostelKeys.all(schoolId) });
      toast.success('Student assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign student');
    }
  });
}

export function useHostelStats(schoolId: string) {
  return useQuery({
    queryKey: hostelKeys.stats(schoolId),
    queryFn: () => hostelService.getHostelStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
