/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validate phone format (Spanish)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true;
  const phoneRegex = /^(\+34\s?)?\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate shift times (end after start)
 */
export const isValidShiftTimes = (start: Date, end: Date): boolean => {
  return end > start;
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};
