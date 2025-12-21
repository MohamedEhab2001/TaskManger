'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { getMaintenanceMode, toggleMaintenanceMode } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const { messages: t } = useLanguage();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const enabled = await getMaintenanceMode();
    setMaintenanceMode(enabled);
    setLoading(false);
  }

  async function handleToggleMaintenance() {
    const result = await toggleMaintenanceMode();
    setMaintenanceMode(result.enabled);
    toast.success(result.enabled ? t.admin.maintenanceEnabled : t.admin.maintenanceDisabled);
  }

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-300">{t.admin.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.admin.adminSettings}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.maintenanceMode}</CardTitle>
          <CardDescription>{t.admin.maintenanceModeDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              onCheckedChange={handleToggleMaintenance}
            />
            <Label htmlFor="maintenance">
              {maintenanceMode ? t.admin.disable : t.admin.enable}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.pricingConfig}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>{t.admin.freePlanLabel}</Label>
              <p className="text-slate-600 dark:text-slate-400">{t.landing.planFree}</p>
            </div>
            <div>
              <Label>{t.admin.proPlanLabel}</Label>
              <p className="text-slate-600 dark:text-slate-400">{t.landing.planPro}</p>
            </div>
            <div>
              <Label>{t.admin.proPlanPrice}</Label>
              <p className="text-slate-600 dark:text-slate-400">$9/month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
