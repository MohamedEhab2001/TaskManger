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
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [dailyCapacity, setDailyCapacity] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('dailyCapacity') || '120' : '120'
  );

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
      </Card>
    </div>
  );
}
