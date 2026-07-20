import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import {
  ArrowRight,
  LayoutDashboard,
  Briefcase,
  Users,
  GitBranch,
  Calendar,
  UserPlus,
  ClipboardCheck,
  Sparkles,
  FileSpreadsheet,
  Link2,
  Lock,
  Target,
  BarChart3,
  Brain,
  Radar,
  Menu,
  X,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Eye,
} from 'lucide-react';
import { SMART_HIRING_ONLY } from '@/shared/config/appModules';
import VedhireBrandLockup from '@/shared/components/VedhireBrandLockup';
import { PRODUCT_NAME_PLAIN as PRODUCT_NAME } from '@/shared/components/VedhireWordmark';
import '@/features/smart-hiring/styles/smart-hiring-landing.css';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'whats-new', label: "What's New" },
  { id: 'platform', label: 'Platform' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'get-started', label: 'Get Started' },
];

const VALUE_PROPS = [
  {
    icon: Eye,
    title: 'See the full funnel',
    text: 'One dashboard for velocity, offers, bottlenecks, and hiring health.',
  },
  {
    icon: Zap,
    title: 'Move candidates faster',
    text: 'Pipeline stages, assessments, and interviews stay aligned in one flow.',
  },
  {
    icon: Brain,
    title: 'Decide with evidence',
    text: 'AI fit, trajectory, and insights support every hiring conversation.',
  },
];

const NEW_FEATURES = [
  {
    badge: 'New',
    icon: LayoutDashboard,
    title: 'Hiring dashboard v2',
    text: 'Six tabs covering overview, pipeline, analytics, interviews, offers, and signals.',
  },
  {
    badge: 'New',
    icon: ClipboardCheck,
    title: 'Assessments command center',
    text: 'Library, in-progress, results, and insights in one recruiter workspace.',
  },
  {
    badge: 'New',
    icon: Sparkles,
    title: 'Career trajectory & Phase 2 fit',
    text: 'Compare paths and simulate manager fit before you extend an offer.',
  },
  {
    badge: 'New',
    icon: Link2,
    title: 'Settings & connectors',
    text: 'Company DB, LinkedIn, Naukri, Monster, and a full audit log.',
  },
  {
    badge: 'New',
    icon: FileSpreadsheet,
    title: 'Bulk candidate import',
    text: 'Map columns, validate, dedupe, and commit high-volume talent files.',
  },
  {
    badge: 'New',
    icon: ShieldCheck,
    title: 'Hiring RBAC',
    text: 'HM, TM, and PM scopes per requisition with offer-stage approvals.',
  },
];

const PLATFORM_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    text: 'KPIs, alerts, and hiring pack analytics.',
  },
  {
    icon: Briefcase,
    title: 'Jobs & requisitions',
    text: 'AI skill extraction and Find Matches.',
  },
  {
    icon: Users,
    title: 'Candidates',
    text: 'Profiles, parsing, fit scores, talent pool.',
  },
  {
    icon: GitBranch,
    title: 'Pipeline',
    text: 'Stages, SLAs, screening to joining.',
  },
  {
    icon: ClipboardCheck,
    title: 'Assessments',
    text: 'Generate, invite, grade, and analyze.',
  },
  {
    icon: Calendar,
    title: 'Interviews',
    text: 'Scheduling and structured feedback.',
  },
  {
    icon: UserPlus,
    title: 'Referrals',
    text: 'Employee referrals tied to open jobs.',
  },
  {
    icon: Sparkles,
    title: 'AI intelligence',
    text: 'Trajectory, compare, Phase 2 fit.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Bulk upload',
    text: 'Excel/CSV import with audit history.',
  },
  {
    icon: Link2,
    title: 'Connectors',
    text: 'LinkedIn, Naukri, Monster, company DB.',
  },
  {
    icon: Lock,
    title: 'Roles',
    text: 'Recruiter, HM, TM, and PM permissions.',
  },
  {
    icon: Target,
    title: 'Config',
    text: 'SLAs, alerts, and fairness guardrails.',
  },
];

