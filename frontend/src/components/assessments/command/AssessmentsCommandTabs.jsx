import React from 'react';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'library', label: 'Library' },
  { id: 'in-progress', label: 'In progress', countKey: 'inProgress' },
  { id: 'results', label: 'Results', countKey: 'results' },
  { id: 'insights', label: 'Insights' },
];

export default function AssessmentsCommandTabs({ activeTab, onTabChange, counts }) {
  return (
    <nav className="as-tabs" role="tablist" aria-label="Assessment workspace tabs" data-testid="assessments-command-tabs">
      {TABS.map((tab) => {
        const count = tab.countKey ? counts?.[tab.countKey] : null;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`as-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {count != null ? (
              <>
                {' '}
                <b>{count}</b>
              </>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
