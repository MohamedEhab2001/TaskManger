'use server';

import { z } from 'zod';
import { connectDB } from '../db';
import { Task, TaskStatus, TaskPriority } from '../models/Task';
import { getCurrentUser } from '../auth';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'doing', 'done', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  startAt: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  actualMinutes: z.number().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
});

export async function getTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  sort?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  let query: any = { userId: user.userId };

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.priority) {
    query.priority = filters.priority;
  }

  if (filters?.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (filters?.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters?.dueDateFrom || filters?.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) {
      query.dueDate.$gte = new Date(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      query.dueDate.$lte = new Date(filters.dueDateTo);
    }
  }

  let sortQuery: any = {};
  if (filters?.sort === 'dueDate') {
    sortQuery = { dueDate: 1, createdAt: -1 };
  } else if (filters?.sort === 'priority') {
    sortQuery = { priority: -1, createdAt: -1 };
  } else {
    sortQuery = { isPinned: -1, createdAt: -1 };
  }

  const tasks = await Task.find(query)
    .populate('tags')
    .sort(sortQuery)
    .lean();

  return JSON.parse(JSON.stringify(tasks));
}

export async function getTask(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  })
    .populate('tags')
    .lean();

  if (!task) throw new Error('Task not found');

  return JSON.parse(JSON.stringify(task));
}

export async function createTask(data: z.infer<typeof taskSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = taskSchema.parse(data);

  await connectDB();

  const task = await Task.create({
    userId: user.userId,
    title: validated.title,
    description: validated.description || '',
    status: validated.status || 'todo',
    priority: validated.priority || 'medium',
    dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
    startAt: validated.startAt ? new Date(validated.startAt) : null,
    estimatedMinutes: validated.estimatedMinutes,
    actualMinutes: validated.actualMinutes,
    tags: validated.tags?.map((id) => new mongoose.Types.ObjectId(id)) || [],
    isPinned: validated.isPinned || false,
  });

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true, taskId: task._id.toString() };
}

export async function updateTask(id: string, data: Partial<z.infer<typeof taskSchema>>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const existingTask = await Task.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  });

  if (!existingTask) throw new Error('Task not found');

  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.lastStatusChangeAt = new Date();

    if (existingTask.status === 'done' && (data.status === 'doing' || data.status === 'todo')) {
      updateData.$inc = { reopenCount: 1 };
    }

    if (data.status === 'done' && !data.actualMinutes) {
      updateData.completedAt = new Date();
    }
  }

  if (data.priority !== undefined && data.priority !== existingTask.priority) {
    updateData.priority = data.priority;
    if (!updateData.$inc) updateData.$inc = {};
    updateData.$inc.priorityChangeCount = 1;
  }

  if (data.dueDate !== undefined)
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.startAt !== undefined)
    updateData.startAt = data.startAt ? new Date(data.startAt) : null;
  if (data.estimatedMinutes !== undefined)
    updateData.estimatedMinutes = data.estimatedMinutes;
  if (data.actualMinutes !== undefined) updateData.actualMinutes = data.actualMinutes;
  if (data.tags !== undefined)
    updateData.tags = data.tags.map((id) => new mongoose.Types.ObjectId(id));
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

  const task = await Task.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), userId: user.userId },
    updateData,
    { new: true }
  );

  if (!task) throw new Error('Task not found');

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true };
}

export async function deleteTask(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const task = await Task.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: user.userId,
  });

  if (!task) throw new Error('Task not found');

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true };
}

export async function bulkUpdateTasks(taskIds: string[], updates: Partial<z.infer<typeof taskSchema>>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const updateData: any = {};

  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === 'done') {
      updateData.completedAt = new Date();
    }
  }
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.tags !== undefined)
    updateData.tags = updates.tags.map((id) => new mongoose.Types.ObjectId(id));

  await Task.updateMany(
    {
      _id: { $in: taskIds.map((id) => new mongoose.Types.ObjectId(id)) },
      userId: user.userId,
    },
    updateData
  );

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true };
}

export async function bulkDeleteTasks(taskIds: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  await Task.deleteMany({
    _id: { $in: taskIds.map((id) => new mongoose.Types.ObjectId(id)) },
    userId: user.userId,
  });

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true };
}
