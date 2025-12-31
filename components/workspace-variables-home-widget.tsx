'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { decryptWorkspaceVariableValue } from '@/lib/workspaceVariablesE2EE';

type PreviewVar = {
  _id: string;
  key: string;
  value: string;
  tag?: string | null;
  createdAt: string;
  updatedAt: string;
};

function maskValue(value: string, languageDir: 'ltr' | 'rtl') {
  const raw = String(value ?? '');
  if (!raw) return '';

  if (raw.length <= 8) {
    return '•'.repeat(Math.max(4, raw.length));
  }

  const prefix = raw.slice(0, 3);
  const masked = `${prefix}${'•'.repeat(6)}`;

  if (languageDir === 'rtl') {
    return `${'•'.repeat(6)}${prefix}`;
  }

  return masked;
}

export function WorkspaceVariablesHomeWidget({ className }: { className?: string }) {
  const { t, dir } = useI18n();

  const tv = (t as any).home?.workspaceVariables;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<PreviewVar[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/workspace-variables?limit=3&sort=updatedAt', {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const decrypted = await Promise.all(
        (data as PreviewVar[]).map(async (it) => {
          try {
            return {
              ...it,
              value: await decryptWorkspaceVariableValue(it.value),
            };
          } catch {
            return it;
          }
        })
      );

      setItems(decrypted);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasItems = items.length > 0;

  const maskedItems = useMemo(() => {
    return items.map((it) => ({
      ...it,
      masked: maskValue(it.value, dir),
    }));
  }, [items, dir]);

  async function copyValue(it: PreviewVar) {
    try {
      await navigator.clipboard.writeText(it.value);
      toast.success(tv.copied);
    } catch {
      toast.error(tv.copyFailed);
    }
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {tv.title}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {tv.subtitle}
          </div>
        </div>

        {hasItems ? (
          <Link href="/app/workspace-variables" className="shrink-0">
            <Button variant="outline" size="sm">
              {tv.viewAll}
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {tv.loadError}
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              {tv.retry}
            </Button>
          </div>
        ) : !hasItems ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-600 dark:text-slate-400">{tv.empty}</div>
            <Link href="/app/workspace-variables?new=1">
              <Button size="sm">{tv.addFirst}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {maskedItems.map((it) => (
              <div
                key={it._id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {it.key}
                  </div>
                  <div
                    className="text-xs text-slate-600 dark:text-slate-400 truncate"
                    title={tv.maskedHint}
                  >
                    {it.masked}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    type="button"
                    onClick={() => copyValue(it)}
                    aria-label={tv.copyAria}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <Link href={`/app/workspace-variables?search=${encodeURIComponent(it.key)}`}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {tv.open}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
