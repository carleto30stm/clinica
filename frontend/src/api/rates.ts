import apiClient from './client';
import { HourlyRate, UpdateHourlyRateData } from '../types';

interface RatesResponse {
  rates: HourlyRate[];
  message?: string;
}

export const ratesApi = {
  /**
   * Get all hourly rates
   */
  getAll: async (): Promise<HourlyRate[]> => {
    const response = await apiClient.get<RatesResponse>('/rates');
    return response.data.rates;
  },

  /**
   * Update hourly rates (admin only)
   */
  update: async (rates: UpdateHourlyRateData[]): Promise<HourlyRate[]> => {
    const response = await apiClient.put<RatesResponse>('/rates', { rates });
    return response.data.rates;
  },
};

export default ratesApi;
