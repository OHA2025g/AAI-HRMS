import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartAccessibleTable from './ChartAccessibleTable';

describe('ChartAccessibleTable', () => {
  it('renders sr-only table and expandable details', () => {
    render(
      <ChartAccessibleTable
        caption="Pipeline funnel"
        columns={[
          { key: 'stage', label: 'Stage' },
          { key: 'count', label: 'Count' },
        ]}
        rows={[
          { id: '1', stage: 'Sourced', count: 10 },
          { id: '2', stage: 'Screening', count: 6 },
        ]}
      />
    );
    expect(screen.getByText('View data as table')).toBeInTheDocument();
    expect(screen.getAllByText('Sourced').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
  });

  it('returns null when rows are empty', () => {
    const { container } = render(
      <ChartAccessibleTable caption="Empty" columns={[{ key: 'a', label: 'A' }]} rows={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});
