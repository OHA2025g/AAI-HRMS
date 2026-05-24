import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { referralsApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  UserPlus,
  Gift,
  Clock,
  CheckCircle,
  Loader2,
  Briefcase,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

const ReferralsPage = () => {
  const placement = usePlacementFilters();
  const [referrals, setReferrals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    job_id: '',
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    resume_text: '',
    note: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [referralsRes, jobsRes] = await Promise.all([
        referralsApi.list(),
        jobsApi.list('OPEN')
      ]);
      setReferrals(referralsRes.data);
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

  const resetForm = () => {
    setFormData({
      job_id: '',
      candidate_name: '',
      candidate_email: '',
      candidate_phone: '',
      resume_text: '',
      note: ''
    });
    setResumeFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (resumeFile) {
        const fd = new FormData();
        fd.append('job_id', formData.job_id);
        fd.append('candidate_name', formData.candidate_name);
        if (formData.candidate_email?.trim()) fd.append('candidate_email', formData.candidate_email.trim());
        if (formData.candidate_phone?.trim()) fd.append('candidate_phone', formData.candidate_phone.trim());
        if (formData.note?.trim()) fd.append('note', formData.note.trim());
        if (formData.resume_text?.trim()) fd.append('resume_text_extra', formData.resume_text.trim());
        fd.append('resume_file', resumeFile);
        res = await referralsApi.createWithResume(fd);
      } else {
        res = await referralsApi.create(formData);
      }
      const fs = res.data?.fit_score;
      const fitMsg =
        fs && fs.final_score != null
          ? ` Job fit score: ${Math.round(Number(fs.final_score))}%.`
          : '';
      toast.success(`Referral submitted.${fitMsg}`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit referral');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'REVIEWED': return 'bg-blue-100 text-blue-700';
      case 'HIRED': return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Referrals
          </h1>
          <p className="text-slate-600 mt-1">Refer candidates and track your submissions</p>
        </div>
        <Dialog
          open={showModal}
          onOpenChange={(open) => {
            setShowModal(open);
            if (!open) setResumeFile(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="submit-referral-btn">
              <UserPlus className="w-4 h-4 mr-2" />
              Submit Referral
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[min(90vh,640px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit' }}>Submit a Referral</DialogTitle>
              <DialogDescription>Refer a candidate for an open position</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Job *</Label>
                <Select 
                  value={formData.job_id} 
                  onValueChange={(v) => setFormData({ ...formData, job_id: v })}
                  required
                >
                  <SelectTrigger data-testid="referral-job-select">
                    <SelectValue placeholder="Select a job position" />
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
                <Label htmlFor="candidate_name">Candidate Name *</Label>
                <Input
                  id="candidate_name"
                  value={formData.candidate_name}
                  onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                  required
                  data-testid="referral-name-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="candidate_email">Email</Label>
                  <Input
                    id="candidate_email"
                    type="email"
                    value={formData.candidate_email}
                    onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                    data-testid="referral-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate_phone">Phone</Label>
                  <Input
                    id="candidate_phone"
                    value={formData.candidate_phone}
                    onChange={(e) => setFormData({ ...formData, candidate_phone: e.target.value })}
                    data-testid="referral-phone-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume_file">Resume / CV (PDF or DOCX)</Label>
                <Input
                  id="resume_file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  data-testid="referral-resume-file"
                />
                <p className="text-xs text-slate-500">
                  When attached, skills and experience are extracted and saved on the candidate profile; a job fit score is computed from the role&rsquo;s skills and description.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume_text">Resume text / profile summary (optional)</Label>
                <Textarea
                  id="resume_text"
                  placeholder="Paste resume text, or add notes alongside an uploaded file..."
                  value={formData.resume_text}
                  onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
                  rows={4}
                  data-testid="referral-resume-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Your Note (optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add any additional notes about why you're referring this candidate..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700" 
                  disabled={submitting || !formData.job_id || !formData.candidate_name}
                  data-testid="submit-referral-form-btn"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Submit Referral
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1" style={{ fontFamily: 'Outfit' }}>
                  Referral Program
                </h3>
                <p className="text-sm text-slate-600">
                  Refer great candidates and help build our team! Your referrals are automatically 
                  added to the hiring pipeline and you can track their progress here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referrals List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : referrals.length > 0 ? (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referrals.map((referral) => (
            <motion.div key={referral.id} variants={itemVariants}>
              <Card className="card-hover h-full" data-testid={`referral-card-${referral.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <Badge className={getStatusColor(referral.status)}>
                      {referral.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-lg text-slate-900 mb-1" style={{ fontFamily: 'Outfit' }}>
                    {referral.candidate?.full_name}
                  </h3>

                  <div className="space-y-2 mb-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span className="truncate">
                        {jobs.find(j => j.id === referral.job_id)?.title || 'Unknown Job'}
                      </span>
                    </div>
                    {referral.candidate?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{referral.candidate.email}</span>
                      </div>
                    )}
                    {referral.candidate?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{referral.candidate.phone}</span>
                      </div>
                    )}
                  </div>

                  {referral.note && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2 italic">
                      "{referral.note}"
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(referral.created_at).toLocaleDateString()}</span>
                    </div>
                    {referral.status === 'HIRED' && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Hired!</span>
                      </div>
                    )}
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
                <UserPlus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No referrals yet
              </h3>
              <p className="text-slate-500 text-center mb-4">
                Submit your first referral and help us find great talent
              </p>
              <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Submit Referral
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ReferralsPage;
