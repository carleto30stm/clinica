import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, CreateUserData, UpdateUserData } from '../api/users';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook para obtener todos los usuarios
 */
export const useUsers = (filters?: { role?: string; isActive?: string; search?: string }) => {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => userApi.getAll(filters),
  });
};

/**
 * Hook para obtener lista de doctores (para dropdowns)
 * Este es uno de los más usados, staleTime más largo
 */
export const useDoctors = () => {
  return useQuery({
    queryKey: queryKeys.users.doctors,
    queryFn: () => userApi.getDoctors(),
    // Los doctores cambian poco, cache más largo
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obtener un usuario por ID
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userApi.getById(id),
    enabled: !!id,
  });
};

/**
 * Hook para crear un usuario
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateUserData) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

/**
 * Hook para actualizar un usuario
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => 
      userApi.update(id, data),
    onSuccess: (updatedUser) => {
      // Actualizar cache del usuario específico
      queryClient.setQueryData(
        queryKeys.users.detail(updatedUser.id),
        updatedUser
      );
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.doctors });
    },
  });
};

/**
 * Hook para eliminar un usuario
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};
