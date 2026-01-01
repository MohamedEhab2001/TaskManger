'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ListTodo,
  Tags,
  BarChart3,
  KeyRound,
  Settings,
  LogOut,
  Moon,
  Sun,
  Globe,
  Menu,
  Target,
  X,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CommandPalette } from '@/components/command-palette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);

  const hideLanguageToggle = pathname === '/app' || pathname === '/app/dashboard';

  const navigation = [
    {
      name: t.nav.home,
      href: '/app',
      icon: LayoutDashboard,
    },
    {
      name: t.nav.dashboard,
      href: '/app/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: t.nav.tasks,
      href: '/app/tasks',
      icon: ListTodo,
    },
    {
      name: t.nav.tags,
      href: '/app/tags',
      icon: Tags,
    },
    {
      name: t.nav.insights,
      href: '/app/insights',
      icon: BarChart3,
    },
    {
      name: t.nav.workspaceVariables,
      href: '/app/workspace-variables',
      icon: KeyRound,
    },
    {
      name: t.nav.settings,
      href: '/app/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0",
        !sidebarOpen && "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Link href="/app" className="flex items-center gap-3">
                <div className="relative h-8 w-8">
                  {logoOk ? (
                    <Image
                      src="/brand/logo.png"
                      alt="Taskello"
                      fill
                      className="object-contain"
                      priority
                      onError={() => setLogoOk(false)}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                      <Target className="w-4 h-4 text-slate-900 dark:text-white" />
                    </div>
                  )}
                </div>
                <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Taskello</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t.common.logout}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/app" className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                {logoOk ? (
                  <Image
                    src="/brand/logo.png"
                    alt="Taskello"
                    fill
                    className="object-contain"
                    priority
                    onError={() => setLogoOk(false)}
                  />
                ) : (
                  <div className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                    <Target className="w-4 h-4 text-slate-900 dark:text-white" />
                  </div>
                )}
              </div>
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Taskello</span>
            </Link>
            <div className="w-10" />
          </div>
        </div>

        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CommandPalette />
    </div>
  );
}
