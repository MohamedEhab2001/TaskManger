'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Copy, Pencil, Trash2, Check, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { decryptWorkspaceVariableValue, encryptWorkspaceVariableValue } from '@/lib/workspaceVariablesE2EE';

type WorkspaceVariableDTO = {
  _id: string;
  key: string;
  value: string;
  tag?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function WorkspaceVariablesPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<WorkspaceVariableDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WorkspaceVariableDTO | null>(null);

  const [form, setForm] = useState({
    key: '',
    value: '',
    tag: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const initialSearch = (searchParams?.get('search') || '').trim();
    if (initialSearch) setSearch(initialSearch);

    const shouldOpenNew = searchParams?.get('new') === '1';
    if (shouldOpenNew) {
      // Delay one tick to avoid state ordering issues on initial mount
      window.setTimeout(() => {
        openCreate();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const description =
    'Store quick references like links, credentials, or internal notes you need during work.';

  const emptyText = 'No variables yet. Add your first workspace reference.';

  const loadData = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('search', q.trim());

      const res = await fetch(`/api/workspace-variables?${qs.toString()}`, {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? (json.data as WorkspaceVariableDTO[]) : [];

      const decrypted = await Promise.all(
        data.map(async (row) => {
          try {
            return {
              ...row,
              value: await decryptWorkspaceVariableValue(row.value),
            };
          } catch {
            return row;
          }
        })
      );

      setRows(decrypted);
    } catch {
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadData(search);
    }, 150);
    return () => window.clearTimeout(id);
  }, [loadData, search]);

  const filteredCountLabel = useMemo(() => {
    if (!search.trim()) return null;
    return `${rows.length} match${rows.length === 1 ? '' : 'es'}`;
  }, [rows.length, search]);

  function openCreate() {
    setEditing(null);
    setForm({ key: '', value: '', tag: '' });
    setDialogOpen(true);
  }

  function openEdit(row: WorkspaceVariableDTO) {
    setEditing(row);
    setForm({
      key: row.key,
      value: row.value,
      tag: row.tag || '',
    });
    setDialogOpen(true);
  }

  async function submit() {
    const key = form.key.trim();
    const value = form.value;
    const tag = form.tag.trim();

    if (!key || !value) {
      toast.error('Key and value are required');
      return;
    }

    setSaving(true);
    try {
      const encryptedValue = await encryptWorkspaceVariableValue(value);

      if (editing) {
        const res = await fetch(`/api/workspace-variables/${encodeURIComponent(editing._id)}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              key,
              value: encryptedValue,
              tag: tag ? tag : null,
            }),
          }
        );

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to save variable');
        }
        toast.success('Variable updated');
      } else {
        const res = await fetch('/api/workspace-variables', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            key,
            value: encryptedValue,
            tag: tag ? tag : null,
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to save variable');
        }
        toast.success('Variable added');
      }
      setDialogOpen(false);
      await loadData(search);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save variable');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: WorkspaceVariableDTO) {
    const ok = window.confirm(`Delete variable "${row.key}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/workspace-variables/${encodeURIComponent(row._id)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to delete variable');
      }
      toast.success('Variable deleted');
      await loadData(search);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete variable');
    }
  }

  async function copyValue(row: WorkspaceVariableDTO) {
    try {
      await navigator.clipboard.writeText(row.value);
      setCopiedId(row._id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Workspace Variables</h1>
          </div>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">{description}</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add variable
        </Button>
      </div>

      <Card className="p-4">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          All variables here are end-to-end encrypted (E2EE).
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key..."
            className="max-w-sm"
          />
          {filteredCountLabel ? <div className="text-sm text-slate-500">{filteredCountLabel}</div> : null}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">{t.common.loading}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm text-slate-600 dark:text-slate-300">{emptyText}</div>
            <div className="mt-4">
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add your first variable
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="font-mono text-sm text-slate-900 dark:text-white">{row.key}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="max-w-[520px] truncate text-sm text-slate-700 dark:text-slate-300"
                        title={row.value}
                      >
                        {row.value}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="h-8 w-8 p-0"
                        onClick={() => copyValue(row)}
                      >
                        {copiedId === row._id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.tag ? (
                      <span className="text-sm text-slate-700 dark:text-slate-300">{row.tag}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => remove(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit variable' : 'Add variable'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wvKey">Key</Label>
              <Input
                id="wvKey"
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                placeholder="client_repo"
                disabled={saving}
              />
              <div className="text-xs text-slate-500">Short identifier, e.g. client_repo or api_url</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wvValue">Value</Label>
              <Input
                id="wvValue"
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                placeholder="https://..."
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wvTag">Tag (optional)</Label>
              <Input
                id="wvTag"
                value={form.tag}
                onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
                placeholder="client"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? t.common.loading : editing ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
