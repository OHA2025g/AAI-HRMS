import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import KpiTile from './KpiTile';

describe('KpiTile', () => {
  it('renders label, value, and positive delta', () => {
    render(
      <MemoryRouter>
        <KpiTile
          label="Open jobs"
          value={12}
          deltaPct={5.2}
          subtitle="141 total"
          icon={Briefcase}
          iconClassName="bg-indigo-100"
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Open jobs')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
    expect(screen.getByText('141 total')).toBeInTheDocument();
  });
});
