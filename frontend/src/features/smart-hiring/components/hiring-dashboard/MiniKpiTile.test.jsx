import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MiniKpiTile from './MiniKpiTile';
import { Sparkles } from 'lucide-react';

describe('MiniKpiTile', () => {
  it('renders label, value, and subtitle', () => {
    render(
      <MemoryRouter>
        <MiniKpiTile
          label="AI Matches adoption"
          value="78%"
          subtitle="14 of 18 open roles"
          icon={Sparkles}
          iconClassName="bg-violet-100 text-violet-600"
          testId="mini-kpi-ai-adoption"
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('mini-kpi-ai-adoption')).toBeInTheDocument();
    expect(screen.getByText('AI Matches adoption')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('14 of 18 open roles')).toBeInTheDocument();
  });
});
