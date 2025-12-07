import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Para estado de UI que debe persistir entre navegaciones
 * NO para datos del servidor (eso lo maneja React Query)
 */

interface CalendarPreferences {
  viewMode: 'auto' | 'list' | 'grid';
  filterDoctorId: string;
}

interface UIStore {
  // Preferencias del calendario
  calendarPreferences: CalendarPreferences;
  setCalendarViewMode: (mode: 'auto' | 'list' | 'grid') => void;
  setCalendarFilterDoctor: (doctorId: string) => void;
  
  // Estado del sidebar (para persistir entre navegaciones)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Último mes/año visto en calendarios
  lastViewedDate: string; // ISO date string
  setLastViewedDate: (date: string) => void;
  
  // Filtros aplicados en gestión de turnos
  shiftManagementFilters: {
    month: string;
    day: string;
    doctorId: string;
    status: string;
  };
  setShiftManagementFilters: (filters: Partial<UIStore['shiftManagementFilters']>) => void;
  
  // Reset
  resetUIStore: () => void;
}

const initialState = {
  calendarPreferences: {
    viewMode: 'auto' as const,
    filterDoctorId: '',
  },
  sidebarOpen: true,
  lastViewedDate: new Date().toISOString(),
  shiftManagementFilters: {
    month: '',
    day: '',
    doctorId: '',
    status: '',
  },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCalendarViewMode: (mode) =>
        set((state) => ({
          calendarPreferences: { ...state.calendarPreferences, viewMode: mode },
        })),
      
      setCalendarFilterDoctor: (doctorId) =>
        set((state) => ({
          calendarPreferences: { ...state.calendarPreferences, filterDoctorId: doctorId },
        })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setLastViewedDate: (date) => set({ lastViewedDate: date }),
      
      setShiftManagementFilters: (filters) =>
        set((state) => ({
          shiftManagementFilters: { ...state.shiftManagementFilters, ...filters },
        })),
      
      resetUIStore: () => set(initialState),
    }),
    {
      name: 'clinic-ui-store',
      // Solo persistir algunas propiedades
      partialize: (state) => ({
        calendarPreferences: state.calendarPreferences,
        sidebarOpen: state.sidebarOpen,
        lastViewedDate: state.lastViewedDate,
      }),
    }
  )
);
