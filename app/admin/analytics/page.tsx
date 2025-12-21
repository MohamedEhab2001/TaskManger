'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { getAdminAnalytics } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminAnalyticsPage() {
  const { language, messages: t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const result = await getAdminAnalytics();
    setData(result);
    setLoading(false);
  }

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-300">{t.admin.loading}</div>;
  }

  const signupsData = data.signupsPerDay.map((d: any) => ({
    date: d._id,
    count: d.count,
  }));

  const planData = data.planDistribution.map((d: any) => ({
    name: d._id,
    value: d.count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.admin.analyticsOverview}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.signupsPerDay}</CardTitle>
            <p className="text-sm text-slate-500">{t.admin.last30Days}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.planDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.userRetention}</CardTitle>
          <p className="text-sm text-slate-500">{t.admin.usersWithTasks}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">New Users (Last 7 Days)</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.newUsersCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Active Users (5+ tasks)</span>
              <span className="text-2xl font-bold text-green-600">{data.retentionCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Retention Rate</span>
              <span className="text-2xl font-bold text-blue-600">{data.retentionRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
