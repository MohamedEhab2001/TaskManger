'use server';

import { connectDB } from '../db';
import { Task } from '../models/Task';
import { Tag } from '../models/Tag';
import { TagGroup } from '../models/TagGroup';
import { getCurrentUser } from '../auth';
import mongoose from 'mongoose';

export async function getDashboardStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const totalTasks = await Task.countDocuments({
    userId: user.userId,
    status: { $ne: 'archived' },
  });

  const completedTasks = await Task.countDocuments({
    userId: user.userId,
    status: 'done',
  });

  const overdueTasks = await Task.countDocuments({
    userId: user.userId,
    status: { $in: ['todo', 'doing'] },
    dueDate: { $lt: now },
  });

  const dueThisWeek = await Task.countDocuments({
    userId: user.userId,
    status: { $in: ['todo', 'doing'] },
    dueDate: { $gte: startOfWeek, $lte: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) },
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate,
    dueThisWeek,
  };
}

export async function getTasksCompletedPerDay(days: number = 14) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const tasks = await Task.aggregate([
    {
      $match: {
        userId: user.userId,
        status: 'done',
        completedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const found = tasks.find((t) => t._id === dateStr);
    result.push({
      date: dateStr,
      count: found ? found.count : 0,
    });
  }

  return result;
}

export async function getStatusDistribution() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const distribution = await Task.aggregate([
    {
      $match: {
        userId: user.userId,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return distribution.map((d) => ({
    status: d._id,
    count: d.count,
  }));
}

export async function getTasksPerTagGroup() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const tagGroups = await TagGroup.find({ userId: user.userId }).lean();
  const tags = await Tag.find({ userId: user.userId }).lean();

  const result = [];

  for (const group of tagGroups) {
    const groupTags = tags.filter((t) => t.groupId.toString() === group._id.toString());
    const tagIds = groupTags.map((t) => t._id);

    const count = await Task.countDocuments({
      userId: user.userId,
      tags: { $in: tagIds },
    });

    result.push({
      group: group.name.en,
      count,
      color: group.color,
    });
  }

  return result;
}

export async function getTaskHealth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const now = new Date();

  const overdueTasks = await Task.countDocuments({
    userId: user.userId,
    status: { $in: ['todo', 'doing'] },
    dueDate: { $lt: now },
  });

  const urgentTasks = await Task.countDocuments({
    userId: user.userId,
    status: { $in: ['todo', 'doing'] },
    priority: 'urgent',
  });

  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);

  const tasksWithEstimates = await Task.find({
    userId: user.userId,
    createdAt: { $gte: last7Days },
    estimatedMinutes: { $ne: null },
  }).lean();

  const dailyCapacity = 120;
  const tasksPerDay: { [key: string]: number } = {};

  for (const task of tasksWithEstimates) {
    const dateStr = task.createdAt.toISOString().split('T')[0];
    tasksPerDay[dateStr] = (tasksPerDay[dateStr] || 0) + (task.estimatedMinutes || 0);
  }

  const daysExceeded = Object.values(tasksPerDay).filter((minutes) => minutes > dailyCapacity).length;

  let health: 'healthy' | 'warning' | 'burnout' = 'healthy';
  const recommendations: string[] = [];

  if (overdueTasks > 5) {
    health = 'warning';
    recommendations.push(`You have ${overdueTasks} overdue tasks. Consider rescheduling or delegating some.`);
  }

  if (urgentTasks > 3) {
    if (health === 'healthy') health = 'warning';
    recommendations.push(`You have ${urgentTasks} urgent tasks. Try breaking them into smaller subtasks.`);
  }

  if (daysExceeded > 3) {
    health = 'burnout';
    recommendations.push(`Your daily capacity was exceeded ${daysExceeded} times this week. Consider reducing commitments.`);
  }

  if (overdueTasks > 10 || urgentTasks > 5) {
    health = 'burnout';
  }

  if (recommendations.length === 0) {
    recommendations.push('Great job! Your task load is manageable.');
  }

  return {
    health,
    overdueTasks,
    urgentTasks,
    daysExceeded,
    recommendations,
  };
}

export async function getTagInsights(tagId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const tagObjectId = new mongoose.Types.ObjectId(tagId);

  const totalTasks = await Task.countDocuments({
    userId: user.userId,
    tags: tagObjectId,
  });

  const completedTasks = await Task.countDocuments({
    userId: user.userId,
    tags: tagObjectId,
    status: 'done',
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksWithTime = await Task.find({
    userId: user.userId,
    tags: tagObjectId,
    status: 'done',
    actualMinutes: { $ne: null },
  }).lean();

  const avgCompletionTime =
    tasksWithTime.length > 0
      ? Math.round(
          tasksWithTime.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / tasksWithTime.length
        )
      : 0;

  return {
    totalTasks,
    completedTasks,
    completionRate,
    avgCompletionTime,
  };
}
