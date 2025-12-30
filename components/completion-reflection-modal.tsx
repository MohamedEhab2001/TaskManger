'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateSubtask, saveCompletionReflection, createFollowupFromUnfinished } from '@/lib/actions/tasks';
import { toast } from 'sonner';

type Subtask = {
  _id: string;
  title: string;
  isDone: boolean;
};

type TaskForReflection = {
  _id: string;
  title: string;
  subtasks?: Subtask[];
  completionReflection?: {
    notes?: string;
    completionRate?: number;
  } | null;
};

export function CompletionReflectionModal({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskForReflection | null;
}) {
  const { t, language } = useI18n() as any;

  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingFollowup, setCreatingFollowup] = useState(false);

  useEffect(() => {
    if (!task) {
      setLocalSubtasks([]);
      setNotes('');
      return;
    }
    setLocalSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
    setNotes(typeof task.completionReflection?.notes === 'string' ? task.completionReflection?.notes : '');
  }, [task]);

  const completionRate = useMemo(() => {
    const total = localSubtasks.length;
    const done = localSubtasks.filter((s) => Boolean(s.isDone)).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [localSubtasks]);

  const unfinished = useMemo(() => localSubtasks.filter((s) => !s.isDone), [localSubtasks]);

  async function toggleSubtask(subtaskId: string, isDone: boolean) {
    if (!task?._id) return;
    try {
      setLocalSubtasks((prev) => prev.map((s) => (s._id === subtaskId ? { ...s, isDone } : s)));
      await updateSubtask(task._id, subtaskId, isDone);
    } catch (e: any) {
      setLocalSubtasks((prev) => prev.map((s) => (s._id === subtaskId ? { ...s, isDone: !isDone } : s)));
      toast.error(e?.message || 'Failed to update subtask');
    }
  }

  async function handleSave() {
    if (!task?._id) return;
    setSaving(true);
    try {
      await saveCompletionReflection(task._id, { notes });
      toast.success(t?.reflection?.savedToast || 'Reflection saved');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save reflection');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateFollowup() {
    if (!task?._id) return;
    setCreatingFollowup(true);
    try {
      const res: any = await createFollowupFromUnfinished(task._id);
      if (res?.created) {
        toast.success(t?.reflection?.followupCreatedToast || 'Follow-up created for tomorrow');
      } else {
        toast.success(t?.reflection?.followupNotNeededToast || 'Nothing to carry over');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create follow-up');
    } finally {
      setCreatingFollowup(false);
    }
  }

  const title = task?.title || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t?.reflection?.title || 'Completion Reflection'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{title}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {t?.reflection?.completionRateLabel || 'Completion rate'}
              </div>
            </div>
            <Badge variant="secondary">{completionRate}%</Badge>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{t?.reflection?.subtasksLabel || 'Subtasks'}</div>
            <div className="mt-3 space-y-2">
              {localSubtasks.map((s) => (
                <label key={s._id} className="flex items-start gap-3 text-sm text-slate-800 dark:text-slate-100">
                  <Checkbox checked={s.isDone} onCheckedChange={(v) => toggleSubtask(s._id, Boolean(v))} />
                  <span className={s.isDone ? 'line-through text-slate-500 dark:text-slate-400' : ''}>{s.title}</span>
                </label>
              ))}
              {localSubtasks.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t?.reflection?.noSubtasks || 'No subtasks'}</div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{t?.reflection?.notesLabel || 'Reflection'}</div>
            <div className="mt-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t?.reflection?.notesPlaceholder || 'What went well? What was missed?'}
              />
            </div>
          </div>

          {unfinished.length > 0 ? (
            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/30">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {t?.reflection?.unfinishedLabel || 'Unfinished items'}
              </div>
              <div className="mt-2 space-y-1">
                {unfinished.map((s) => (
                  <div key={s._id} className="text-sm text-slate-700 dark:text-slate-300">
                    {s.title}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-3 flex-wrap justify-end">
            {unfinished.length > 0 ? (
              <Button variant="outline" onClick={handleCreateFollowup} disabled={creatingFollowup || saving}>
                {creatingFollowup
                  ? t?.common?.loading || 'Loading...'
                  : t?.reflection?.createFollowup || 'Create follow-up tasks for tomorrow'}
              </Button>
            ) : null}
            <Button onClick={handleSave} disabled={saving || creatingFollowup}>
              {saving ? t?.common?.loading || 'Loading...' : t?.reflection?.save || 'Save reflection'}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving || creatingFollowup}>
              {t?.reflection?.close || t?.common?.close || 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
