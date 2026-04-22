import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeService, StoreItem, StoreSale, StoreFilters, PaginationParams } from '@/services/storeService';
import { toast } from 'sonner';

const storeKeys = {
  all: (schoolId: string) => ['store', schoolId] as const,
  items: (schoolId: string, filters: StoreFilters, pagination: PaginationParams) =>
    [...storeKeys.all(schoolId), 'items', filters, pagination] as const,
  sales: (schoolId: string, filters: StoreFilters, pagination: PaginationParams) =>
    [...storeKeys.all(schoolId), 'sales', filters, pagination] as const,
  stats: (schoolId: string) => [...storeKeys.all(schoolId), 'stats'] as const
};

export function useStoreItems(
  schoolId: string,
  filters: StoreFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: storeKeys.items(schoolId, filters, pagination),
    queryFn: () => storeService.getItems(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useStoreSales(
  schoolId: string,
  filters: StoreFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: storeKeys.sales(schoolId, filters, pagination),
    queryFn: () => storeService.getSales(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateStoreItem(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<StoreItem, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      storeService.createItem(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.all(schoolId) });
      toast.success('Item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create item');
    }
  });
}

export function useCreateStoreSale(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<StoreSale, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      storeService.createSale(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.all(schoolId) });
      toast.success('Sale recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record sale');
    }
  });
}

export function useUpdateStock(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      storeService.updateStock(schoolId, itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.all(schoolId) });
      toast.success('Stock updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stock');
    }
  });
}

export function useStoreStats(schoolId: string) {
  return useQuery({
    queryKey: storeKeys.stats(schoolId),
    queryFn: () => storeService.getStoreStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
