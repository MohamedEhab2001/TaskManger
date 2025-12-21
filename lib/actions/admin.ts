'use server';

import { connectDB } from '../db';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Settings } from '../models/Settings';
import { getCurrentUser } from '../auth';
import { redirect } from 'next/navigation';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/app/dashboard');
  }
  return user;
}

export async function getAdminOverview() {
  await requireAdmin();
  await connectDB();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalUsers = await User.countDocuments({ role: 'user' });
  const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'active' });
  const conversionRate = totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0;
  const newUsersLast7Days = await User.countDocuments({
    role: 'user',
    createdAt: { $gte: sevenDaysAgo },
  });
  const churnLast30Days = await User.countDocuments({
    subscriptionStatus: 'canceled',
    updatedAt: { $gte: thirtyDaysAgo },
  });

  const latestSignups = await User.find({ role: 'user' })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name email createdAt')
    .lean();

  const recentLogins = await User.find({ role: 'user', lastLoginAt: { $exists: true } })
    .sort({ lastLoginAt: -1 })
    .limit(10)
    .select('name email lastLoginAt')
    .lean();

  return {
    stats: {
      totalUsers,
      activeSubscriptions,
      conversionRate,
      newUsersLast7Days,
      churnLast30Days,
    },
    activity: {
      latestSignups: JSON.parse(JSON.stringify(latestSignups)),
      recentLogins: JSON.parse(JSON.stringify(recentLogins)),
    },
  };
}

export async function getAdminUsers(filters?: { plan?: string; status?: string; search?: string }) {
  await requireAdmin();
  await connectDB();

  const query: any = { role: 'user' };

  if (filters?.plan && filters.plan !== 'all') {
    query.plan = filters.plan;
  }

  if (filters?.status === 'disabled') {
    query.isDisabled = true;
  } else if (filters?.status === 'active') {
    query.isDisabled = false;
  }

  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .select('name email role plan subscriptionStatus isDisabled createdAt lastLoginAt')
    .lean();

  return JSON.parse(JSON.stringify(users));
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  await requireAdmin();
  await connectDB();

  await User.findByIdAndUpdate(userId, { role });

  return { success: true };
}

export async function updateUserPlan(userId: string, plan: 'free' | 'pro') {
  await requireAdmin();
  await connectDB();

  const update: any = { plan };

  if (plan === 'pro') {
    update.subscriptionStatus = 'active';
    update.subscriptionStartedAt = new Date();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1);
    update.subscriptionEndsAt = endsAt;
  } else {
    update.subscriptionStatus = 'none';
    update.subscriptionStartedAt = null;
    update.subscriptionEndsAt = null;
  }

  await User.findByIdAndUpdate(userId, update);

  return { success: true };
}

export async function toggleUserDisabled(userId: string) {
  await requireAdmin();
  await connectDB();

  const user = await User.findById(userId);
  if (!user) {
    return { error: 'User not found' };
  }

  await User.findByIdAndUpdate(userId, { isDisabled: !user.isDisabled });

  return { success: true, isDisabled: !user.isDisabled };
}

export async function getSubscriptionStats() {
  await requireAdmin();
  await connectDB();

  const activeProUsers = await User.countDocuments({
    plan: 'pro',
    subscriptionStatus: 'active',
  });

  const mrr = activeProUsers * 9;

  const subscriptions = await User.find({
    plan: 'pro',
  })
    .select('name email subscriptionStatus subscriptionStartedAt subscriptionEndsAt plan')
    .sort({ subscriptionStartedAt: -1 })
    .lean();

  return {
    mrr,
    activeCount: activeProUsers,
    subscriptions: JSON.parse(JSON.stringify(subscriptions)),
  };
}

export async function updateSubscription(
  userId: string,
  data: {
    status: 'none' | 'active' | 'past_due' | 'canceled';
    startDate?: string;
    endDate?: string;
  }
) {
  await requireAdmin();
  await connectDB();

  const update: any = { subscriptionStatus: data.status };

  if (data.startDate) {
    update.subscriptionStartedAt = new Date(data.startDate);
  }

  if (data.endDate) {
    update.subscriptionEndsAt = new Date(data.endDate);
  }

  if (data.status === 'active') {
    update.plan = 'pro';
  } else if (data.status === 'canceled' || data.status === 'none') {
    update.plan = 'free';
  }

  await User.findByIdAndUpdate(userId, update);

  return { success: true };
}

export async function exportSubscribersCSV() {
  await requireAdmin();
  await connectDB();

  const subscribers = await User.find({
    plan: 'pro',
    subscriptionStatus: { $in: ['active', 'past_due'] },
  })
    .select('name email plan subscriptionStatus subscriptionStartedAt subscriptionEndsAt')
    .lean();

  const csv = [
    'Name,Email,Plan,Status,Started,Ends',
    ...subscribers.map(
      (s) =>
        `${s.name},${s.email},${s.plan},${s.subscriptionStatus},${s.subscriptionStartedAt || ''},${s.subscriptionEndsAt || ''}`
    ),
  ].join('\n');

  return csv;
}

export async function getAdminAnalytics() {
  await requireAdmin();
  await connectDB();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const signupsPerDay = await User.aggregate([
    {
      $match: {
        role: 'user',
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const planDistribution = await User.aggregate([
    { $match: { role: 'user' } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
      },
    },
  ]);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newUsers = await User.find({
    role: 'user',
    createdAt: { $gte: sevenDaysAgo },
  })
    .select('_id')
    .lean();

  const newUserIds = newUsers.map((u) => u._id);

  const usersWithTasks = await Task.aggregate([
    {
      $match: {
        userId: { $in: newUserIds },
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: '$userId',
        taskCount: { $sum: 1 },
      },
    },
    {
      $match: {
        taskCount: { $gte: 5 },
      },
    },
  ]);

  const retentionRate =
    newUserIds.length > 0 ? Math.round((usersWithTasks.length / newUserIds.length) * 100) : 0;

  return {
    signupsPerDay: JSON.parse(JSON.stringify(signupsPerDay)),
    planDistribution: JSON.parse(JSON.stringify(planDistribution)),
    retentionRate,
    retentionCount: usersWithTasks.length,
    newUsersCount: newUserIds.length,
  };
}

export async function getMaintenanceMode() {
  await requireAdmin();
  await connectDB();

  const setting = await Settings.findOne({ key: 'maintenanceMode' });

  return setting?.value || false;
}

export async function toggleMaintenanceMode() {
  await requireAdmin();
  await connectDB();

  const setting = await Settings.findOne({ key: 'maintenanceMode' });

  if (setting) {
    setting.value = !setting.value;
    await setting.save();
  } else {
    await Settings.create({ key: 'maintenanceMode', value: true });
  }

  const newValue = setting ? setting.value : true;

  return { enabled: newValue };
}
