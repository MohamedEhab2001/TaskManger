import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WorkspaceVariable } from '@/lib/models/WorkspaceVariable';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sort: z.enum(['updatedAt', 'createdAt']).default('updatedAt'),
  search: z.string().optional(),
});

const createSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'Invalid key format'),
  value: z.string().min(1).max(20000),
  tag: z.string().max(60).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const parsed = querySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { limit, sort, search } = parsed.data;

    await connectDB();

    const query: any = { userId: user.userId };
    const q = (search || '').trim();
    if (q) {
      query.key = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    let cursor = WorkspaceVariable.find(query).sort({ [sort]: -1 });
    if (typeof limit === 'number') {
      cursor = cursor.limit(limit);
    }
    const vars = await cursor.lean();

    const data = vars.map((v: any) => ({
      _id: v._id.toString(),
      key: v.key,
      value: v.value,
      tag: v.tag ?? null,
      createdAt: new Date(v.createdAt).toISOString(),
      updatedAt: new Date(v.updatedAt).toISOString(),
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
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
      const doc = await WorkspaceVariable.create({
        userId: user.userId,
        key: validated.key,
        value: validated.value,
        tag: validated.tag ?? null,
      });

      return NextResponse.json({
        data: {
          _id: doc._id.toString(),
          key: doc.key,
          value: doc.value,
          tag: doc.tag ?? null,
          createdAt: new Date(doc.createdAt).toISOString(),
          updatedAt: new Date(doc.updatedAt).toISOString(),
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
