import { config } from '../config/constants';

/**
 * Converts a date string (YYYY-MM-DD) to Argentina timezone Date object at midnight
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object in Argentina timezone
 */
export const parseArgentinaDate = (dateString: string): Date => {
  // Keep only the date portion if an ISO string was provided
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Create a Date at local midnight for that YYYY-MM-DD (avoids UTC shifts)
  return new Date(year, month - 1, day);
};

/**
 * Gets current date/time in Argentina timezone
 * @returns Date object representing current time in Argentina
 */
export const nowInArgentina = (): Date => {
  return new Date();
};

/**
 * Formats a Date to YYYY-MM-DD string in Argentina timezone
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatArgentinaDate = (date: Date): string => {
  // Use local getters because dates are stored/handled as local-midnight Argentina dates
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Creates a Date object from ISO string, preserving the intended local time
 * @param isoString - ISO date string
 * @returns Date object
 */
export const parseISOInArgentina = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * Gets start of day in Argentina timezone
 * @param date - Date object
 * @returns Date at 00:00:00 in Argentina timezone
 */
export const startOfDayArgentina = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Gets end of day in Argentina timezone
 * @param date - Date object
 * @returns Date at 23:59:59.999 in Argentina timezone
 */
export const endOfDayArgentina = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * Normaliza el endDateTime para que sea posterior al startDateTime.
 * Si end <= start, añade días hasta que end > start.
 * Útil para corregir turnos nocturnos mal guardados donde la fecha de fin quedó en el mismo día.
 */
export const normalizeShiftEnd = (start: Date, end: Date): Date => {
  let normalized = new Date(end);
  while (normalized.getTime() <= start.getTime()) {
    normalized = new Date(normalized.getTime() + 24 * 60 * 60 * 1000);
  }
  return normalized;
};
