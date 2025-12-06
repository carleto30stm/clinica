export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  roles: {
    ADMIN: 'ADMIN' as const,
    DOCTOR: 'DOCTOR' as const,
  },
  shiftTypes: {
    FIXED: 'FIXED' as const,
    ROTATING: 'ROTATING' as const,
  },
};

export const ROLES = config.roles;
export const SHIFT_TYPES = config.shiftTypes;
