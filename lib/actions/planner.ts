'use server';

import { connectDB } from '../db';
import { Task } from '../models/Task';
import { getCurrentUser } from '../auth';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface DayPlan {
  day: string;
  date: Date;
  tasks: any[];
  totalMinutes: number;
}

const priorityWeight: { [key: string]: number } = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export async function generateWeeklyPlan(dailyCapacity: number = 120, lockedDays: string[] = []) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const tasks = await Task.find({
    userId: user.userId,
    status: { $in: ['todo', 'doing'] },
    $or: [{ startAt: null }, { startAt: { $gte: startOfWeek } }],
  })
    .sort({
      priority: -1,
      dueDate: 1,
    })
    .lean();

  const sortedTasks = tasks.sort((a, b) => {
    const aPriority = priorityWeight[a.priority] || 0;
    const bPriority = priorityWeight[b.priority] || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return 0;
  });

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekPlan: DayPlan[] = days.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      day,
      date,
      tasks: [],
      totalMinutes: 0,
    };
  });

  const lockedTasks = await Task.find({
    userId: user.userId,
    startAt: { $gte: startOfWeek, $lt: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) },
  }).lean();

  for (const task of lockedTasks) {
    if (task.startAt) {
      const dayIndex = new Date(task.startAt).getDay();
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;

      if (lockedDays.includes(days[adjustedIndex])) {
        weekPlan[adjustedIndex].tasks.push(task);
        weekPlan[adjustedIndex].totalMinutes += task.estimatedMinutes || 30;
      }
    }
  }

  for (const task of sortedTasks) {
    if (lockedTasks.some((lt) => lt._id.toString() === task._id.toString())) {
      continue;
    }

    const estimatedMinutes = task.estimatedMinutes || 30;

    let dayIndex = -1;
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (dueDate >= startOfWeek) {
        const dueDayIndex = Math.floor((dueDate.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000));
        if (dueDayIndex >= 0 && dueDayIndex < 7) {
          if (!lockedDays.includes(days[dueDayIndex]) &&
              weekPlan[dueDayIndex].totalMinutes + estimatedMinutes <= dailyCapacity) {
            dayIndex = dueDayIndex;
          }
        }
      }
    }

    if (dayIndex === -1) {
      for (let i = 0; i < 7; i++) {
        if (!lockedDays.includes(days[i]) &&
            weekPlan[i].totalMinutes + estimatedMinutes <= dailyCapacity) {
          dayIndex = i;
          break;
        }
      }
    }

    if (dayIndex !== -1) {
      weekPlan[dayIndex].tasks.push(task);
      weekPlan[dayIndex].totalMinutes += estimatedMinutes;
    }
  }

  return JSON.parse(JSON.stringify(weekPlan));
}

export async function acceptWeeklyPlan(plan: DayPlan[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  for (const dayPlan of plan) {
    for (const task of dayPlan.tasks) {
      await Task.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(task._id), userId: user.userId },
        { startAt: dayPlan.date }
      );
    }
  }

  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');

  return { success: true };
}
