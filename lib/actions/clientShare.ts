'use server';

import mongoose from 'mongoose';
import crypto from 'crypto';
import { z } from 'zod';
import { connectDB } from '../db';
import { getCurrentUser } from '../auth';
import { revalidatePath } from 'next/cache';
import { ClientShare } from '../models/ClientShare';
import { Tag } from '../models/Tag';
import { Task } from '../models/Task';

const createShareSchema = z.object({
  tagId: z.string().min(1),
  title: z.string().min(1).max(120),
  defaultLanguage: z.enum(['en', 'ar']).optional(),
  expiresAt: z.string().optional(),
});

const updateShareSchema = z.object({
  shareId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function computeMinutesFromTask(task: any) {
  if (typeof task?.actualMinutes === 'number' && Number.isFinite(task.actualMinutes)) return Math.max(0, task.actualMinutes);
  const seconds = task?.timeTracking?.totalSeconds;
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) return Math.round(seconds / 60);
  return 0;
}

function classifyEstimation(task: any): 'underestimated' | 'overestimated' | 'accurate' | null {
  const est = task?.estimatedMinutes;
  if (typeof est !== 'number' || !Number.isFinite(est) || est <= 0) return null;

  const actual = computeMinutesFromTask(task);
  if (!Number.isFinite(actual) || actual <= 0) return null;

  const delta = actual - est;
  const pct = Math.abs(delta) / est;
  if (pct <= 0.05) return 'accurate';
  if (delta > 0) return 'underestimated';
  return 'overestimated';
}

export async function createOrGetClientShareForTag(input: z.infer<typeof createShareSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = createShareSchema.parse(input);

  await connectDB();

  const tagId = new mongoose.Types.ObjectId(validated.tagId);

  const tag = await Tag.findOne({ _id: tagId, userId: user.userId }).lean();
  if (!tag) throw new Error('Tag not found');

  const existing = await ClientShare.findOne({ userId: user.userId, tagId }).lean();
  if (existing) {
    return {
      shareId: existing._id.toString(),
      token: existing.token,
      title: existing.title,
      isActive: existing.isActive,
      expiresAt: existing.expiresAt ? new Date(existing.expiresAt).toISOString() : null,
    };
  }

  const token = generateToken();
  const expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null;

  const created = await ClientShare.create({
    userId: user.userId,
    tagId,
    token,
    title: validated.title,
    isActive: true,
    defaultLanguage: validated.defaultLanguage || 'en',
    expiresAt,
  });

  revalidatePath('/app/tags');

  return {
    shareId: created._id.toString(),
    token: created.token,
    title: created.title,
    isActive: created.isActive,
    expiresAt: created.expiresAt ? new Date(created.expiresAt).toISOString() : null,
  };
}

export async function getClientShareForTag(tagId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const share = await ClientShare.findOne({ userId: user.userId, tagId: new mongoose.Types.ObjectId(tagId) }).lean();
  if (!share) return null;

  return {
    shareId: share._id.toString(),
    token: share.token,
    title: share.title,
    isActive: share.isActive,
    expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString() : null,
    defaultLanguage: share.defaultLanguage,
  };
}

export async function updateClientShare(input: z.infer<typeof updateShareSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = updateShareSchema.parse(input);

  await connectDB();

  const update: any = {};
  if (typeof validated.title === 'string') update.title = validated.title;
  if (typeof validated.isActive === 'boolean') update.isActive = validated.isActive;
  if (validated.expiresAt !== undefined) {
    update.expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null;
  }

  const updated = await ClientShare.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(validated.shareId), userId: user.userId },
    update,
    { new: true }
  ).lean();

  if (!updated) throw new Error('Share not found');

  revalidatePath('/app/tags');

  return {
    shareId: updated._id.toString(),
    token: updated.token,
    title: updated.title,
    isActive: updated.isActive,
    expiresAt: updated.expiresAt ? new Date(updated.expiresAt).toISOString() : null,
    defaultLanguage: updated.defaultLanguage,
  };
}

export async function regenerateClientShareToken(shareId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const token = generateToken();

  const updated = await ClientShare.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(shareId), userId: user.userId },
    { token },
    { new: true }
  ).lean();

  if (!updated) throw new Error('Share not found');

  revalidatePath('/app/tags');

  return {
    shareId: updated._id.toString(),
    token: updated.token,
  };
}

export type PublicClientTask = {
  title: string;
  status: 'todo' | 'doing' | 'done';
  timeSpentMinutes: number;
  estimation: 'underestimated' | 'overestimated' | 'accurate' | null;
  subtasks?: { title: string; isDone: boolean }[];
  completionReflection?: { completionRate: number; notes: string } | null;
};

