/**
 * Parse a YYYY-MM-DD string into a Date at local midnight
 */
export const parseArgentinaDate = (dateString: string): Date => {
  // Accept either YYYY-MM-DD or ISO date strings
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatArgentinaDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
