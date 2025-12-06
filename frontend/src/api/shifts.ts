import api from './client';
import { Shift, CreateShiftData, UpdateShiftData } from '../types';

interface ShiftsResponse {
  shifts: Shift[];
}

interface ShiftResponse {
  shift: Shift;
  message?: string;
}

export interface ShiftFilters {
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  type?: 'FIXED' | 'ROTATING';
  isAvailable?: boolean;
}

export const shiftApi = {
  getAll: async (filters?: ShiftFilters): Promise<Shift[]> => {
    const response = await api.get<ShiftsResponse>('/shifts', { params: filters });
    return response.data.shifts;
  },

  getById: async (id: string): Promise<Shift> => {
    const response = await api.get<ShiftResponse>(`/shifts/${id}`);
    return response.data.shift;
  },

  create: async (data: CreateShiftData): Promise<Shift> => {
    const response = await api.post<ShiftResponse>('/shifts', data);
    return response.data.shift;
  },

  update: async (id: string, data: UpdateShiftData): Promise<Shift> => {
    const response = await api.put<ShiftResponse>(`/shifts/${id}`, data);
    return response.data.shift;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/shifts/${id}`);
  },

  bulkDelete: async (ids: string[]): Promise<{ message?: string }> => {
    const response = await api.post<{ message?: string }>('/shifts/bulk-delete', { ids });
    return response.data;
  },

  bulkCreate: async (shifts: CreateShiftData[]): Promise<Shift[]> => {
    const response = await api.post<ShiftsResponse>('/shifts/bulk', { shifts });
    return response.data.shifts;
  },

  batchAssign: async (assignments: Array<{ shiftId: string; doctorIds: string[] }>): Promise<Shift[]> => {
    const response = await api.patch<ShiftsResponse>('/shifts/batch-assign', { assignments });
    return response.data.shifts;
  },

  // Doctor endpoints
  getMyShifts: async (filters?: { startDate?: string; endDate?: string }): Promise<Shift[]> => {
    const response = await api.get<ShiftsResponse>('/shifts/my', { params: filters });
    return response.data.shifts;
  },

  getAvailable: async (filters?: { startDate?: string; endDate?: string }): Promise<Shift[]> => {
    const response = await api.get<ShiftsResponse>('/shifts/available', { params: filters });
    return response.data.shifts;
  },

  selfAssign: async (id: string): Promise<Shift> => {
    const response = await api.post<ShiftResponse>(`/shifts/${id}/self-assign`);
    return response.data.shift;
  },
};
