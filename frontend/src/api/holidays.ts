import api from './client';
import { Holiday, CreateHolidayData, UpdateHolidayData } from '../types';

interface HolidaysResponse {
  holidays: Holiday[];
}

interface HolidayResponse {
  holiday: Holiday;
  message?: string;
}

export interface HolidayFilters {
  year?: number;
}

export const holidayApi = {
  getAll: async (filters?: HolidayFilters): Promise<Holiday[]> => {
    const response = await api.get<HolidaysResponse>('/holidays', { params: filters });
    return response.data.holidays;
  },

  getById: async (id: string): Promise<Holiday> => {
    const response = await api.get<HolidayResponse>(`/holidays/${id}`);
    return response.data.holiday;
  },

  create: async (data: CreateHolidayData): Promise<Holiday> => {
    const response = await api.post<HolidayResponse>('/holidays', data);
    return response.data.holiday;
  },

  update: async (id: string, data: UpdateHolidayData): Promise<Holiday> => {
    const response = await api.put<HolidayResponse>(`/holidays/${id}`, data);
    return response.data.holiday;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/holidays/${id}`);
  },

  bulkCreate: async (holidays: CreateHolidayData[]): Promise<Holiday[]> => {
    const response = await api.post<HolidaysResponse>('/holidays/bulk', { holidays });
    return response.data.holidays;
  },
};
