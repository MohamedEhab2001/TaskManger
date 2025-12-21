'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { getSubscriptionStats, exportSubscribersCSV } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSubscriptionsPage() {
  const { language, messages: t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const result = await getSubscriptionStats();
    setData(result);
    setLoading(false);
  }

  async function handleExport() {
    const csv = await exportSubscribersCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(t.admin.csvExported);
  }

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-300">{t.admin.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.admin.subscriptionManagement}</h1>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t.admin.exportSubscribers}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t.admin.mrr}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${data.mrr}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.admin.estimate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t.admin.activeSubscriptions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{data.activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.subscriptions}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.subscriptions.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t.admin.noSubscriptions}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.name}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.plan}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.status}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.startDate}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.endDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {data.subscriptions.map((sub: any) => (
                    <tr key={sub._id}>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{sub.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{sub.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant="default">{sub.plan}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            sub.subscriptionStatus === 'active'
                              ? 'default'
                              : sub.subscriptionStatus === 'past_due'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {sub.subscriptionStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {sub.subscriptionStartedAt
                          ? new Date(sub.subscriptionStartedAt).toLocaleDateString(language)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {sub.subscriptionEndsAt
                          ? new Date(sub.subscriptionEndsAt).toLocaleDateString(language)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
