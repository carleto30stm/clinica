import { User, Shift } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DOCTOR';
  specialty: string | null;
  isActive: boolean;
}

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'DOCTOR';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: TokenPair;
}

// User types
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'DOCTOR';
  specialty?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  name?: string;
  specialty?: string;
  phone?: string;
  isActive?: boolean;
}

// Shift types
export type DayCategory = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
export type AssignmentStatus = 'AVAILABLE' | 'SELF_ASSIGNED' | 'ADMIN_ASSIGNED';

export interface CreateShiftRequest {
  startDateTime: string;
  endDateTime: string;
  type: 'FIXED' | 'ROTATING';
  dayCategory?: DayCategory;
  selfAssignable?: boolean;
  requiredDoctors?: number;
  doctorId?: string | null;  // Legacy single doctor
  doctorIds?: string[];      // New: multiple doctors
  notes?: string;
}

export interface UpdateShiftRequest {
  startDateTime?: string;
  endDateTime?: string;
  type?: 'FIXED' | 'ROTATING';
  dayCategory?: DayCategory;
  selfAssignable?: boolean;
  assignmentStatus?: AssignmentStatus;
  requiredDoctors?: number;
  doctorId?: string | null;  // Legacy single doctor
  doctorIds?: string[];      // New: multiple doctors
  notes?: string;
}

// Batch assignment types
export interface BatchAssignmentRequest {
  assignments: Array<{
    shiftId: string;
    doctorIds: string[];  // Array of doctor IDs to assign
  }>;
}

// Holiday types
export interface CreateHolidayRequest {
  date: string;
  name: string;
  isRecurrent?: boolean;
}

export interface UpdateHolidayRequest {
  date?: string;
  name?: string;
  isRecurrent?: boolean;
}

export interface ShiftWithDoctor extends Shift {
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
  } | null;
}

// New: Shift with multiple doctors
export interface ShiftDoctorInfo {
  id: string;
  name: string;
  specialty: string | null;
  isSelfAssigned: boolean;
  assignedAt: string;
}

export interface ShiftWithDoctors extends Shift {
  doctors: Array<{
    doctor: {
      id: string;
      name: string;
      specialty: string | null;
    };
    isSelfAssigned: boolean;
    assignedAt: Date;
  }>;
  // Legacy field for backwards compatibility
  doctor?: {
    id: string;
    name: string;
    specialty: string | null;
  } | null;
}

// Stats types
export interface DoctorHoursSummary {
  doctorId: string;
  doctorName: string;
  specialty: string | null;
  totalHours: number;
  shiftCount: number;
  fixedShifts: number;
  rotatingShifts: number;
}

export interface MonthlyStats {
  totalShifts: number;
  assignedShifts: number;
  availableShifts: number;
  totalHours: number;
  doctorsSummary: DoctorHoursSummary[];
}

export interface DailyCoverage {
  date: string;
  isWeekend: boolean;
  shifts: ShiftWithDoctor[];
  coveragePercentage: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
