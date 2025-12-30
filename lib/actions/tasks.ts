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
  status: z.enum(['todo', 'doing', 'hold', 'done', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  startAt: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  actualMinutes: z.number().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  subtasks: z
    .array(
      z.object({
        _id: z.string().optional(),
        title: z.string().min(1),
        isDone: z.boolean().optional(),
      })
    )
    .optional(),
});

const updateSubtaskSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  isDone: z.boolean(),
});

const saveCompletionReflectionSchema = z.object({
  taskId: z.string().min(1),
  notes: z.string().max(5000).optional(),
});

const resetTaskTimeTrackingSchema = z.object({
  taskId: z.string().min(1),
});

const setTaskTrackedMinutesSchema = z.object({
  taskId: z.string().min(1),
  minutes: z.number().int().min(0).max(24 * 60),
});

function computeTaskTotalSeconds(task: any, now: Date) {
  const totalSeconds = task?.timeTracking?.totalSeconds || 0;
  const isRunning = Boolean(task?.timeTracking?.isRunning);
  const lastStartedAt = task?.timeTracking?.lastStartedAt
    ? new Date(task.timeTracking.lastStartedAt)
    : null;

  if (!isRunning || !lastStartedAt) return totalSeconds;

  const deltaSeconds = Math.floor((now.getTime() - lastStartedAt.getTime()) / 1000);
  return totalSeconds + Math.max(deltaSeconds, 0);
}

function computeEstimationResult(task: any, now: Date) {
  const thresholdPct = 10;

  const estimatedMinutes = typeof task?.estimatedMinutes === 'number' ? task.estimatedMinutes : null;
  if (!estimatedMinutes || estimatedMinutes <= 0) return null;

  const actualFromField = typeof task?.actualMinutes === 'number' ? task.actualMinutes : null;
  const totalSeconds = typeof task?.timeTracking?.totalSeconds === 'number' ? task.timeTracking.totalSeconds : 0;
  const actualFromTracking = totalSeconds > 0 ? Math.round(totalSeconds / 60) : null;
  const actualMinutes = actualFromField ?? actualFromTracking;
  if (actualMinutes === null || actualMinutes === undefined) return null;

  const deltaMinutes = actualMinutes - estimatedMinutes;
  const deltaPercent = (deltaMinutes / estimatedMinutes) * 100;

  const pctOff = Math.abs(deltaPercent);
  const accuracyScore = Math.max(0, Math.min(100, 100 - pctOff));

  let accuracyCategory: 'underestimated' | 'overestimated' | 'accurate' = 'accurate';
  if (pctOff > thresholdPct) {
    accuracyCategory = deltaMinutes > 0 ? 'underestimated' : 'overestimated';
  }

  return {
    estimatedMinutes,
    actualMinutes,
    deltaMinutes,
    deltaPercent,
    accuracyCategory,
    accuracyScore,
    thresholdPct,
    computedAt: now,
  };
}

