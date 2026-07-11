import React from 'react';
import { INTERVIEW_TABS } from '@/shared/lib/interviewsCommandUtils';

export default function InterviewsTabs({ activeTab, onTabChange }) {
  return (
    <div className="iv-tabs" role="tablist" aria-label="Interview views" data-testid="interviews-tabs">
      {INTERVIEW_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`iv-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          data-testid={`interviews-tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
