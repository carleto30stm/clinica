import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalHoursApi } from '../api/externalHours';
import { CreateExternalHoursData, UpdateExternalHoursData } from '../types';

const externalHoursKeys = {
  all: ['externalHours'] as const,
  lists: () => [...externalHoursKeys.all, 'list'] as const,
  list: (filters?: { month?: number; year?: number; doctorId?: string }) =>
    [...externalHoursKeys.lists(), filters] as const,
  my: (filters?: { month?: number; year?: number }) =>
    [...externalHoursKeys.all, 'my', filters] as const,
};

/**
 * Get all external hours (admin only)
 */
export const useExternalHours = (filters?: { month?: number; year?: number; doctorId?: string }) => {
  return useQuery({
    queryKey: externalHoursKeys.list(filters),
    queryFn: () => externalHoursApi.getAll(filters),
  });
};

/**
 * Get external hours for current doctor
 */
export const useMyExternalHours = (filters?: { month?: number; year?: number }) => {
  return useQuery({
    queryKey: externalHoursKeys.my(filters),
    queryFn: () => externalHoursApi.getMy(filters),
  });
};

/**
 * Create external hours entry (admin only)
 */
export const useCreateExternalHours = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExternalHoursData) => externalHoursApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalHoursKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] }); // Refresh stats
    },
  });
};

/**
 * Update external hours entry (admin only)
 */
export const useUpdateExternalHours = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExternalHoursData }) =>
      externalHoursApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalHoursKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] }); // Refresh stats
    },
  });
};

/**
 * Delete external hours entry (admin only)
 */
export const useDeleteExternalHours = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => externalHoursApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalHoursKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] }); // Refresh stats
    },
  });
};
