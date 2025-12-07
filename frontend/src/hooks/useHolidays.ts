import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayApi, HolidayFilters } from '../api/holidays';
import { queryKeys } from '../lib/queryClient';
import { CreateHolidayData, UpdateHolidayData } from '../types';

/**
 * Hook para obtener todos los feriados
 */
export const useHolidays = (filters?: HolidayFilters) => {
  return useQuery({
    queryKey: queryKeys.holidays.list(filters?.year),
    queryFn: () => holidayApi.getAll(filters),
    // Los feriados cambian muy poco
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para crear un feriado
 */
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateHolidayData) => holidayApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

/**
 * Hook para actualizar un feriado
 */
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayData }) => 
      holidayApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

/**
 * Hook para eliminar un feriado
 */
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => holidayApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};