export type PublicClientShareData = {
  title: string;
  isActive: boolean;
  expiresAt: string | null;
  defaultLanguage: 'en' | 'ar';
  lastUpdatedAt: string;
  progress: {
    totalTasks: number;
    completedTasks: number;
    progressPct: number;
    totalTimeMinutes: number;
  };
  tasks: PublicClientTask[];
  insights: {
    avgAccuracyPct: number;
    distribution: {
      underestimated: number;
      overestimated: number;
      accurate: number;
    };
  };
};

export async function getClientShareByTokenPublic(token: string): Promise<
  | { status: 'not_found' }
  | { status: 'expired'; title: string }
  | { status: 'ok'; data: PublicClientShareData; tagName: { en: string; ar: string } }
> {
  await connectDB();

  const share = await ClientShare.findOne({ token }).lean();
  if (!share) return { status: 'not_found' };
  if (!share.isActive) return { status: 'not_found' };

  const now = new Date();
  if (share.expiresAt && new Date(share.expiresAt).getTime() < now.getTime()) {
    return { status: 'expired', title: share.title };
  }

  const tag = await Tag.findOne({ _id: share.tagId, userId: share.userId }).lean();
  if (!tag) return { status: 'not_found' };

  const tasks = await Task.find({
    userId: share.userId,
    status: { $in: ['todo', 'doing', 'done'] },
    tags: share.tagId,
  })
    .select({
      title: 1,
      status: 1,
      estimatedMinutes: 1,
      actualMinutes: 1,
      timeTracking: 1,
      updatedAt: 1,
      completedAt: 1,
      subtasks: 1,
      completionReflection: 1,
    })
    .sort({ updatedAt: -1 })
    .lean();

  const publicTasks: PublicClientTask[] = tasks.map((t: any) => ({
    title: t.title,
    status: t.status,
    timeSpentMinutes: computeMinutesFromTask(t),
    estimation: t.status === 'done' ? classifyEstimation(t) : null,
    subtasks: Array.isArray(t?.subtasks)
      ? t.subtasks
          .filter((s: any) => s && typeof s.title === 'string')
          .map((s: any) => ({
            title: String(s.title).trim(),
            isDone: Boolean(s.isDone),
          }))
      : [],
    completionReflection:
      t?.completionReflection && typeof t.completionReflection === 'object'
        ? {
            completionRate: Number(t.completionReflection.completionRate) || 0,
            notes: typeof t.completionReflection.notes === 'string' ? t.completionReflection.notes : '',
          }
        : null,
  }));

  const totalTasks = publicTasks.length;
  const completedTasks = publicTasks.filter((t) => t.status === 'done').length;
  const totalTimeMinutes = publicTasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0);
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const doneWithEst = tasks.filter((t: any) => t.status === 'done' && typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0);
  const dist = { underestimated: 0, overestimated: 0, accurate: 0 };

  for (const t of doneWithEst) {
    const est = t.estimatedMinutes;
    const act = computeMinutesFromTask(t);
    if (!est || est <= 0 || !act) continue;

    const cls = classifyEstimation(t);
    if (cls === 'accurate') dist.accurate += 1;
    else if (cls === 'underestimated') dist.underestimated += 1;
    else if (cls === 'overestimated') dist.overestimated += 1;
  }

  const totalEstimatedDone = dist.underestimated + dist.overestimated + dist.accurate;
  const momentumPct =
    totalEstimatedDone > 0 ? Math.round(((dist.overestimated + dist.accurate) / totalEstimatedDone) * 1000) / 10 : 0;

  const lastUpdatedAt =
    tasks.length > 0
      ? new Date(tasks.reduce((max: number, t: any) => Math.max(max, new Date(t.updatedAt).getTime()), 0)).toISOString()
      : new Date(share.updatedAt).toISOString();

  return {
    status: 'ok',
    tagName: { en: (tag as any).name?.en || '', ar: (tag as any).name?.ar || '' },
    data: {
      title: share.title,
      isActive: share.isActive,
      expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString() : null,
      defaultLanguage: (share as any).defaultLanguage || 'en',
      lastUpdatedAt,
      progress: {
        totalTasks,
        completedTasks,
        progressPct,
        totalTimeMinutes,
      },
      tasks: publicTasks,
      insights: {
        avgAccuracyPct: momentumPct,
        distribution: dist,
      },
    },
  };
}
