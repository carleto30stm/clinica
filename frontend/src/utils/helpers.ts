import { AxiosError } from 'axios';

/**
 * Extract error message from API error
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message || 'Error de conexión';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ha ocurrido un error inesperado';
};

/**
 * Generate a random color for doctor avatars
 */
export const getDoctorColor = (doctorId: string): string => {
  const colors = [
    '#1976d2', // blue
    '#388e3c', // green
    '#d32f2f', // red
    '#7b1fa2', // purple
    '#f57c00', // orange
    '#0097a7', // cyan
    '#5d4037', // brown
    '#455a64', // blue-grey
  ];
  
  // Generate consistent color based on ID
  let hash = 0;
  for (let i = 0; i < doctorId.length; i++) {
    hash = doctorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Group array by key
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Sort array by date field
 */
export const sortByDate = <T>(
  array: T[],
  dateField: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateField] as string).getTime();
    const dateB = new Date(b[dateField] as string).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Remove duplicates from array by key
 */
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Calculate estimated payment for a shift based on hourly rates
export const calculateShiftPayment = (
  startIso: string,
  endIso: string,
  dayCategory: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY',
  hourlyRates: { periodType: string; rate: number }[],
  holidaySet?: Set<string>,
  recurringSet?: Set<string>
) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const DAY_START = 9;
  const DAY_END = 21;

  // Create map for quick lookup
  const rateMap = new Map<string, number>();
  hourlyRates.forEach((r) => rateMap.set(r.periodType, Number(r.rate)));

  let totalAmount = 0;
  let totalHours = 0;
  const breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> = [];

  // Normalize end in case it's earlier than or equal to start (e.g. 21:00 -> 09:00 stored as same day)
  let endNorm = new Date(end);
  while (endNorm.getTime() <= start.getTime()) {
    endNorm = new Date(endNorm.getTime() + 24 * 60 * 60 * 1000);
  }

  const current = new Date(start);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Determine if the ENTIRE shift is holiday/weekend based ONLY on the start date
  let isShiftHolidayOrWeekend = dayCategory === 'WEEKEND' || dayCategory === 'HOLIDAY';
  if (holidaySet || recurringSet) {
    const y = start.getFullYear();
    const m = pad(start.getMonth() + 1);
    const d = pad(start.getDate());
    const dateKey = `${y}-${m}-${d}`;
    const monthDayKey = `${m}-${d}`;

    const isRecurrentHoliday = recurringSet ? recurringSet.has(monthDayKey) : false;
    const isSpecificHoliday = holidaySet ? holidaySet.has(dateKey) : false;
    const isWeekend = start.getDay() === 0 || start.getDay() === 6;
    isShiftHolidayOrWeekend = isSpecificHoliday || isRecurrentHoliday || isWeekend;
  }

  while (current < endNorm) {
    const hour = current.getHours();
    const isDay = hour >= DAY_START && hour < DAY_END;

    // ---------------------------------------------------------------------------
    // COMMENTED: Per-hour holiday/weekend discrimination logic
    // This logic was replaced by using only the shift's start date to determine
    // if the entire shift is holiday/weekend. Kept for reference.
    // ---------------------------------------------------------------------------
    // let isHourHolidayOrWeekend = false;
    //
    // if (holidaySet || recurringSet) {
    //   const y = current.getFullYear();
    //   const m = pad(current.getMonth() + 1);
    //   const d = pad(current.getDate());
    //   const dateKey = `${y}-${m}-${d}`; // YYYY-MM-DD
    //   const monthDayKey = `${m}-${d}`; // MM-DD
    //
    //   const isRecurrentHoliday = recurringSet ? recurringSet.has(monthDayKey) : false;
    //   const isSpecificHoliday = holidaySet ? holidaySet.has(dateKey) : false;
    //   const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    //   isHourHolidayOrWeekend = isSpecificHoliday || isRecurrentHoliday || isWeekend;
    // } else {
    //   // Fallback to caller-provided dayCategory
    //   isHourHolidayOrWeekend = dayCategory === 'WEEKEND' || dayCategory === 'HOLIDAY';
    // }
    // ---------------------------------------------------------------------------

    // Use the shift-level determination (based on start date only)
    const isHourHolidayOrWeekend = isShiftHolidayOrWeekend;

    let periodType = 'WEEKDAY_DAY';
    if (isHourHolidayOrWeekend) {
      periodType = isDay ? 'WEEKEND_HOLIDAY_DAY' : 'WEEKEND_HOLIDAY_NIGHT';
    } else {
      periodType = isDay ? 'WEEKDAY_DAY' : 'WEEKDAY_NIGHT';
    }

    const rate = rateMap.get(periodType) || 0;

    const entry = breakdown.find((b) => b.type === periodType);
    if (entry) {
      entry.hours += 1;
      entry.amount = entry.hours * entry.rate;
    } else {
      breakdown.push({ type: periodType, hours: 1, rate, amount: rate });
    }

    totalAmount += rate;
    totalHours += 1;

    current.setHours(current.getHours() + 1);
  }

  return { totalAmount, totalHours, breakdown };
};
