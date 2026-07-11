import React from 'react';

export const DASHBOARD_CHART_TOOLTIP_PROPS = {
  allowEscapeViewBox: { x: true, y: true },
  wrapperStyle: { zIndex: 30, outline: 'none' },
};

export const DASHBOARD_CHART_CURSOR = {
  stroke: '#94a3b8',
  strokeWidth: 1,
  strokeDasharray: '4 4',
};

export function DashboardChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="dashboard-chart-tooltip">
      {displayLabel != null && displayLabel !== '' ? (
        <p className="dashboard-chart-tooltip__label">{displayLabel}</p>
      ) : null}
      <ul className="dashboard-chart-tooltip__items">
        {payload.map((entry) => {
          let value = entry.value;
          let name = entry.name ?? entry.dataKey;
          if (formatter) {
            const formatted = formatter(value, name, entry, entry.payload);
            if (Array.isArray(formatted)) {
              [value, name] = formatted;
            } else {
              value = formatted;
            }
          }
          return (
            <li key={`${entry.dataKey}-${name}`} className="dashboard-chart-tooltip__item">
              <span
                className="dashboard-chart-tooltip__swatch"
                style={{ backgroundColor: entry.color || entry.stroke || '#6d4cff' }}
              />
              <span className="dashboard-chart-tooltip__name">{name}</span>
              <span className="dashboard-chart-tooltip__value">{value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function dashboardTooltipContent(formatter, labelFormatter) {
  function TooltipContent(props) {
    return (
      <DashboardChartTooltipContent
        {...props}
        formatter={formatter}
        labelFormatter={labelFormatter}
      />
    );
  }
  return TooltipContent;
}