export async function updateTaskStatus(id: string, newStatus: TaskStatus) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const now = new Date();
  const taskId = new mongoose.Types.ObjectId(id);

  const session = await mongoose.startSession();
  try {
    let updated: any = null;
    let triggerReflection = false;
    let prevStatusForReturn: TaskStatus | null = null;

    const applyStatusChange = async (useSession: mongoose.ClientSession | null) => {
      const q = Task.findOne({ _id: taskId, userId: user.userId });
      const task = useSession ? await q.session(useSession) : await q;
      if (!task) throw new Error('Task not found');

      const prevStatus = task.status as TaskStatus;
      prevStatusForReturn = prevStatus;
      if (prevStatus === newStatus) {
        updated = task;
        return;
      }

      if (!task.doneTransitionMeta) {
        task.doneTransitionMeta = {
          lastStatus: prevStatus,
          doneAt: null,
          doneTriggeredReflectionAt: null,
        } as any;
      }
      (task.doneTransitionMeta as any).lastStatus = prevStatus;

      if (!task.timeTracking) {
        task.timeTracking = {
          totalSeconds: 0,
          isRunning: false,
          lastStartedAt: null,
          sessions: [],
        } as any;
      }

      const tt = task.timeTracking as any;
      const finalizeRunningSession = () => {
        if (!tt.isRunning) return;
        if (!tt.lastStartedAt) {
          tt.isRunning = false;
          tt.lastStartedAt = null;
          return;
        }

        const startedAt = new Date(tt.lastStartedAt);
        const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const safeElapsed = Math.max(elapsedSeconds, 0);

        tt.totalSeconds = (tt.totalSeconds || 0) + safeElapsed;
        tt.sessions = tt.sessions || [];
        tt.sessions.push({
          startedAt,
          endedAt: now,
          durationSeconds: safeElapsed,
        });
        tt.isRunning = false;
        tt.lastStartedAt = null;
      };

      if (newStatus === 'doing') {
        if (!tt.isRunning) {
          tt.isRunning = true;
          tt.lastStartedAt = now;
        }
        task.completedAt = null;
      } else if (newStatus === 'hold') {
        finalizeRunningSession();
      } else if (newStatus === 'done') {
        finalizeRunningSession();
        task.completedAt = now;
        task.estimationResult = computeEstimationResult(task, now);

        if (task.doneTransitionMeta) {
          (task.doneTransitionMeta as any).doneAt = now;
        }

        const hasSubtasks = Array.isArray((task as any).subtasks) && (task as any).subtasks.length > 0;
        if (prevStatus !== 'done' && hasSubtasks) {
          triggerReflection = true;
          if (task.doneTransitionMeta) {
            (task.doneTransitionMeta as any).doneTriggeredReflectionAt = now;
          }
        }
      } else {
        if (prevStatus === 'doing') {
          finalizeRunningSession();
        }
        if (newStatus === 'todo') {
          task.completedAt = null;
        }

        if (task.doneTransitionMeta) {
          (task.doneTransitionMeta as any).doneAt = null;
          (task.doneTransitionMeta as any).doneTriggeredReflectionAt = null;
        }
      }

      task.status = newStatus;
      task.lastStatusChangedAt = now;

      if (prevStatus === 'done' && (newStatus === 'doing' || newStatus === 'todo')) {
        task.reopenCount = (task.reopenCount || 0) + 1;
        task.estimationResult = null;
      }

      await task.save(useSession ? { session: useSession } : undefined);
      updated = task;
    };

    try {
      await session.withTransaction(async () => {
        await applyStatusChange(session);
      });
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : '';
      const isTxnUnsupported = msg.includes('Transaction numbers are only allowed');
      if (!isTxnUnsupported) throw error;
      await applyStatusChange(null);
    }

    revalidatePath('/app');
    revalidatePath('/app/tasks');
    revalidatePath('/app/dashboard');
    revalidatePath('/app/insights');

    if (!updated) throw new Error('Task not found');
    return {
      success: true,
      triggerReflection,
      prevStatus: prevStatusForReturn,
      newStatus,
    };
  } finally {
    session.endSession();
  }
}

export async function resetTaskTimeTracking(taskId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = resetTaskTimeTrackingSchema.parse({ taskId });

  await connectDB();

  const taskObjectId = new mongoose.Types.ObjectId(validated.taskId);
  const task = await Task.findOne({ _id: taskObjectId, userId: user.userId });
  if (!task) throw new Error('Task not found');

  (task as any).timeTracking = {
    totalSeconds: 0,
    isRunning: false,
    lastStartedAt: null,
    sessions: [],
  };

  await task.save();

  revalidatePath('/app');
  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/insights');

  return { success: true };
}

