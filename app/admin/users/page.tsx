'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { getAdminUsers, updateUserRole, updateUserPlan, toggleUserDisabled } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const { language, messages: t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, [planFilter, statusFilter, search]);

  async function loadUsers() {
    setLoading(true);
    const result = await getAdminUsers({
      plan: planFilter,
      status: statusFilter,
      search,
    });
    setUsers(result);
    setLoading(false);
  }

  async function handleChangeRole(userId: string, role: 'user' | 'admin') {
    await updateUserRole(userId, role);
    toast.success(t.admin.userUpdated);
    loadUsers();
  }

  async function handleChangePlan(userId: string, plan: 'free' | 'pro') {
    await updateUserPlan(userId, plan);
    toast.success(t.admin.userUpdated);
    loadUsers();
  }

  async function handleToggleDisabled(userId: string) {
    await toggleUserDisabled(userId);
    toast.success(t.admin.userUpdated);
    loadUsers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.admin.userManagement}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.searchUsers}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder={t.admin.searchUsers}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.allPlans}</SelectItem>
                <SelectItem value="free">{t.landing.planFree}</SelectItem>
                <SelectItem value="pro">{t.landing.planPro}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.allStatuses}</SelectItem>
                <SelectItem value="active">{t.admin.active}</SelectItem>
                <SelectItem value="disabled">{t.admin.disabled}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-600">{t.admin.loading}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t.admin.noUsers}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.name}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.plan}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.status}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.createdAt}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.admin.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.isDisabled ? 'destructive' : 'default'}>
                          {user.isDisabled ? t.admin.disabled : t.admin.active}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString(language)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangePlan(user._id, user.plan === 'free' ? 'pro' : 'free')}
                          >
                            {user.plan === 'free' ? 'Pro' : 'Free'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleDisabled(user._id)}
                          >
                            {user.isDisabled ? t.admin.enableUser : t.admin.disableUser}
                          </Button>
                        </div>
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
