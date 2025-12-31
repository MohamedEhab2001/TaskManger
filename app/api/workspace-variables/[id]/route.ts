import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WorkspaceVariable } from '@/lib/models/WorkspaceVariable';

const updateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'Invalid key format'),
  value: z.string().min(1).max(20000),
  tag: z.string().max(60).optional().nullable(),
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validated = {
      ...parsed.data,
      key: parsed.data.key.trim(),
      tag: parsed.data.tag ? parsed.data.tag.trim() : parsed.data.tag,
    };

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

      if (!updated) {
        return NextResponse.json({ error: 'Workspace variable not found' }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          _id: updated._id.toString(),
          key: updated.key,
          value: updated.value,
          tag: updated.tag ?? null,
          createdAt: new Date(updated.createdAt).toISOString(),
          updatedAt: new Date(updated.updatedAt).toISOString(),
        },
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        return NextResponse.json({ error: 'Key already exists' }, { status: 409 });
      }
      throw e;
    }
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = ctx.params;

    await connectDB();

    const deleted = await WorkspaceVariable.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: user.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Workspace variable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
