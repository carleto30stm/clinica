import { config } from '../config/constants';

/**
 * Converts a date string (YYYY-MM-DD) to Argentina timezone Date object at midnight
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object in Argentina timezone
 */
export const parseArgentinaDate = (dateString: string): Date => {
  // Create a Date object at UTC midnight for the given YYYY-MM-DD
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Use Date.UTC so we get midnight UTC consistently
  return new Date(Date.UTC(year, month - 1, day));
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
  // Use UTC getters to avoid local timezone shifts when date was stored as UTC midnight
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
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
