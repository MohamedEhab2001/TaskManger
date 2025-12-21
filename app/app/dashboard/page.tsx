'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ListTodo, CheckCircle2, AlertCircle, TrendingUp, Calendar, Activity } from 'lucide-react';
import { getDashboardStats, getTasksCompletedPerDay, getStatusDistribution, getTasksPerTagGroup, getTaskHealth } from '@/lib/actions/analytics';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [completedPerDay, setCompletedPerDay] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [tasksPerGroup, setTasksPerGroup] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, completedData, statusData, groupData, healthData] = await Promise.all([
        getDashboardStats(),
        getTasksCompletedPerDay(days),
        getStatusDistribution(),
        getTasksPerTagGroup(),
        getTaskHealth(),
      ]);

      setStats(statsData);
      setCompletedPerDay(completedData);
      setStatusDist(statusData);
      setTasksPerGroup(groupData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const healthColors: Record<string, string> = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    burnout: 'bg-red-500',
  };

  const healthIcons: Record<string, string> = {
    healthy: '🟢',
    warning: '🟡',
    burnout: '🔴',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.dashboard.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.dashboard.title}</h1>
        <Link href="/app/tasks?action=planner">
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            {t.planner.title}
          </Button>
        </Link>
      </div>

      {health && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full ${healthColors[health.health]} flex items-center justify-center text-2xl`}>
              {healthIcons[health.health]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {t.health.title}
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                {health.health === 'healthy' && t.dashboard.healthy}
                {health.health === 'warning' && t.dashboard.warning}
                {health.health === 'burnout' && t.dashboard.burnoutRisk}
              </p>
              <div className="space-y-1">
                {health.recommendations.map((rec: string, i: number) => (
                  <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                    • {rec}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.totalTasks}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTasks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.completedTasks}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedTasks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.overdueTasks}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.overdueTasks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.completionRate}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completionRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.dueThisWeek}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.dueThisWeek}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.dashboard.tasksCompletedPerDay}
          </h2>
          <div className="flex gap-2">
            <Button
              variant={days === 14 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(14)}
            >
              {t.dashboard.last14Days}
            </Button>
            <Button
              variant={days === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(30)}
            >
              {t.dashboard.last30Days}
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={completedPerDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
            {t.dashboard.statusDistribution}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDist}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {statusDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
            {t.dashboard.tasksPerTagGroup}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tasksPerGroup} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="group" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {tasksPerGroup.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