const WORKFLOW = [
  { title: 'Requisition', text: 'Create jobs with AI skills and scoring rubrics.', icon: Briefcase },
  { title: 'Source & match', text: 'Import and rank candidates by fit signals.', icon: Users },
  { title: 'Assess', text: 'Generate tests, invite, and score results.', icon: ClipboardCheck },
  { title: 'Interview', text: 'Schedule rounds and capture feedback.', icon: Calendar },
  { title: 'Offer & join', text: 'Approvals, ageing, and joining control.', icon: CheckCircle2 },
];

const CONNECTORS = [
  { label: 'LinkedIn Recruiter', glyph: 'in' },
  { label: 'Naukri', glyph: 'N' },
  { label: 'Monster', glyph: 'M' },
  { label: 'Company database', glyph: 'DB' },
  { label: 'Excel / CSV import', glyph: 'XL' },
  { label: 'Webhook audit log', glyph: '⚡' },
];

const INTEL_TILES = [
  {
    icon: Sparkles,
    title: 'Career trajectory',
    text: 'Explainable growth paths and readiness signals for each candidate.',
  },
  {
    icon: BarChart3,
    title: 'Compare trajectories',
    text: 'Side-by-side fit views for shortlists and calibration meetings.',
  },
  {
    icon: Radar,
    title: 'Phase 2 manager fit',
    text: 'Simulate team and manager alignment before you extend an offer.',
  },
];