export async function setTaskTrackedMinutes(taskId: string, minutes: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = setTaskTrackedMinutesSchema.parse({ taskId, minutes });

  await connectDB();

  const taskObjectId = new mongoose.Types.ObjectId(validated.taskId);
  const task = await Task.findOne({ _id: taskObjectId, userId: user.userId });
  if (!task) throw new Error('Task not found');

  const totalSeconds = validated.minutes * 60;
  (task as any).timeTracking = {
    totalSeconds,
    isRunning: false,
    lastStartedAt: null,
    sessions: [],
  };

  await task.save();

  revalidatePath('/app');
  revalidatePath('/app/tasks');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/insights');

  return { success: true };
}

export async function updateSubtask(taskId: string, subtaskId: string, isDone: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = updateSubtaskSchema.parse({ taskId, subtaskId, isDone });

  await connectDB();

  const now = new Date();
  const taskObjectId = new mongoose.Types.ObjectId(validated.taskId);
  const subtaskObjectId = new mongoose.Types.ObjectId(validated.subtaskId);

  const task = await Task.findOne({ _id: taskObjectId, userId: user.userId });
  if (!task) throw new Error('Task not found');

  const subtasks = Array.isArray((task as any).subtasks) ? (task as any).subtasks : [];
  const target = subtasks.find((s: any) => String(s?._id) === String(subtaskObjectId));
  if (!target) throw new Error('Subtask not found');

  target.isDone = Boolean(validated.isDone);
  target.doneAt = validated.isDone ? now : null;

  await task.save();

  revalidatePath('/app/tasks');
  revalidatePath('/app');
  revalidatePath('/app/insights');

  return { success: true };
}

