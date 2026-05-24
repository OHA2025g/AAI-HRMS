import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ClipboardCheck, Clock, FileQuestion, Eye, Briefcase, ExternalLink, Copy, Upload, Archive, Star } from 'lucide-react';
import { getTypeColor } from '../../hooks/useAssessmentsWorkspace';

export default function AssessmentFilterBar({
  jobs,
  jobFilter,
  typeFilter,
  usageFilter,
  sortFilter,
  searchQ,
  setFilter,
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
      <Input
        placeholder="Search assessments…"
        value={searchQ}
        onChange={(e) => setFilter('q', e.target.value)}
        className="lg:max-w-xs"
      />
      <Select value={jobFilter || 'all'} onValueChange={(v) => setFilter('job_id', v === 'all' ? '' : v)}>
        <SelectTrigger className="lg:w-48">
          <SelectValue placeholder="All jobs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All jobs</SelectItem>
          {(jobs || []).map((j) => (
            <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={typeFilter || 'all'} onValueChange={(v) => setFilter('type', v === 'all' ? '' : v)}>
        <SelectTrigger className="lg:w-44">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="SCREENING">Screening</SelectItem>
          <SelectItem value="CORE_SKILL">Core Skill</SelectItem>
          <SelectItem value="WORK_SIMULATION">Work Simulation</SelectItem>
          <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
        </SelectContent>
      </Select>
      <Select value={usageFilter || 'all'} onValueChange={(v) => setFilter('usage', v === 'all' ? '' : v)}>
        <SelectTrigger className="lg:w-40">
          <SelectValue placeholder="Usage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="in_use">In use</SelectItem>
          <SelectItem value="unused">Unused</SelectItem>
          <SelectItem value="stale">Stale (30d+ unused)</SelectItem>
          <SelectItem value="missing">Missing for job</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortFilter || '-created_at'} onValueChange={(v) => setFilter('sort', v)}>
        <SelectTrigger className="lg:w-44" data-testid="assessment-sort-filter">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="-created_at">Newest first</SelectItem>
          <SelectItem value="created_at">Oldest first</SelectItem>
          <SelectItem value="title">Title A–Z</SelectItem>
          <SelectItem value="-usage">Most invited</SelectItem>
          <SelectItem value="usage">Least invited</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function AssessmentLibraryGrid({
  assessments,
  jobs,
  onPreview,
  onInvite,
  onDuplicate,
  onPublish,
  onArchive,
  onSetPrimary,
}) {
  if (!assessments.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-slate-500">No assessments match your filters.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assessments.map((assessment) => {
        const usage = assessment.usage || {};
        const jobTitle = jobs.find((j) => j.id === assessment.job_id)?.title || 'Unknown Job';
        return (
          <Card key={assessment.id} className="card-hover h-full" data-testid={`assessment-card-${assessment.id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getTypeColor(assessment.assessment_type)}>
                    {assessment.assessment_type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{assessment.status || 'DRAFT'}</Badge>
                  {assessment.is_primary ? (
                    <Badge className="bg-violet-100 text-violet-800 text-xs">Primary</Badge>
                  ) : null}
                </div>
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                {assessment.title}
              </h3>
              <div className="space-y-2 mb-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span className="truncate">{jobTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {assessment.duration_minutes} min ·{' '}
                    {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4" />
                  <span>
                    {assessment.questions?.length || 0} questions · {usage.invited_count || 0} invited ·{' '}
                    {usage.pass_count || 0} passed
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>
                    Pipeline: {usage.sent_count || 0} sent · {usage.cleared_count || 0} cleared
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <span className="text-sm text-slate-600">{assessment.total_marks} marks</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Link to={`/pipeline?job=${assessment.job_id}&stage=ASSESSMENT`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Open pipeline for ${jobTitle}`}
                      title="Open pipeline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                  {onDuplicate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Duplicate assessment ${assessment.title || assessment.id}`}
                      title="Duplicate"
                      onClick={() => onDuplicate(assessment)}
                      data-testid={`duplicate-assessment-${assessment.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  ) : null}
                  {onPublish && assessment.status !== 'ACTIVE' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Publish assessment ${assessment.title || assessment.id}`}
                      title="Publish"
                      onClick={() => onPublish(assessment)}
                      data-testid={`publish-assessment-${assessment.id}`}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  ) : null}
                  {onInvite && assessment.status === 'ACTIVE' ? (
                    <Button variant="outline" size="sm" onClick={() => onInvite(assessment)}>
                      Invite
                    </Button>
                  ) : null}
                  {onSetPrimary && assessment.status === 'ACTIVE' && !assessment.is_primary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Set ${assessment.title || 'assessment'} as primary for job`}
                      title="Set as primary for job"
                      onClick={() => onSetPrimary(assessment)}
                      data-testid={`set-primary-assessment-${assessment.id}`}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  ) : null}
                  {onArchive && assessment.status !== 'ARCHIVED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Archive assessment ${assessment.title || assessment.id}`}
                      title="Archive"
                      onClick={() => onArchive(assessment)}
                      data-testid={`archive-assessment-${assessment.id}`}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" className="text-indigo-600" onClick={() => onPreview(assessment.id)}>
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
