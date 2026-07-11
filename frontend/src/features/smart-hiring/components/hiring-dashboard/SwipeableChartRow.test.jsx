import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SwipeableChartRow from './SwipeableChartRow';

describe('SwipeableChartRow', () => {
  it('renders mobile swipe region and desktop grid', () => {
    render(
      <SwipeableChartRow testId="demo-charts">
        <div>Chart A</div>
        <div>Chart B</div>
      </SwipeableChartRow>
    );
    expect(screen.getByTestId('demo-charts-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('demo-charts')).toBeInTheDocument();
    expect(screen.getAllByText('Chart A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chart B').length).toBeGreaterThan(0);
  });
});
