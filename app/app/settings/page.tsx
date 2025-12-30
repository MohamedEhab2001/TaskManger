'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload } from 'lucide-react';
import { getTasks } from '@/lib/actions/tasks';
import { runTimeTrackingSanityTest } from '@/lib/actions/tasks';
import { changePasswordAction } from '@/lib/actions/settings';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [dailyCapacity, setDailyCapacity] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('dailyCapacity') || '120' : '120'
  );

  const [pwLoading, setPwLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function runSanityTest() {
    try {
      const result = await runTimeTrackingSanityTest();
      toast.success(
        `Time sanity OK: ${result.totalSeconds}s, sessions=${result.sessionsCount}, status=${result.status}`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Sanity test failed');
    }
  }

  async function submitChangePassword() {
    if (newPassword !== confirmNewPassword) {
      toast.error(t.settings.passwordMismatch);
      return;
    }

    setPwLoading(true);
    try {
      const res = await changePasswordAction({ currentPassword, newPassword });
      if ((res as any)?.success) {
        toast.success(t.settings.passwordChanged);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        window.location.href = '/login';
        return;
      }

      const code = (res as any)?.error;
      if (code === 'INVALID_CURRENT_PASSWORD') {
        toast.error(t.settings.passwordChangeFailed);
      } else {
        toast.error(t.settings.passwordChangeFailed);
      }
    } catch {
      toast.error(t.settings.passwordChangeFailed);
    } finally {
      setPwLoading(false);
    }
  }

  function saveDailyCapacity() {
    localStorage.setItem('dailyCapacity', dailyCapacity);
    toast.success(t.settings.settingsSaved);
  }

  async function exportJSON() {
    try {
      const tasks = await getTasks();
      const dataStr = JSON.stringify(tasks, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.settings.exportSuccess);
    } catch (error) {
      toast.error('Failed to export');
    }
  }

  async function exportCSV() {
    try {
      const tasks = await getTasks();
      const headers = ['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Estimated Minutes'];
      const rows = tasks.map((task: any) => [
        task.title,
        task.description || '',
        task.status,
        task.priority,
        task.dueDate || '',
        task.estimatedMinutes || '',
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.settings.exportSuccess);
    } catch (error) {
      toast.error('Failed to export');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.settings.title}</h1>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {t.settings.language}
          </h2>
          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t.settings.english}</SelectItem>
              <SelectItem value="ar">{t.settings.arabic}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {t.settings.changePasswordTitle}
          </h2>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.settings.currentPassword}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t.settings.newPassword}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">{t.settings.confirmNewPassword}</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>

            <Button type="button" onClick={submitChangePassword} disabled={pwLoading}>
              {pwLoading ? t.common.loading : t.common.save}
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {t.settings.dailyWorkMinutes}
          </h2>
          <div className="flex gap-4">
            <Input
              type="number"
              value={dailyCapacity}
              onChange={(e) => setDailyCapacity(e.target.value)}
              placeholder="120"
              className="flex-1"
            />
            <Button onClick={saveDailyCapacity}>{t.common.save}</Button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            This affects the Smart Weekly Planner capacity calculations.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {t.settings.export}
          </h2>
          <div className="flex gap-4">
            <Button onClick={exportJSON} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t.settings.exportJSON}
            </Button>
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t.settings.exportCSV}
            </Button>
          </div>
        </div>

        {process.env.NODE_ENV !== 'production' ? (
          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={runSanityTest}
              className="h-6 px-2 text-[10px] opacity-0 hover:opacity-100 focus:opacity-100"
            >
              Run time sanity test
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
