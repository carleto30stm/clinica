import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi, ShiftFilters } from '../api/shifts';
import { queryKeys } from '../lib/queryClient';
import { CreateShiftData, UpdateShiftData } from '../types';

/**
 * Hook para obtener todos los turnos con filtros
 */
export const useShifts = (filters?: ShiftFilters) => {
  return useQuery({
    queryKey: queryKeys.shifts.list(filters),
    queryFn: () => shiftApi.getAll(filters),
    enabled: true,
  });
};

/**
 * Hook para obtener los turnos del doctor actual
 */
export const useMyShifts = (filters?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: queryKeys.shifts.my(filters),
    queryFn: () => shiftApi.getMyShifts(filters),
  });
};

/**
 * Hook para obtener turnos disponibles para auto-asignación
 */
export const useAvailableShifts = (filters?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: queryKeys.shifts.available(filters),
    queryFn: () => shiftApi.getAvailable(filters),
  });
};

/**
 * Hook para obtener un turno por ID
 */
export const useShift = (id: string) => {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => shiftApi.getById(id),
    enabled: !!id,
  });
};

/**
 * Hook para crear un turno
 */
export const useCreateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateShiftData) => shiftApi.create(data),
    onSuccess: () => {
      // Invalidar todas las queries de shifts
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};

/**
 * Hook para crear múltiples turnos
 */
export const useBulkCreateShifts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shifts: CreateShiftData[]) => shiftApi.bulkCreate(shifts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};

/**
 * Hook para actualizar un turno
 */
export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftData }) => 
      shiftApi.update(id, data),
    onSuccess: (updatedShift) => {
      // Actualizar el cache del turno específico
      queryClient.setQueryData(
        queryKeys.shifts.detail(updatedShift.id),
        updatedShift
      );
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.available() });
    },
  });
};

/**
 * Hook para eliminar un turno
 */
export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => shiftApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};

/**
 * Hook para eliminar múltiples turnos
 */
export const useBulkDeleteShifts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: string[]) => shiftApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};

/**
 * Hook para auto-asignarse a un turno
 */
export const useSelfAssignShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => shiftApi.selfAssign(id),
    onSuccess: () => {
      // Invalidar turnos disponibles y mis turnos
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.available() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.list() });
    },
  });
};

/**
 * Hook para asignación batch
 */
export const useBatchAssignShifts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignments: Array<{ shiftId: string; doctorIds: string[] }>) => 
      shiftApi.batchAssign(assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};
