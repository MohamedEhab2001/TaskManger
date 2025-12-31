'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db';
import { User } from '../models/User';
import { signToken, setAuthCookie, clearAuthCookie } from '../auth';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function loginAction(formData: FormData) {
  try {
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const validated = loginSchema.parse(data);

    await connectDB();

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    if (user.isDisabled) {
      return { error: 'Account is disabled' };
    }

    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password' };
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input' };
    }
    throw error;
  }
}

export async function signupAction(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const validated = signupSchema.parse(data);

    await connectDB();

    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return { error: 'Email already in use' };
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: 'user',
      plan: 'free',
      subscriptionStatus: 'none',
      lastLoginAt: new Date(),
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    throw error;
  }
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect('/login');
}
