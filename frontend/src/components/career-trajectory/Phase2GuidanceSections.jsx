import React, { useMemo } from 'react';
import {
  Lightbulb,
  ListChecks,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Users,
  MessageSquare,
  GitBranch,
  Target,
  AlertTriangle,
  UserCircle,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

const CATEGORY_META = {
  career_trajectory: { label: 'Career trajectory', icon: TrendingUp, accent: 'from-violet-500 to-indigo-600' },
  leadership: { label: 'Leadership', icon: Users, accent: 'from-indigo-500 to-blue-600' },
  communication: { label: 'Communication', icon: MessageSquare, accent: 'from-sky-500 to-cyan-600' },
  manager_fit: { label: 'Manager fit', icon: GitBranch, accent: 'from-fuchsia-500 to-purple-600' },
  contextual_fit: { label: 'Contextual fit', icon: Target, accent: 'from-emerald-500 to-teal-600' },
  retention: { label: 'Retention', icon: AlertTriangle, accent: 'from-amber-500 to-orange-600' },
};

const SEVERITY_BADGE = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-900 border-amber-200',
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const SEVERITY_RING = {
  low: 'ring-emerald-200/80',
  medium: 'ring-amber-200/80',
  high: 'ring-rose-200/80',
  info: 'ring-indigo-200/80',
};

const PRIORITY_STYLES = {
  high: 'bg-rose-600 text-white border-transparent shadow-sm',
  medium: 'bg-indigo-600 text-white border-transparent shadow-sm',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

function ownerLabel(role) {
  const labels = {
    hiring_manager: 'Hiring manager',
    recruiter: 'Recruiter',
    interviewer: 'Interviewer',
    hiring_team: 'Hiring team',
    candidate: 'Candidate',
  };
  return labels[role] || role || 'Team';
}

function formatTimeframe(tf) {
  if (!tf) return null;
  return tf.replace(/_/g, ' ');
}

function AccordionSectionTrigger({ icon: Icon, title, description, accentClass, count }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white shadow-md`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {title}
          </h3>
          {count != null ? (
            <Badge variant="secondary" className="font-normal text-xs">
              {count}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-slate-500 mt-0.5 font-normal">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function InsightCard({ insight, index }) {
  const meta = CATEGORY_META[insight.category] || {
    label: insight.category || 'Insight',
    icon: Sparkles,
    accent: 'from-slate-500 to-slate-600',
  };
  const CatIcon = meta.icon;
  const severity = insight.severity || 'info';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ${SEVERITY_RING[severity] || SEVERITY_RING.info} transition-shadow hover:shadow-md`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${meta.accent}`} />
      <div className="flex gap-3 pl-2">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.accent} text-white`}
        >
          <CatIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Badge variant="outline" className={`text-[10px] capitalize ${SEVERITY_BADGE[severity]}`}>
              {severity}
            </Badge>
            <span className="text-xs text-slate-500">{meta.label}</span>
          </div>
          <p className="font-semibold text-slate-900 leading-snug">{insight.title}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{insight.summary}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const priority = rec.priority || 'medium';
  return (
    <div className="relative rounded-xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/40 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}>
              {priority}
            </span>
            {rec.audience ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                <UserCircle className="h-3 w-3" />
                {rec.audience.replace(/_/g, ' ')}
              </span>
            ) : null}
          </div>
          <p className="font-semibold text-slate-900 leading-snug">{rec.title}</p>
          {rec.rationale ? (
            <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-3">
              {rec.rationale}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActionItemCard({ act, index }) {
  const priority = act.priority || 'medium';
  return (
    <div className="flex gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-300 bg-white text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[priority]}`}>
            {priority}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
            <UserCircle className="h-3 w-3" />
            {ownerLabel(act.owner_role)}
          </span>
          {act.timeframe ? (
            <span className="inline-flex items-center gap-1 text-xs text-teal-700">
              <CalendarClock className="h-3 w-3" />
              {formatTimeframe(act.timeframe)}
            </span>
          ) : null}
        </div>
        <p className="font-medium text-slate-900 leading-snug">{act.title}</p>
        {act.status === 'open' ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Open</span>
        ) : null}
      </div>
      <span className="text-xs font-mono text-slate-400 self-start">{String(index + 1).padStart(2, '0')}</span>
    </div>
  );
}

export function Phase2GuidanceSections({ report }) {
  const insights = report?.insights || [];
  const recommendations = report?.recommendations || [];
  const actionItems = report?.action_items || [];
  const nextSteps = report?.recommended_next_steps || [];

  const defaultSection = useMemo(() => {
    if (insights.length) return 'insights';
    if (recommendations.length) return 'recommendations';
    if (actionItems.length) return 'actions';
    if (nextSteps.length) return 'next-steps';
    return undefined;
  }, [insights.length, recommendations.length, actionItems.length, nextSteps.length]);

  if (!insights.length && !recommendations.length && !actionItems.length && !nextSteps.length) {
    return null;
  }

  const panelClass =
    'border rounded-xl shadow-sm overflow-hidden border-b-0 last:border-b';

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200" data-testid="phase2-guidance-accordion">
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px]">
        <div className="rounded-[11px] bg-white px-4 py-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <p className="text-sm font-medium text-slate-800">
            AI-generated hiring guidance — expand one section at a time.
          </p>
        </div>
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue={defaultSection}
        key={`${report?.id || 'report'}-${defaultSection}`}
        className="space-y-3"
      >
        {insights.length > 0 ? (
          <AccordionItem value="insights" className={`${panelClass} border-amber-200/80`} data-testid="phase2-insights">
            <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-amber-50/80 to-orange-50/40 hover:no-underline [&[data-state=open]]:border-b border-amber-100/60">
              <AccordionSectionTrigger
                icon={Lightbulb}
                title="Insights"
                description="Key signals about trajectory, leadership, communication, and manager alignment."
                accentClass="from-amber-500 to-orange-500"
                count={insights.length}
              />
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-3 bg-white">
              {insights.map((ins, i) => (
                <InsightCard key={ins.id || ins.title} insight={ins} index={i} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {recommendations.length > 0 ? (
          <AccordionItem value="recommendations" className={`${panelClass} border-indigo-200/80`} data-testid="phase2-recommendations">
            <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-indigo-50/90 to-violet-50/50 hover:no-underline [&[data-state=open]]:border-b border-indigo-100/60">
              <AccordionSectionTrigger
                icon={ListChecks}
                title="Recommendations"
                description="Suggested moves for recruiters, interviewers, and hiring managers."
                accentClass="from-indigo-500 to-violet-600"
                count={recommendations.length}
              />
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-3 bg-white">
              {recommendations.map((rec, i) => (
                <RecommendationCard key={rec.id || rec.title} rec={rec} index={i} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {actionItems.length > 0 ? (
          <AccordionItem value="actions" className={`${panelClass} border-emerald-200/80`} data-testid="phase2-action-items">
            <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 hover:no-underline [&[data-state=open]]:border-b border-emerald-100/60">
              <AccordionSectionTrigger
                icon={ClipboardList}
                title="Action items"
                description="Concrete tasks with owner and timeframe to advance this candidate."
                accentClass="from-emerald-500 to-teal-600"
                count={actionItems.length}
              />
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-3 bg-white">
              {actionItems.map((act, i) => (
                <ActionItemCard key={act.id || act.title} act={act} index={i} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {nextSteps.length > 0 ? (
          <AccordionItem value="next-steps" className={`${panelClass} border-slate-200`}>
            <AccordionTrigger className="px-4 py-3 bg-slate-50/80 hover:no-underline [&[data-state=open]]:border-b border-slate-200">
              <AccordionSectionTrigger
                icon={ArrowRight}
                title="Summary next steps"
                description="Condensed checklist from insights and recommendations."
                accentClass="from-slate-500 to-indigo-600"
                count={nextSteps.length}
              />
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 bg-white">
              <ol className="space-y-2">
                {nextSteps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  );
}
