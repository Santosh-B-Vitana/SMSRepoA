import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CRUDService<TItem, TCreate, TUpdate = TCreate> {
  list: (params?: Record<string, unknown>) => Promise<{ data?: TItem[]; items?: TItem[]; [key: string]: unknown }>;
  get: (id: string) => Promise<TItem>;
  create: (data: TCreate) => Promise<TItem>;
  update: (id: string, data: TUpdate) => Promise<TItem>;
  remove: (id: string) => Promise<void>;
}

export interface UseBaseCRUDOptions {
  /** e.g. ["students", schoolId] — used to scope query invalidation */
  queryKey: readonly unknown[];
  /** Stale time in ms (default: 2 min) */
  staleTime?: number;
  /** Whether to enable the list query (default: true) */
  enabled?: boolean;
  /** Extra params forwarded to service.list() */
  listParams?: Record<string, unknown>;
}

/**
 * Generic CRUD hook that eliminates boilerplate for list / create / update / delete.
 *
 * Usage:
 *   const { items, create, update, remove } = useBaseCRUD(studentService, {
 *     queryKey: ["students", schoolId],
 *     enabled: !!schoolId,
 *   });
 */
export function useBaseCRUD<TItem extends { id: string }, TCreate, TUpdate = TCreate>(
  service: CRUDService<TItem, TCreate, TUpdate>,
  options: UseBaseCRUDOptions
) {
  const { queryKey, staleTime = 2 * 60 * 1000, enabled = true, listParams } = options;
  const qc = useQueryClient();

  // ── List ─────────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: [...queryKey, "list", listParams],
    queryFn: () => service.list(listParams),
    staleTime,
    enabled,
  });

  const items: TItem[] = (() => {
    const raw = listQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as TItem[];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
    // try first array-valued key
    const arrayKey = Object.keys(raw).find((k) => Array.isArray((raw as Record<string, unknown>)[k]));
    return arrayKey ? ((raw as Record<string, unknown>)[arrayKey] as TItem[]) : [];
  })();

  // ── Get single ───────────────────────────────────────────────────────────
  const useGetById = (id: string | undefined) =>
    useQuery({
      queryKey: [...queryKey, "detail", id],
      queryFn: () => service.get(id!),
      staleTime,
      enabled: enabled && !!id,
    });

  // ── Create ───────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (data: TCreate) => service.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKey, "list"] });
      toast.success("Created successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to create";
      toast.error(message);
    },
  });

  // ── Update ───────────────────────────────────────────────────────────────
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TUpdate }) =>
      service.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [...queryKey, "list"] });
      qc.invalidateQueries({ queryKey: [...queryKey, "detail", id] });
      toast.success("Updated successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    },
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const remove = useMutation({
    mutationFn: (id: string) => service.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKey, "list"] });
      toast.success("Deleted successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    },
  });

  return {
    // List state
    items,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,

    // Single item
    useGetById,

    // Mutations
    create,
    update,
    remove,

    // Raw query (for advanced use)
    listQuery,
  };
}
