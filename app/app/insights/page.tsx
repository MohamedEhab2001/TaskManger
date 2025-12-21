'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTags } from '@/lib/actions/tags';
import { getTagInsights } from '@/lib/actions/analytics';
import { getTagTimeCostAnalytics } from '@/lib/actions/advanced';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function InsightsPage() {
  const { t, language } = useI18n();
  const [tags, setTags] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ [key: string]: any }>({});
  const [tagTimeData, setTagTimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tagsData, timeData] = await Promise.all([
        getTags(),
        getTagTimeCostAnalytics(),
      ]);

      setTags(tagsData);
      setTagTimeData(timeData);

      const insightsData: { [key: string]: any } = {};
      for (const tag of tagsData) {
        const tagInsight = await getTagInsights(tag._id);
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.insights.title}</h1>

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
