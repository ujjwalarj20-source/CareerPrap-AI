import { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import * as authService from '../services/auth.service';
import { AUTH_COOKIE } from '../utils/jwt';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  targetRole: z.string().trim().max(150).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
};

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response) {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(req.body);
  setAuthCookie(res, token);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.status(204).end();
}

export function me(req: Request, res: Response) {
  res.json({ user: authService.toPublicUser(req.user!) });
}
