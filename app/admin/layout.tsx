'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import { Users, DollarSign, BarChart3, Settings as SettingsIcon, LayoutDashboard, Target, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/lib/actions/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, messages: t } = useLanguage();

  const navigation = [
    { name: t.admin.overview, href: '/admin', icon: LayoutDashboard },
    { name: t.admin.users, href: '/admin/users', icon: Users },
    { name: t.admin.subscriptions, href: '/admin/subscriptions', icon: DollarSign },
    { name: t.admin.analytics, href: '/admin/analytics', icon: BarChart3 },
    { name: t.admin.settings, href: '/admin/settings', icon: SettingsIcon },
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-red-600" />
              <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'} text-xl font-bold text-slate-900 dark:text-white`}>
                {t.admin.title}
              </span>
            </div>
            <div className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} space-x-4`}>
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                {language === 'en' ? 'ع' : 'EN'}
              </button>
              <Link href="/app/dashboard">
                <Button variant="outline" size="sm">
                  App Dashboard
                </Button>
              </Link>
              <form action={logoutAction}>
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.common.logout}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className={`${language === 'ar' ? 'ml-3' : 'mr-3'} h-5 w-5`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
