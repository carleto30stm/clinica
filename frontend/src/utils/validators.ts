/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Minimum 6 characters
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validate month format YYYY-MM
 */
export const isValidMonth = (value: string): boolean => {
  if (!value) return false;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
};

/**
 * Validate date format YYYY-MM-DD
 */
export const isValidDateString = (value: string): boolean => {
  if (!value) return false;
  // Simple check, then ensure Date parsing matches
  const match = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value);
  if (!match) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

/**
 * Validate phone format (Spanish)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^(\+34\s?)?\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate required field
 */
export const isRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim() !== '';
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Validate shift times (end after start)
 */
export const isValidShiftTimes = (start: Date, end: Date): boolean => {
  return end > start;
};

/**
 * Validate minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validate maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Get validation error message
 */
export const getValidationMessage = (field: string, rule: string): string => {
  const messages: Record<string, Record<string, string>> = {
    email: {
      required: 'El email es requerido',
      invalid: 'El email no es válido',
    },
    password: {
      required: 'La contraseña es requerida',
      minLength: 'La contraseña debe tener al menos 6 caracteres',
    },
    name: {
      required: 'El nombre es requerido',
    },
    phone: {
      invalid: 'El teléfono no es válido',
    },
    shift: {
      invalidTimes: 'La hora de fin debe ser posterior a la hora de inicio',
    },
  };

  return messages[field]?.[rule] || 'Campo inválido';
};
