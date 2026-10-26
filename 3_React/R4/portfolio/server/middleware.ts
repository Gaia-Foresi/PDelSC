import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: { id: number; username: string };
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET no está configurado o es muy corto (mínimo 16 caracteres).');
  }
  return secret;
}

/** Deja pasar solo si viene un token válido en "Authorization: Bearer <token>" */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const [type, token] = (req.headers.authorization || '').split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: number; username: string };
    req.admin = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'La sesión expiró. Volvé a iniciar sesión.' });
  }
}

/** Límite simple de intentos de login (por IP) para frenar ataques de fuerza bruta */
const attempts = new Map<string, { count: number; until: number }>();

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'x';
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && entry.until > now && entry.count >= 8) {
    const min = Math.ceil((entry.until - now) / 60000);
    return res.status(429).json({ error: `Demasiados intentos. Probá de nuevo en ${min} min.` });
  }
  if (!entry || entry.until <= now) attempts.set(ip, { count: 1, until: now + 15 * 60000 });
  else entry.count++;

  next();
}

export function resetLoginAttempts(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'x';
  attempts.delete(ip);
}
