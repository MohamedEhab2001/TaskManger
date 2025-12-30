'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number | null;
  max?: number;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const safeMax = typeof max === 'number' && max > 0 ? max : 100;
    const rawValue = typeof value === 'number' ? value : 0;
    const clamped = Math.min(safeMax, Math.max(0, rawValue));
    const pct = (clamped / safeMax) * 100;

    return (
      <div
        ref={ref}
        className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
