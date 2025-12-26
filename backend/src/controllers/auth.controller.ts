import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/constants';
import { parseDurationToMs } from '../utils/helpers';
import { LoginRequest, JwtPayload, TokenPair } from '../types';

/**
 * Generate JWT tokens
 */
const generateTokens = (userId: string, role: 'ADMIN' | 'DOCTOR'): TokenPair => {
  const payload = { userId, role };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

/**
 * Login user
 */
export const login = async (
  req: Request<object, object, LoginRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const identifier = email; // 'email' field can contain email or username
    const whereClause = isNaN(Number(identifier))
      ? { OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] }
      : { OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] };

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const tokens = generateTokens(user.id, user.role);

    // Save refresh token with expiresAt based on config
    const refreshMs = parseDurationToMs(String(config.jwt.refreshExpiresIn));
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshMs),
      },
    });

    // Log the login action
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        userId: user.id,
        details: JSON.stringify({ ip: req.ip }),
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        specialty: user.specialty,
      },
      tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      res.status(401).json({ error: 'Refresh token inválido o expirado' });
      return;
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const tokens = generateTokens(storedToken.user.id, storedToken.user.role);

    // Save new refresh token with expiresAt based on config
    const refreshMs2 = parseDurationToMs(String(config.jwt.refreshExpiresIn));
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + refreshMs2),
      },
    });

    res.json({ tokens });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Refresh token expirado' });
      return;
    }
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      });
    }

    // Log the logout action
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          userId: req.user.id,
        },
      });
    }

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialty: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!validPassword) {
      res.status(400).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};
