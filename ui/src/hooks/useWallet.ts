import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, WalletTransaction, WalletBalance, WalletFilters, PaginationParams } from '@/services/walletService';
import { toast } from 'sonner';

const walletKeys = {
  all: (schoolId: string) => ['wallet', schoolId] as const,
  transactions: (schoolId: string, filters: WalletFilters, pagination: PaginationParams) =>
    [...walletKeys.all(schoolId), 'transactions', filters, pagination] as const,
  balances: (schoolId: string, filters: WalletFilters, pagination: PaginationParams) =>
    [...walletKeys.all(schoolId), 'balances', filters, pagination] as const,
  stats: (schoolId: string) => [...walletKeys.all(schoolId), 'stats'] as const
};

export function useWalletTransactions(
  schoolId: string,
  filters: WalletFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: walletKeys.transactions(schoolId, filters, pagination),
    queryFn: () => walletService.getTransactions(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useWalletBalances(
  schoolId: string,
  filters: WalletFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: walletKeys.balances(schoolId, filters, pagination),
    queryFn: () => walletService.getBalances(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateWalletTransaction(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<WalletTransaction, 'id' | 'schoolId' | 'balance' | 'createdAt' | 'updatedAt'>) =>
      walletService.createTransaction(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all(schoolId) });
      toast.success('Transaction completed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete transaction');
    }
  });
}

export function useWalletStats(schoolId: string) {
  return useQuery({
    queryKey: walletKeys.stats(schoolId),
    queryFn: () => walletService.getWalletStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
