import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  Users,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Briefcase,
  Sparkles,
  Loader2,
  Filter,
  Layers,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { orderJobsSeededExcelPattern } from '../lib/jobSource';
import SmartHiringPageHeader from '../components/hiring/SmartHiringPageHeader';

const JobsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const withoutMatches = searchParams.get('without_matches') === '1';
  const lowFit = searchParams.get('low_fit') === '1';

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, withoutMatches, lowFit]);

  const fetchJobs = async () => {
    setFetchError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (withoutMatches) params.without_fit_scores = true;
      if (lowFit) params.low_fit = true;
      const response = await jobsApi.list(params);
      setJobs(response.data);
    } catch (error) {
      setFetchError('Failed to load jobs. Check your connection and try again.');
      setJobs([]);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await jobsApi.delete(jobId);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const orgSearchBlob = (job) =>
    [job?.business_pillar, job?.business_department, job?.business_sub_department, job?.project_id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const filteredJobs = (jobs || []).filter((job) => {
    const title = (job?.title || '').toLowerCase();
    const location = (job?.location || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return title.includes(q) || location.includes(q) || orgSearchBlob(job).includes(q);
  });

  const displayJobs = useMemo(
    () => orderJobsSeededExcelPattern(filteredJobs),
    [filteredJobs]
  );

  const totalJobsCount = jobs.length;
  const visibleJobsCount = filteredJobs.length;
  const jobsCountLabel =
    visibleJobsCount === totalJobsCount
      ? `${totalJobsCount} job requisitions`
      : `${visibleJobsCount} of ${totalJobsCount} job requisitions`;

  const fmtOrg = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-100 text-emerald-700';
      case 'PAUSED': return 'bg-amber-100 text-amber-700';
      case 'CLOSED': return 'bg-slate-100 text-slate-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <SmartHiringPageHeader
          title="Jobs"
          description={jobsCountLabel}
          testId="jobs-heading"
          filters={
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-jobs-input"
                  aria-label="Search jobs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 shrink-0" data-testid="status-filter" aria-label="Filter jobs by status">
                  <Filter className="w-4 h-4 mr-2" aria-hidden />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          actions={
            <Link to="/jobs/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" data-testid="create-job-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </Link>
          }
        />
      </motion.div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : fetchError ? (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <h3 className="text-lg font-semibold text-red-900" style={{ fontFamily: 'Outfit' }}>
                Could not load jobs
              </h3>
              <p className="text-red-700 text-sm max-w-md">{fetchError}</p>
              <Button variant="outline" onClick={fetchJobs} aria-label="Retry loading jobs">
                Try again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : displayJobs.length > 0 ? (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="jobs-grid">
          {displayJobs.map((job) => (
            <div key={job.id}>
              <Card className="card-hover group h-full" data-testid={`job-card-${job.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Job actions for ${job.title}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link to={`/jobs/${job.id}`}>
                    <h3 className="font-semibold text-slate-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1" style={{ fontFamily: 'Outfit' }}>
                      {job.title}
                    </h3>
                  </Link>

                  {job.normalized_title && job.normalized_title !== job.title && (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 mb-3">
                      <Sparkles className="w-3 h-3" />
                      <span>{job.normalized_title}</span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                        {job.work_mode && (
                          <Badge variant="secondary" className="text-xs">{job.work_mode}</Badge>
                        )}
                      </div>
                    )}
                    {job.seniority && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>{job.seniority} Level</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-white p-3 mb-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      <Layers className="w-3.5 h-3.5" />
                      Requisition Details
                    </div>
                    <dl className="grid grid-cols-1 gap-1 text-xs text-slate-600">
                      <div className="flex gap-2 min-w-0">
                        <dt className="text-slate-500 shrink-0 w-28">Pillar</dt>
                        <dd className="min-w-0 truncate font-medium text-slate-800">{fmtOrg(job.business_pillar)}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <dt className="text-slate-500 shrink-0 w-28">Department</dt>
                        <dd className="min-w-0 truncate font-medium text-slate-800">{fmtOrg(job.business_department)}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <dt className="text-slate-500 shrink-0 w-28">Sub-dept</dt>
                        <dd className="min-w-0 truncate font-medium text-slate-800">{fmtOrg(job.business_sub_department)}</dd>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <dt className="text-slate-500 shrink-0 w-28">Project ID</dt>
                        <dd className="min-w-0 truncate font-medium text-slate-800">{fmtOrg(job.project_id)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Skills Preview */}
                  {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.skills.slice(0, 3).map((skill, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className={`text-xs ${skill.skill_type === 'MUST_HAVE' ? 'badge-must-have' : 'badge-good-to-have'}`}
                        >
                          {skill.skill_name}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{job.candidate_count || 0} candidates</span>
                    </div>
                    <Link to={`/pipeline?job=${job.id}`}>
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                        Pipeline
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No jobs found
              </h3>
              <p className="text-slate-500 text-center mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first job requisition to get started'}
              </p>
              <Link to="/jobs/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default JobsPage;
