import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getSmartHiringSidebarNav,
  isSmartHiringNavGroupActive,
  isSmartHiringNavItemActive,
  smartHiringNavTestId,
} from '../config/smartHiringNav';

export default function SmartHiringSidebar({
  user,
  navVariant = 'operational',
  brandGlyph = 'A',
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
  showCollapse = true,
}) {
  const location = useLocation();
  const items = getSmartHiringSidebarNav(user, navVariant);
  const canToggle = showCollapse && onToggleCollapse;
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = new Set();
    items.forEach((item) => {
      if (item.defaultExpanded && item.children?.length) {
        initial.add(item.label);
      }
    });
    return initial;
  });

  useEffect(() => {
    const navItems = getSmartHiringSidebarNav(user, navVariant);
    navItems.forEach((item) => {
      if (!item.children?.length) return;
      if (isSmartHiringNavGroupActive(location.pathname, location.search, item)) {
        setExpandedGroups((prev) => {
          if (prev.has(item.label)) return prev;
          const next = new Set(prev);
          next.add(item.label);
          return next;
        });
      }
    });
  }, [location.pathname, location.search, user, navVariant]);

  const toggleGroup = (label) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const brandContent = (
    <>
      <div className="sh-logo" aria-hidden>
        {brandGlyph}
      </div>
      {!collapsed ? (
        <div className="sh-brand-text">
          <h2>AAI-HRMS</h2>
          <p>Smart Hiring</p>
        </div>
      ) : null}
    </>
  );

  return (
    <aside
      data-app-sidebar
      data-testid="smart-hiring-sidebar"
      data-nav-variant={navVariant}
      className={cn('sh-sidebar', collapsed && 'sh-sidebar--collapsed', className)}
    >
      {canToggle ? (
        <button
          type="button"
          className="sh-brand sh-brand-toggle"
          onClick={onToggleCollapse}
          data-testid="sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {brandContent}
        </button>
      ) : (
        <div className="sh-brand">{brandContent}</div>
      )}

      <nav className="sh-nav" aria-label="Smart Hiring">
        {items.map((item) => {
          if (item.children?.length) {
            const groupActive = isSmartHiringNavGroupActive(location.pathname, location.search, item);
            const expanded = expandedGroups.has(item.label);
            const subnavId = `sh-subnav-${smartHiringNavTestId(item.testLabel || item.label)}`;

            return (
              <div
                key={item.label}
                className="sh-nav-group"
                data-testid={smartHiringNavTestId(item.testLabel || item.label)}
              >
                <button
                  type="button"
                  className={cn('sh-nav-link sh-nav-parent', groupActive && 'active', expanded && 'sh-nav-parent--open')}
                  title={item.label}
                  aria-expanded={expanded}
                  aria-controls={subnavId}
                  onClick={() => toggleGroup(item.label)}
                >
                  <span className="sh-nav-glyph">{item.glyph}</span>
                  <span className="sh-nav-label">{item.label}</span>
                  {!collapsed ? (
                    <ChevronDown
                      className={cn('sh-nav-chevron', expanded && 'sh-nav-chevron--open')}
                      aria-hidden
                    />
                  ) : null}
                </button>
                {!collapsed && expanded ? (
                  <div id={subnavId} className="sh-subnav" aria-label={`${item.label} submenu`}>
                    {item.children.map((child) => {
                      const active = isSmartHiringNavItemActive(location.pathname, location.search, child);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          title={child.label}
                          onClick={onNavigate}
                          data-testid={smartHiringNavTestId(child.testLabel || child.label)}
                          className={cn('sh-subnav-link', active && 'active')}
                        >
                          <span className="sh-nav-glyph">{child.glyph}</span>
                          <span className="sh-nav-label">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = isSmartHiringNavItemActive(location.pathname, location.search, item);
          return (
            <Link
              key={`${item.path}-${item.label}`}
              to={item.path}
              title={item.label}
              onClick={onNavigate}
              data-testid={smartHiringNavTestId(item.testLabel || item.label)}
              className={cn('sh-nav-link', active && 'active')}
            >
              <span className="sh-nav-glyph">{item.glyph}</span>
              <span className="sh-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sh-sidebar-footer">
        {!collapsed ? (
          <div className="sh-assistant">
            <b>Ask AI Assistant</b>
            <p className="sh-assistant-copy">Ask anything about your hiring pipeline.</p>
            <Link
              to="/ai-hiring/candidate-fit/career-trajectory"
              className="sh-assistant-btn"
              onClick={onNavigate}
              data-testid="smart-hiring-ask-ai"
            >
              <span className="sh-assistant-btn-label">Ask Now →</span>
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
