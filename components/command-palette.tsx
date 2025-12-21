'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  ListTodo,
  Tags,
  BarChart3,
  Settings,
  Plus,
  Calendar,
  Globe,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  keywords: string[];
}

export function CommandPalette() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands: Command[] = [
    {
      id: 'create-task',
      label: t.commandPalette.createTask,
      icon: Plus,
      action: () => {
        setOpen(false);
        router.push('/app/tasks');
        setTimeout(() => {
          const btn = document.querySelector('[data-new-task-btn]') as HTMLButtonElement;
          btn?.click();
        }, 100);
      },
      keywords: ['create', 'new', 'task', 'add'],
    },
    {
      id: 'home',
      label: t.nav.home,
      icon: LayoutDashboard,
      action: () => {
        setOpen(false);
        router.push('/app');
      },
      keywords: ['home', 'overview', 'today', 'tomorrow'],
    },
    {
      id: 'dashboard',
      label: t.commandPalette.goToDashboard,
      icon: LayoutDashboard,
      action: () => {
        setOpen(false);
        router.push('/app/dashboard');
      },
      keywords: ['dashboard', 'analytics', 'charts'],
    },
    {
      id: 'tasks',
      label: t.commandPalette.goToTasks,
      icon: ListTodo,
      action: () => {
        setOpen(false);
        router.push('/app/tasks');
      },
      keywords: ['tasks', 'todo', 'list'],
    },
    {
      id: 'tags',
      label: t.commandPalette.goToTags,
      icon: Tags,
      action: () => {
        setOpen(false);
        router.push('/app/tags');
      },
      keywords: ['tags', 'labels', 'categories'],
    },
    {
      id: 'insights',
      label: t.commandPalette.goToInsights,
      icon: BarChart3,
      action: () => {
        setOpen(false);
        router.push('/app/insights');
      },
      keywords: ['insights', 'analytics', 'reports', 'stats'],
    },
    {
      id: 'settings',
      label: t.commandPalette.goToSettings,
      icon: Settings,
      action: () => {
        setOpen(false);
        router.push('/app/settings');
      },
      keywords: ['settings', 'preferences', 'config'],
    },
    {
      id: 'planner',
      label: t.commandPalette.openPlanner,
      icon: Calendar,
      action: () => {
        setOpen(false);
        router.push('/app/tasks?action=planner');
      },
      keywords: ['planner', 'schedule', 'calendar', 'plan'],
    },
    {
      id: 'language',
      label: t.commandPalette.switchLanguage,
      icon: Globe,
      action: () => {
        setLanguage(language === 'en' ? 'ar' : 'en');
        setOpen(false);
      },
      keywords: ['language', 'arabic', 'english', 'translate'],
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-4">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <Input
            placeholder={t.commandPalette.placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-600 dark:text-slate-400">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t.commandPalette.noResults}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'focus:bg-slate-100 dark:focus:bg-slate-800 focus:outline-none'
                    )}
                  >
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {cmd.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Navigate with ↑ ↓ • Select with ↵</span>
          <span>Close with Esc</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
