import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { applicationsApi, jobsApi } from '../lib/api';
import { interviewProposalsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { FitScoreRing } from '../components/FitScore';
import { 
  Loader2,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const PIPELINE_STAGES = [
  { id: 'SOURCED', label: 'Sourced', color: 'bg-slate-100 text-slate-700' },
  { id: 'SCREENING', label: 'Screening', color: 'bg-blue-100 text-blue-700' },
  { id: 'ASSESSMENT_SENT', label: 'Assessment', color: 'bg-purple-100 text-purple-700' },
  { id: 'INTERVIEW_1', label: 'Interview', color: 'bg-amber-100 text-amber-700' },
  { id: 'OFFER', label: 'Offer', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'JOINED', label: 'Joined', color: 'bg-green-500 text-white' }
];

const PipelinePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(jobId || '');
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Keep selected job in sync with loaded OPEN jobs (Radix Select breaks on value="" or unknown ids).
  useEffect(() => {
    if (jobs.length === 0) {
      if (selectedJob) setSelectedJob('');
      return;
    }
    const valid = jobs.some((j) => j.id === selectedJob);
    if (!selectedJob || !valid) {
      setSelectedJob(jobs[0].id);
    }
  }, [jobs, selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      fetchPipeline();
      fetchProposals();
      setSearchParams({ job: selectedJob });
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.list('OPEN');
      setJobs(response.data);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchPipeline = async () => {
    if (!selectedJob) return;
    try {
      const response = await applicationsApi.getPipeline(selectedJob);
      const raw = response.data && typeof response.data === 'object' ? response.data : {};
      const normalized = {};
      Object.keys(raw).forEach((k) => {
        normalized[k] = Array.isArray(raw[k]) ? raw[k] : [];
      });
      setPipeline(normalized);
    } catch (error) {
      toast.error('Failed to fetch pipeline');
    }
  };

  const fetchProposals = async () => {
    if (!selectedJob) return;
    setProposalsLoading(true);
    try {
      const response = await interviewProposalsApi.listByJob(selectedJob);
      setProposals(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch interview proposals');
    } finally {
      setProposalsLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    setUpdating(true);
    try {
      await applicationsApi.updateStage(draggableId, {
        stage: destination.droppableId
      });

      // Update local state
      const newPipeline = { ...pipeline };
      const [moved] = newPipeline[source.droppableId].splice(source.index, 1);
      moved.stage = destination.droppableId;
      if (!newPipeline[destination.droppableId]) {
        newPipeline[destination.droppableId] = [];
      }
      newPipeline[destination.droppableId].splice(destination.index, 0, moved);
      setPipeline(newPipeline);

      toast.success('Candidate moved successfully');
    } catch (error) {
      toast.error('Failed to update stage');
      fetchPipeline(); // Refresh to get correct state
    } finally {
      setUpdating(false);
    }
  };

  const getStageCount = (stageId) => {
    return pipeline[stageId]?.length || 0;
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectValue = jobs.some((j) => j.id === selectedJob) ? selectedJob : undefined;

  const formatSlot = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Hiring Pipeline
          </h1>
          <p className="text-slate-600 mt-1">Drag candidates between stages</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectValue} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-64" data-testid="job-select">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedJob && (
            <Link to={`/jobs/${selectedJob}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Job
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pipeline Stats */}
      {selectedJobData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedJobData.title}</p>
                  <p className="text-sm text-slate-500">{selectedJobData.candidate_count} candidates total</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {PIPELINE_STAGES.slice(0, 4).map((stage) => (
                  <div key={stage.id} className="text-center">
                    <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                      {getStageCount(stage.id)}
                    </p>
                    <p className="text-xs text-slate-500">{stage.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      {selectedJob ? (
        <>
          {proposalsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            proposals.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Outfit' }}>
                    Interview Proposals (HR Approval)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Auto-generated from top ranked matches. Approve to schedule interviews.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {proposals.slice(0, 20).map((p) => (
                      <div key={p.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{p.candidate?.full_name || p.candidate_id}</p>
                            <p className="text-sm text-slate-500">{p.candidate?.headline || p.candidate?.email || ''}</p>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {p.status?.toLowerCase() || 'pending'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(p.proposed_slots || []).map((s) => (
                            <div key={s.slot_index} className="text-sm text-slate-700">
                              <span className="font-medium">Slot {s.slot_index + 1}:</span> {formatSlot(s.scheduled_start)}
                            </div>
                          ))}
                        </div>

                        {p.status === 'PENDING' && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700"
                              onClick={async () => {
                                try {
                                  await interviewProposalsApi.approve(p.id, { slot_index: 0, interviewers: [], meeting_link: null, notes: null });
                                  toast.success('Interview approved (Slot 1)');
                                  await fetchPipeline();
                                  await fetchProposals();
                                } catch (e) {
                                  toast.error(e?.response?.data?.detail || 'Failed to approve');
                                }
                              }}
                            >
                              Approve Slot 1
                            </Button>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700"
                              onClick={async () => {
                                try {
                                  await interviewProposalsApi.approve(p.id, { slot_index: 1, interviewers: [], meeting_link: null, notes: null });
                                  toast.success('Interview approved (Slot 2)');
                                  await fetchPipeline();
                                  await fetchProposals();
                                } catch (e) {
                                  toast.error(e?.response?.data?.detail || 'Failed to approve');
                                }
                              }}
                            >
                              Approve Slot 2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                const reason = window.prompt('Rejection reason (optional):', 'Rejected by HR') || 'Rejected by HR';
                                try {
                                  await interviewProposalsApi.reject(p.id, { reason });
                                  toast.success('Proposal rejected');
                                  await fetchPipeline();
                                  await fetchProposals();
                                } catch (e) {
                                  toast.error(e?.response?.data?.detail || 'Failed to reject');
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {p.status === 'REJECTED' && p.rejected_reason && (
                          <p className="text-xs text-red-700">{p.rejected_reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`kanban-column min-w-[280px] w-[280px] flex-shrink-0 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge className={stage.color}>{stage.label}</Badge>
                          <span className="text-sm text-slate-500">
                            ({getStageCount(stage.id)})
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(pipeline[stage.id] || [])
                          .filter((app) => app && app.id)
                          .map((app, index) => (
                          <Draggable key={app.id} draggableId={String(app.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-card ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500' : ''
                                }`}
                                data-testid={`pipeline-card-${app.id}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 truncate">
                                      {app.candidate?.full_name}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate">
                                      {app.candidate?.headline || app.candidate?.email}
                                    </p>
                                  </div>
                                </div>

                                {app.fit_score && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <FitScoreRing score={app.fit_score.final_score} size={36} strokeWidth={4} />
                                    <div className="text-xs">
                                      <p className="text-slate-600">Fit Score</p>
                                      {app.fit_score.must_have_ok ? (
                                        <span className="text-emerald-600 flex items-center gap-0.5">
                                          <CheckCircle className="w-3 h-3" /> OK
                                        </span>
                                      ) : (
                                        <span className="text-red-600 flex items-center gap-0.5">
                                          <XCircle className="w-3 h-3" /> Missing
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {app.candidate?.skills?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {app.candidate.skills.slice(0, 3).map((skill, i) => (
                                      <Badge key={i} variant="outline" className="text-xs py-0">
                                        {skill.skill_name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <Link to={`/candidates/${app.candidate_id}`}>
                                  <Button variant="ghost" size="sm" className="w-full mt-2 text-indigo-600">
                                    View Profile
                                    <ArrowRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {getStageCount(stage.id) === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          Drop candidates here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
              Select a Job
            </h3>
            <p className="text-slate-500 text-center mb-4">
              Choose a job to view its hiring pipeline
            </p>
            {jobs.length === 0 && (
              <Link to="/jobs/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create Your First Job
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 shadow-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-slate-600">Updating...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PipelinePage;
