import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const AUTH_COOKIE = 'cp_token';

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60,
  });
}

/** Returns the user id, or null if the token is invalid/expired. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === 'object' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
