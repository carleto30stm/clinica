import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos se consideran frescos por 2 minutos
      staleTime: 2 * 60 * 1000,
      // Cache se mantiene por 10 minutos después de no usarse
      gcTime: 10 * 60 * 1000,
      // Reintentar 2 veces en errores
      retry: 2,
      // Refetch cuando la ventana recupera el foco
      refetchOnWindowFocus: true,
      // No refetch al montar si los datos son frescos
      refetchOnMount: true,
    },
    mutations: {
      // Reintentar 1 vez en errores de mutación
      retry: 1,
    },
  },
});

// Query keys centralizados para consistencia
export const queryKeys = {
  // Shifts
  shifts: {
    all: ['shifts'] as const,
    list: (filters?: { startDate?: string; endDate?: string; doctorId?: string }) => 
      ['shifts', 'list', filters] as const,
    detail: (id: string) => ['shifts', 'detail', id] as const,
    my: (filters?: { startDate?: string; endDate?: string }) => 
      ['shifts', 'my', filters] as const,
    available: (filters?: { startDate?: string; endDate?: string }) => 
      ['shifts', 'available', filters] as const,
  },
  
  // Users/Doctors
  users: {
    all: ['users'] as const,
    list: (filters?: { role?: string; isActive?: string }) => 
      ['users', 'list', filters] as const,
    doctors: ['users', 'doctors'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  
  // Holidays
  holidays: {
    all: ['holidays'] as const,
    list: (year?: number) => ['holidays', 'list', year] as const,
  },
  
  // Stats
  stats: {
    all: ['stats'] as const,
    monthly: (month: number, year: number) => ['stats', 'monthly', month, year] as const,
    doctors: (startDate?: string, endDate?: string) => ['stats', 'doctors', startDate, endDate] as const,
  },

  // Hourly Rates
  rates: {
    all: ['rates'] as const,
  },
};
