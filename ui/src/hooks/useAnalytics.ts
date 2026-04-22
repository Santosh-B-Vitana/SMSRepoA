import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService, AnalyticsFilters, PaginationParams, CursorPaginationParams } from '@/services/analyticsService';
import { toast } from 'sonner';

const analyticsKeys = {
  all: (schoolId: string) => ['analytics', schoolId] as const,
  dashboard: (schoolId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(schoolId), 'dashboard', filters] as const,
  module: (schoolId: string, module: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(schoolId), 'module', module, filters] as const,
  activities: (schoolId: string, filters: AnalyticsFilters, pagination: PaginationParams) =>
    [...analyticsKeys.all(schoolId), 'activities', filters, pagination] as const,
  activitiesCursor: (schoolId: string, filters: AnalyticsFilters, pagination: CursorPaginationParams) =>
    [...analyticsKeys.all(schoolId), 'activitiesCursor', filters, pagination] as const
};

export function useDashboardAnalytics(
  schoolId: string,
  filters: AnalyticsFilters = {}
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(schoolId, filters),
    queryFn: () => analyticsService.getDashboardAnalytics(schoolId, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useModuleAnalytics(
  schoolId: string,
  module: string,
  filters: AnalyticsFilters = {}
) {
  return useQuery({
    queryKey: analyticsKeys.module(schoolId, module, filters),
    queryFn: () => analyticsService.getModuleAnalytics(schoolId, module, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId && !!module
  });
}

export function useActivityLogs(
  schoolId: string,
  filters: AnalyticsFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: analyticsKeys.activities(schoolId, filters, pagination),
    queryFn: () => analyticsService.getActivityLogs(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useActivityLogsCursor(
  schoolId: string,
  filters: AnalyticsFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: analyticsKeys.activitiesCursor(schoolId, filters, pagination),
    queryFn: () => analyticsService.getActivityLogsCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useExportAnalytics(schoolId: string) {
  return useMutation({
    mutationFn: ({ type, filters, format }: { 
      type: string; 
      filters?: AnalyticsFilters; 
      format?: 'csv' | 'pdf' | 'excel' 
    }) => analyticsService.exportAnalytics(schoolId, type, filters, format),
    onSuccess: (data) => {
      toast.success('Export ready for download');
      // Trigger download
      window.open(data.downloadUrl, '_blank');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export analytics');
    }
  });
}
