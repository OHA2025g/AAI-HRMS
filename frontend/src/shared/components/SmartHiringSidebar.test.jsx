import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SmartHiringSidebar from './SmartHiringSidebar';

describe('SmartHiringSidebar', () => {
  it('renders operational nav on dashboard (same as other sections)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SmartHiringSidebar user={{ role: 'admin' }} navVariant="operational" brandGlyph="✦" showCollapse={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('AAI-HRMS')).toBeTruthy();
    expect(screen.getByText('Smart Hiring')).toBeTruthy();
    expect(screen.getByTestId('nav-dashboard')).toBeTruthy();
    expect(screen.getByTestId('nav-jobs')).toBeTruthy();
    expect(screen.getByTestId('nav-pipeline')).toBeTruthy();
    expect(screen.getByTestId('nav-admin')).toBeTruthy();
    expect(screen.getByTestId('smart-hiring-ask-ai')).toBeTruthy();
    expect(container.querySelector('.sh-sidebar-footer .sh-assistant')).toBeTruthy();
    expect(screen.getByText('Ask AI Assistant')).toBeTruthy();
    expect(screen.getByText('Ask anything about your hiring pipeline.')).toBeTruthy();
    expect(screen.getByText('Ask Now →')).toBeTruthy();
  });

  it('renders operational nav on pipeline route', () => {
    render(
      <MemoryRouter initialEntries={['/pipeline']}>
        <SmartHiringSidebar user={{ role: 'admin' }} navVariant="operational" showCollapse={false} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('nav-dashboard')).toBeTruthy();
    expect(screen.getByTestId('nav-jobs')).toBeTruthy();
    expect(screen.getByTestId('nav-admin')).toBeTruthy();
  });

  it('toggles Admin submenu open and closed', () => {
    render(
      <MemoryRouter initialEntries={['/pipeline']}>
        <SmartHiringSidebar user={{ role: 'admin' }} navVariant="operational" showCollapse={false} />
      </MemoryRouter>
    );

    const adminGroup = screen.getByTestId('nav-admin');
    const adminToggle = adminGroup.querySelector('button');
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('nav-database-maintenance')).toBeNull();

    fireEvent.click(adminToggle);
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('nav-database-maintenance')).toBeTruthy();

    fireEvent.click(adminToggle);
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('nav-database-maintenance')).toBeNull();

    fireEvent.click(adminToggle);
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('nav-database-maintenance')).toBeTruthy();
  });

  it('keeps Admin submenu collapsed after toggle on an admin route', () => {
    render(
      <MemoryRouter initialEntries={['/admin/database']}>
        <SmartHiringSidebar user={{ role: 'admin' }} navVariant="operational" showCollapse={false} />
      </MemoryRouter>
    );

    const adminToggle = screen.getByTestId('nav-admin').querySelector('button');
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(adminToggle);
    expect(adminToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('nav-database-maintenance')).toBeNull();
  });

  it('toggles sidebar from the brand logo button', () => {
    const onToggleCollapse = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SmartHiringSidebar
          user={{ role: 'admin' }}
          navVariant="operational"
          brandGlyph="✦"
          onToggleCollapse={onToggleCollapse}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('sidebar-toggle'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });
});
