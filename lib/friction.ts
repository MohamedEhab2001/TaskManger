export interface FrictionScore {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: string[];
}

export function calculateFriction(task: any): FrictionScore {
  let score = 0;
  const factors: string[] = [];

  const now = new Date();

  if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'done') {
    const overdueDays = Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const overdueScore = Math.min(overdueDays * 5, 30);
    score += overdueScore;
    if (overdueDays > 0) {
      factors.push(`Overdue ${overdueDays} day${overdueDays > 1 ? 's' : ''}`);
    }
  }

  if (task.status === 'doing' && task.lastStatusChangeAt) {
    const doingDays = Math.floor((now.getTime() - new Date(task.lastStatusChangeAt).getTime()) / (1000 * 60 * 60 * 24));
    if (doingDays > 2) {
      const doingScore = Math.min(doingDays * 3, 20);
      score += doingScore;
      factors.push(`In progress ${doingDays} day${doingDays > 1 ? 's' : ''}`);
    }
  }

  if (task.reopenCount > 0) {
    const reopenScore = Math.min(task.reopenCount * 10, 25);
    score += reopenScore;
    factors.push(`Reopened ${task.reopenCount} time${task.reopenCount > 1 ? 's' : ''}`);
  }

  if (task.priorityChangeCount > 0) {
    const priorityScore = Math.min(task.priorityChangeCount * 4, 15);
    score += priorityScore;
    factors.push(`Priority changed ${task.priorityChangeCount} time${task.priorityChangeCount > 1 ? 's' : ''}`);
  }

  if (task.estimatedMinutes && task.actualMinutes && task.estimatedMinutes > 0) {
    const diff = Math.abs(task.actualMinutes - task.estimatedMinutes);
    const mismatchPercent = Math.round((diff / task.estimatedMinutes) * 100);
    if (mismatchPercent > 50) {
      const mismatchScore = Math.min(mismatchPercent / 5, 10);
      score += mismatchScore;
      factors.push(`Time estimate off by ${mismatchPercent}%`);
    }
  }

  score = Math.min(Math.round(score), 100);

  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return { score, level, factors };
}
