import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examinationService, Exam, Result, ExamFilters, ResultFilters, PaginationParams } from '@/services/examinationService';

interface UseExamsOptions {
  schoolId: string;
  filters?: ExamFilters;
  pagination?: PaginationParams;
  autoFetch?: boolean;
}

interface UseResultsOptions {
  schoolId: string;
  filters?: ResultFilters;
  pagination?: PaginationParams;
  autoFetch?: boolean;
}

export function useExams(options: UseExamsOptions) {
  const { schoolId, filters, pagination, autoFetch = true } = options;
  const queryClient = useQueryClient();

  const queryKey = ['exams', schoolId, filters, pagination];

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => examinationService.getExams(schoolId, filters, pagination),
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const addMutation = useMutation({
    mutationFn: (exam: Omit<Exam, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      examinationService.addExam(schoolId, exam),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', schoolId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ examId, updates }: { examId: string; updates: Partial<Exam> }) =>
      examinationService.updateExam(schoolId, examId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', schoolId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (examId: string) => examinationService.deleteExam(schoolId, examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', schoolId] });
    }
  });

  return {
    data: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 1,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addExam: addMutation.mutateAsync,
    updateExam: updateMutation.mutateAsync,
    deleteExam: deleteMutation.mutateAsync,
    refetch
  };
}

export function useResults(options: UseResultsOptions) {
  const { schoolId, filters, pagination, autoFetch = true } = options;
  const queryClient = useQueryClient();

  const queryKey = ['results', schoolId, filters, pagination];

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => examinationService.getResults(schoolId, filters, pagination),
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const addMutation = useMutation({
    mutationFn: (result: Omit<Result, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      examinationService.addResult(schoolId, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', schoolId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ resultId, updates }: { resultId: string; updates: Partial<Result> }) =>
      examinationService.updateResult(schoolId, resultId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', schoolId] });
    }
  });

  return {
    data: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 1,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addResult: addMutation.mutateAsync,
    updateResult: updateMutation.mutateAsync,
    refetch
  };
}

export function useExamStats(schoolId: string) {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['exam-stats', schoolId],
    queryFn: () => examinationService.getExamStats(schoolId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  return {
    stats: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null
  };
}
