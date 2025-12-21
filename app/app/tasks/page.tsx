'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Filter, Calendar as CalendarIcon, Pin, Edit, Trash2, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask, bulkUpdateTasks, bulkDeleteTasks } from '@/lib/actions/tasks';
import { getTags, getTagGroups } from '@/lib/actions/tags';
import { generateWeeklyPlan, acceptWeeklyPlan } from '@/lib/actions/planner';
import { createStarterTasks, suggestTaskBreakdown, acceptTaskBreakdown } from '@/lib/actions/advanced';
import { calculateFriction } from '@/lib/friction';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

export default function TasksPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [taskDialog, setTaskDialog] = useState(false);
  const [plannerDialog, setPlannerDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [weekPlan, setWeekPlan] = useState<any[]>([]);
  const [dailyCapacity, setDailyCapacity] = useState(120);
  const [lockedDays, setLockedDays] = useState<string[]>([]);
  const [breakdownDialog, setBreakdownDialog] = useState(false);
  const [breakdownData, setBreakdownData] = useState<any>(null);

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    sort: 'createdAt',
  });

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    status: 'todo' | 'doing' | 'done' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string;
    estimatedMinutes: string;
    tags: string[];
    isPinned: boolean;
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    estimatedMinutes: '',
    tags: [],
    isPinned: false,
  });

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'planner') {
      setPlannerDialog(true);
    }
  }, [filters, searchParams]);

  async function loadData() {
    setLoading(true);
    try {
      const [tasksData, tagsData] = await Promise.all([
        getTasks({
          status: filters.status as any,
          priority: filters.priority as any,
          search,
          sort: filters.sort,
        }),
        getTags(),
      ]);
      setTasks(tasksData);
      setTags(tagsData);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      const data = {
        ...formData,
        estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : undefined,
      };

      if (editingTask) {
        await updateTask(editingTask._id, data);
        toast.success(t.tasks.taskUpdated);
      } else {
        await createTask(data);
        toast.success(t.tasks.taskCreated);
      }

      setTaskDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save task');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      estimatedMinutes: '',
      tags: [],
      isPinned: false,
    });
    setEditingTask(null);
  }

  function editTask(task: any) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      estimatedMinutes: task.estimatedMinutes?.toString() || '',
      tags: task.tags?.map((t: any) => t._id) || [],
      isPinned: task.isPinned || false,
    });
    setTaskDialog(true);
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure?')) {
      try {
        await deleteTask(id);
        toast.success(t.tasks.taskDeleted);
        loadData();
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  }

  async function handleBulkAction(action: string) {
    if (selectedTasks.length === 0) return;

    try {
      if (action === 'delete') {
        await bulkDeleteTasks(selectedTasks);
        toast.success(t.tasks.deleteSelected);
      } else if (action === 'done') {
        await bulkUpdateTasks(selectedTasks, { status: 'done' });
        toast.success(t.tasks.markAsDone);
      } else if (action === 'archive') {
        await bulkUpdateTasks(selectedTasks, { status: 'archived' });
        toast.success(t.tasks.archive);
      }

      setSelectedTasks([]);
      loadData();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  }

  async function generatePlan() {
    try {
      const plan = await generateWeeklyPlan(dailyCapacity, lockedDays);
      setWeekPlan(plan);
      toast.success(t.planner.planGenerated);
    } catch (error) {
      toast.error('Failed to generate plan');
    }
  }

  async function acceptPlan() {
    try {
      await acceptWeeklyPlan(weekPlan);
      toast.success(t.planner.planAccepted);
      setPlannerDialog(false);
      loadData();
    } catch (error) {
      toast.error('Failed to accept plan');
    }
  }

  async function handleCreateStarterTasks() {
    try {
      await createStarterTasks();
      toast.success(t.emptyStates.starterTasksCreated);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create starter tasks');
    }
  }

  async function checkTaskBreakdown(taskId: string) {
    try {
      const suggestion = await suggestTaskBreakdown(taskId);
      if (suggestion.shouldBreakdown) {
        setBreakdownData(suggestion);
        setBreakdownDialog(true);
      }
    } catch (error) {
      console.error('Failed to check breakdown:', error);
    }
  }

  async function handleAcceptBreakdown() {
    if (!breakdownData) return;
    try {
      await acceptTaskBreakdown(breakdownData.originalTask._id, breakdownData.subtasks);
      toast.success(t.breakdown.subtasksCreated);
      setBreakdownDialog(false);
      setBreakdownData(null);
      loadData();
    } catch (error) {
      toast.error('Failed to create subtasks');
    }
  }

  function getFrictionBadge(task: any) {
    const friction = calculateFriction(task);
    const colors = {
      low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return { friction, color: colors[friction.level] };
  }

  async function quickUpdateStatus(taskId: string, status: 'todo' | 'doing' | 'done' | 'archived') {
    const prev = tasks;
    setTasks((current) => current.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      await updateTask(taskId, { status });
      loadData();
    } catch (error) {
      setTasks(prev);
      toast.error('Failed to update task');
    }
  }

  function getTagLabel(tag: any) {
    return tag?.name?.en || tag?.name?.ar || tag?.name || '';
  }

  function toggleQuickTag(tagId: string) {
    setQuickTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  }

  function toggleFormTag(tagId: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId) ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId],
    }));
  }

  const priorityColors: any = {
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  const statusColors: any = {
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    doing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.tasks.title}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setPlannerDialog(true)} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            {t.planner.title}
          </Button>
          <Button onClick={() => { resetForm(); setTaskDialog(true); }} data-new-task-btn>
            <Plus className="w-4 h-4 mr-2" />
            {t.tasks.newTask}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t.tasks.quickAdd}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search) {
                  createTask({ title: search, tags: quickTags }).then(() => {
                    setSearch('');
                    setQuickTags([]);
                    loadData();
                    toast.success(t.tasks.taskCreated);
                  });
                }
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {t.tasks.tags}
                {quickTags.length > 0 ? ` (${quickTags.length})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag._id}
                  checked={quickTags.includes(tag._id)}
                  onCheckedChange={() => toggleQuickTag(tag._id)}
                >
                  {getTagLabel(tag)}
                </DropdownMenuCheckboxItem>
              ))}
              {tags.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">{t.tags.noTags}</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v === '__clear__' ? '' : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.tasks.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__clear__">{t.common.filter}</SelectItem>
              <SelectItem value="todo">{t.tasks.statusTodo}</SelectItem>
              <SelectItem value="doing">{t.tasks.statusDoing}</SelectItem>
              <SelectItem value="done">{t.tasks.statusDone}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.priority}
            onValueChange={(v) => setFilters({ ...filters, priority: v === '__clear__' ? '' : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.tasks.priority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__clear__">{t.common.filter}</SelectItem>
              <SelectItem value="low">{t.tasks.priorityLow}</SelectItem>
              <SelectItem value="medium">{t.tasks.priorityMedium}</SelectItem>
              <SelectItem value="high">{t.tasks.priorityHigh}</SelectItem>
              <SelectItem value="urgent">{t.tasks.priorityUrgent}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedTasks.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('done')}>
              {t.tasks.markAsDone}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
              {t.tasks.archive}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
              {t.tasks.deleteSelected}
            </Button>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task._id} className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedTasks.includes(task._id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTasks([...selectedTasks, task._id]);
                  } else {
                    setSelectedTasks(selectedTasks.filter((id) => id !== task._id));
                  }
                }}
              />
              <div className="flex-1">
                <div className="flex items-start gap-2 mb-2 flex-wrap">
                  {task.isPinned && <Pin className="w-4 h-4 text-yellow-600 mt-1" />}
                  <h3 className="font-semibold text-slate-900 dark:text-white flex-1">
                    {task.title}
                  </h3>
                  {(() => {
                    const { friction, color } = getFrictionBadge(task);
                    if (friction.score > 0) {
                      return (
                        <Badge
                          className={`${color} cursor-help`}
                          title={friction.factors.join(' • ')}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {friction.level === 'low' && t.friction.low}
                          {friction.level === 'medium' && t.friction.medium}
                          {friction.level === 'high' && t.friction.high}
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                  <Badge className={priorityColors[task.priority]}>
                    {t.tasks[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as keyof typeof t.tasks]}
                  </Badge>
                  <Select value={task.status} onValueChange={(v) => quickUpdateStatus(task._id, v as any)}>
                    <SelectTrigger className="h-7 px-2 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{t.tasks.statusTodo}</SelectItem>
                      <SelectItem value="doing">{t.tasks.statusDoing}</SelectItem>
                      <SelectItem value="done">{t.tasks.statusDone}</SelectItem>
                      <SelectItem value="archived">{t.tasks.statusArchived}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {task.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-400">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                    </span>
                  )}
                  {task.estimatedMinutes && (
                    <span>{task.estimatedMinutes} min</span>
                  )}
                  {task.tags?.map((tag: any) => (
                    <Badge key={tag._id} variant="outline">
                      {tag.name.en}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {(task.priority === 'urgent' || (task.estimatedMinutes && task.estimatedMinutes > 120)) && (
                  <Button size="sm" variant="outline" onClick={() => checkTaskBreakdown(task._id)}>
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => editTask(task)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(task._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {tasks.length === 0 && !loading && (
          <Card className="p-12 text-center space-y-4">
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t.emptyStates.noTasksTitle}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.emptyStates.noTasksDescription}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { resetForm(); setTaskDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                {t.tasks.newTask}
              </Button>
              <Button variant="outline" onClick={handleCreateStarterTasks}>
                {t.emptyStates.createStarterTasks}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t.common.edit : t.tasks.newTask}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tasks.taskTitle}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t.tasks.taskTitle}
              />
            </div>
            <div>
              <Label>{t.tasks.description}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.tasks.description}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.tasks.status}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">{t.tasks.statusTodo}</SelectItem>
                    <SelectItem value="doing">{t.tasks.statusDoing}</SelectItem>
                    <SelectItem value="done">{t.tasks.statusDone}</SelectItem>
                    <SelectItem value="archived">{t.tasks.statusArchived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.tasks.priority}</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t.tasks.priorityLow}</SelectItem>
                    <SelectItem value="medium">{t.tasks.priorityMedium}</SelectItem>
                    <SelectItem value="high">{t.tasks.priorityHigh}</SelectItem>
                    <SelectItem value="urgent">{t.tasks.priorityUrgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.tasks.dueDate}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.tasks.estimatedMinutes}</Label>
                <Input
                  type="number"
                  value={formData.estimatedMinutes}
                  onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <Label>{t.tasks.tags}</Label>
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {t.tasks.tags}
                      {formData.tags.length > 0 ? ` (${formData.tags.length})` : ''}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {tags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag._id}
                        checked={formData.tags.includes(tag._id)}
                        onCheckedChange={() => toggleFormTag(tag._id)}
                      >
                        {getTagLabel(tag)}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {tags.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">{t.tags.noTags}</div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {formData.tags.map((tagId) => {
                  const tag = tags.find((x) => x._id === tagId);
                  const label = tag ? getTagLabel(tag) : tagId;
                  return (
                    <Badge key={tagId} variant="outline" className="cursor-pointer" onClick={() => toggleFormTag(tagId)}>
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleSubmit} className="flex-1">
                {t.common.save}
              </Button>
              <Button variant="outline" onClick={() => setTaskDialog(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={plannerDialog} onOpenChange={setPlannerDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.planner.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t.planner.description}</p>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>{t.planner.dailyCapacity}</Label>
                <Input
                  type="number"
                  value={dailyCapacity}
                  onChange={(e) => setDailyCapacity(parseInt(e.target.value))}
                />
              </div>
              <Button onClick={generatePlan}>
                {weekPlan.length > 0 ? t.planner.regenerate : t.planner.generate}
              </Button>
              {weekPlan.length > 0 && (
                <Button onClick={acceptPlan} variant="default">
                  {t.planner.accept}
                </Button>
              )}
            </div>

            {weekPlan.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {weekPlan.map((day) => (
                  <Card key={day.day} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold capitalize">{t.planner[day.day as keyof typeof t.planner]}</h3>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {day.totalMinutes}/{dailyCapacity} min
                      </span>
                    </div>
                    <div className="space-y-2">
                      {day.tasks.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          {t.planner.noTasksScheduled}
                        </p>
                      ) : (
                        day.tasks.map((task: any) => (
                          <div
                            key={task._id}
                            className="text-sm p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {task.estimatedMinutes || 30} min • {task.priority}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={breakdownDialog} onOpenChange={setBreakdownDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.breakdown.title}</DialogTitle>
          </DialogHeader>
          {breakdownData && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.breakdown.description}
              </p>
              <div className="space-y-2">
                {breakdownData.subtasks.map((subtask: any, index: number) => (
                  <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="font-medium text-slate-900 dark:text-white">{subtask.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtask.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtask.estimatedMinutes} min</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAcceptBreakdown} className="flex-1">
                  {t.breakdown.accept}
                </Button>
                <Button variant="outline" onClick={() => setBreakdownDialog(false)}>
                  {t.breakdown.dismiss}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