const CHART_HEIGHTS = [42, 68, 54, 88, 62, 96, 74, 58];
const HEADER_OFFSET = 80;

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  if (window.history?.replaceState) {
    window.history.replaceState(null, '', `#${id}`);
  }
}

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const appEntry = isAuthenticated ? '/dashboard' : '/login';
  const appEntryLabel = isAuthenticated ? 'Launch workspace' : 'Sign in';
  const signUpHref = isAuthenticated ? '/dashboard' : '/login?tab=register';
  const primaryCtaLabel = isAuthenticated ? 'Launch workspace' : 'Sign up';
  const primaryCtaHref = isAuthenticated ? '/dashboard' : signUpHref;

  const [activeId, setActiveId] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = useCallback((e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    setActiveId(id);
    scrollToSection(id);
  }, []);

  useEffect(() => {
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash && NAV_ITEMS.some((item) => item.id === hash)) {
      const t = window.setTimeout(() => scrollToSection(hash), 40);
      setActiveId(hash);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [location.hash]);

  useEffect(() => {
    const elements = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: `-${HEADER_OFFSET + 8}px 0px -45% 0px`,
        threshold: [0.15, 0.35, 0.55],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="slp">
      <header className="slp-header">
        <div className="slp-header-inner">
          <a href="#overview" className="slp-brand" onClick={(e) => handleNavClick(e, 'overview')}>
            <VedhireBrandLockup variant="light" markSize={30} className="slp-brand-lockup" />
          </a>

          <nav className="slp-nav" aria-label="Landing page">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`slp-nav-link${activeId === item.id ? ' active' : ''}`}
                onClick={(e) => handleNavClick(e, item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="slp-header-actions">
            {!isAuthenticated ? (
              <Link to="/login" className="slp-btn-ghost">
                Sign in
              </Link>
            ) : null}
            <Link to={primaryCtaHref} className="slp-btn-primary">
              {primaryCtaLabel}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="slp-menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="slp-mobile-nav" role="dialog" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`slp-mobile-nav-link${activeId === item.id ? ' active' : ''}`}
                onClick={(e) => handleNavClick(e, item.id)}
              >
                {item.label}
              </a>
            ))}
            <div className="slp-mobile-nav-actions">
              {!isAuthenticated ? (
                <Link to="/login" className="slp-btn-outline light" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              ) : null}
              <Link to={primaryCtaHref} className="slp-btn-primary" onClick={() => setMenuOpen(false)}>
                {primaryCtaLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section id="overview" className="slp-hero">
        <div className="slp-orb slp-orb-a" />
        <div className="slp-orb slp-orb-b" />
        <div className="slp-orb slp-orb-c" />
        <div className="slp-hero-inner">
          <div className="slp-hero-copy">
            <div className="slp-fade-up">
              <div className="slp-eyebrow">
                <span className="slp-dot" />
                Live hiring intelligence workspace
              </div>
            </div>

            <h1 className="slp-fade-up">
              Hire with clarity.
              <br />
              <em>Move with confidence.</em>
            </h1>

            <p className="slp-hero-lead slp-fade-up-delay">
              From requisition to signed offer, Smart Hiring keeps matching, assessments,
              interviews, and AI insights in one secure workspace.
            </p>

            <div className="slp-hero-ctas slp-fade-up-delay">
              <Link to={primaryCtaHref} className="slp-btn-primary lg">
                {primaryCtaLabel}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                href="#workflow"
                className="slp-btn-outline"
                onClick={(e) => handleNavClick(e, 'workflow')}
              >
                See how it works
              </a>
            </div>

            <div className="slp-hero-meta slp-fade-up-delay-2">
              <div className="slp-meta-chip">
                <strong>6</strong>
                <span>Dashboard tabs</span>
              </div>
              <div className="slp-meta-chip">
                <strong>12+</strong>
                <span>Pipeline stages</span>
              </div>
              <div className="slp-meta-chip">
                <strong>AI</strong>
                <span>Fit &amp; trajectory</span>
              </div>
            </div>
          </div>

          <div className="slp-hero-visual slp-fade-up-delay">
            <div className="slp-float-badge">
              <span className="ok" />
              Hiring health · Strong
            </div>
            <div className="slp-float-badge slp-float-badge-2">
              <Activity size={14} color="#4f46e5" />
              Velocity ↑ 18%
            </div>
            <div className="slp-preview-glow" />
            <div className="slp-preview" aria-hidden="true">
              <div className="slp-preview-bar">
                <span className="slp-preview-dot r" />
                <span className="slp-preview-dot y" />
                <span className="slp-preview-dot g" />
                <span className="slp-preview-title">smart-hiring · command center</span>
              </div>
              <div className="slp-preview-body">
                <div className="slp-preview-kpis">
                  <div className="slp-preview-kpi">
                    <span>Open reqs</span>
                    <strong>42</strong>
                  </div>
                  <div className="slp-preview-kpi">
                    <span>In pipeline</span>
                    <strong>318</strong>
                  </div>
                  <div className="slp-preview-kpi">
                    <span>Offers</span>
                    <strong>27</strong>
                  </div>
                </div>
                <div className="slp-preview-chart">
                  {CHART_HEIGHTS.map((h, i) => (
                    <div
                      key={`bar-${i}`}
                      className="slp-preview-bar-col"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${0.08 * i}s`,
                        transformOrigin: 'bottom',
                      }}
                    />
                  ))}
                </div>
                <div className="slp-preview-row">
                  <div className="slp-preview-panel">
                    <h4>AI insight</h4>
                    <p>Screening SLA risk on 3 roles. Prioritize backend hiring manager reviews.</p>
                  </div>
                  <div className="slp-preview-panel">
                    <h4>Source mix</h4>
                    <p>LinkedIn 38% · Referral 24% · Naukri 21%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#whats-new"
          className="slp-scroll-cue"
          onClick={(e) => handleNavClick(e, 'whats-new')}
        >
          <span>Scroll to explore</span>
          <span className="slp-scroll-mouse" aria-hidden="true" />
        </a>
      </section>

      <section className="slp-value-strip" aria-label="Key benefits">
        <div className="slp-section-inner slp-value-grid">
          {VALUE_PROPS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="slp-value-card">
              <div className="slp-value-icon">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="whats-new" className="slp-section dark">
        <div className="slp-section-inner">
          <div className="slp-section-head center">
            <p className="slp-kicker">What&apos;s new</p>
            <h2>Built for how talent teams work today</h2>
            <p>
              Fresh command centers and AI decision tools for recruiters, hiring managers, and
              talent leaders.
            </p>
          </div>
          <div className="slp-new-grid">
            {NEW_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="slp-new-card">
                  <div className="slp-new-icon">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <span className="slp-new-badge">{item.badge}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="platform" className="slp-section soft slp-section-compact">
        <div className="slp-section-inner">
          <div className="slp-section-head center">
            <p className="slp-kicker">Platform</p>
            <h2>Everything you need in one place</h2>
            <p>
              A complete talent acquisition workspace for day-to-day hiring and admin controls.
            </p>
          </div>
          <div className="slp-cap-grid">
            {PLATFORM_FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="slp-cap-card">
                <div className="slp-cap-icon">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="slp-section dark">
        <div className="slp-section-inner">
          <div className="slp-section-head center">
            <p className="slp-kicker">Workflow</p>
            <h2>A clear path through every hire</h2>
            <p>Five stages with ownership, SLA visibility, and AI recommendations.</p>
          </div>
          <div className="slp-flow">
            {WORKFLOW.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="slp-flow-step">
                  <div className="slp-flow-icon">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="intelligence" className="slp-section soft">
        <div className="slp-section-inner">
          <div className="slp-section-head center">
            <p className="slp-kicker">Intelligence</p>
            <h2>Evidence for every hiring conversation</h2>
            <p>
              Recommendations, risks, and next actions from LLM insights to trajectory explainability.
            </p>
          </div>
          <div className="slp-intel-showcase">
            <div className="slp-intel-main">
              <h3>What you get</h3>
              <ul className="slp-intel-list">
                <li>LLM hiring insights on the dashboard</li>
                <li>Signal strength and hiring velocity trends</li>
                <li>Source mix analytics and fairness guardrails</li>
                <li>Phase 2 fit simulation for manager alignment</li>
              </ul>
              <div className="slp-pill-row">
                <span className="slp-pill">LLM insights</span>
                <span className="slp-pill">Hiring velocity</span>
                <span className="slp-pill">Source mix</span>
                <span className="slp-pill">Fairness</span>
              </div>
            </div>
            <div className="slp-intel-side">
              {INTEL_TILES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="slp-intel-tile">
                  <div className="slp-intel-tile-icon">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="connectors" className="slp-section dark">
        <div className="slp-section-inner">
          <div className="slp-section-head center">
            <p className="slp-kicker">Connectors</p>
            <h2>Bring talent from where it already is</h2>
            <p>Connect external channels and keep an audit trail of every sync.</p>
          </div>
          <div className="slp-connector-grid">
            {CONNECTORS.map((item) => (
              <div key={item.label} className="slp-connector-tile">
                <span aria-hidden="true">{item.glyph}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className="slp-cta">
        <div className="slp-cta-panel">
          <div>
            <p className="slp-cta-kicker">Get started</p>
            <h2>Ready to run Smart Hiring?</h2>
            <p>
              Create an account or sign in to open your workspace for requisitions, pipeline,
              assessments, and AI-powered hiring intelligence.
            </p>
          </div>
          <div className="slp-cta-actions">
            <Link to={primaryCtaHref} className="slp-btn-primary lg">
              {primaryCtaLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {!isAuthenticated ? (
              <Link to={appEntry} className="slp-btn-outline">
                {appEntryLabel}
              </Link>
            ) : (
              <Link to="/dashboard" className="slp-btn-outline">
                Open dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="slp-footer">
        <div className="slp-footer-inner">
          <span>© 2026 AGRAYIAN AI Labs · {PRODUCT_NAME}</span>
          <div className="slp-footer-links">
            {NAV_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={(e) => handleNavClick(e, item.id)}>
                {item.label}
              </a>
            ))}
            <Link to="/login">Account access</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
