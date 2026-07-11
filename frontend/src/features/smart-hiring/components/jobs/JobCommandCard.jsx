import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { fmtNum, fmtOrg } from '@/shared/lib/jobsCommandUtils';

function statusClass(status) {
  if (status === 'OPEN') return 'status';
  if (status === 'PAUSED') return 'status warn';
  if (status === 'CLOSED') return 'status warn';
  return 'status warn';
}

export default function JobCommandCard({ job, onDelete }) {
  const navigate = useNavigate();
  const skills = job.skills || [];
  const riskClass =
    job.risk === 'high' ? 'jobs-risk-high' : job.risk === 'medium' ? 'jobs-risk-medium' : 'jobs-risk-low';
  const riskLabel = job.risk === 'high' ? 'High' : job.risk === 'medium' ? 'Medium' : 'Low';
  const locationLabel = [job.location, job.work_mode === 'remote' ? 'Remote' : null]
    .filter(Boolean)
    .join(' · ') || '—';

  return (
    <article className="card jobs-card" data-testid={`job-card-${job.id}`}>
      <div className="jobs-card-top">
        <div>
          <div className="jobs-card-icon" aria-hidden>
            ▣
          </div>
          <h3 className="jobs-card-title">
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          {job.normalized_title ? (
            <span className="jobs-card-link">✧ {job.normalized_title}</span>
          ) : null}
          <div className="jobs-card-meta">
            <span>⌖ {locationLabel}</span>
            {job.seniority ? <span>◷ {job.seniority} Level</span> : null}
            <span className={statusClass(job.status)}>{job.status}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="jobs-card-menu" aria-label={`Actions for ${job.title}`}>
              ⋮
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}/edit`)}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(job.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="jobs-card-body">
        <div className="jobs-card-details">
          <div>
            Pillar<b>{fmtOrg(job.business_pillar)}</b>
          </div>
          <div>
            Department<b>{fmtOrg(job.business_department)}</b>
          </div>
          <div>
            Sub-dept<b>{fmtOrg(job.business_sub_department)}</b>
          </div>
          <div>
            Project ID<b>{fmtOrg(job.project_id)}</b>
          </div>
        </div>

        {skills.length > 0 ? (
          <div className="jobs-card-chips">
            {skills.slice(0, 3).map((skill, i) => (
              <span key={`${skill.skill_name}-${i}`} className="chip">
                {skill.skill_name}
              </span>
            ))}
            {skills.length > 3 ? <span className="chip">+{skills.length - 3} more</span> : null}
          </div>
        ) : null}

        <div className="bar jobs-card-health" aria-hidden>
          <i style={{ width: `${job.healthPct}%` }} />
        </div>
      </div>

      <div className="jobs-card-footer">
        <div>
          Candidates<b>{fmtNum(job.pipelineCount)}</b>
        </div>
        <div>
          High Fit<b>{fmtNum(job.highFitCount)}</b>
        </div>
        <div>
          Risk<b className={cn(riskClass)}>{riskLabel}</b>
        </div>
      </div>
    </article>
  );
}
