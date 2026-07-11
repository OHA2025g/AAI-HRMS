export const DASHBOARD_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'offers', label: 'Offers' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'signals', label: 'Signals' },
  { value: 'analytics', label: 'Analytics' },
];

/** Native mock tab bar — exact `.tabs` / `.tab` from pixel-perfect HTML. */
export default function DashboardSectionNav({ activeTab, onTabChange }) {
  return (
    <section className="tabs" role="tablist" aria-label="Dashboard tabs" data-testid="dashboard-tabs">
      {DASHBOARD_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          className={activeTab === tab.value ? 'tab active' : 'tab'}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </section>
  );
}

export { DASHBOARD_TABS as DASHBOARD_SECTION_IDS };
