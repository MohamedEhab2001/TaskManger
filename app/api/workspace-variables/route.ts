import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WorkspaceVariable } from '@/lib/models/WorkspaceVariable';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
  sort: z.enum(['updatedAt', 'createdAt']).default('updatedAt'),
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
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { limit, sort } = parsed.data;

    await connectDB();

    const vars = await WorkspaceVariable.find({ userId: user.userId })
      .sort({ [sort]: -1 })
      .limit(limit)
      .lean();

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
