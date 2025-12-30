'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export type InsightsDateRange = {
  from: string;
  to: string;
};

export type InsightsRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

function toIsoStartOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toIsoEndOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function formatYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYYYYMMDD(v: string) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00.000`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function InsightsTimeFilter({
  value,
  onChange,
}: {
  value: InsightsDateRange;
  onChange: (range: InsightsDateRange) => void;
}) {
  const { t } = useI18n() as any;

  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');

  const defaultRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: toIsoEndOfDay(now) };
  }, []);

  useEffect(() => {
    // Initialize inputs from current value (typically last 7 days)
    const fromDate = new Date(value.from);
    const toDate = new Date(value.to);
    setFromStr(formatYYYYMMDD(fromDate));
    setToStr(formatYYYYMMDD(toDate));
  }, [value.from, value.to]);

  const derivedPreset = useMemo<InsightsRangePreset>(() => {
    const fromD = new Date(value.from);
    const toD = new Date(value.to);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) return 'last7';

    const toStart = new Date(toD);
    toStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(toD);
    toEnd.setHours(23, 59, 59, 999);

    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yStart = new Date(yesterday);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);

    const eq = (a: Date, b: Date) => a.getTime() === b.getTime();

    if (eq(fromD, todayStart) && eq(toD, todayEnd)) return 'today';
    if (eq(fromD, yStart) && eq(toD, yEnd)) return 'yesterday';

    const last7 = defaultRange;
    if (eq(fromD, new Date(last7.from)) && eq(toD, new Date(last7.to))) return 'last7';

    const last30Start = new Date(toStart);
    last30Start.setDate(toStart.getDate() - 29);
    last30Start.setHours(0, 0, 0, 0);
    if (eq(fromD, last30Start) && eq(toD, toEnd)) return 'last30';

    const monthStart = new Date(toStart.getFullYear(), toStart.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    if (eq(fromD, monthStart) && eq(toD, toEnd)) return 'thisMonth';

    return 'custom';
  }, [defaultRange, value.from, value.to]);

  function computePresetRange(p: InsightsRangePreset): InsightsDateRange {
    const now = new Date();

    if (p === 'today') {
      return { from: toIsoStartOfDay(now), to: toIsoEndOfDay(now) };
    }

    if (p === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { from: toIsoStartOfDay(y), to: toIsoEndOfDay(y) };
    }

    if (p === 'last30') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: toIsoEndOfDay(now) };
    }

    if (p === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: toIsoEndOfDay(now) };
    }

    if (p === 'custom') {
      return value;
    }

    return defaultRange;
  }

  function handlePresetChange(p: string) {
    const nextPreset = p as InsightsRangePreset;
    if (nextPreset !== 'custom') {
      const range = computePresetRange(nextPreset);
      setFromStr(formatYYYYMMDD(new Date(range.from)));
      setToStr(formatYYYYMMDD(new Date(range.to)));
      onChange(range);
    }
  }

  function handleCustomChange(nextFrom: string, nextTo: string) {
    const fromD = parseYYYYMMDD(nextFrom);
    const toD = parseYYYYMMDD(nextTo);
    if (!fromD || !toD) return;

    if (fromD.getTime() > toD.getTime()) return;

    onChange({ from: toIsoStartOfDay(fromD), to: toIsoEndOfDay(toD) });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px]">
            <Label>{t?.insights?.timeRangeLabel || 'Time range'}</Label>
            <Select value={derivedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t?.insights?.rangeToday || 'Today'}</SelectItem>
                <SelectItem value="yesterday">{t?.insights?.rangeYesterday || 'Yesterday'}</SelectItem>
                <SelectItem value="last7">{t?.insights?.rangeLast7 || 'Last 7 days'}</SelectItem>
                <SelectItem value="last30">{t?.insights?.rangeLast30 || 'Last 30 days'}</SelectItem>
                <SelectItem value="thisMonth">{t?.insights?.rangeThisMonth || 'This month'}</SelectItem>
                <SelectItem value="custom">{t?.insights?.rangeCustom || 'Custom range'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <Label>{t?.insights?.rangeFrom || 'From'}</Label>
            <Input
              className="mt-2"
              type="date"
              value={fromStr}
              onChange={(e) => {
                const next = e.target.value;
                setFromStr(next);
                handleCustomChange(next, toStr);
              }}
            />
          </div>

          <div className="min-w-[180px]">
            <Label>{t?.insights?.rangeTo || 'To'}</Label>
            <Input
              className="mt-2"
              type="date"
              value={toStr}
              onChange={(e) => {
                const next = e.target.value;
                setToStr(next);
                handleCustomChange(fromStr, next);
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
