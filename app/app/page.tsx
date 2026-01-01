'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getTask, getTasks, updateTaskStatus } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { startOfDay, endOfDay, addDays, isSameDay } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Shield, Clock, CalendarClock, Timer, AlertTriangle } from 'lucide-react';
import { CompletionReflectionModal } from '@/components/completion-reflection-modal';

type TaskWithTags = any;

type GroupedTasks = {
  tagId: string;
  tagName: string;
  color?: string;
  tasks: TaskWithTags[];
};

type TaskStatus = 'todo' | 'doing' | 'hold' | 'done' | 'archived';

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinutesAsHours(minutes: number) {
  const safe = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function computeDisplayedSeconds(task: any, nowMs: number) {
  const tt = task?.timeTracking;
  if (!tt) return task?.computedTotalSeconds ?? 0;

  if (tt.isRunning && tt.lastStartedAt) {
    const startedMs = new Date(tt.lastStartedAt).getTime();
    const delta = Math.floor((nowMs - startedMs) / 1000);
    return (tt.totalSeconds || 0) + Math.max(delta, 0);
  }

  return tt.totalSeconds ?? task?.computedTotalSeconds ?? 0;
}

function computeSecondsInRange(task: any, rangeStartMs: number, rangeEndMs: number, nowMs: number) {
  const tt = task?.timeTracking;
  if (!tt) return 0;

  const startMs = Math.min(rangeStartMs, rangeEndMs);
  const endMs = Math.max(rangeStartMs, rangeEndMs);
  let totalSeconds = 0;

  const sessions = Array.isArray(tt.sessions) ? tt.sessions : [];
  for (const s of sessions) {
    if (!s?.startedAt || !s?.endedAt) continue;
    const sStart = new Date(s.startedAt).getTime();
    const sEnd = new Date(s.endedAt).getTime();
    if (!Number.isFinite(sStart) || !Number.isFinite(sEnd)) continue;

    const overlapStart = Math.max(sStart, startMs);
    const overlapEnd = Math.min(sEnd, endMs);
    if (overlapEnd > overlapStart) {
      totalSeconds += Math.floor((overlapEnd - overlapStart) / 1000);
    }
  }

  if (tt.isRunning && tt.lastStartedAt) {
    const runningStart = new Date(tt.lastStartedAt).getTime();
    const overlapStart = Math.max(runningStart, startMs);
    const overlapEnd = Math.min(nowMs, endMs);
    if (overlapEnd > overlapStart) {
      totalSeconds += Math.floor((overlapEnd - overlapStart) / 1000);
    }
  }

  return Math.max(0, totalSeconds);
}

function hashToHslColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 50%)`;
}

function getTagLabel(tag: any, language: string) {
  if (!tag) return '';
  if (typeof tag.name === 'string') return tag.name;
  return tag.name?.[language] ?? tag.name?.en ?? tag.name?.ar ?? 'Tag';
}

function groupTasksByTag(tasks: TaskWithTags[], language: string, untaggedLabel: string): GroupedTasks[] {
  const map = new Map<string, GroupedTasks>();

  for (const task of tasks) {
    const tag = Array.isArray(task.tags) && task.tags.length > 0 ? task.tags[0] : null;

    const tagId = tag?._id ? String(tag._id) : '__untagged__';
    const tagName = tag ? getTagLabel(tag, language) : untaggedLabel;
    const color = tag?.color;

    if (!map.has(tagId)) {
      map.set(tagId, { tagId, tagName, color, tasks: [] });
    }
    map.get(tagId)!.tasks.push(task);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.tagId === '__untagged__') return 1;
    if (b.tagId === '__untagged__') return -1;
    return a.tagName.localeCompare(b.tagName);
  });
}

function formatTemplate(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String((params as any)[k] ?? ''));
}

export default function AppHomePage() {
  const { t, language } = useI18n() as any;
  const [todayTasks, setTodayTasks] = useState<TaskWithTags[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskPreviewOpen, setTaskPreviewOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<TaskWithTags | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionTask, setReflectionTask] = useState<TaskWithTags | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [dailyCapacity, setDailyCapacity] = useState<number>(120);

  const statuses = useMemo(
    () =>
      [
        { key: 'todo' as const, label: t.tasks.statusTodo },
        { key: 'doing' as const, label: t.tasks.statusDoing },
        { key: 'hold' as const, label: t.tasks.statusHold },
        { key: 'done' as const, label: t.tasks.statusDone },
        { key: 'archived' as const, label: t.tasks.statusArchived },
      ] as const,
    [t]
  );

  const statusTriggerClass = useMemo(
    () =>
      ({
        todo: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
        doing: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800',
        hold: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800',
        done: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800',
        archived: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
      }) as Record<TaskStatus, string>,
    []
  );

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('dailyCapacity') : null;
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) setDailyCapacity(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const yesterdayEnd = endOfDay(addDays(now, -1));

      const [t1, t2] = await Promise.all([
        getTasks({
          dueDateFrom: todayStart.toISOString(),
          dueDateTo: todayEnd.toISOString(),
          sort: 'dueDate',
        }),
        getTasks({
          dueDateTo: yesterdayEnd.toISOString(),
          sort: 'dueDate',
        }),
      ]);

      setTodayTasks(t1);
      setOverdueTasks(
        (t2 || []).filter(
          (task: any) =>
            task?.dueDate &&
            new Date(task.dueDate).getTime() < todayStart.getTime() &&
            task?.status !== 'done' &&
            task?.status !== 'archived'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function getCompletionEstimationMessage(task: any) {
    const estimated = typeof task?.estimatedMinutes === 'number' ? task.estimatedMinutes : null;
    if (!estimated || estimated <= 0) return t.estimation.doneNoEstimate;

    const trackedMinutes = task?.timeTracking?.totalSeconds
      ? Math.round(task.timeTracking.totalSeconds / 60)
      : null;
    const actual = typeof task?.actualMinutes === 'number' ? task.actualMinutes : trackedMinutes;
    if (actual === null || actual === undefined) return t.estimation.doneNoEstimate;

    const delta = actual - estimated;
    const pct = Math.round((Math.abs(delta) / estimated) * 100);
    if (pct <= 5) return t.estimation.donePerfect;

    if (delta < 0) return formatTemplate(t.estimation.doneFaster, { percent: pct });
    return formatTemplate(t.estimation.doneSlower, { percent: pct });
  }

  function getEstimationBadge(task: any) {
    const estimated = typeof task?.estimatedMinutes === 'number' ? task.estimatedMinutes : null;
    if (!estimated || estimated <= 0) return null;

    const trackedMinutes = task?.timeTracking?.totalSeconds
      ? Math.round(task.timeTracking.totalSeconds / 60)
      : null;
    const actual = typeof task?.actualMinutes === 'number' ? task.actualMinutes : trackedMinutes;

    const base = `${estimated}m`;
    if (task.status !== 'done' || actual === null || actual === undefined) return base;

    const delta = actual - estimated;
    const pct = Math.round((Math.abs(delta) / estimated) * 100);
    if (pct <= 5) return `${base} • ${t.estimation.accurateEstimate}`;
    if (delta > 0) return `${base} • ${t.estimation.underestimated}`;
    return `${base} • ${t.estimation.overestimated}`;
  }

  async function quickUpdateStatus(taskId: string, status: 'todo' | 'doing' | 'hold' | 'done' | 'archived') {
    const prevToday = todayTasks;
    const prevOverdue = overdueTasks;

    const localTask =
      (prevToday || []).find((t: any) => t?._id === taskId) || (prevOverdue || []).find((t: any) => t?._id === taskId) || null;

    setTodayTasks((current) => current.map((t) => (t._id === taskId ? { ...t, status } : t)));
    setOverdueTasks((current) => current.map((t) => (t._id === taskId ? { ...t, status } : t)));

    try {
      const res: any = await updateTaskStatus(taskId, status);
      if (status === 'done') {
        const transitionedIntoDone = res?.prevStatus ? res.prevStatus !== 'done' : Boolean(res?.triggerReflection);
        const shouldOpenReflection = Boolean(res?.triggerReflection) || transitionedIntoDone;

        let fullTask: any = null;
        try {
          fullTask = await getTask(taskId);
        } catch {
          fullTask = null;
        }

        const taskForUi = fullTask || localTask;
        if (taskForUi) toast.success(getCompletionEstimationMessage(taskForUi));

        const hasSubtasks = Array.isArray(taskForUi?.subtasks) && taskForUi.subtasks.length > 0;
        if (shouldOpenReflection && hasSubtasks) {
          setReflectionTask(taskForUi);
          setReflectionOpen(true);
        } else if (Boolean(res?.triggerReflection) && !hasSubtasks) {
          toast.error('Failed to load completion criteria for reflection');
        }
      }
      await load();
    } catch (e) {
      setTodayTasks(prevToday);
      setOverdueTasks(prevOverdue);
    }
  }

  const todayGroups = useMemo(
    () => groupTasksByTag(todayTasks, language, t.home.untagged),
    [todayTasks, language, t.home.untagged]
  );

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const todayEnd = useMemo(() => endOfDay(new Date()), []);

  const todayPlannedMinutes = useMemo(() => {
    const eligible = new Set(['todo', 'doing', 'hold', 'done']);
    return (todayTasks || [])
      .filter((task: any) => eligible.has(String(task?.status || '')))
      .reduce((sum: number, task: any) => sum + (typeof task?.estimatedMinutes === 'number' ? task.estimatedMinutes : 0), 0);
  }, [todayTasks]);

  const todaySpentMinutes = useMemo(() => {
    const rangeStartMs = todayStart.getTime();
    const rangeEndMs = todayEnd.getTime();
    const eligible = new Set(['todo', 'doing', 'hold', 'done']);
    const totalSeconds = (todayTasks || [])
      .filter((task: any) => eligible.has(String(task?.status || '')))
      .reduce((sum: number, task: any) => sum + computeSecondsInRange(task, rangeStartMs, rangeEndMs, nowTick), 0);
    return Math.round(totalSeconds / 60);
  }, [todayTasks, todayStart, todayEnd, nowTick]);

  const overduePlannedMinutes = useMemo(() => {
    return (overdueTasks || []).reduce(
      (sum: number, task: any) => sum + (typeof task?.estimatedMinutes === 'number' ? task.estimatedMinutes : 0),
      0
    );
  }, [overdueTasks]);

  const todaysEstimatedMinutes = useMemo(() => {
    return (todayTasks || [])
      .filter((t: any) => t?.status !== 'done' && t?.status !== 'archived')
      .reduce((sum: number, t: any) => sum + (typeof t?.estimatedMinutes === 'number' ? t.estimatedMinutes : 0), 0);
  }, [todayTasks]);

  const isOverCapacity = useMemo(() => {
    return dailyCapacity > 0 && todaysEstimatedMinutes > dailyCapacity;
  }, [dailyCapacity, todaysEstimatedMinutes]);

  function openPreview(task: TaskWithTags) {
    setTaskPreviewOpen(true);
    setPreviewTask(task);
    // Ensure we load the full task (including completion criteria / subtasks)
    getTask(task._id)
      .then((full) => {
        if (full?._id === task._id) setPreviewTask(full);
      })
      .catch(() => {
        // ignore
      });
  }

  function renderTagGroups(groups: GroupedTasks[]) {
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.tagId} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-2 border-slate-200 dark:border-slate-700">
                  {group.tagId === '__untagged__' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: group.color || hashToHslColor(group.tagId || group.tagName) }}
                    />
                  )}
                  <span className="text-slate-900 dark:text-white">{group.tagName}</span>
                </Badge>
              </div>
              <Badge variant="secondary">{group.tasks.length}</Badge>
            </div>

            <div className="space-y-2">
              {group.tasks.map((task) => (
                <button
                  type="button"
                  key={task._id}
                  onClick={() => openPreview(task)}
                  className="w-full text-left rounded-md p-2 -m-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white whitespace-normal break-normal">
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(task.dueDate).getTime() < todayStart.getTime()
                          ? t.tasks.overdue
                          : isSameDay(new Date(task.dueDate), today)
                            ? t.home.dueToday
                            : isSameDay(new Date(task.dueDate), tomorrow)
                              ? t.home.dueTomorrow
                              : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select value={task.status} onValueChange={(v) => quickUpdateStatus(task._id, v as any)}>
                        <SelectTrigger className={`h-7 px-2 w-[140px] ${statusTriggerClass[task.status as TaskStatus]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.key} value={s.key}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {getEstimationBadge(task) && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200"
                      >
                        {getEstimationBadge(task)}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        task?.timeTracking?.isRunning
                          ? 'border-yellow-200 text-yellow-800 dark:border-yellow-800 dark:text-yellow-200'
                          : task.status === 'done'
                            ? 'border-green-200 text-green-800 dark:border-green-800 dark:text-green-200'
                            : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                      }
                    >
                      {task?.timeTracking?.isRunning
                        ? `${t.timeTracking.running} ${formatDuration(computeDisplayedSeconds(task, nowTick))}`
                        : task.status === 'done'
                          ? `${t.timeTracking.done} ${formatDuration(computeDisplayedSeconds(task, nowTick))}`
                          : `${t.timeTracking.paused} ${formatDuration(computeDisplayedSeconds(task, nowTick))}`}
                    </Badge>
                    <Badge
                      className={
                        task.priority === 'urgent'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  function renderStatusBoard(tasks: TaskWithTags[]) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map((s) => {
          const columnTasks = tasks.filter((task) => task.status === s.key);
          const groups = groupTasksByTag(columnTasks, language, t.home.untagged);
          return (
            <Card key={s.key} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className={statusTriggerClass[s.key]}>{s.label}</Badge>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>

              {groups.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t.home.noTasks}</div>
              ) : (
                <div className="space-y-4">{renderTagGroups(groups)}</div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.home.title}</h1>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Shield className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Focus Guard</div>
                <Badge variant="outline" className="gap-1 text-slate-700 dark:text-slate-200">
                  <Clock className="h-3.5 w-3.5" />
                  {t.landing.comingSoon}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Stay focused while working on tasks with gentle nudges and distraction protection.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 opacity-70 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="text-xs text-slate-600 dark:text-slate-400">Off</div>
            <Switch checked={false} disabled />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Time awareness</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              A calm snapshot of what’s planned for today, what you’ve spent, and what’s overdue.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-4 w-4" />
              Today’s planned time
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {formatMinutesAsHours(todayPlannedMinutes)}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Timer className="h-4 w-4" />
              Time spent today
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {formatMinutesAsHours(todaySpentMinutes)}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <AlertTriangle className="h-4 w-4" />
              Overdue workload
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {overduePlannedMinutes > 0 ? formatMinutesAsHours(overduePlannedMinutes) : 'No overdue workload 🎉'}
            </div>
          </div>
        </div>
      </Card>

      {!loading && isOverCapacity ? (
        <Card className="p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                {t.home.capacityWarningTitle}
              </div>
              <div className="mt-1 text-sm text-yellow-900/90 dark:text-yellow-100/90">
                {formatTemplate(t.home.capacityWarningBody, {
                  total: formatMinutesAsHours(todaysEstimatedMinutes),
                  capacity: formatMinutesAsHours(dailyCapacity),
                })}
              </div>
            </div>

            <Link href="/app/settings">
              <Badge variant="outline" className="border-yellow-300 text-yellow-900 dark:border-yellow-700 dark:text-yellow-200">
                {t.home.capacityWarningCta}
              </Badge>
            </Link>
          </div>
        </Card>
      ) : null}

      <Dialog open={taskPreviewOpen} onOpenChange={setTaskPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewTask?.title || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {previewTask?.description ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {previewTask.description}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.tasks.description}: —</p>
            )}
            <div className="flex flex-wrap gap-2">
              {previewTask?.status && <Badge variant="outline">{previewTask.status}</Badge>}
              {previewTask?.priority && <Badge variant="outline">{previewTask.priority}</Badge>}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {t.tasks.completionCriteria || 'Completion criteria'}
              </div>
              {Array.isArray((previewTask as any)?.subtasks) && (previewTask as any).subtasks.length > 0 ? (
                <div className="space-y-1">
                  {(previewTask as any).subtasks.map((s: any) => (
                    <div key={String(s?._id || s?.title)} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className={s?.isDone ? 'line-through text-slate-500 dark:text-slate-500' : ''}>{s?.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t.tasks.noCompletionCriteriaHint || 'No completion criteria.'}</div>
              )}
            </div>

            {previewTask?.status === 'done' &&
            Array.isArray((previewTask as any)?.subtasks) &&
            (previewTask as any).subtasks.length > 0 ? (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTaskPreviewOpen(false);
                    setReflectionTask(previewTask);
                    setReflectionOpen(true);
                  }}
                >
                  {t.reflection.view}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <CompletionReflectionModal
        open={reflectionOpen}
        onOpenChange={(open) => {
          setReflectionOpen(open);
          if (!open) setReflectionTask(null);
        }}
        task={reflectionTask}
      />

      {loading ? (
        <div className="space-y-4">
          <Card className="p-6 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40" />
            <div className="mt-4 h-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </Card>
          <Card className="p-6 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40" />
            <div className="mt-4 h-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </Card>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.home.today}</h2>
            {renderStatusBoard(todayTasks)}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.tasks.overdue}</h2>
            {renderStatusBoard(overdueTasks)}
          </section>
        </>
      )}
    </div>
  );
}
