import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { shortenInsightActionLabel } from '@/shared/lib/insightActionLabel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

function InsightCard({ insight, onAction }) {
  return (
    <div className={cn('insight', insight.severity || 'blue')}>
      <h4>{insight.title}</h4>
      <p>{insight.message}</p>
      {insight.action_path ? (
        <button
          type="button"
          className="mini"
          onClick={() => onAction(insight.action_path)}
        >
          {shortenInsightActionLabel(insight.action_label || insight.actionLabel || 'View Details')}
        </button>
      ) : null}
    </div>
  );
}

export default function AiInsightsModal({ open, onOpenChange, insights = [], source }) {
  const navigate = useNavigate();

  const handleAction = (path) => {
    onOpenChange(false);
    if (path) navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="hd-insights-modal"
        data-testid="ai-insights-modal"
        aria-describedby="ai-insights-modal-description"
      >
        <DialogHeader className="hd-insights-modal-head">
          <DialogTitle>✦ AI Insights &amp; Recommendations</DialogTitle>
          <DialogDescription id="ai-insights-modal-description">
            {insights.length
              ? `${insights.length} insight${insights.length === 1 ? '' : 's'} for your current filters${
                  source === 'llm' ? ' · LLM-enhanced' : ''
                }.`
              : 'No AI insights for the current filters.'}
          </DialogDescription>
        </DialogHeader>

        {insights.length ? (
          <div className="hd-insights-modal-grid insights">
            {insights.map((insight, index) => (
              <InsightCard
                key={`${insight.title}-${index}`}
                insight={insight}
                onAction={handleAction}
              />
            ))}
          </div>
        ) : (
          <p className="hd-insights-modal-empty muted">No AI insights for the current filters.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
