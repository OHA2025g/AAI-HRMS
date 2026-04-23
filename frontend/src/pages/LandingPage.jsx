import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useInView, animate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  BarChart2,
  Briefcase,
  Users,
  GitBranch,
  Calendar,
  UserPlus,
  ClipboardCheck,
  UserCog,
  TrendingUp,
  FolderKanban,
  GraduationCap,
  Heart,
  Zap,
  Bot,
  Rocket,
  Shield,
  Layers,
  BarChart3,
  Cog,
  Cpu,
  Star,
  Orbit,
  Radio,
  Activity,
} from 'lucide-react';

const outfit = { fontFamily: "'Outfit', system-ui, sans-serif" };
const syne = { fontFamily: "'Syne', 'Outfit', system-ui, sans-serif" };
const inter = { fontFamily: "'Inter', system-ui, sans-serif" };

function CountUpStat({ end, label, suffix = '', prefix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(0, end, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setV(decimals ? Number(latest.toFixed(decimals)) : Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, end, decimals]);

  return (
    <div ref={ref} className="text-center lg:text-left">
      <p className="text-2xl md:text-4xl font-bold text-white tabular-nums tracking-tight" style={syne}>
        {prefix}
        {v}
        {suffix}
      </p>
      <p className="text-[11px] md:text-xs text-slate-500 uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}

function useLandingMotion() {
  const reduce = useReducedMotion();
  return useMemo(
    () => ({
      fade: reduce
        ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
        : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
      float: reduce ? {} : { y: [0, -10, 0] },
      floatDur: reduce ? 0 : 6,
    }),
    [reduce],
  );
}

function InfinityReveal({ label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  return (
    <motion.div
      ref={ref}
      className="text-center lg:text-left"
      initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
      animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
      transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.15 }}
    >
      <p className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-indigo-300 tabular-nums" style={syne}>
        ∞
      </p>
      <p className="text-[11px] md:text-xs text-slate-500 uppercase tracking-wider mt-1.5">{label}</p>
    </motion.div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function SectionHeading({ eyebrow, title, description, light }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
      {eyebrow && (
        <p
          className={`text-xs font-bold tracking-[0.2em] uppercase mb-3 ${
            light ? 'text-indigo-300' : 'text-indigo-600'
          }`}
          style={outfit}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-3xl md:text-5xl font-bold mb-4 leading-tight ${light ? 'text-white' : 'text-slate-900'}`}
        style={outfit}
      >
        {title}
      </h2>
      {description && (
        <p className={`text-lg md:text-xl leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>{description}</p>
      )}
    </div>
  );
}

const MARQUEE_ITEMS = [
  'Smart hiring',
  'Skills intelligence',
  'Project master',
  'Allocations',
  'Executive KPIs',
  'HR Copilot',
  'Lifecycle',
  'Engagement',
  'Retention',
  'Workflow automation',
  'Demand forecast',
  'Governance',
];

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const appEntry = isAuthenticated ? '/dashboard' : '/login';
  const appEntryLabel = isAuthenticated ? 'Launch workspace' : 'Sign in';
  const m = useLandingMotion();
  const prefersReducedMotion = useReducedMotion();

  const highlights = [
    {
      icon: BarChart2,
      title: 'Executive visibility',
      text: 'Dashboards and KPI packs—health, cost, and workforce signals in one glass pane.',
      to: '/executive-kpis',
      span: 'md:col-span-2 md:row-span-1',
    },
    {
      icon: Briefcase,
      title: 'AI-assisted hiring',
      text: 'Requisitions, talent pool, resume intelligence, pipeline, interviews.',
      to: '/jobs',
      span: 'md:col-span-2',
    },
    {
      icon: UserCog,
      title: 'Employee lifecycle',
      text: 'Master data, org context, approvals, compliant transitions.',
      to: '/employees',
      span: 'md:col-span-1',
    },
    {
      icon: TrendingUp,
      title: 'Demand & supply',
      text: 'Skill inventory and forecasts aligned to hiring and mobility.',
      to: '/workforce-intelligence',
      span: 'md:col-span-1',
    },
    {
      icon: FolderKanban,
      title: 'Projects & resources',
      text: 'Optimization, project hub, allocation bridge, resource intelligence overlays.',
      to: '/resource-optimization',
      span: 'md:col-span-2',
    },
    {
      icon: Layers,
      title: 'Resource intelligence',
      text: 'Bench, readiness, demand fit, forecasting hooks, and AI-ready workforce signals.',
      to: '/resource-project-optimization/resource/dashboard',
      span: 'md:col-span-2',
    },
    {
      icon: GraduationCap,
      title: 'Learning paths',
      text: 'Recommendations and assignments tied to role growth.',
      to: '/training-recommendations',
      span: 'md:col-span-1',
    },
    {
      icon: Heart,
      title: 'Engagement',
      text: 'Pulse, programs, and HR-owned follow-through.',
      to: '/employee-engagement',
      span: 'md:col-span-1',
    },
    {
      icon: Zap,
      title: 'Automation & copilot',
      text: 'HR Copilot, transformation roadmap, workflow engine.',
      to: '/hr-copilot',
      span: 'md:col-span-2',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/40">
      <style>{`
        @keyframes landing-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes landing-marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes landing-aurora {
          0%, 100% { opacity: 0.45; transform: scale(1) translate(0, 0); }
          33% { opacity: 0.65; transform: scale(1.08) translate(3%, -2%); }
          66% { opacity: 0.5; transform: scale(1.04) translate(-2%, 3%); }
        }
        @keyframes landing-beam {
          0% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
          15% { opacity: 0.35; }
          50% { opacity: 0.2; }
          100% { transform: translateX(220%) skewX(-12deg); opacity: 0; }
        }
        @keyframes landing-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes landing-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.35); }
          50% { box-shadow: 0 0 0 22px rgba(99, 102, 241, 0); }
        }
        .landing-marquee-track {
          animation: landing-marquee 38s linear infinite;
        }
        .landing-marquee-track-reverse {
          animation: landing-marquee-reverse 48s linear infinite;
        }
        .landing-aurora-blob {
          animation: landing-aurora 18s ease-in-out infinite;
        }
        .landing-hero-beam {
          animation: landing-beam 7s ease-in-out infinite;
        }
        .landing-orbit-slow {
          animation: landing-orbit 90s linear infinite;
        }
        .landing-cta-pulse {
          animation: landing-pulse-ring 2.8s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-marquee-track,
          .landing-marquee-track-reverse,
          .landing-aurora-blob,
          .landing-hero-beam,
          .landing-orbit-slow,
          .landing-cta-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient mesh + aurora (fixed) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(140vw,900px)] h-[min(140vw,900px)] landing-orbit-slow opacity-30">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(99,102,241,0.25), transparent, rgba(167,139,250,0.2), transparent, rgba(236,72,153,0.15), transparent)',
            }}
          />
        </div>
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-indigo-600/25 blur-[120px] landing-aurora-blob" />
        <div
          className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[100px] landing-aurora-blob"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-fuchsia-600/15 blur-[90px] landing-aurora-blob"
          style={{ animationDelay: '-12s' }}
        />
        <div className="absolute top-[18%] right-[12%] w-px h-32 bg-gradient-to-b from-transparent via-indigo-400/40 to-transparent rotate-12" />
        <div className="absolute top-[40%] left-[8%] w-px h-24 bg-gradient-to-b from-transparent via-violet-400/30 to-transparent -rotate-6" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-indigo-500 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-1 ring-white/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="leading-tight min-w-0">
              <span className="font-bold text-lg text-white block truncate" style={outfit}>
                AAI-HRMS
              </span>
              <span className="text-[10px] uppercase tracking-widest text-indigo-300/90 hidden sm:block">Systems</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/10">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="relative overflow-hidden bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
            >
              <Link to={appEntry} className="relative z-10 px-5">
                {appEntryLabel}
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex flex-col justify-center pt-8 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <motion.div
                initial={m.fade.initial}
                animate={m.fade.animate}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-sm overflow-hidden">
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-indigo-500/20 to-transparent landing-hero-beam" />
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  </span>
                  <span className="relative text-xs font-semibold text-slate-200 tracking-wide">Live stack · Agentic AI · Enterprise HR</span>
                </div>

                <h1
                  className="text-[2.55rem] sm:text-5xl md:text-6xl lg:text-[4.35rem] font-extrabold text-white leading-[1.02] tracking-tight mb-5"
                  style={inter}
                >
                  The workforce layer{' '}
                  <span className="relative inline-block">
                    <span
                      className="absolute -inset-x-2 -inset-y-1 rounded-2xl bg-gradient-to-r from-indigo-600/35 via-violet-600/25 to-fuchsia-600/25 blur-xl"
                      aria-hidden
                    />
                    <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-violet-200">
                      your board actually feels
                    </span>
                  </span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 mb-3 leading-relaxed">
                  Hiring, skills, projects, bench, and KPIs—woven into one glass pane so HR, PMO, and leadership stop
                  reconciling three spreadsheets and start steering one truth.
                </p>
                <p className="text-sm text-indigo-300/90 font-medium mb-10 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <Star className="w-4 h-4 text-amber-300 shrink-0" fill="currentColor" />
                  <span>Designed to demo like a product—not a slide deck.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                  <div className="relative rounded-full landing-cta-pulse">
                    <Button
                      size="lg"
                      asChild
                      className="relative h-14 px-8 text-base rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-600 hover:opacity-95 text-white border-0 shadow-xl shadow-indigo-600/40 ring-1 ring-white/20"
                    >
                      <Link to={appEntry} className="inline-flex items-center">
                        {appEntryLabel}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-14 px-8 text-base rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
                  >
                    <Link to="/login">Create account</Link>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 border-t border-white/10 pt-8">
                  <CountUpStat end={12} suffix="+" label="Product surfaces" />
                  <CountUpStat end={1} label="Unified fabric" />
                  <InfinityReveal label="Scale ceiling" />
                </div>
              </motion.div>
            </div>

            {/* Product aura / mock frame */}
            <div className="lg:col-span-5 relative">
              <motion.div
                className="relative mx-auto max-w-md lg:max-w-none"
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/20 blur-2xl" />
                <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute -inset-y-8 -left-1/2 w-[80%] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent landing-hero-beam" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/80 relative">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono flex-1 text-center truncate">aai-hrms · unified workspace</span>
                    <Radio className="w-3.5 h-3.5 text-emerald-400/90" />
                  </div>
                  <div className="p-5 space-y-4 relative">
                    <div className="flex gap-3">
                      <div className="h-28 flex-1 rounded-xl bg-gradient-to-br from-indigo-500/25 to-transparent border border-white/10 p-3 relative overflow-hidden group/card">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full" />
                        <Cpu className="w-5 h-5 text-indigo-300 mb-2 relative" />
                        <div className="h-2 w-20 rounded bg-white/25 mb-2 relative" />
                        <div className="h-1.5 w-full rounded bg-white/10 mb-3 relative" />
                        <svg viewBox="0 0 120 32" className="w-full h-8 text-indigo-400/90" fill="none" aria-hidden>
                          <motion.path
                            d="M0 24 L20 18 L40 22 L58 8 L78 14 L98 6 L120 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </svg>
                      </div>
                      <div className="h-28 flex-1 rounded-xl bg-gradient-to-br from-violet-500/25 to-transparent border border-white/10 p-3 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/15 blur-2xl rounded-full" />
                        <BarChart3 className="w-5 h-5 text-violet-300 mb-2 relative" />
                        <div className="h-2 w-16 rounded bg-white/25 mb-2 relative" />
                        <div className="flex gap-1 mt-2 h-11 items-end relative">
                          {[14, 22, 18, 36, 24, 40, 28].map((h, i) => (
                            <motion.div
                              key={i}
                              className="flex-1 min-w-[5px] rounded-sm bg-gradient-to-t from-violet-600/60 to-indigo-400/90"
                              initial={{ height: 4 }}
                              animate={{ height: h }}
                              transition={{ delay: 0.5 + i * 0.06, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-2 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          Live signal
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                          Healthy
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400"
                          initial={{ width: '0%' }}
                          animate={{ width: '78%' }}
                          transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Hiring funnel · bench · project risk · cost—correlated, not siloed.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-6 -right-4 hidden lg:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/15 items-center justify-center backdrop-blur-md shadow-lg shadow-indigo-900/40"
                animate={m.floatDur ? m.float : false}
                transition={{ duration: m.floatDur || 1, repeat: m.floatDur ? Infinity : 0, ease: 'easeInOut' }}
              >
                <Orbit className="w-7 h-7 text-indigo-200" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }} className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-2">
            <motion.div className="w-1 h-2 rounded-full bg-indigo-400" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} />
          </motion.div>
        </div>
      </section>

      {/* Live signal strip */}
      <section className="relative z-10 py-14 md:py-16 border-y border-white/10 bg-gradient-to-b from-slate-950 via-indigo-950/25 to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Cpu, k: 'Agent-ready', v: 'Copilot + APIs', d: 'Hooks for HR copilot, workflows, and integrations.' },
              { icon: BarChart3, k: 'Executive KPIs', v: 'Board-grade', d: 'Dashboards and packs your CFO will trust.' },
              { icon: FolderKanban, k: 'Projects ↔ People', v: 'One bridge', d: 'Demands, allocations, bench—same graph.' },
              { icon: Shield, k: 'Governance', v: 'Approvals built-in', d: 'Lifecycle and staffing gates with audit trails.' },
            ].map((item, i) => (
              <motion.div
                key={item.k}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl overflow-hidden hover:border-indigo-400/35 transition-colors duration-300"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(99,102,241,0.18),transparent_55%)]" />
                <item.icon className="w-8 h-8 text-indigo-300 mb-3 relative" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/90 mb-1 relative" style={outfit}>
                  {item.k}
                </p>
                <p className="text-lg font-bold text-white mb-1 relative" style={syne}>
                  {item.v}
                </p>
                <p className="text-sm text-slate-400 leading-snug relative">{item.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 border-y border-white/10 bg-slate-900/50 overflow-hidden py-3 space-y-3">
        <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
        <div className="flex w-max landing-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((label, i) => (
            <span key={`${label}-a-${i}`} className="mx-6 text-sm font-semibold text-slate-400 whitespace-nowrap" style={outfit}>
              {label}
              <span className="mx-6 text-indigo-500/50">·</span>
            </span>
          ))}
        </div>
        <div className="flex w-max landing-marquee-track-reverse opacity-70">
          {[...MARQUEE_ITEMS].reverse().map((label, i) => (
            <span key={`${label}-b-${i}`} className="mx-6 text-xs font-medium text-slate-500 whitespace-nowrap tracking-wide uppercase">
              {label}
              <span className="mx-6 text-violet-500/40">·</span>
            </span>
          ))}
          {[...MARQUEE_ITEMS].reverse().map((label, i) => (
            <span key={`${label}-c-${i}`} className="mx-6 text-xs font-medium text-slate-500 whitespace-nowrap tracking-wide uppercase">
              {label}
              <span className="mx-6 text-violet-500/40">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bento highlights */}
      <section className="relative py-20 md:py-28 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="Surface area"
            title="Every capability, one orbit"
            description="Bento-sized previews of what your teams get on day one—click through to the live module."
            light
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 auto-rows-fr">
            {highlights.map(({ icon: Icon, title, text, to, span }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: idx * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group ${span}`}
              >
                <Link
                  to={to}
                  className="block h-full rounded-2xl p-[1px] bg-gradient-to-br from-white/25 via-indigo-500/30 to-violet-600/40 hover:from-white/40 hover:via-indigo-400/50 hover:to-fuchsia-500/45 transition-all duration-300"
                >
                  <div className="h-full rounded-2xl bg-slate-900/90 backdrop-blur-xl p-6 flex flex-col border border-white/5 group-hover:border-white/15 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-indigo-500/10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/10 flex items-center justify-center mb-4 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-indigo-300" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors" style={outfit}>
                      {title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed flex-1">{text}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300">
                      Enter module
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Light band: deep modules */}
      <section className="relative py-20 md:py-28 bg-[#f4f6fb] text-slate-900">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 md:space-y-28">
          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Analytics"
              title="Executive clarity without the spreadsheet maze"
              description="From dashboard tiles to KPI packs—built for leaders who need defensible numbers, fast."
            />
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  icon: LayoutDashboard,
                  t: 'Dashboard',
                  d: 'Cross-module snapshot: hiring funnel, workforce signals, and alerts.',
                  to: '/dashboard',
                },
                {
                  icon: BarChart3,
                  t: 'Executive KPIs',
                  d: 'Horizons, definitions, and export-ready leadership views.',
                  to: '/executive-kpis',
                },
              ].map((x) => (
                <Card
                  key={x.t}
                  className="border-slate-200/80 shadow-lg shadow-slate-200/40 overflow-hidden group hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <CardHeader>
                    <x.icon className="w-9 h-9 text-indigo-600 mb-1" />
                    <CardTitle style={outfit}>{x.t}</CardTitle>
                    <CardDescription className="text-slate-600 text-base">{x.d}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="link" className="px-0 text-indigo-600 font-semibold" asChild>
                      <Link to={x.to}>Open →</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Talent"
              title="Smart hiring — from requisition to signed offer"
              description="Structured stages, assessments, and interview orchestration so great candidates never slip through cracks."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Jobs & requisitions', to: '/jobs', icon: Briefcase },
                { label: 'Candidates & profiles', to: '/candidates', icon: Users },
                { label: 'Pipeline & stages', to: '/pipeline', icon: GitBranch },
                { label: 'Interviews', to: '/interviews', icon: Calendar },
                { label: 'Referrals', to: '/referrals', icon: UserPlus },
                { label: 'Assessments', to: '/assessments', icon: ClipboardCheck },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200/80 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-violet-500/0 group-hover:from-indigo-500/5 group-hover:to-violet-500/5 transition-colors" />
                  <div className="relative w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <item.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="relative font-semibold text-slate-800 flex-1" style={outfit}>
                    {item.label}
                  </span>
                  <ArrowRight className="relative w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="People & projects"
              title="Lifecycle, intelligence, and delivery in one motion"
              description="Skills, forecasts, utilization, and project governance—wired so planning matches reality."
            />
            <div className="grid md:grid-cols-3 gap-5">
              <Card className="border-slate-200/80 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <UserCog className="w-8 h-8 text-indigo-600" />
                  <CardTitle style={outfit}>Employee master</CardTitle>
                  <CardDescription className="text-slate-600">Directory, hierarchy, and profile truth.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="px-0 text-indigo-600 font-semibold" asChild>
                    <Link to="/employees">Employees →</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <GitBranch className="w-8 h-8 text-indigo-600" />
                  <CardTitle style={outfit}>Lifecycle & approvals</CardTitle>
                  <CardDescription className="text-slate-600">Gated transitions with audit-friendly events.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="px-0 text-indigo-600 font-semibold" asChild>
                    <Link to="/employee-lifecycle">Lifecycle →</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <FolderKanban className="w-8 h-8 text-indigo-600" />
                  <CardTitle style={outfit}>Resource & projects</CardTitle>
                  <CardDescription className="text-slate-600">Optimization, project section, demands, allocations.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <Button variant="link" className="px-0 text-indigo-600 font-semibold h-auto py-1 justify-start" asChild>
                    <Link to="/resource-optimization">Resource optimization →</Link>
                  </Button>
                  <Button variant="link" className="px-0 text-indigo-600 font-semibold h-auto py-1 justify-start" asChild>
                    <Link to="/resource-project-optimization/projects/dashboard">Project hub →</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Culture & ops"
              title="Engagement, learning, automation—and the glue underneath"
              description="Retention signals, L&D paths, copilots, transformation maps, and admin-grade connectors."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: GraduationCap, t: 'Training', to: '/training-recommendations' },
                { icon: Heart, t: 'Engagement', to: '/employee-engagement' },
                { icon: Bot, t: 'HR Copilot', to: '/hr-copilot' },
                { icon: Rocket, t: 'Transformation', to: '/transformation' },
                { icon: Shield, t: 'Retention', to: '/employee-retention' },
                { icon: Cog, t: 'Workflow automation', to: '/admin/workflow-automation' },
                { icon: Layers, t: 'Integrations', to: '/admin/integrations' },
                { icon: UserCog, t: 'Roles', to: '/admin/roles' },
              ].map((x) => (
                <Link
                  key={x.t}
                  to={x.to}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-3">
                    <x.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="font-bold text-slate-900" style={outfit}>
                    {x.t}
                  </span>
                  <span className="text-xs text-indigo-600 font-semibold mt-2">Explore</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-900" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        {!prefersReducedMotion ? (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(18)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-white/25"
                style={{
                  width: 2 + (i % 3),
                  height: 2 + (i % 3),
                  left: `${(i * 17) % 96}%`,
                  top: `${(i * 23) % 88}%`,
                }}
                animate={{ opacity: [0.15, 0.85, 0.15], y: [0, -6, 0] }}
                transition={{ duration: 3.2 + (i % 4) * 0.4, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : null}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.h2
            className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight"
            style={outfit}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Ship the future of HR—without ripping out what works.
          </motion.h2>
          <p className="text-lg text-indigo-100/90 mb-10 max-w-2xl mx-auto">
            Your workspace is one click away. Permissions follow role—explore the modules that matter to you first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="h-14 px-10 rounded-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-xl"
            >
              <Link to={appEntry}>{appEntryLabel}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-14 px-10 rounded-full border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white backdrop-blur-sm"
            >
              <Link to="/login">Account access</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold" style={outfit}>
                AAI-HRMS Systems
              </p>
              <p>© {new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              Application
            </Link>
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              Top
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
