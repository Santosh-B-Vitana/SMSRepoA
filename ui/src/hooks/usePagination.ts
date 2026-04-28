import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  offset: number;
  /** Set current page (1-indexed). Clamps to valid range if totalPages is known. */
  setPage: (page: number) => void;
  /** Jump to next page */
  nextPage: () => void;
  /** Jump to previous page */
  prevPage: () => void;
  /** Jump to first page */
  firstPage: () => void;
  /** Jump to last page (requires totalItems) */
  lastPage: () => void;
  /** Change page size and reset to page 1 */
  setPageSize: (size: number) => void;
  /** Computed from totalItems when provided */
  totalPages: number;
  /** Whether a previous page exists */
  hasPrev: boolean;
  /** Whether a next page exists */
  hasNext: boolean;
  /** Range description e.g. "1–20 of 150" */
  rangeLabel: string;
  /** Reset to page 1 */
  reset: () => void;
}

export interface UsePaginationOptions {
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Initial page size (default: 20) */
  initialPageSize?: number;
  /** Total number of items (required for totalPages / hasNext) */
  totalItems?: number;
}

/**
 * Generic pagination state hook.
 *
 * Usage:
 *   const { page, pageSize, offset, nextPage, prevPage, rangeLabel } = usePagination({
 *     totalItems: studentsQuery.data?.total,
 *   });
 */
export function usePagination(options: UsePaginationOptions = {}): PaginationControls {
  const { initialPage = 1, initialPageSize = 20, totalItems } = options;

  const [page, setPageRaw] = useState(initialPage);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    if (totalItems == null || totalItems <= 0) return 0;
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const hasPrev = page > 1;
  const hasNext = totalPages > 0 ? page < totalPages : true; // optimistic if total unknown

  const setPage = useCallback(
    (p: number) => {
      const clamped = totalPages > 0 ? Math.min(Math.max(1, p), totalPages) : Math.max(1, p);
      setPageRaw(clamped);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => setPage(page + 1), [page, setPage]);
  const prevPage = useCallback(() => setPage(page - 1), [page, setPage]);
  const firstPage = useCallback(() => setPage(1), [setPage]);
  const lastPage = useCallback(() => {
    if (totalPages > 0) setPage(totalPages);
  }, [totalPages, setPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1); // reset to first page when page size changes
  }, []);

  const reset = useCallback(() => {
    setPageRaw(initialPage);
    setPageSizeRaw(initialPageSize);
  }, [initialPage, initialPageSize]);

  const offset = (page - 1) * pageSize;

  const rangeLabel = useMemo(() => {
    if (totalItems == null) return `Page ${page}`;
    const from = offset + 1;
    const to = Math.min(offset + pageSize, totalItems);
    return `${from}–${to} of ${totalItems}`;
  }, [page, pageSize, offset, totalItems]);

  return {
    page,
    pageSize,
    offset,
    setPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    totalPages,
    hasPrev,
    hasNext,
    rangeLabel,
    reset,
  };
}
