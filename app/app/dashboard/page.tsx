'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ListTodo, CheckCircle2, AlertCircle, TrendingUp, Calendar, Activity } from 'lucide-react';
import { getDashboardStats, getTasksCompletedPerDay, getStatusDistribution, getTasksPerTagGroup, getTaskHealth } from '@/lib/actions/analytics';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [completedPerDay, setCompletedPerDay] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [tasksPerGroup, setTasksPerGroup] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  const tourSlides = [
    {
      title: 'Start by creating your tags',
      body: 'Set up your tags first so organizing tasks is fast and consistent.',
    },
    {
      title: 'Add your tasks',
      body: 'Create tasks, estimate time, and assign tags so your plan stays clear and realistic.',
    },
    {
      title: 'See your tasks on the Home page',
      body: 'Home gives you a calm daily snapshot: what’s planned, what’s overdue, and what needs attention now.',
    },
    {
      title: 'Submit a reflection when you finish',
      body: 'When you complete a task, add a short reflection to capture what happened and improve your next run.',
    },
    {
      title: 'Review Dashboard & Insights',
      body: 'Use the Dashboard and Insights to track momentum, distribution, and patterns across your work.',
    },
    {
      title: 'Share progress with clients',
      body: 'Generate client share pages to show only what you choose—without exposing your full workspace.',
    },
  ];

  const TOUR_STORAGE_KEY = 'taskello.dashboardQuickTour.v1.seen';


  const safeStats = stats || {
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    dueThisWeek: 0,
  };

  const loadData = useCallback(async () => {
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
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    try {
      const seen = typeof window !== 'undefined' ? window.localStorage.getItem(TOUR_STORAGE_KEY) : '1';
      if (!seen) {
        setTourIndex(0);
        setTourOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function finishTour() {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setTourOpen(false);
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTourIndex(0);
            setTourOpen(true);
          }}
        >
          Quick tour
        </Button>
        {/* <Link href="/app/tasks?action=planner">
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            {t.planner.title} dgf
          </Button>
        </Link> */}
      </div>

      <Dialog
        open={tourOpen}
        onOpenChange={(open) => {
          setTourOpen(open);
          if (!open) finishTour();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {tourSlides[tourIndex]?.title || 'Quick tour'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50">
              <div className="relative aspect-[16/9]">
                <Image
                  src={`/preview/${5 + tourIndex}.png`}
                  alt={`Dashboard tour ${tourIndex + 1}`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {tourSlides[tourIndex]?.body || ''}
            </p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Step {tourIndex + 1} of {tourSlides.length}
                </div>
                <div className="flex items-center gap-1">
                  {tourSlides.map((_, i) => (
                    <span
                      key={i}
                      className={
                        i === tourIndex
                          ? 'h-2 w-2 rounded-full bg-slate-900 dark:bg-white'
                          : 'h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700'
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={finishTour}>
                  Skip
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTourIndex((i) => Math.max(i - 1, 0))}
                  disabled={tourIndex === 0}
                >
                  Back
                </Button>
                {tourIndex < tourSlides.length - 1 ? (
                  <Button onClick={() => setTourIndex((i) => Math.min(i + 1, tourSlides.length - 1))}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={finishTour}>Done</Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {health && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full ${healthColors[health?.health] || 'bg-slate-400'} flex items-center justify-center text-2xl`}
            >
              {healthIcons[health?.health] || '⚪'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {t.health.title}
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                {health?.health === 'healthy' && t.dashboard.healthy}
                {health?.health === 'warning' && t.dashboard.warning}
                {health?.health === 'burnout' && t.dashboard.burnoutRisk}
              </p>
              <div className="space-y-1">
                {(health?.recommendations || []).map((rec: string, i: number) => (
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeStats.totalTasks}</p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeStats.completedTasks}</p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeStats.overdueTasks}</p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeStats.completionRate}%</p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeStats.dueThisWeek}</p>
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
