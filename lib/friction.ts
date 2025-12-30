export type FrictionFactorKey = 'overdue' | 'doingTime' | 'reopened' | 'priorityChanged' | 'timeMismatch';

export type FrictionFactor =
  | { key: 'overdue'; days: number }
  | { key: 'doingTime'; days: number }
  | { key: 'reopened'; count: number }
  | { key: 'priorityChanged'; count: number }
  | { key: 'timeMismatch'; percent: number };

export interface FrictionScore {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: FrictionFactor[];
}

export function calculateFriction(task: any): FrictionScore {
  let score = 0;
  const factors: FrictionFactor[] = [];

  const now = new Date();

  if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'done') {
    const overdueDays = Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const overdueScore = Math.min(overdueDays * 5, 30);
    score += overdueScore;
    if (overdueDays > 0) {
      factors.push({ key: 'overdue', days: overdueDays });
    }
  }

  if (task.status === 'doing' && task.lastStatusChangedAt) {
    const doingDays = Math.floor(
      (now.getTime() - new Date(task.lastStatusChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (doingDays > 2) {
      const doingScore = Math.min(doingDays * 3, 20);
      score += doingScore;
      factors.push({ key: 'doingTime', days: doingDays });
    }
  }

  if (task.reopenCount > 0) {
    const reopenScore = Math.min(task.reopenCount * 10, 25);
    score += reopenScore;
    factors.push({ key: 'reopened', count: task.reopenCount });
  }

  if (task.priorityChangeCount > 0) {
    const priorityScore = Math.min(task.priorityChangeCount * 4, 15);
    score += priorityScore;
    factors.push({ key: 'priorityChanged', count: task.priorityChangeCount });
  }

  if (task.estimatedMinutes && task.actualMinutes && task.estimatedMinutes > 0) {
    const diff = Math.abs(task.actualMinutes - task.estimatedMinutes);
    const mismatchPercent = Math.round((diff / task.estimatedMinutes) * 100);
    if (mismatchPercent > 50) {
      const mismatchScore = Math.min(mismatchPercent / 5, 10);
      score += mismatchScore;
      factors.push({ key: 'timeMismatch', percent: mismatchPercent });
    }
  }

  score = Math.min(Math.round(score), 100);

  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return { score, level, factors };
}
