import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export function CareerTrajectoryJobErrorBanner({ message, onRetry, onDismiss, retrying }) {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-start gap-3"
      data-testid="career-traj-job-error"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-[200px] space-y-2">
        <p className="text-sm text-amber-900">{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-300"
            onClick={onRetry}
            disabled={retrying}
            data-testid="career-traj-retry-btn"
          >
            {retrying ? 'Retrying…' : 'Retry analysis'}
          </Button>
          {onDismiss ? (
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