export async function saveCompletionReflection(taskId: string, payload: { notes?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = saveCompletionReflectionSchema.parse({ taskId, notes: payload?.notes });

  await connectDB();

  const taskObjectId = new mongoose.Types.ObjectId(validated.taskId);
  const task = await Task.findOne({ _id: taskObjectId, userId: user.userId });
  if (!task) throw new Error('Task not found');

  const subtasks = Array.isArray((task as any).subtasks) ? (task as any).subtasks : [];
  const total = subtasks.length;
  const done = subtasks.filter((s: any) => Boolean(s?.isDone)).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const now = new Date();
  const existing = (task as any).completionReflection;
  const createdAt = existing?.createdAt ? new Date(existing.createdAt) : now;

  (task as any).completionReflection = {
    completionRate,
    notes: validated.notes ?? '',
    createdAt,
    updatedAt: now,
  } as any;

  await task.save();

  revalidatePath('/app/tasks');
  revalidatePath('/app');
  revalidatePath('/app/insights');

  return { success: true, completionRate };
}

export async function createFollowupFromUnfinished(taskId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const taskObjectId = new mongoose.Types.ObjectId(taskId);
  const task = await Task.findOne({ _id: taskObjectId, userId: user.userId });
  if (!task) throw new Error('Task not found');

  const subtasks = Array.isArray((task as any).subtasks) ? (task as any).subtasks : [];
  const unfinished = subtasks.filter((s: any) => !Boolean(s?.isDone));

  if (unfinished.length === 0) {
    return { success: true, created: false };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const followup = await Task.create({
    userId: user.userId,
    title: `Continue: ${task.title}`,
    description: '',
    status: 'todo',
    priority: task.priority,
    dueDate: tomorrow,
    startAt: null,
    completedAt: null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    estimatedMinutes: null,
    actualMinutes: null,
    isPinned: false,
    subtasks: unfinished.map((s: any) => ({
      title: s.title,
      isDone: false,
      createdAt: new Date(),
      doneAt: null,
    })),
    originalTaskId: task._id,
  });

  const now = new Date();
  const existing = (task as any).completionReflection;
  if (existing) {
    (task as any).completionReflection = {
      ...existing,
      autoSuggestionsAccepted: true,
      updatedAt: now,
    };
  } else {
    (task as any).completionReflection = {
      completionRate: subtasks.length > 0 ? Math.round(((subtasks.length - unfinished.length) / subtasks.length) * 100) : 0,
      notes: '',
      createdAt: now,
      updatedAt: now,
      autoSuggestionsAccepted: true,
    };
  }

  await task.save();

  revalidatePath('/app/tasks');
  revalidatePath('/app');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/insights');

  return { success: true, created: true, followupTaskId: followup._id.toString() };
}

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

  const now = new Date();
  const enriched = tasks.map((t: any) => ({
    ...t,
    computedTotalSeconds: computeTaskTotalSeconds(t, now),
  }));

  return JSON.parse(JSON.stringify(enriched));
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

  const now = new Date();
  const enriched: any = {
    ...task,
    computedTotalSeconds: computeTaskTotalSeconds(task, now),
  };

  return JSON.parse(JSON.stringify(enriched));
}

export async function createTask(data: z.infer<typeof taskSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const validated = taskSchema.parse(data);

  await connectDB();

  const now = new Date();

  const subtasks = Array.isArray((validated as any).subtasks)
    ? (validated as any).subtasks
        .filter((s: any) => s && typeof s.title === 'string' && s.title.trim().length > 0)
        .map((s: any) => ({
          title: String(s.title).trim(),
          isDone: Boolean(s.isDone),
          createdAt: now,
          doneAt: s.isDone ? now : null,
        }))
    : undefined;

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
    subtasks,
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
    await updateTaskStatus(id, data.status as TaskStatus);
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

  if ((data as any).subtasks !== undefined) {
    const now = new Date();
    const existing = Array.isArray((existingTask as any).subtasks) ? (existingTask as any).subtasks : [];
    const incoming = Array.isArray((data as any).subtasks) ? (data as any).subtasks : [];

    const nextSubtasks = incoming
      .filter((s: any) => s && typeof s.title === 'string' && s.title.trim().length > 0)
      .map((s: any) => {
        const idStr = s?._id ? String(s._id) : '';
        const prev = idStr ? existing.find((x: any) => String(x?._id) === idStr) : null;
        if (prev) {
          return {
            _id: prev._id,
            title: String(s.title).trim(),
            isDone: Boolean(prev.isDone),
            createdAt: prev.createdAt ? new Date(prev.createdAt) : now,
            doneAt: prev.doneAt ? new Date(prev.doneAt) : null,
          };
        }
        const isDone = Boolean(s?.isDone);
        return {
          title: String(s.title).trim(),
          isDone,
          createdAt: now,
          doneAt: isDone ? now : null,
        };
      });

    updateData.subtasks = nextSubtasks;
  }

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

export async function runTimeTrackingSanityTest() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const task = await Task.create({
    userId: user.userId,
    title: 'Time Tracking Sanity Test',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    isPinned: false,
  });

  try {
    await updateTaskStatus(task._id.toString(), 'doing');
    await wait(1100);
    await updateTaskStatus(task._id.toString(), 'hold');
    await wait(250);
    await updateTaskStatus(task._id.toString(), 'doing');
    await wait(1100);
    await updateTaskStatus(task._id.toString(), 'done');

    const updated = await Task.findOne({ _id: task._id, userId: user.userId }).lean();
    if (!updated) throw new Error('Task not found');

    const totalSeconds = updated?.timeTracking?.totalSeconds || 0;
    const sessionsCount = Array.isArray(updated?.timeTracking?.sessions) ? updated.timeTracking.sessions.length : 0;

    return {
      taskId: task._id.toString(),
      totalSeconds,
      sessionsCount,
      status: updated.status,
    };
  } finally {
    await Task.deleteOne({ _id: task._id, userId: user.userId });
  }
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
    if (updates.status === 'doing' || updates.status === 'hold' || updates.status === 'done') {
      for (const taskId of taskIds) {
        await updateTaskStatus(taskId, updates.status as TaskStatus);
      }
      return { success: true };
    }

    updateData.status = updates.status;
    updateData.lastStatusChangedAt = new Date();
    if (updates.status === 'todo') updateData.completedAt = null;
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
