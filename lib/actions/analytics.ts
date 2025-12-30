'use server';

import mongoose from 'mongoose';
import { connectDB } from '../db';
import { Task } from '../models/Task';
import { Tag } from '../models/Tag';
import { TagGroup } from '../models/TagGroup';
import { getCurrentUser } from '../auth';


function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type InsightsDateRange = { from: string; to: string };

function defaultLast7Range(now: Date) {
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function normalizeRange(input?: InsightsDateRange | null) {
  const now = new Date();
  const fallback = defaultLast7Range(now);

  const fromIso = typeof (input as any)?.from === 'string' ? (input as any).from : fallback.from;
  const toIso = typeof (input as any)?.to === 'string' ? (input as any).to : fallback.to;

  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
    return {
      from: new Date(fallback.from),
      to: new Date(fallback.to),
      fromIso: fallback.from,
      toIso: fallback.to,
    };
  }

  return { from, to, fromIso, toIso };
}

export async function getEstimationInsights(range?: InsightsDateRange | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const norm = normalizeRange(range);
  const now = new Date(norm.to);

  const start30 = new Date(now);
  start30.setDate(now.getDate() - 29);
  start30.setHours(0, 0, 0, 0);

  const start7 = new Date(now);
  start7.setDate(now.getDate() - 6);
  start7.setHours(0, 0, 0, 0);

  const matchBase = {
    userId: userIdMatch,
    status: 'done',
    completedAt: { $ne: null },
    estimatedMinutes: { $ne: null },
  } as any;

  const computedFields = {
    estimated: '$estimatedMinutes',
    actual: {
      $ifNull: [
        '$actualMinutes',
        {
          $cond: [
            { $gt: [{ $ifNull: ['$timeTracking.totalSeconds', 0] }, 0] },
            { $divide: [{ $ifNull: ['$timeTracking.totalSeconds', 0] }, 60] },
            null,
          ],
        },
      ],
    },
  };

  const accuracyExpr = {
    $let: {
      vars: {
        est: '$estimated',
        act: '$actual',
      },
      in: {
        $min: [
          100,
          {
            $max: [
              0,
              {
                $subtract: [
                  100,
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $abs: { $subtract: ['$$act', '$$est'] } },
                          '$$est',
                        ],
                      },
                      100,
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };

  const classificationExpr = {
    $let: {
      vars: {
        est: '$estimated',
        act: '$actual',
      },
      in: {
        $cond: [
          {
            $lte: [
              { $divide: [{ $abs: { $subtract: ['$$act', '$$est'] } }, '$$est'] },
              0.05,
            ],
          },
          'accurate',
          {
            $cond: [
              { $gt: [{ $subtract: ['$$act', '$$est'] }, 0] },
              'underestimated',
              'overestimated',
            ],
          },
        ],
      },
    },
  };

  const dailyAgg = await Task.aggregate([
    {
      $match: {
        ...matchBase,
        completedAt: { $gte: start30 },
      },
    },
    { $addFields: computedFields },
    { $match: { actual: { $ne: null }, estimated: { $gt: 0 } } },
    {
      $addFields: {
        accuracy: accuracyExpr,
        classification: classificationExpr,
        dayKey: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: tz } },
      },
    },
    {
      $group: {
        _id: '$dayKey',
        avgAccuracy: { $avg: '$accuracy' },
        total: { $sum: 1 },
        underestimated: { $sum: { $cond: [{ $eq: ['$classification', 'underestimated'] }, 1, 0] } },
        overestimated: { $sum: { $cond: [{ $eq: ['$classification', 'overestimated'] }, 1, 0] } },
        accurate: { $sum: { $cond: [{ $eq: ['$classification', 'accurate'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayMap = new Map<string, any>();
  for (const row of dailyAgg) {
    dayMap.set(row._id, row);
  }

  const accuracyOverTime: { date: string; avgAccuracy: number; total: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30);
    d.setDate(start30.getDate() + i);
    const key = isoDay(d);
    const row = dayMap.get(key);
    accuracyOverTime.push({
      date: key,
      avgAccuracy: Math.round((row?.avgAccuracy || 0) * 10) / 10,
      total: row?.total || 0,
    });
  }

  const rangeAgg = await Task.aggregate([
    {
      $match: {
        ...matchBase,
        completedAt: { $gte: start30 },
      },
    },
    { $addFields: computedFields },
    { $match: { actual: { $ne: null }, estimated: { $gt: 0 } } },
    {
      $addFields: {
        accuracy: accuracyExpr,
        classification: classificationExpr,
      },
    },
    {
      $group: {
        _id: null,
        avgAccuracy30: { $avg: '$accuracy' },
        total30: { $sum: 1 },
        underestimated30: { $sum: { $cond: [{ $eq: ['$classification', 'underestimated'] }, 1, 0] } },
        overestimated30: { $sum: { $cond: [{ $eq: ['$classification', 'overestimated'] }, 1, 0] } },
        accurate30: { $sum: { $cond: [{ $eq: ['$classification', 'accurate'] }, 1, 0] } },
      },
    },
  ]);

  const range7Agg = await Task.aggregate([
    {
      $match: {
        ...matchBase,
        completedAt: { $gte: start7 },
      },
    },
    { $addFields: computedFields },
    { $match: { actual: { $ne: null }, estimated: { $gt: 0 } } },
    {
      $addFields: {
        accuracy: accuracyExpr,
        classification: classificationExpr,
      },
    },
    {
      $group: {
        _id: null,
        avgAccuracy7: { $avg: '$accuracy' },
        total7: { $sum: 1 },
        underestimated7: { $sum: { $cond: [{ $eq: ['$classification', 'underestimated'] }, 1, 0] } },
        overestimated7: { $sum: { $cond: [{ $eq: ['$classification', 'overestimated'] }, 1, 0] } },
        accurate7: { $sum: { $cond: [{ $eq: ['$classification', 'accurate'] }, 1, 0] } },
      },
    },
  ]);

  const r30 = rangeAgg[0] || {};
  const r7 = range7Agg[0] || {};

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return {
    kpis: {
      avgAccuracy7: Math.round((r7.avgAccuracy7 || 0) * 10) / 10,
      avgAccuracy30: Math.round((r30.avgAccuracy30 || 0) * 10) / 10,
    },
    distribution30: {
      total: r30.total30 || 0,
      underestimated: r30.underestimated30 || 0,
      overestimated: r30.overestimated30 || 0,
      accurate: r30.accurate30 || 0,
      underestimatedPct: pct(r30.underestimated30 || 0, r30.total30 || 0),
      overestimatedPct: pct(r30.overestimated30 || 0, r30.total30 || 0),
      accuratePct: pct(r30.accurate30 || 0, r30.total30 || 0),
    },
    distribution7: {
      total: r7.total7 || 0,
      underestimated: r7.underestimated7 || 0,
      overestimated: r7.overestimated7 || 0,
      accurate: r7.accurate7 || 0,
      underestimatedPct: pct(r7.underestimated7 || 0, r7.total7 || 0),
      overestimatedPct: pct(r7.overestimated7 || 0, r7.total7 || 0),
      accuratePct: pct(r7.accurate7 || 0, r7.total7 || 0),
    },
    accuracyOverTime,
  };
}

export async function getReflectionInsights(daysOrRange: number | InsightsDateRange = 7) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  let start: Date;
  let end: Date;
  let rangeDays: number;

  if (typeof daysOrRange === 'number') {
    const safeDays = Math.max(1, Math.min(60, clampInt(daysOrRange) || 7));
    const now = new Date();
    start = new Date(now);
    start.setDate(now.getDate() - (safeDays - 1));
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    rangeDays = safeDays;
  } else {
    const norm = normalizeRange(daysOrRange);
    start = norm.from;
    end = norm.to;
    const ms = Math.max(0, end.getTime() - start.getTime());
    rangeDays = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
  }

  const baseMatch: any = {
    userId: userIdMatch,
    status: 'done',
    completedAt: { $gte: start, $lte: end },
    'subtasks.0': { $exists: true },
  };

  const countsAgg = await Task.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        totalCompletedWithSubtasks: { $sum: 1 },
        withReflection: {
          $sum: {
            $cond: [{ $ne: [{ $ifNull: ['$completionReflection.createdAt', null] }, null] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalCompletedWithSubtasks = clampInt(countsAgg?.[0]?.totalCompletedWithSubtasks || 0);
  const withReflection = clampInt(countsAgg?.[0]?.withReflection || 0);
  const withoutReflection = Math.max(0, totalCompletedWithSubtasks - withReflection);

  const avgAgg = await Task.aggregate([
    {
      $match: {
        ...baseMatch,
        'completionReflection.completionRate': { $ne: null },
        'completionReflection.createdAt': { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgCompletionRate: { $avg: '$completionReflection.completionRate' },
      },
    },
  ]);

  const avgCompletionRate = Math.round((avgAgg?.[0]?.avgCompletionRate || 0) * 10) / 10;

  return {
    rangeDays,
    kpis: {
      avgCompletionRate,
      totalCompletedWithSubtasks,
      withReflection,
      withoutReflection,
    },
  };
}

export async function getInsightsTimeStats(rangeDays: number = 7) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new Date();
  const days = Math.max(1, Math.min(90, Math.floor(rangeDays || 7)));

  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayKey = isoDay(todayStart);

  const perDayAgg = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        'timeTracking.sessions.0': { $exists: true },
      },
    },
    { $unwind: '$timeTracking.sessions' },
    {
      $match: {
        'timeTracking.sessions.endedAt': { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timeTracking.sessions.endedAt', timezone: tz },
        },
        totalSeconds: { $sum: '$timeTracking.sessions.durationSeconds' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayMap = new Map<string, number>();
  for (const row of perDayAgg) {
    dayMap.set(row._id, clampInt(row.totalSeconds || 0));
  }

  const perDay = [] as { date: string; totalSeconds: number }[];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = isoDay(d);
    perDay.push({ date: key, totalSeconds: dayMap.get(key) || 0 });
  }

  const totalSecondsRange = perDay.reduce((sum, r) => sum + (r.totalSeconds || 0), 0);
  const todaySecondsBase = dayMap.get(todayKey) || 0;

  const avgCompletedAgg = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        status: 'done',
        completedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        completedCount: { $sum: 1 },
        totalSeconds: { $sum: { $ifNull: ['$timeTracking.totalSeconds', 0] } },
      },
    },
  ]);

  const completedCount = avgCompletedAgg[0]?.completedCount || 0;
  const totalSecondsCompleted = clampInt(avgCompletedAgg[0]?.totalSeconds || 0);
  const avgSecondsPerCompletedTask = completedCount > 0 ? Math.round(totalSecondsCompleted / completedCount) : 0;

  const topTasksAgg = await Task.aggregate([
    { $match: { userId: userIdMatch } },
    {
      $project: {
        title: 1,
        status: 1,
        dueDate: 1,
        completedAt: 1,
        tags: 1,
        totalSeconds: { $ifNull: ['$timeTracking.totalSeconds', 0] },
        isRunning: { $ifNull: ['$timeTracking.isRunning', false] },
        lastStartedAt: '$timeTracking.lastStartedAt',
      },
    },
    { $sort: { totalSeconds: -1 } },
    { $limit: 10 },
  ]);

  const topTasks = topTasksAgg.map((t: any) => ({
    taskId: String(t._id),
    title: t.title,
    status: t.status,
    totalSeconds: clampInt(t.totalSeconds || 0),
    isRunning: Boolean(t.isRunning),
    lastStartedAt: t.lastStartedAt ? new Date(t.lastStartedAt).toISOString() : null,
  }));

  const tagTimeAgg = await Task.aggregate([
    { $match: { userId: userIdMatch, status: { $ne: 'archived' } } },
    {
      $project: {
        status: 1,
        totalSeconds: { $ifNull: ['$timeTracking.totalSeconds', 0] },
        tagId: { $arrayElemAt: ['$tags', 0] },
      },
    },
    { $match: { tagId: { $ne: null } } },
    {
      $group: {
        _id: '$tagId',
        totalSeconds: { $sum: '$totalSeconds' },
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'done'] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'tags',
        localField: '_id',
        foreignField: '_id',
        as: 'tag',
      },
    },
    { $unwind: '$tag' },
    {
      $lookup: {
        from: 'taggroups',
        localField: 'tag.groupId',
        foreignField: '_id',
        as: 'group',
      },
    },
    { $unwind: '$group' },
    { $sort: { totalSeconds: -1 } },
    { $limit: 25 },
    {
      $project: {
        _id: 0,
        tagId: { $toString: '$_id' },
        tagName: '$tag.name',
        groupId: { $toString: '$group._id' },
        groupName: '$group.name',
        groupColor: '$group.color',
        totalSeconds: 1,
        totalTasks: 1,
        completedTasks: 1,
      },
    },
  ]);

  const tagTime = tagTimeAgg.map((r: any) => ({
    ...r,
    totalSeconds: clampInt(r.totalSeconds || 0),
    completionRate: r.totalTasks > 0 ? Math.round((r.completedTasks / r.totalTasks) * 100) : 0,
  }));

  const groupMap = new Map<
    string,
    {
      groupId: string;
      groupName: any;
      groupColor: string;
      totalSeconds: number;
      totalTasks: number;
      completedTasks: number;
    }
  >();

  for (const row of tagTime) {
    const k = row.groupId;
    if (!groupMap.has(k)) {
      groupMap.set(k, {
        groupId: row.groupId,
        groupName: row.groupName,
        groupColor: row.groupColor,
        totalSeconds: 0,
        totalTasks: 0,
        completedTasks: 0,
      });
    }
    const g = groupMap.get(k)!;
    g.totalSeconds += clampInt(row.totalSeconds);
    g.totalTasks += row.totalTasks;
    g.completedTasks += row.completedTasks;
  }

  const groupTime = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
      completionRate: g.totalTasks > 0 ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const runningTasks = await Task.find({
    userId: userIdMatch,
    'timeTracking.isRunning': true,
    'timeTracking.lastStartedAt': { $ne: null },
  })
    .select({ title: 1, status: 1, timeTracking: 1 })
    .lean();

  const liveAddSeconds = runningTasks.reduce((sum: number, t: any) => {
    const startedAt = t?.timeTracking?.lastStartedAt ? new Date(t.timeTracking.lastStartedAt) : null;
    if (!startedAt) return sum;
    const delta = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    return sum + Math.max(delta, 0);
  }, 0);

  const todaySeconds = todaySecondsBase + liveAddSeconds;
  const totalSecondsInRange = totalSecondsRange + liveAddSeconds;
  const perDayWithLive = perDay.map((d) =>
    d.date === todayKey ? { ...d, totalSeconds: d.totalSeconds + liveAddSeconds } : d
  );

  for (const rt of runningTasks) {
    const startedAt = rt?.timeTracking?.lastStartedAt ? new Date(rt.timeTracking.lastStartedAt) : null;
    if (!startedAt) continue;
    const delta = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const add = Math.max(delta, 0);
    const existing = topTasks.find((t) => t.taskId === String(rt._id));
    if (existing) existing.totalSeconds += add;
  }
  topTasks.sort((a, b) => b.totalSeconds - a.totalSeconds);

  return {
    rangeDays: days,
    kpis: {
      todaySeconds: clampInt(todaySeconds),
      rangeSeconds: clampInt(totalSecondsInRange),
      avgSecondsPerCompletedTask,
    },
    perDay: perDayWithLive,
    topTasks,
    byTag: tagTime,
    byTagGroup: groupTime,
  };
}

export async function getInsightsTimeStatsByDateRange(range?: InsightsDateRange | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const norm = normalizeRange(range);

  const startDate = new Date(norm.from);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(norm.to);
  endDate.setHours(23, 59, 59, 999);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayKey = isoDay(todayStart);

  const perDayAgg = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        'timeTracking.sessions.0': { $exists: true },
      },
    },
    { $unwind: '$timeTracking.sessions' },
    {
      $match: {
        'timeTracking.sessions.endedAt': { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timeTracking.sessions.endedAt', timezone: tz },
        },
        totalSeconds: { $sum: '$timeTracking.sessions.durationSeconds' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dayMap = new Map<string, number>();
  for (const row of perDayAgg) {
    dayMap.set(row._id, clampInt(row.totalSeconds || 0));
  }

  const perDay: { date: string; totalSeconds: number }[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endDate.getTime()) {
    const key = isoDay(cursor);
    perDay.push({ date: key, totalSeconds: dayMap.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalSecondsRange = perDay.reduce((sum, r) => sum + (r.totalSeconds || 0), 0);
  const todaySecondsBase = dayMap.get(todayKey) || 0;

  const avgCompletedAgg = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        status: 'done',
        completedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        completedCount: { $sum: 1 },
        totalSeconds: { $sum: { $ifNull: ['$timeTracking.totalSeconds', 0] } },
      },
    },
  ]);

  const completedCount = avgCompletedAgg[0]?.completedCount || 0;
  const totalSecondsCompleted = clampInt(avgCompletedAgg[0]?.totalSeconds || 0);
  const avgSecondsPerCompletedTask = completedCount > 0 ? Math.round(totalSecondsCompleted / completedCount) : 0;

  const topTasksAgg = await Task.aggregate([
    { $match: { userId: userIdMatch } },
    {
      $project: {
        title: 1,
        status: 1,
        dueDate: 1,
        completedAt: 1,
        tags: 1,
        totalSeconds: { $ifNull: ['$timeTracking.totalSeconds', 0] },
        isRunning: { $ifNull: ['$timeTracking.isRunning', false] },
        lastStartedAt: '$timeTracking.lastStartedAt',
      },
    },
    { $sort: { totalSeconds: -1 } },
    { $limit: 10 },
  ]);

  const topTasks = topTasksAgg.map((t: any) => ({
    taskId: String(t._id),
    title: t.title,
    status: t.status,
    totalSeconds: clampInt(t.totalSeconds || 0),
    isRunning: Boolean(t.isRunning),
    lastStartedAt: t.lastStartedAt ? new Date(t.lastStartedAt).toISOString() : null,
  }));

  const tagTimeAgg = await Task.aggregate([
    { $match: { userId: userIdMatch, status: { $ne: 'archived' } } },
    {
      $project: {
        status: 1,
        totalSeconds: { $ifNull: ['$timeTracking.totalSeconds', 0] },
        tagId: { $arrayElemAt: ['$tags', 0] },
      },
    },
    { $match: { tagId: { $ne: null } } },
    {
      $group: {
        _id: '$tagId',
        totalSeconds: { $sum: '$totalSeconds' },
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'done'] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'tags',
        localField: '_id',
        foreignField: '_id',
        as: 'tag',
      },
    },
    { $unwind: '$tag' },
    {
      $lookup: {
        from: 'taggroups',
        localField: 'tag.groupId',
        foreignField: '_id',
        as: 'group',
      },
    },
    { $unwind: '$group' },
    { $sort: { totalSeconds: -1 } },
    { $limit: 25 },
    {
      $project: {
        _id: 0,
        tagId: { $toString: '$_id' },
        tagName: '$tag.name',
        groupId: { $toString: '$group._id' },
        groupName: '$group.name',
        groupColor: '$group.color',
        totalSeconds: 1,
        totalTasks: 1,
        completedTasks: 1,
      },
    },
  ]);

  const tagTime = tagTimeAgg.map((r: any) => ({
    ...r,
    totalSeconds: clampInt(r.totalSeconds || 0),
    completionRate: r.totalTasks > 0 ? Math.round((r.completedTasks / r.totalTasks) * 100) : 0,
  }));

  const groupMap = new Map<
    string,
    {
      groupId: string;
      groupName: any;
      groupColor: string;
      totalSeconds: number;
      totalTasks: number;
      completedTasks: number;
    }
  >();

  for (const row of tagTime) {
    const k = row.groupId;
    if (!groupMap.has(k)) {
      groupMap.set(k, {
        groupId: row.groupId,
        groupName: row.groupName,
        groupColor: row.groupColor,
        totalSeconds: 0,
        totalTasks: 0,
        completedTasks: 0,
      });
    }
    const g = groupMap.get(k)!;
    g.totalSeconds += clampInt(row.totalSeconds);
    g.totalTasks += row.totalTasks;
    g.completedTasks += row.completedTasks;
  }

  const groupTime = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
      completionRate: g.totalTasks > 0 ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const runningTasks = await Task.find({
    userId: userIdMatch,
    'timeTracking.isRunning': true,
    'timeTracking.lastStartedAt': { $ne: null },
  })
    .select({ title: 1, status: 1, timeTracking: 1 })
    .lean();

  const liveAddSeconds = runningTasks.reduce((sum: number, t: any) => {
    const startedAt = t?.timeTracking?.lastStartedAt ? new Date(t.timeTracking.lastStartedAt) : null;
    if (!startedAt) return sum;
    const delta = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    return sum + Math.max(delta, 0);
  }, 0);

  const includesToday = endDate.getTime() >= todayStart.getTime();
  const liveSeconds = includesToday ? liveAddSeconds : 0;

  const todaySeconds = todaySecondsBase + liveSeconds;
  const totalSecondsInRange = totalSecondsRange + liveSeconds;
  const perDayWithLive = perDay.map((d) => (d.date === todayKey ? { ...d, totalSeconds: d.totalSeconds + liveSeconds } : d));

  if (liveSeconds > 0) {
    for (const rt of runningTasks) {
      const startedAt = rt?.timeTracking?.lastStartedAt ? new Date(rt.timeTracking.lastStartedAt) : null;
      if (!startedAt) continue;
      const delta = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const add = Math.max(delta, 0);
      const existing = topTasks.find((t) => t.taskId === String(rt._id));
      if (existing) existing.totalSeconds += add;
    }
    topTasks.sort((a, b) => b.totalSeconds - a.totalSeconds);
  }

  const ms = Math.max(0, endDate.getTime() - startDate.getTime());
  const rangeDays = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);

  return {
    rangeDays,
    range: { from: norm.fromIso, to: norm.toIso },
    kpis: {
      todaySeconds: clampInt(todaySeconds),
      rangeSeconds: clampInt(totalSecondsInRange),
      avgSecondsPerCompletedTask,
    },
    perDay: perDayWithLive,
    topTasks,
    byTag: tagTime,
    byTagGroup: groupTime,
  };
}

export async function getInsightsOverviewByDateRange(range?: InsightsDateRange | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };
  const norm = normalizeRange(range);
  const from = new Date(norm.from);
  const to = new Date(norm.to);

  const completedCount = await Task.countDocuments({
    userId: userIdMatch,
    status: 'done',
    completedAt: { $gte: from, $lte: to },
  });

  const overdueCount = await Task.countDocuments({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
    dueDate: { $ne: null, $lt: to },
  });

  const estimatedAgg = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: null,
        totalEstimatedMinutes: { $sum: { $ifNull: ['$estimatedMinutes', 0] } },
        totalTasks: { $sum: 1 },
      },
    },
  ]);

  const totalEstimatedMinutes = clampInt(estimatedAgg?.[0]?.totalEstimatedMinutes || 0);
  const totalTasks = clampInt(estimatedAgg?.[0]?.totalTasks || 0);

  return {
    range: { from: norm.fromIso, to: norm.toIso },
    kpis: {
      totalEstimatedMinutes,
      completedCount: clampInt(completedCount),
      overdueCount: clampInt(overdueCount),
      totalTasks,
    },
  };
}

export async function getDashboardStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const totalTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: { $ne: 'archived' },
  });

  const archivedTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: 'archived',
  });

  const completedTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: 'done',
  });

  const overdueTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
    dueDate: { $lt: now },
  });

  const dueThisWeek = await Task.countDocuments({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
    dueDate: { $gte: startOfWeek, $lte: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) },
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    archivedTasks,
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

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const formatDay = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  const tasks = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
        status: 'done',
        completedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: tz },
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
    const dateStr = formatDay(date);

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

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const distribution = await Task.aggregate([
    {
      $match: {
        userId: userIdMatch,
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

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const tagGroups = await TagGroup.find({ userId: userIdMatch }).lean();
  const tags = await Tag.find({ userId: userIdMatch }).lean();

  const result = [];

  for (const group of tagGroups) {
    const groupTags = tags.filter((t) => t.groupId.toString() === group._id.toString());
    const tagIds = groupTags.map((t) => t._id);

    const count = await Task.countDocuments({
      userId: userIdMatch,
      tags: { $in: tagIds },
      status: { $ne: 'archived' },
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

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const now = new Date();

  const overdueTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
    dueDate: { $lt: now },
  });

  const urgentTasks = await Task.countDocuments({
    userId: userIdMatch,
    status: { $in: ['todo', 'doing', 'hold'] },
    priority: 'urgent',
  });

  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);

  const tasksWithEstimates = await Task.find({
    userId: userIdMatch,
    createdAt: { $gte: last7Days },
    estimatedMinutes: { $ne: null },
  }).lean();

  const dailyCapacity = 120;
  const tasksPerDay: { [key: string]: number } = {};

  for (const task of tasksWithEstimates) {
    const dateStr = isoDay(new Date(task.createdAt));
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

export async function getTagInsights(tagId: string, range?: InsightsDateRange | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await connectDB();

  const userIdMatch = { $in: [user.userId, user.userId.toString()] };

  const norm = normalizeRange(range);
  const from = new Date(norm.from);
  const to = new Date(norm.to);

  const tagObjectId = new mongoose.Types.ObjectId(tagId);

  const totalTasks = await Task.countDocuments({
    userId: userIdMatch,
    tags: tagObjectId,
    createdAt: { $gte: from, $lte: to },
  });

  const completedTasks = await Task.countDocuments({
    userId: userIdMatch,
    tags: tagObjectId,
    status: 'done',
    completedAt: { $ne: null, $gte: from, $lte: to },
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksWithTime = await Task.find({
    userId: userIdMatch,
    tags: tagObjectId,
    status: 'done',
    completedAt: { $ne: null, $gte: from, $lte: to },
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
