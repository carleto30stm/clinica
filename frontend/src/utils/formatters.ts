import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { parseArgentinaDate } from './dateHelpers';
import { es } from 'date-fns/locale';

/**
 * Format a date to Spanish locale format (dd/MM/yyyy)
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseArgentinaDate(date) : parseISO(date)) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
};

/**
 * Format a date with time (dd/MM/yyyy HH:mm)
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseArgentinaDate(date) : parseISO(date)) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
};

/**
 * Format time only (HH:mm)
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseArgentinaDate(date) : parseISO(date)) : date;
  return format(d, 'HH:mm', { locale: es });
};

/**
 * Format a date with day name (lunes, 15 de enero)
 */
export const formatDateLong = (date: string | Date): string => {
  const d = typeof date === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseArgentinaDate(date) : parseISO(date)) : date;
  return format(d, "EEEE, d 'de' MMMM", { locale: es });
};

/**
 * Format month and year (enero 2025)
 */
export const formatMonthYear = (date: string | Date): string => {
  const d = typeof date === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseArgentinaDate(date) : parseISO(date)) : date;
  return format(d, 'MMMM yyyy', { locale: es });
};

/**
 * Calculate and format shift duration
 */
export const formatShiftDuration = (start: string | Date, end: string | Date): string => {
  const startDate = typeof start === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(start) ? parseArgentinaDate(start) : parseISO(start)) : start;
  const endDate = typeof end === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(end) ? parseArgentinaDate(end) : parseISO(end)) : end;
  
  const totalMinutes = differenceInMinutes(endDate, startDate);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

/**
 * Get hours between two dates
 */
export const getHoursDifference = (start: string | Date, end: string | Date): number => {
  const startDate = typeof start === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(start) ? parseArgentinaDate(start) : parseISO(start)) : start;
  const endDate = typeof end === 'string' ? (/^\d{4}-\d{2}-\d{2}$/.test(end) ? parseArgentinaDate(end) : parseISO(end)) : end;
  return differenceInHours(endDate, startDate);
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
 * Format phone number
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};
