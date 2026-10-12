import bcrypt from 'bcryptjs';
import { UserDoc, UserModel } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';

const BCRYPT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  targetRole?: string | null;
}

export function toPublicUser(user: UserDoc): PublicUser {
  return { id: user.id, name: user.name, email: user.email, targetRole: user.targetRole ?? null };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  targetRole?: string;
}): Promise<{ user: PublicUser; token: string }> {
  const existing = await UserModel.exists({ email: input.email.toLowerCase() });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
      targetRole: input.targetRole,
    });
    return { user: toPublicUser(user), token: signToken(user.id) };
  } catch (err) {
    // Race between the exists() check and create(): unique index violation.
    if ((err as { code?: number }).code === 11000) {
      throw new AppError(409, 'An account with this email already exists');
    }
    throw err;
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: PublicUser; token: string }> {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');
  return { user: toPublicUser(user), token: signToken(user.id) };
}

export async function getUserById(id: string): Promise<UserDoc | null> {
  return UserModel.findById(id);
}
