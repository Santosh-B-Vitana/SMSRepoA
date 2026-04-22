import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  parentService, 
  Parent, 
  ParentCommunication, 
  ParentMeeting,
  ParentFilters, 
  CommunicationFilters,
  MeetingFilters,
  PaginationParams, 
  CursorPaginationParams 
} from '@/services/parentService';
import { toast } from 'sonner';

// Query Keys
const parentKeys = {
  all: (schoolId: string) => ['parents', schoolId] as const,
  lists: (schoolId: string) => [...parentKeys.all(schoolId), 'list'] as const,
  list: (schoolId: string, filters: ParentFilters, pagination: PaginationParams) => 
    [...parentKeys.lists(schoolId), filters, pagination] as const,
  listCursor: (schoolId: string, filters: ParentFilters, pagination: CursorPaginationParams) =>
    [...parentKeys.lists(schoolId), 'cursor', filters, pagination] as const,
  details: (schoolId: string) => [...parentKeys.all(schoolId), 'detail'] as const,
  detail: (schoolId: string, parentId: string) => [...parentKeys.details(schoolId), parentId] as const,
  communications: (schoolId: string, filters: CommunicationFilters, pagination: PaginationParams) =>
    [...parentKeys.all(schoolId), 'communications', filters, pagination] as const,
  meetings: (schoolId: string, filters: MeetingFilters, pagination: PaginationParams) =>
    [...parentKeys.all(schoolId), 'meetings', filters, pagination] as const,
  stats: (schoolId: string) => [...parentKeys.all(schoolId), 'stats'] as const
};

// Parent Hooks
export function useParents(
  schoolId: string,
  filters: ParentFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: parentKeys.list(schoolId, filters, pagination),
    queryFn: () => parentService.getParents(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useParentsCursor(
  schoolId: string,
  filters: ParentFilters = {},
  pagination: CursorPaginationParams = { limit: 20 }
) {
  return useQuery({
    queryKey: parentKeys.listCursor(schoolId, filters, pagination),
    queryFn: () => parentService.getParentsCursor(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useParent(schoolId: string, parentId: string) {
  return useQuery({
    queryKey: parentKeys.detail(schoolId, parentId),
    queryFn: () => parentService.getParent(schoolId, parentId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId && !!parentId
  });
}

export function useCreateParent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Parent, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) =>
      parentService.createParent(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.stats(schoolId) });
      toast.success('Parent created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create parent');
    }
  });
}

export function useUpdateParent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentId, updates }: { parentId: string; updates: Partial<Omit<Parent, 'id' | 'schoolId' | 'createdAt'>> }) =>
      parentService.updateParent(schoolId, parentId, updates),
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.detail(schoolId, parentId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.stats(schoolId) });
      toast.success('Parent updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update parent');
    }
  });
}

export function useDeleteParent(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: string) => parentService.deleteParent(schoolId, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists(schoolId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.stats(schoolId) });
      toast.success('Parent deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete parent');
    }
  });
}

// Communication Hooks
export function useParentCommunications(
  schoolId: string,
  filters: CommunicationFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: parentKeys.communications(schoolId, filters, pagination),
    queryFn: () => parentService.getCommunications(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useSendCommunication(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ParentCommunication, 'id' | 'schoolId' | 'status' | 'sentAt' | 'createdAt' | 'updatedAt'>) =>
      parentService.sendCommunication(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all(schoolId) });
      toast.success('Communication sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send communication');
    }
  });
}

// Meeting Hooks
export function useParentMeetings(
  schoolId: string,
  filters: MeetingFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: parentKeys.meetings(schoolId, filters, pagination),
    queryFn: () => parentService.getMeetings(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useScheduleMeeting(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ParentMeeting, 'id' | 'schoolId' | 'status' | 'createdAt' | 'updatedAt'>) =>
      parentService.scheduleMeeting(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all(schoolId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.stats(schoolId) });
      toast.success('Meeting scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to schedule meeting');
    }
  });
}

export function useUpdateMeeting(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, updates }: { meetingId: string; updates: Partial<Omit<ParentMeeting, 'id' | 'schoolId' | 'createdAt'>> }) =>
      parentService.updateMeeting(schoolId, meetingId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all(schoolId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.stats(schoolId) });
      toast.success('Meeting updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update meeting');
    }
  });
}

// Stats Hook
export function useParentStats(schoolId: string) {
  return useQuery({
    queryKey: parentKeys.stats(schoolId),
    queryFn: () => parentService.getParentStats(schoolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId
  });
}
