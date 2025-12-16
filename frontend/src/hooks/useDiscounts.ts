import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discountsApi } from '../api/discounts';
import { CreateDiscountData, UpdateDiscountData } from '../types';

const discountKeys = {
  all: ['discounts'] as const,
  active: ['discounts', 'active'] as const,
};

export const useDiscounts = () => {
  return useQuery({
    queryKey: discountKeys.all,
    queryFn: discountsApi.getAll,
  });
};

export const useActiveDiscount = () => {
  return useQuery({
    queryKey: discountKeys.active,
    queryFn: discountsApi.getActive,
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDiscountData) => discountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.all });
      queryClient.invalidateQueries({ queryKey: discountKeys.active });
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscountData }) =>
      discountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.all });
      queryClient.invalidateQueries({ queryKey: discountKeys.active });
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.all });
      queryClient.invalidateQueries({ queryKey: discountKeys.active });
    },
  });
};
