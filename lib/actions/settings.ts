'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db';
import { User } from '../models/User';
import { getCurrentUser, clearAuthCookie } from '../auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export async function changePasswordAction(data: { currentPassword: string; newPassword: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = changePasswordSchema.parse(data);

  await connectDB();

  const existing = await User.findOne({ _id: user.userId });
  if (!existing) throw new Error('User not found');

  const ok = await bcrypt.compare(validated.currentPassword, existing.passwordHash);
  if (!ok) {
    return { success: false, error: 'INVALID_CURRENT_PASSWORD' } as const;
  }

  const passwordHash = await bcrypt.hash(validated.newPassword, 10);
  existing.passwordHash = passwordHash;
  await existing.save();

  // Light-weight session invalidation: clear auth cookie so user must login again.
  await clearAuthCookie();

  return { success: true } as const;
}
