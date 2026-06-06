import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'booktree-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

export interface JwtPayload {
  userId: string;
  username: string;
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function ensureAdminUser(): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (existing) return;

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: { username: 'admin', passwordHash: hash },
  });
  console.log('[auth] Created default admin user (username: admin)');
}

export async function verifyPassword(password: string): Promise<{ userId: string; username: string } | null> {
  const user = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { userId: user.id, username: user.username };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Middleware: attach user if token is valid (optional auth) */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const payload = verifyToken(header.slice(7));
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/** Middleware: require valid token, respond 401 if missing/invalid */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
    return;
  }

  req.user = payload;
  next();
}
