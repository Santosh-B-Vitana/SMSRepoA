import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  libraryService,
  Book,
  BookIssue,
  LibraryFilters,
  PaginationParams
} from '@/services/libraryService';
import { toast } from 'sonner';

export const libraryKeys = {
  all: (schoolId: string) => ['library', schoolId] as const,
  books: (schoolId: string) => [...libraryKeys.all(schoolId), 'books'] as const,
  booksList: (schoolId: string, filters: LibraryFilters, pagination: PaginationParams) =>
    [...libraryKeys.books(schoolId), { filters, pagination }] as const,
  issues: (schoolId: string) => [...libraryKeys.all(schoolId), 'issues'] as const,
  issuesList: (schoolId: string, filters: LibraryFilters, pagination: PaginationParams) =>
    [...libraryKeys.issues(schoolId), { filters, pagination }] as const,
};

export function useBooks(
  schoolId: string,
  filters: LibraryFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: libraryKeys.booksList(schoolId, filters, pagination),
    queryFn: () => libraryService.getBooks(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useBookIssues(
  schoolId: string,
  filters: LibraryFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: libraryKeys.issuesList(schoolId, filters, pagination),
    queryFn: () => libraryService.getBookIssues(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useAddBook(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Book, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      libraryService.addBook(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.books(schoolId) });
      toast.success('Book added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add book');
    }
  });
}

export function useIssueBook(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BookIssue, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      libraryService.issueBook(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all(schoolId) });
      toast.success('Book issued successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to issue book');
    }
  });
}

export function useReturnBook(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => libraryService.returnBook(schoolId, issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all(schoolId) });
      toast.success('Book returned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to return book');
    }
  });
}
