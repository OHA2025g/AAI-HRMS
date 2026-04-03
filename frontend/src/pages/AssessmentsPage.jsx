import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assessmentsApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Plus, 
  ClipboardCheck,
  Clock,
  FileQuestion,
  Sparkles,
  Loader2,
  Eye,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

const AssessmentsPage = () => {
  const navigate = useNavigate();
  const placement = usePlacementFilters();
  const [assessments, setAssessments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAssessment, setPreviewAssessment] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    job_id: '',
    assessment_type: 'CORE_SKILL',
    title: '',
    duration_minutes: 60
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assessmentsRes, jobsRes] = await Promise.all([
        assessmentsApi.list(),
        jobsApi.list('OPEN')
      ]);
      setAssessments(assessmentsRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';
  const filteredJobs = (jobs || []).filter((j) => {
    if (pillarLabel && (j?.business_pillar || '') !== pillarLabel) return false;
    if (deptLabel && (j?.business_department || '') !== deptLabel) return false;
    if (placement.subDepartment && (j?.business_sub_department || '') !== placement.subDepartment) return false;
    if (placement.projectId && (j?.project_id || '') !== placement.projectId) return false;
    return true;
  });

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.job_id || !formData.title) return;

    setGenerating(true);
    try {
      await assessmentsApi.generate(formData.job_id, formData);
      toast.success('Assessment generated with AI!');
      setShowModal(false);
      setFormData({
        job_id: '',
        assessment_type: 'CORE_SKILL',
        title: '',
        duration_minutes: 60
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate assessment');
    } finally {
      setGenerating(false);
    }
  };

  const openPreview = async (assessmentId) => {
    if (!assessmentId) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewAssessment(null);
    try {
      const res = await assessmentsApi.get(assessmentId);
      setPreviewAssessment(res.data || null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load assessment preview');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SCREENING': return 'bg-blue-100 text-blue-700';
      case 'CORE_SKILL': return 'bg-purple-100 text-purple-700';
      case 'WORK_SIMULATION': return 'bg-amber-100 text-amber-700';
      case 'BEHAVIORAL': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
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
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewAssessment(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>
              {previewAssessment?.title || 'Assessment Preview'}
            </DialogTitle>
            <DialogDescription>
              {previewAssessment?.questions?.length ?? 0} questions • {previewAssessment?.duration_minutes ?? '—'} minutes •{' '}
              {previewAssessment?.total_marks ?? '—'} marks
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : previewAssessment ? (
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
              {(previewAssessment.questions || []).map((q, idx) => (
                <Card key={q.id || idx}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span>
                        Q{idx + 1}. {q.question_text}
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {q.question_type} • {q.max_marks ?? 10} marks
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.isArray(q.options) && q.options.length > 0 ? (
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                        {q.options.map((opt, oi) => (
                          <li key={oi}>{opt}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-slate-500">No options (free response)</p>
                    )}
                    {q.skill_tested ? (
                      <p className="text-xs text-slate-500">
                        Skill tested: <span className="font-medium text-slate-700">{q.skill_tested}</span>
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No preview available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Assessments
          </h1>
          <p className="text-slate-600 mt-1">AI-generated tests for candidate evaluation</p>
        </div>
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-assessment-btn">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI Assessment Generator
              </DialogTitle>
              <DialogDescription>
                Select a job and our AI will create relevant test questions
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Job *</Label>
                <Select 
                  value={formData.job_id} 
                  onValueChange={(v) => setFormData({ ...formData, job_id: v })}
                >
                  <SelectTrigger data-testid="assessment-job-select">
                    <SelectValue placeholder="Select a job to base the assessment on" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Assessment Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Data Analyst Technical Assessment"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="assessment-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assessment Type</Label>
                  <Select 
                    value={formData.assessment_type} 
                    onValueChange={(v) => setFormData({ ...formData, assessment_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCREENING">Screening (Quick)</SelectItem>
                      <SelectItem value="CORE_SKILL">Core Skill Test</SelectItem>
                      <SelectItem value="WORK_SIMULATION">Work Simulation</SelectItem>
                      <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-800">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  Our AI will analyze the job requirements and generate relevant questions, 
                  including MCQs, scenario-based questions, and practical assignments.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700" 
                  disabled={generating || !formData.job_id || !formData.title}
                  data-testid="generate-assessment-btn"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Assessments List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : assessments.length > 0 ? (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment) => (
            <motion.div key={assessment.id} variants={itemVariants}>
              <Card className="card-hover h-full" data-testid={`assessment-card-${assessment.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <Badge className={getTypeColor(assessment.assessment_type)}>
                      {assessment.assessment_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-lg text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                    {assessment.title}
                  </h3>

                  <div className="space-y-2 mb-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span className="truncate">
                        {jobs.find(j => j.id === assessment.job_id)?.title || 'Unknown Job'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{assessment.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileQuestion className="w-4 h-4" />
                      <span>{assessment.questions?.length || 0} questions</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm text-slate-600">
                      {assessment.total_marks} marks
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600"
                      onClick={() => openPreview(assessment.id)}
                      data-testid={`assessment-preview-${assessment.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No assessments yet
              </h3>
              <p className="text-slate-500 text-center mb-4">
                Generate your first AI-powered assessment
              </p>
              <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Assessment
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AssessmentsPage;
