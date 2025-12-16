import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratesApi } from '../api/rates';
import { UpdateHourlyRateData } from '../types';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook to fetch all hourly rates
 */
export const useRates = () => {
  return useQuery({
    queryKey: queryKeys.rates.all,
    queryFn: () => ratesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes - rates don't change often
  });
};

/**
 * Hook to update hourly rates
 */
export const useUpdateRates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rates: UpdateHourlyRateData[]) => ratesApi.update(rates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });
    },
  });
};
