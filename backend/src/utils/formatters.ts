import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale/es';

/**
 * Format a date to Spanish locale format (dd/MM/yyyy)
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
};

/**
 * Format a date with time (dd/MM/yyyy HH:mm)
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
};

/**
 * Format time only (HH:mm)
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: es });
};

/**
 * Format month and year (enero 2025)
 */
export const formatMonthYear = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM yyyy', { locale: es });
};

/**
 * Calculate hours between two dates
 */
export const getHoursDifference = (start: string | Date, end: string | Date): number => {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInHours(endDate, startDate);
};

/**
 * Calculate minutes between two dates
 */
export const getMinutesDifference = (start: string | Date, end: string | Date): number => {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInMinutes(endDate, startDate);
};

/**
 * Format user role for display
 */
export const formatRole = (role: 'ADMIN' | 'DOCTOR'): string => {
  const roles: Record<string, string> = {
    ADMIN: 'Administrador',
    DOCTOR: 'Doctor',
  };
  return roles[role] || role;
};

/**
 * Format shift type for display
 */
export const formatShiftType = (type: 'FIXED' | 'ROTATING'): string => {
  const types: Record<string, string> = {
    FIXED: 'Fijo',
    ROTATING: 'Rotativo',
  };
  return types[type] || type;
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
