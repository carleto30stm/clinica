import api from './client';
import { ExternalHours, CreateExternalHoursData, UpdateExternalHoursData } from '../types';

export const externalHoursApi = {
  /**
   * Get all external hours (admin only)
   * @param filters - Optional filters: month, year, doctorId
   */
  getAll: async (filters?: { month?: number; year?: number; doctorId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    
    const response = await api.get(`/external-hours?${params.toString()}`);
    return response.data.externalHours as ExternalHours[];
  },

  /**
   * Get external hours for current doctor
   * @param filters - Optional filters: month, year
   */
  getMy: async (filters?: { month?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    
    const response = await api.get(`/external-hours/my?${params.toString()}`);
    return response.data.externalHours as ExternalHours[];
  },

  /**
   * Create external hours entry (admin only)
   */
  create: async (data: CreateExternalHoursData) => {
    const response = await api.post('/external-hours', data);
    return response.data.externalHours as ExternalHours;
  },

  /**
   * Update external hours entry (admin only)
   */
  update: async (id: string, data: UpdateExternalHoursData) => {
    const response = await api.patch(`/external-hours/${id}`, data);
    return response.data.externalHours as ExternalHours;
  },

  /**
   * Delete external hours entry (admin only)
   */
  delete: async (id: string) => {
    await api.delete(`/external-hours/${id}`);
  },
};

export default externalHoursApi;
