'use server';

import { z } from 'zod';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB } from '../db';
import { getCurrentUser } from '../auth';
import { WorkspaceVariable } from '../models/WorkspaceVariable';

const workspaceVariableSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'Invalid key format'),
  value: z.string().min(1).max(5000),
  tag: z.string().max(60).optional().nullable(),
});

export type WorkspaceVariableDTO = {
  _id: string;
  key: string;
  value: string;
  tag?: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDTO(doc: any): WorkspaceVariableDTO {
  return {
    _id: doc._id.toString(),
    key: doc.key,
    value: doc.value,
    tag: doc.tag ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function getWorkspaceVariables(params?: { search?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const search = (params?.search || '').trim();

  const query: any = { userId: user.userId };
  if (search) {
    query.key = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const vars = await WorkspaceVariable.find(query).sort({ createdAt: -1 }).lean();

  return JSON.parse(JSON.stringify(vars.map(toDTO)));
}

export async function createWorkspaceVariable(data: z.infer<typeof workspaceVariableSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = workspaceVariableSchema.parse({
    ...data,
    key: data.key.trim(),
    tag: data.tag ? data.tag.trim() : data.tag,
  });

  await connectDB();

  try {
    await WorkspaceVariable.create({
      userId: user.userId,
      key: validated.key,
      value: validated.value,
      tag: validated.tag ?? null,
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      throw new Error('Key already exists');
    }
    throw e;
  }

  revalidatePath('/app/workspace-variables');
  return { success: true };
}

export async function updateWorkspaceVariable(id: string, data: z.infer<typeof workspaceVariableSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = workspaceVariableSchema.parse({
    ...data,
    key: data.key.trim(),
    tag: data.tag ? data.tag.trim() : data.tag,
  });

  await connectDB();

  try {
    const updated = await WorkspaceVariable.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: user.userId },
      {
        key: validated.key,
        value: validated.value,
        tag: validated.tag ?? null,
      },
      { new: true }
    );

    if (!updated) throw new Error('Workspace variable not found');
  } catch (e: any) {
    if (e?.code === 11000) {
      throw new Error('Key already exists');
    }
    throw e;
  }

  revalidatePath('/app/workspace-variables');
  return { success: true };
}

export async function deleteWorkspaceVariable(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const deleted = await WorkspaceVariable.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  });

  if (!deleted) throw new Error('Workspace variable not found');

  revalidatePath('/app/workspace-variables');
  return { success: true };
}
