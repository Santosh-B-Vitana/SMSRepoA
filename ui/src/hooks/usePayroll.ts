import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService, PayrollRecord, PayrollFilters, PaginationParams } from '@/services/payrollService';
import { toast } from 'sonner';

const payrollKeys = {
  all: (schoolId: string) => ['payroll', schoolId] as const,
  lists: (schoolId: string) => [...payrollKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: PayrollFilters, pagination: PaginationParams) =>
    [...payrollKeys.lists(schoolId), filters, pagination] as const,
  stats: (schoolId: string) => [...payrollKeys.all(schoolId), 'stats'] as const
};

export function usePayrollRecords(
  schoolId: string,
  filters: PayrollFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: payrollKeys.list(schoolId, filters, pagination),
    queryFn: () => payrollService.getPayrollRecords(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreatePayrollRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PayrollRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      payrollService.createPayrollRecord(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.stats(schoolId) });
      toast.success('Payroll record created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create payroll record');
    }
  });
}

export function useUpdatePayrollRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }: { recordId: string; updates: Partial<Omit<PayrollRecord, 'id' | 'schoolId' | 'createdAt'>> }) =>
      payrollService.updatePayrollRecord(schoolId, recordId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.stats(schoolId) });
      toast.success('Payroll record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payroll record');
    }
  });
}

export function useDeletePayrollRecord(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => payrollService.deletePayrollRecord(schoolId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.stats(schoolId) });
      toast.success('Payroll record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete payroll record');
    }
  });
}

export function usePayrollStats(schoolId: string) {
  return useQuery({
    queryKey: payrollKeys.stats(schoolId),
    queryFn: () => payrollService.getPayrollStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
