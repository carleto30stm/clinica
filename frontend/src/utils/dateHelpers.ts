/**
 * Parse a YYYY-MM-DD string into a Date at local midnight
 */
export const parseArgentinaDate = (dateString: string): Date => {
  // Accept either YYYY-MM-DD or ISO date strings and return local midnight
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Create date at local midnight (avoids UTC shift that moves it to the previous day)
  return new Date(year, month - 1, day);
};

export const formatArgentinaDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
