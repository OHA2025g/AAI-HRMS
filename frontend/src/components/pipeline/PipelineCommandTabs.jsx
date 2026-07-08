import React from 'react';
import { ROUND_TABS } from '../../lib/pipelineCommandUtils';

export default function PipelineCommandTabs({ activeTab, tabCounts, onTabChange }) {
  return (
    <div className="pl-tabs" role="tablist" aria-label="Pipeline stages">
      {ROUND_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`pl-tab ${activeTab === tab.key ? 'active' : ''}`}
          data-testid={`pipeline-tab-${tab.key.toLowerCase()}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label} <b>{tabCounts[tab.key] ?? 0}</b>
        </button>
      ))}
    </div>
  );
}
