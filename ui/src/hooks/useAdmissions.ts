import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  admissionService,
  AdmissionFilters,
  AdmissionPaginationParams,
  CreateAdmissionData,
  UpdateAdmissionData,
} from '@/services/admissionService';

interface UseAdmissionsOptions {
  filters?: AdmissionFilters;
  pagination?: AdmissionPaginationParams;
  autoFetch?: boolean;
}

export function useAdmissions(options: UseAdmissionsOptions = {}) {
  const { filters, pagination, autoFetch = true } = options;
  const queryClient = useQueryClient();

  const queryKey = ['admissions', filters, pagination];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => admissionService.getAdmissions(filters, pagination),
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateAdmissionData) => admissionService.createAdmission(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdmissionData }) =>
      admissionService.updateAdmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      admissionService.updateStatus(id, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => admissionService.approveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      admissionService.rejectApplication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: ({ id, admissionNumber }: { id: string; admissionNumber: string }) =>
      admissionService.enrollApplication(id, admissionNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => admissionService.deleteAdmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission-stats'] });
    },
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, date, notes }: { id: string; date: string; notes?: string }) =>
      admissionService.scheduleInterview(id, date, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
  });

  return {
    items: data?.items || [],
    totalCount: data?.totalCount || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 1,
    isLoading,
    error: error instanceof Error ? error.message : null,
    createAdmission: createMutation.mutateAsync,
    updateAdmission: updateMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    approveApplication: approveMutation.mutateAsync,
    rejectApplication: rejectMutation.mutateAsync,
    enrollApplication: enrollMutation.mutateAsync,
    scheduleInterview: interviewMutation.mutateAsync,
    deleteAdmission: deleteMutation.mutateAsync,
    refetch,
  };
}

export function useAdmissionById(id: string | null) {
  return useQuery({
    queryKey: ['admission', id],
    queryFn: () => admissionService.getAdmissionById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdmissionStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admission-stats'],
    queryFn: () => admissionService.getStats(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    stats: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useAdmissionDocuments(admissionId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admission-documents', admissionId],
    queryFn: () => admissionService.getDocuments(admissionId!),
    enabled: !!admissionId,
    staleTime: 2 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      documentType,
      documentName,
      fileUrl,
    }: {
      documentType: string;
      documentName: string;
      fileUrl: string;
    }) => admissionService.uploadDocument(admissionId!, documentType, documentName, fileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-documents', admissionId] });
    },
  });

  return {
    documents: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    uploadDocument: uploadMutation.mutateAsync,
  };
}

