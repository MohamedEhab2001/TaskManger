'use server';

import { connectDB } from '../db';
import { Task } from '../models/Task';
import { Tag } from '../models/Tag';
import { TagGroup } from '../models/TagGroup';
import { getCurrentUser } from '../auth';
import { createTask } from './tasks';
import { calculateFriction } from '../friction';
import mongoose from 'mongoose';

export async function getTasksWithFriction() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const tasks = await Task.find({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
  })
    .populate('tags')
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  const tasksWithFriction = tasks.map((task) => {
    const friction = calculateFriction(task);
    return {
      ...task,
      friction,
    };
  });

  return JSON.parse(JSON.stringify(tasksWithFriction));
}

export interface TagTimeData {
  tagId: string;
  tagName: { en: string; ar: string };
  groupName: { en: string; ar: string };
  groupColor: string;
  totalTasks: number;
  completedTasks: number;
  totalMinutes: number;
  percentOfWeek: number;
  completionRate: number;
  efficiency: 'efficient' | 'inefficient' | 'neutral';
}

export async function getTagTimeCostAnalytics(range?: { from: string; to: string } | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const tags = await Tag.find({ userId: userIdMatch }).populate('groupId').lean();
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const from = typeof range?.from === 'string' ? new Date(range.from) : defaultFrom;
  const to = typeof range?.to === 'string' ? new Date(range.to) : defaultTo;
  const safeFrom = Number.isNaN(from.getTime()) ? defaultFrom : from;
  const safeTo = Number.isNaN(to.getTime()) ? defaultTo : to;

  let totalWeeklyMinutes = 0;

  interface TagDataTemp {
    tagId: string;
    tagName: { en: string; ar: string };
    groupName: { en: string; ar: string };
    groupColor: string;
    totalTasks: number;
    completedTasks: number;
    totalMinutes: number;
    completionRate: number;
    efficiency: 'efficient' | 'inefficient' | 'neutral';
  }

  const tagDataPromises: Promise<TagDataTemp>[] = tags.map(async (tag) => {
    const tasks = await Task.find({
      userId: userIdMatch,
      tags: tag._id,
      updatedAt: { $gte: safeFrom, $lte: safeTo },
    }).lean();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;

    let totalMinutes = 0;
    tasks.forEach((t) => {
      const ttSeconds = (t as any)?.timeTracking?.totalSeconds;
      if (typeof ttSeconds === 'number' && ttSeconds > 0) {
        totalMinutes += Math.round(ttSeconds / 60);
        return;
      }
      if (t.actualMinutes) {
        totalMinutes += t.actualMinutes;
        return;
      }
    });

    totalWeeklyMinutes += totalMinutes;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      tagId: tag._id.toString(),
      tagName: tag.name,
      groupName: (tag.groupId as any).name,
      groupColor: (tag.groupId as any).color,
      totalTasks,
      completedTasks,
      totalMinutes,
      completionRate,
      efficiency: 'neutral' as const,
    };
  });

  let tagData: TagDataTemp[] = await Promise.all(tagDataPromises);

  const enrichedTagData: TagTimeData[] = tagData.map((data) => {
    const percentOfWeek = totalWeeklyMinutes > 0 ? Math.round((data.totalMinutes / totalWeeklyMinutes) * 100) : 0;

    let efficiency: 'efficient' | 'inefficient' | 'neutral' = 'neutral';
    if (data.totalTasks >= 3) {
      if (data.completionRate >= 70) {
        efficiency = 'efficient';
      } else if (data.completionRate < 40 && percentOfWeek > 20) {
        efficiency = 'inefficient';
      }
    }

    return {
      ...data,
      percentOfWeek,
      efficiency,
    };
  });

  const filteredData = enrichedTagData.filter((d) => d.totalTasks > 0);
  filteredData.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return JSON.parse(JSON.stringify(filteredData));
}

export async function createStarterTasks() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const existingTasks = await Task.countDocuments({
    userId: user.userId,
    status: { $ne: 'archived' },
  });

  if (existingTasks > 0) {
    throw new Error('You already have tasks. Starter tasks are for new users only.');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await createTask({
    title: 'Review your goals for this week',
    description: 'Take 10 minutes to clarify what you want to accomplish',
    priority: 'high',
    estimatedMinutes: 10,
    dueDate: tomorrow.toISOString().split('T')[0],
  });

  await createTask({
    title: 'Organize your workspace',
    description: 'A clean space helps with focus and productivity',
    priority: 'medium',
    estimatedMinutes: 15,
    dueDate: tomorrow.toISOString().split('T')[0],
  });

  await createTask({
    title: 'Set up your tags and categories',
    description: 'Create tag groups for Work, Personal, and Learning',
    priority: 'medium',
    estimatedMinutes: 10,
    dueDate: tomorrow.toISOString().split('T')[0],
  });

  return { success: true };
}

export async function suggestTaskBreakdown(taskId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(taskId),
    userId: user.userId,
  }).lean();

  if (!task) throw new Error('Task not found');

  const shouldBreakdown =
    task.priority === 'urgent' ||
    (task.estimatedMinutes && task.estimatedMinutes > 120);

  if (!shouldBreakdown) {
    return { shouldBreakdown: false, subtasks: [] };
  }

  const subtasks = [
    {
      title: `Prepare: ${task.title}`,
      description: 'Gather resources, plan approach, identify requirements',
      estimatedMinutes: Math.round((task.estimatedMinutes || 60) * 0.2),
    },
    {
      title: `Execute: ${task.title}`,
      description: 'Main work on the task',
      estimatedMinutes: Math.round((task.estimatedMinutes || 60) * 0.6),
    },
    {
      title: `Review: ${task.title}`,
      description: 'Check work, test results, finalize',
      estimatedMinutes: Math.round((task.estimatedMinutes || 60) * 0.2),
    },
  ];

  return {
    shouldBreakdown: true,
    subtasks,
    originalTask: task,
  };
}

export async function acceptTaskBreakdown(taskId: string, subtasks: any[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(taskId),
    userId: user.userId,
  });

  if (!task) throw new Error('Task not found');

  for (const subtask of subtasks) {
    await createTask({
      title: subtask.title,
      description: subtask.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
      estimatedMinutes: subtask.estimatedMinutes,
      tags: task.tags.map((t) => t.toString()),
    });
  }

  await Task.findByIdAndUpdate(taskId, { status: 'archived' });

  return { success: true };
}
