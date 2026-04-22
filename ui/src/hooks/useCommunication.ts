import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  communicationService,
  Announcement,
  Message,
  CommunicationFilters,
  PaginationParams
} from '@/services/communicationService';
import { toast } from 'sonner';

export const communicationKeys = {
  all: (schoolId: string) => ['communication', schoolId] as const,
  announcements: (schoolId: string) => [...communicationKeys.all(schoolId), 'announcements'] as const,
  announcementsList: (schoolId: string, filters: CommunicationFilters, pagination: PaginationParams) =>
    [...communicationKeys.announcements(schoolId), { filters, pagination }] as const,
  messages: (schoolId: string) => [...communicationKeys.all(schoolId), 'messages'] as const,
  messagesList: (schoolId: string, filters: CommunicationFilters, pagination: PaginationParams) =>
    [...communicationKeys.messages(schoolId), { filters, pagination }] as const,
};

export function useAnnouncements(
  schoolId: string,
  filters: CommunicationFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: communicationKeys.announcementsList(schoolId, filters, pagination),
    queryFn: () => communicationService.getAnnouncements(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useMessages(
  schoolId: string,
  filters: CommunicationFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 }
) {
  return useQuery({
    queryKey: communicationKeys.messagesList(schoolId, filters, pagination),
    queryFn: () => communicationService.getMessages(schoolId, filters, pagination),
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId
  });
}

export function useCreateAnnouncement(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Announcement, 'id' | 'schoolId' | 'readCount' | 'createdAt' | 'updatedAt'>) =>
      communicationService.createAnnouncement(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.announcements(schoolId) });
      toast.success('Announcement created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create announcement');
    }
  });
}

export function useSendMessage(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Message, 'id' | 'schoolId' | 'status' | 'sentAt' | 'createdAt' | 'updatedAt'>) =>
      communicationService.sendMessage(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.messages(schoolId) });
      toast.success('Message sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    }
  });
}
