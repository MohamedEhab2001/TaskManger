'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTasks, updateTask } from '@/lib/actions/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { startOfDay, endOfDay, addDays, isSameDay } from 'date-fns';

type TaskWithTags = any;

type GroupedTasks = {
  tagId: string;
  tagName: string;
  color?: string;
  tasks: TaskWithTags[];
};

type TaskStatus = 'todo' | 'doing' | 'done' | 'archived';

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

export default function AppHomePage() {
  const { t, language } = useI18n() as any;
  const [todayTasks, setTodayTasks] = useState<TaskWithTags[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<TaskWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskPreviewOpen, setTaskPreviewOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<TaskWithTags | null>(null);

  const statuses = useMemo(
    () =>
      [
        { key: 'todo' as const, label: t.tasks.statusTodo },
        { key: 'doing' as const, label: t.tasks.statusDoing },
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
        done: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800',
        archived: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
      }) as Record<TaskStatus, string>,
    []
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const tomorrowStart = startOfDay(addDays(now, 1));
      const tomorrowEnd = endOfDay(addDays(now, 1));

      const [t1, t2] = await Promise.all([
        getTasks({
          dueDateFrom: todayStart.toISOString(),
          dueDateTo: todayEnd.toISOString(),
          sort: 'dueDate',
        }),
        getTasks({
          dueDateFrom: tomorrowStart.toISOString(),
          dueDateTo: tomorrowEnd.toISOString(),
          sort: 'dueDate',
        }),
      ]);

      setTodayTasks(t1);
      setTomorrowTasks(t2);
    } finally {
      setLoading(false);
    }
  }

  async function quickUpdateStatus(taskId: string, status: 'todo' | 'doing' | 'done' | 'archived') {
    const prevToday = todayTasks;
    const prevTomorrow = tomorrowTasks;

    setTodayTasks((current) => current.map((t) => (t._id === taskId ? { ...t, status } : t)));
    setTomorrowTasks((current) => current.map((t) => (t._id === taskId ? { ...t, status } : t)));

    try {
      await updateTask(taskId, { status });
      await load();
    } catch (e) {
      setTodayTasks(prevToday);
      setTomorrowTasks(prevTomorrow);
    }
  }

  const todayGroups = useMemo(
    () => groupTasksByTag(todayTasks, language, t.home.untagged),
    [todayTasks, language, t.home.untagged]
  );
  const tomorrowGroups = useMemo(
    () => groupTasksByTag(tomorrowTasks, language, t.home.untagged),
    [tomorrowTasks, language, t.home.untagged]
  );

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);

  function openPreview(task: TaskWithTags) {
    setPreviewTask(task);
    setTaskPreviewOpen(true);
  }

  function renderTagGroups(groups: GroupedTasks[]) {
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.tagId} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-2 border-slate-200 dark:border-slate-700">
                  {group.color ? (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
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
                        {isSameDay(new Date(task.dueDate), today)
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
          </div>
        </DialogContent>
      </Dialog>

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
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.home.tomorrow}</h2>
            {renderStatusBoard(tomorrowTasks)}
          </section>
        </>
      )}
    </div>
  );
}
