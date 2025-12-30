'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getTags } from '@/lib/actions/tags';
import {
  getEstimationInsights,
  getInsightsTimeStatsByDateRange,
  getReflectionInsights,
  getTagInsights,
} from '@/lib/actions/analytics';
import { getTagTimeCostAnalytics } from '@/lib/actions/advanced';
import { InsightsTimeFilter, type InsightsDateRange } from '@/components/insights-time-filter';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InsightsPage() {
  const { t, language } = useI18n();
  const tt = t as any;
  const [tags, setTags] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ [key: string]: any }>({});
  const [tagTimeData, setTagTimeData] = useState<any[]>([]);
  const [timeStats, setTimeStats] = useState<any>(null);
  const [estimationStats, setEstimationStats] = useState<any>(null);
  const [reflectionStats, setReflectionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<InsightsDateRange>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  });

  useEffect(() => {
    loadData(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  async function loadData(activeRange: InsightsDateRange) {
    setLoading(true);
    try {
      const [tagsData, timeData, timeRes, est, refl] = await Promise.all([
        getTags(),
        getTagTimeCostAnalytics(activeRange),
        getInsightsTimeStatsByDateRange(activeRange),
        getEstimationInsights(activeRange),
        getReflectionInsights(activeRange),
      ]);

      setTags(tagsData);
      setTagTimeData(timeData);
      setTimeStats(timeRes);
      setEstimationStats(est);
      setReflectionStats(refl);

      const insightsData: { [key: string]: any } = {};
      for (const tag of tagsData) {
        const tagInsight = await getTagInsights(tag._id, activeRange);
        insightsData[tag._id] = tagInsight;
      }
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.insights.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pieData = tagTimeData.slice(0, 8).map((d) => ({
    name: d.tagName[language],
    value: d.totalMinutes,
    color: d.groupColor,
  }));

  const timePerDay = (timeStats?.perDay || []).map((d: any) => ({
    date: d.date,
    hours: Math.round(((d.totalSeconds || 0) / 3600) * 10) / 10,
    totalSeconds: d.totalSeconds || 0,
  }));

  const timeByGroup = (timeStats?.byTagGroup || []).map((g: any) => ({
    name: g.groupName?.[language] ?? g.groupName?.en ?? g.groupName?.ar ?? 'Group',
    hours: Math.round(((g.totalSeconds || 0) / 3600) * 10) / 10,
    totalSeconds: g.totalSeconds || 0,
    color: g.groupColor,
    completionRate: g.completionRate,
  }));

  const accuracySeries = (estimationStats?.accuracyOverTime || []).map((d: any) => ({
    date: d.date,
    accuracy: d.avgAccuracy || 0,
    total: d.total || 0,
  }));

  const distributionBars = [
    {
      name: t.estimation.underestimated,
      count: estimationStats?.distribution30?.underestimated || 0,
      pct: estimationStats?.distribution30?.underestimatedPct || 0,
      color: '#ef4444',
    },
    {
      name: t.estimation.overestimated,
      count: estimationStats?.distribution30?.overestimated || 0,
      pct: estimationStats?.distribution30?.overestimatedPct || 0,
      color: '#f59e0b',
    },
    {
      name: t.estimation.accurateEstimate,
      count: estimationStats?.distribution30?.accurate || 0,
      pct: estimationStats?.distribution30?.accuratePct || 0,
      color: '#10b981',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.insights.title}</h1>
      </div>

      <InsightsTimeFilter value={range} onChange={setRange} />

      <div className="text-sm text-slate-600 dark:text-slate-400">
        {(tt.insights?.showingRange || 'Showing insights from {from} → {to}')
          .replace('{from}', new Date(range.from).toLocaleDateString())
          .replace('{to}', new Date(range.to).toLocaleDateString())}
      </div>

      {reflectionStats && (
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{tt.insights.reflectionTitle}</h2>
            <Badge variant="secondary">{String(reflectionStats.rangeDays || 7)}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{tt.insights.avgReflectionCompletionRate7d}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(reflectionStats.kpis?.avgCompletionRate || 0)}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{tt.insights.completedWithReflection}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {reflectionStats.kpis?.withReflection || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{tt.insights.completedWithoutReflection}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {reflectionStats.kpis?.withoutReflection || 0}
              </div>
            </Card>
          </div>
        </Card>
      )}

      {timeStats && (
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t.timeTracking.timeTracked}
            </h2>
            <Badge variant="secondary">{String(timeStats.rangeDays)}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.timeTracking.today}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatDuration(timeStats.kpis?.todaySeconds || 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.timeTracking.thisWeek}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatDuration(timeStats.kpis?.rangeSeconds || 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.timeTracking.avgPerCompleted}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatDuration(timeStats.kpis?.avgSecondsPerCompletedTask || 0)}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.timeTracking.trackedPerDay}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timePerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'hours') return `${value}h`;
                      return value;
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.timeTracking.timeByTagGroups}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeByGroup}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip formatter={(v: any) => `${v}h`} />
                  <Bar dataKey="hours">
                    {timeByGroup.map((g: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={g.color || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {Array.isArray(timeStats?.topTasks) && timeStats.topTasks.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.timeTracking.topTasksByTime}</h3>
              <div className="space-y-2">
                {timeStats.topTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.taskId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{task.status}</div>
                    </div>
                    <Badge variant="outline">{formatDuration(task.totalSeconds || 0)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {estimationStats && (
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t.estimation.estimationInsights}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.estimation.avgAccuracy7d}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(estimationStats.kpis?.avgAccuracy7 || 0)}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">{t.estimation.avgAccuracy30d}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(estimationStats.kpis?.avgAccuracy30 || 0)}%
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.estimation.accuracyOverTime}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={accuracySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => `${Math.round(v)}%`} />
                  <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.estimation.distribution}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={distributionBars}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip formatter={(v: any, name: any, props: any) => `${v} (${props?.payload?.pct || 0}%)`} />
                  <Bar dataKey="count">
                    {distributionBars.map((g: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={g.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </Card>
      )}

      {tagTimeData.length > 0 && (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              {t.tagTime.whereTimeGoes}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}m`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t.tagTime.title}
                </h3>

                <Accordion type="single" collapsible className="mb-3">
                  <AccordionItem value="efficiency-rules">
                    <AccordionTrigger className="text-sm text-slate-700 dark:text-slate-200">
                      {t.tagTime?.efficiencyRulesTitle || 'How efficiency is calculated'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {t.tagTime?.efficientRuleTitle || 'Efficient'}
                          </div>
                          <div>
                            {t.tagTime?.efficientRuleBody || 'Shown when a tag has at least 3 tasks and completion rate is 70% or more.'}
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {t.tagTime?.inefficientRuleTitle || 'Inefficient'}
                          </div>
                          <div>
                            {t.tagTime?.inefficientRuleBody || 'Shown when a tag has at least 3 tasks, completion rate is below 40%, and it consumes more than 20% of your tracked time.'}
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {t.tagTime?.neutralRuleTitle || 'No badge'}
                          </div>
                          <div>
                            {t.tagTime?.neutralRuleBody || 'If the tag has fewer than 3 tasks, or it doesn’t match the rules above, it will show no efficiency badge.'}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {tagTimeData.slice(0, 5).map((data) => (
                  <div
                    key={data.tagId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.groupColor }}
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {data.tagName[language]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {data.totalMinutes}m ({data.percentOfWeek}%)
                      </span>
                      {data.efficiency === 'efficient' && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {t.tagTime.efficient}
                        </Badge>
                      )}
                      {data.efficiency === 'inefficient' && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {t.tagTime.inefficient}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {tagTimeData.some((d) => d.efficiency === 'inefficient') && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    {tagTimeData
                      .filter((d) => d.efficiency === 'inefficient')
                      .map((d) => (
                        <p key={d.tagId} className="text-sm text-yellow-800 dark:text-yellow-300">
                          {t.tagTime.warningHigh
                            .replace('{tag}', d.tagName[language])
                            .replace('{percent}', d.percentOfWeek.toString())
                            .replace('{completion}', d.completionRate.toString())}
                        </p>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              {t.insights.perTagInsights}
            </h2>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tags.map((tag) => {
          const insight = insights[tag._id];
          if (!insight) return null;

          return (
            <Card key={tag._id} className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {tag.name[language]}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t.insights.totalTasks}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {insight.totalTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t.insights.completionRate}
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {insight.completionRate}%
                  </span>
                </div>
                {insight.avgCompletionTime > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t.insights.avgCompletionTime}
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {insight.avgCompletionTime} {t.insights.minutes}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {tags.length === 0 && (
          <Card className="p-12 text-center col-span-full">
            <p className="text-slate-600 dark:text-slate-400">{t.insights.noData}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
