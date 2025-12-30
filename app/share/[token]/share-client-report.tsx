'use client';

import { useEffect, useMemo, useState } from 'react';
import { messages, Language } from '@/lib/i18n/messages';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { PublicClientShareData } from '@/lib/actions/clientShare';
import { ThumbsUp, Clock, Target, ChevronDown, ChevronRight } from 'lucide-react';

function formatMinutes(mins: number, t: any) {
  const safe = Math.max(0, Math.round(mins || 0));
  if (safe < 60) return `${safe} ${t.share.minutesShort}`;

  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (m === 0) return `${h} ${t.share.hoursShort}`;
  return `${h} ${t.share.hoursShort} ${m} ${t.share.minutesShort}`;
}

function formatDateTime(iso: string, language: Language) {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function statusLabel(status: string, t: any) {
  if (status === 'todo') return t.share.statusTodo;
  if (status === 'doing') return t.share.statusDoing;
  return t.share.statusDone;
}

function estimationLabel(est: string | null, t: any) {
  if (!est) return '—';
  if (est === 'accurate') return t.share.estimationOnTime;
  if (est === 'underestimated') return t.share.estimationSlower;
  return t.share.estimationFaster;
}

export default function ShareClientReport(props:
  | { mode: 'expired'; initialLanguage: Language; title: string }
  | { mode: 'ok'; initialLanguage: Language; title: string; tagName: { en: string; ar: string }; data: PublicClientShareData }
) {
  const [language, setLanguage] = useState<Language>(props.initialLanguage || 'en');
  const [taskQuery, setTaskQuery] = useState('');
  const [taskStatus, setTaskStatus] = useState<'all' | 'todo' | 'doing' | 'done'>('all');
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = useMemo(() => messages[language], [language]);
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const tasks = useMemo(() => {
    if (props.mode !== 'ok') return [];
    return props.data.tasks || [];
  }, [props]);

  const filteredTasks = useMemo(() => {
    const q = (taskQuery || '').trim().toLowerCase();
    return (tasks || []).filter((task: any) => {
      if (taskStatus !== 'all' && task.status !== taskStatus) return false;
      if (!q) return true;
      return (task.title || '').toLowerCase().includes(q);
    });
  }, [tasks, taskQuery, taskStatus]);

  useEffect(() => {
    setExpandedTaskIndex(null);
  }, [taskQuery, taskStatus, language]);

  if (props.mode === 'expired') {
    return (
      <div dir={dir} className={`min-h-screen bg-white text-slate-900 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{t.share.expiredTitle}</h1>
              <p className="text-slate-600 mt-1">{t.share.expiredBody}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setLanguage('en')}>EN</Button>
              <Button variant="outline" onClick={() => setLanguage('ar')}>ع</Button>
            </div>
          </div>
          <Card className="p-6">
            <div className="text-sm text-slate-600">{t.share.projectTitle}</div>
            <div className="text-lg font-medium mt-1">{props.title}</div>
          </Card>
        </div>
      </div>
    );
  }

  const projectStatus = props.data.progress.progressPct >= 100 ? t.share.statusCompleted : t.share.statusActive;
  const projectStatusVariant = props.data.progress.progressPct >= 100 ? 'secondary' : 'outline';

  return (
    <div dir={dir} className={`min-h-screen bg-white text-slate-900 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight whitespace-normal break-words">{props.title}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant={projectStatusVariant as any}>{projectStatus}</Badge>
              <span className="text-sm text-slate-600">
                {t.share.lastUpdated}: {formatDateTime(props.data.lastUpdatedAt, language)}
              </span>
              <span className="text-sm text-slate-500">•</span>
              <span className="text-sm text-slate-600">
                {props.tagName[language]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLanguage('en')}>EN</Button>
            <Button variant="outline" onClick={() => setLanguage('ar')}>ع</Button>
          </div>
        </header>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-medium">{t.share.progressSummary}</h2>
              <p className="text-sm text-slate-600 mt-1">{t.share.publicPageTitle}</p>
            </div>
            <div className="text-sm text-slate-600">
              {t.share.expiresAt}:{' '}
              {props.data.expiresAt ? formatDateTime(props.data.expiresAt, language) : t.share.never}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <div className="text-xs text-slate-500">{t.share.totalTasks}</div>
              <div className="text-xl font-semibold">{props.data.progress.totalTasks}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.share.completedTasks}</div>
              <div className="text-xl font-semibold">{props.data.progress.completedTasks}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.share.progress}</div>
              <div className="text-xl font-semibold">{props.data.progress.progressPct}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.share.totalTimeSpent}</div>
              <div className="text-xl font-semibold">{formatMinutes(props.data.progress.totalTimeMinutes, t)}</div>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={props.data.progress.progressPct} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-medium">{(t as any).share.workMomentum}</h2>
              <p className="text-sm text-slate-600 mt-1">{(t as any).share.momentumNote}</p>
            </div>
            <div className="text-3xl font-semibold">{props.data.insights.avgAccuracyPct}%</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="p-3 rounded-md border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                {t.share.estimationSlower}
              </div>
              <div className="text-lg font-semibold">{props.data.insights.distribution.underestimated}</div>
            </div>
            <div className="p-3 rounded-md border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                {t.share.estimationFaster}
              </div>
              <div className="text-lg font-semibold">{props.data.insights.distribution.overestimated}</div>
            </div>
            <div className="p-3 rounded-md border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Target className="w-4 h-4" />
                {t.share.estimationOnTime}
              </div>
              <div className="text-lg font-semibold">{props.data.insights.distribution.accurate}</div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-medium">{t.share.taskList}</h2>
              <div className="text-sm text-slate-600">{t.share.filterTasks}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
                placeholder={t.share.searchTasks}
                className="h-9 w-full sm:w-72 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as any)}
                className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="all">{t.share.filterAll}</option>
                <option value="todo">{t.share.statusTodo}</option>
                <option value="doing">{t.share.statusDoing}</option>
                <option value="done">{t.share.statusDone}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left font-medium text-slate-600 px-6 py-3">{t.tasks.title}</th>
                  <th className="text-left font-medium text-slate-600 px-6 py-3">{t.tasks.status}</th>
                  <th className="text-left font-medium text-slate-600 px-6 py-3">{t.share.timeSpent}</th>
                  <th className="text-left font-medium text-slate-600 px-6 py-3">{t.share.estimation}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <>
                    {(() => {
                      const subtasks = Array.isArray((task as any).subtasks) ? (task as any).subtasks : [];
                      const notes = String((task as any).completionReflection?.notes || '').trim();
                      const hasDetails = subtasks.length > 0 || notes.length > 0;
                      const isExpanded = expandedTaskIndex === idx;

                      return (
                        <>
                          <tr
                            key={idx}
                            className={
                              hasDetails
                                ? 'border-t border-slate-100 cursor-pointer hover:bg-slate-50'
                                : 'border-t border-slate-100'
                            }
                            onClick={() => {
                              if (!hasDetails) return;
                              setExpandedTaskIndex((prev) => (prev === idx ? null : idx));
                            }}
                          >
                            <td className="px-6 py-3 text-slate-900 whitespace-normal break-words">
                              <div className="flex items-start gap-2">
                                {hasDetails ? (
                                  <span className="mt-0.5 text-slate-500">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </span>
                                ) : null}
                                <span className="min-w-0">{task.title}</span>
                              </div>
                            </td>
                      <td className="px-6 py-3 text-slate-700">{statusLabel(task.status, t)}</td>
                      <td className="px-6 py-3 text-slate-700">{formatMinutes(task.timeSpentMinutes, t)}</td>
                      <td className="px-6 py-3 text-slate-700">{estimationLabel(task.estimation, t)}</td>
                          </tr>

                          {hasDetails && isExpanded ? (
                            <tr className="border-t border-slate-50 bg-slate-50/40">
                              <td colSpan={4} className="px-6 py-4">
                                <div className="space-y-3">
                                  {subtasks.length > 0 ? (
                                    <div>
                                      <div className="text-xs font-semibold text-slate-600">Completion criteria</div>
                                      <div className="mt-2 space-y-1">
                                        {subtasks.map((s: any, i: number) => (
                                          <div key={i} className="text-sm text-slate-800 flex items-start gap-2">
                                            <span className="mt-0.5">{s?.isDone ? '✓' : '•'}</span>
                                            <span className={s?.isDone ? 'line-through text-slate-500' : ''}>{s?.title || ''}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {notes.length > 0 ? (
                                    <div>
                                      <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="text-xs font-semibold text-slate-600">Reflection</div>
                                        {typeof (task as any).completionReflection?.completionRate === 'number' ? (
                                          <Badge variant="secondary">
                                            {(task as any).completionReflection.completionRate}%
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <div className="mt-2 text-sm text-slate-800 whitespace-pre-line">
                                        {(task as any).completionReflection?.notes || ''}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </>
                      );
                    })()}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-xs text-slate-500 print:hidden">
          {t.share.publicPageTitle}
        </div>
      </div>
    </div>
  );
}
