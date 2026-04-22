import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService, Student, StudentFilters, PaginationParams, CursorPaginationParams } from '@/services/studentService';
import { toast } from 'sonner';

export function useStudents(
  schoolId: string,
  filters: StudentFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: ['students', schoolId, filters, pagination],
    queryFn: () => studentService.getStudents(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!schoolId
  });
}

export function useStudentsCursor(
  schoolId: string,
  filters: StudentFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: ['students-cursor', schoolId, filters, pagination],
    queryFn: () => studentService.getStudentsCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useStudent(schoolId: string, studentId: string) {
  return useQuery({
    queryKey: ['student', schoolId, studentId],
    queryFn: () => studentService.getStudent(schoolId, studentId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId && !!studentId
  });
}

export function useCreateStudent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Student, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      studentService.createStudent(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-stats', schoolId] });
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    }
  });
}

export function useUpdateStudent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, updates }: { studentId: string; updates: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>> }) =>
      studentService.updateStudent(schoolId, studentId, updates),
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student', schoolId, studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-stats', schoolId] });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    }
  });
}

export function useDeleteStudent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => studentService.deleteStudent(schoolId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-stats', schoolId] });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete student');
    }
  });
}

export function useBulkUpdateStudents(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentIds, updates }: { studentIds: string[]; updates: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>> }) =>
      studentService.bulkUpdateStudents(schoolId, studentIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-stats', schoolId] });
      toast.success('Students updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update students');
    }
  });
}

export function useStudentStats(schoolId: string) {
  return useQuery({
    queryKey: ['student-stats', schoolId],
    queryFn: () => studentService.getStudentStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
