// User types
export interface User {
  id: string;
  email?: string | null;
  username?: string | null;
  name: string;
  role: 'ADMIN' | 'DOCTOR';
  specialty?: string | null;
  phone?: string | null;
  isActive: boolean;
  hasDiscount?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser extends Omit<User, 'createdAt' | 'updatedAt' | 'phone'> {
  specialty: string | null;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Shift types
export type ShiftType = 'FIXED' | 'ROTATING';
export type DayCategory = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
export type AssignmentStatus = 'AVAILABLE' | 'SELF_ASSIGNED' | 'ADMIN_ASSIGNED';

// Doctor assignment info (from ShiftDoctor junction table)
export interface ShiftDoctorAssignment {
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
  };
  isSelfAssigned: boolean;
  assignedAt: string;
}

export interface Shift {
  id: string;
  startDateTime: string;
  endDateTime: string;
  type: ShiftType;
  dayCategory: DayCategory;
  assignmentStatus: AssignmentStatus;
  selfAssignable: boolean;
  isAvailable: boolean;
  requiredDoctors?: number;  // Number of doctors required for this shift
  assignedCount?: number;    // Current number of assigned doctors
  slotsAvailable?: number;   // Remaining slots for self-assignment
  doctorId: string | null;   // Legacy single doctor field
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Legacy single doctor (for backwards compatibility)
  doctor?: {
    id: string;
    name: string;
    specialty: string | null;
  } | null;
  // New: multiple doctors
  doctors?: ShiftDoctorAssignment[];
  createdByAdmin?: {
    id: string;
    name: string;
  };
  holiday?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateShiftData {
  startDateTime: string;
  endDateTime: string;
  type: ShiftType;
  dayCategory?: DayCategory;
  selfAssignable?: boolean;
  requiredDoctors?: number;
  doctorId?: string | null;
  doctorIds?: string[];  // New: multiple doctors
  notes?: string;
}

export interface UpdateShiftData extends Partial<CreateShiftData> {
  assignmentStatus?: AssignmentStatus;
}

// Holiday types
export interface Holiday {
  id: string;
  date: string;
  name: string;
  isRecurrent: boolean;
  requiredDoctors: number;  // Cantidad de médicos requeridos (0 = no mostrar en turnos disponibles)
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayData {
  date: string;
  name: string;
  isRecurrent?: boolean;
  requiredDoctors?: number;
}

export interface UpdateHolidayData extends Partial<CreateHolidayData> {}

// Stats types
export interface DoctorHoursSummary {
  doctorId: string;
  doctorName: string;
  specialty: string | null;
  totalHours: number;
  shiftCount: number;
  fixedShifts: number;
  rotatingShifts: number;
  totalPayment?: number;
  brutoPayment?: number;
  paymentBreakdown?: Array<{ periodType: string; hours: number; amount: number }>;
  hasDiscount?: boolean;
  discountAmount?: number;
  finalPayment?: number;
  externalHours?: number;
  externalPayment?: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  totalShifts: number;
  assignedShifts: number;
  availableShifts: number;
  totalHours: number;
  totalPayment?: number;
  doctorsSummary: DoctorHoursSummary[];
}

export interface DailyCoverage {
  date: string;
  isWeekend: boolean;
  shifts: Shift[];
  coveragePercentage: number;
}

export interface CoverageResponse {
  month: number;
  year: number;
  coverage: DailyCoverage[];
}

// Doctor simplified
export interface DoctorOption {
  id: string;
  name: string;
  specialty: string | null;
}

// API Response types
export interface ApiError {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

// Hourly Rate types
export type RatePeriodType = 'WEEKDAY_DAY' | 'WEEKDAY_NIGHT' | 'WEEKEND_HOLIDAY_DAY' | 'WEEKEND_HOLIDAY_NIGHT';

export interface HourlyRate {
  id: string;
  periodType: RatePeriodType;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHourlyRateData {
  periodType: RatePeriodType;
  rate: number;
}

// Discount types
export interface Discount {
  id: string;
  amount: number;
  validFrom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountData {
  amount: number;
}

export interface UpdateDiscountData {
  amount?: number;
  isActive?: boolean;
}

// External Hours types (consultorio externo)
export interface ExternalHours {
  id: string;
  doctorId: string;
  doctor?: {
    id: string;
    name: string;
    email: string;
  };
  hours: number;
  rate: number;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExternalHoursData {
  doctorId: string;
  hours: number;
  rate: number;
  description?: string;
  date: string;
}

export interface UpdateExternalHoursData {
  hours?: number;
  rate?: number;
  description?: string;
  date?: string;
}
