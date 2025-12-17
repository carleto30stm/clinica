import api from './client';
import { MonthlyStats, CoverageResponse } from '../types';

interface WeekendCoverageResponse {
  month: number;
  year: number;
  weekends: Array<{
    weekKey: string;
    shifts: unknown[];
    totalShifts: number;
    assignedShifts: number;
  }>;
  totalWeekendShifts: number;
  assignedWeekendShifts: number;
}

interface DoctorHoursResponse {
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
  };
  month: number;
  year: number;
  summary: {
    totalHours: number;
    fixedHours: number;
    rotatingHours: number;
    weekendHours: number;
    shiftCount: number;
    externalHours?: number;
  };
  shiftsPayment?: number;
  externalPayment?: number;
  brutoPayment?: number;
  hasDiscount?: boolean;
  discountAmount?: number;
  finalPayment?: number;
  shifts: unknown[];
}

export const statsApi = {
  getMonthlyStats: async (year?: number, month?: number): Promise<MonthlyStats> => {
    const response = await api.get<MonthlyStats>('/stats/monthly', {
      params: { year, month },
    });
    return response.data;
  },

  getDailyCoverage: async (year?: number, month?: number): Promise<CoverageResponse> => {
    const response = await api.get<CoverageResponse>('/stats/coverage', {
      params: { year, month },
    });
    return response.data;
  },

  getWeekendCoverage: async (year?: number, month?: number): Promise<WeekendCoverageResponse> => {
    const response = await api.get<WeekendCoverageResponse>('/stats/weekends', {
      params: { year, month },
    });
    return response.data;
  },

  getDoctorHours: async (
    doctorId: string,
    year?: number,
    month?: number
  ): Promise<DoctorHoursResponse> => {
    const response = await api.get<DoctorHoursResponse>(`/stats/doctor/${doctorId}/hours`, {
      params: { year, month },
    });
    return response.data;
  },
};
