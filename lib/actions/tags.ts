'use server';

import { z } from 'zod';
import { connectDB } from '../db';
import { Tag } from '../models/Tag';
import { TagGroup } from '../models/TagGroup';
import { getCurrentUser } from '../auth';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

const tagGroupSchema = z.object({
  name: z.object({
    en: z.string().min(1),
    ar: z.string().optional(),
  }),
  color: z.string(),
  icon: z.string(),
});

const tagSchema = z.object({
  groupId: z.string(),
  name: z.object({
    en: z.string().min(1),
    ar: z.string().optional(),
  }),
  color: z.string().optional(),
});

export async function getTagGroups() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const tagGroups = await TagGroup.find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(tagGroups));
}

export async function getTags(groupId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  let query: any = { userId: user.userId };
  if (groupId) {
    query.groupId = new mongoose.Types.ObjectId(groupId);
  }

  const tags = await Tag.find(query)
    .populate('groupId')
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(tags));
}

export async function createTagGroup(data: z.infer<typeof tagGroupSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = tagGroupSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Invalid input' };
    }

    const validated = parsed.data;

    await connectDB();

    const tagGroup = await TagGroup.create({
      userId: user.userId,
      name: {
        en: validated.name.en,
        ar: validated.name.ar ?? '',
      },
      color: validated.color,
      icon: validated.icon,
    });

    revalidatePath('/app/tags');

    return { success: true, groupId: tagGroup._id.toString() };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to create tag group' };
  }
}

export async function updateTagGroup(id: string, data: z.infer<typeof tagGroupSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = tagGroupSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Invalid input' };
    }

    const validated = parsed.data;

    await connectDB();

    const tagGroup = await TagGroup.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: user.userId },
      {
        name: {
          en: validated.name.en,
          ar: validated.name.ar ?? '',
        },
        color: validated.color,
        icon: validated.icon,
      },
      { new: true }
    );

    if (!tagGroup) return { success: false, error: 'Tag group not found' };

    revalidatePath('/app/tags');

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update tag group' };
  }
}

export async function deleteTagGroup(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  await Tag.deleteMany({
    userId: user.userId,
    groupId: new mongoose.Types.ObjectId(id),
  });

  const tagGroup = await TagGroup.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  });

  if (!tagGroup) throw new Error('Tag group not found');

  revalidatePath('/app/tags');
  revalidatePath('/app/tasks');

  return { success: true };
}

export async function createTag(data: z.infer<typeof tagSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = tagSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Invalid input' };
    }

    const validated = parsed.data;

    await connectDB();

    const tag = await Tag.create({
      userId: user.userId,
      groupId: new mongoose.Types.ObjectId(validated.groupId),
      name: {
        en: validated.name.en,
        ar: validated.name.ar ?? '',
      },
      color: validated.color,
    });

    revalidatePath('/app/tags');

    return { success: true, tagId: tag._id.toString() };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to create tag' };
  }
}

export async function updateTag(id: string, data: z.infer<typeof tagSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = tagSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || 'Invalid input' };
    }

    const validated = parsed.data;

    await connectDB();

    const tag = await Tag.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: user.userId },
      {
        groupId: new mongoose.Types.ObjectId(validated.groupId),
        name: {
          en: validated.name.en,
          ar: validated.name.ar ?? '',
        },
        color: validated.color,
      },
      { new: true }
    );

    if (!tag) return { success: false, error: 'Tag not found' };

    revalidatePath('/app/tags');

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update tag' };
  }
}

export async function deleteTag(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const tag = await Tag.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  });

  if (!tag) throw new Error('Tag not found');

  revalidatePath('/app/tags');
  revalidatePath('/app/tasks');

  return { success: true };
}
