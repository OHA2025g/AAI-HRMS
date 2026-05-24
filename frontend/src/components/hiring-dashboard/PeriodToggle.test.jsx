import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PeriodToggle from './PeriodToggle';

describe('PeriodToggle', () => {
  it('renders 7d, 30d, and 90d options', () => {
    render(<PeriodToggle value={30} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('calls onChange when a period is selected', () => {
    const onChange = vi.fn();
    render(<PeriodToggle value={30} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('disables buttons when disabled prop is set', () => {
    render(<PeriodToggle value={30} onChange={() => {}} disabled />);
    expect(screen.getByRole('button', { name: '7d' })).toBeDisabled();
  });
});
