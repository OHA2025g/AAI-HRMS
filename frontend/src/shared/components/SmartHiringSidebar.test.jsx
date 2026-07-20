import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SmartHiringSidebar from './SmartHiringSidebar';

const logoutMock = vi.fn();

vi.mock('@/shared/context/AuthContext', () => ({
  useAuth: () => ({
    logout: logoutMock,
    user: { role: 'admin', full_name: 'QA Admin' },
    isAuthenticated: true,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SmartHiringSidebar', () => {
  beforeEach(() => {
    logoutMock.mockClear();
    mockNavigate.mockClear();
  });

  it('renders operational nav on dashboard (same as other sections)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SmartHiringSidebar
          user={{ role: 'admin', full_name: 'QA Admin' }}
          navVariant="operational"
          brandGlyph="✦"
          showCollapse={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('vedhire-wordmark')).toBeTruthy();
    expect(screen.getByText('vedhire')).toBeTruthy();
    expect(screen.getByText('.ai')).toBeTruthy();
    expect(screen.getByText('Inspired by Ved & Powered by AI')).toBeTruthy();
    expect(screen.getByTestId('nav-dashboard')).toBeTruthy();
    expect(screen.getByTestId('nav-jobs')).toBeTruthy();
    expect(screen.getByTestId('nav-pipeline')).toBeTruthy();
    expect(screen.getByTestId('nav-admin')).toBeTruthy();
    expect(screen.getByTestId('smart-hiring-ask-ai')).toBeTruthy();
    expect(screen.getByTestId('sidebar-logout-btn')).toBeTruthy();
    expect(container.querySelector('.sh-sidebar-footer .sh-assistant')).toBeTruthy();
    expect(screen.getByText('Ask AI Assistant')).toBeTruthy();
    expect(screen.getByText('Ask anything about your hiring pipeline.')).toBeTruthy();
    expect(screen.getByText('Ask Now →')).toBeTruthy();
  });

  it('logs out and navigates to login from the sidebar button', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SmartHiringSidebar
          user={{ role: 'admin', full_name: 'QA Admin' }}
          navVariant="operational"
          showCollapse={false}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
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
