import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService, Report, ReportFilters, PaginationParams, CursorPaginationParams } from '@/services/reportsService';
import { toast } from 'sonner';

const reportsKeys = {
  all: (schoolId: string) => ['reports', schoolId] as const,
  lists: (schoolId: string) => [...reportsKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: ReportFilters, pagination: PaginationParams) =>
    [...reportsKeys.lists(schoolId), filters, pagination] as const,
  listCursor: (schoolId: string, filters: ReportFilters, pagination: CursorPaginationParams) =>
    [...reportsKeys.lists(schoolId), 'cursor', filters, pagination] as const,
  stats: (schoolId: string) => [...reportsKeys.all(schoolId), 'stats'] as const
};

export function useReports(
  schoolId: string,
  filters: ReportFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: reportsKeys.list(schoolId, filters, pagination),
    queryFn: () => reportsService.getReports(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useReportsCursor(
  schoolId: string,
  filters: ReportFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: reportsKeys.listCursor(schoolId, filters, pagination),
    queryFn: () => reportsService.getReportsCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useGenerateReport(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Report, 'id' | 'schoolId' | 'status' | 'generatedAt' | 'createdAt' | 'updatedAt'>) =>
      reportsService.generateReport(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.stats(schoolId) });
      toast.success('Report generation started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate report');
    }
  });
}

export function useDeleteReport(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportsService.deleteReport(schoolId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.stats(schoolId) });
      toast.success('Report deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete report');
    }
  });
}

export function useReportStats(schoolId: string) {
  return useQuery({
    queryKey: reportsKeys.stats(schoolId),
    queryFn: () => reportsService.getReportStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
