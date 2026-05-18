import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { candidatesApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FitScoreCard, FitScoreRing } from '../components/FitScore';
import { getCandidateDisplaySource } from '../lib/candidateSource';
import { hasResumeDisplayContent } from '../lib/resumeContent';
import { ResumeContentView } from '../components/ResumeContentView';
import { normalizeExperienceList } from '../lib/experienceParser';
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Calendar,
  Clock,
  Building,
  Edit,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const CandidateProfilePage = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    total_experience_years: '',
    skills: '',
    resume_text: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [candidateId]);

  const fetchProfile = async () => {
    try {
      const response = await candidatesApi.getProfile(candidateId);
      setProfile(response.data);
      const p = response.data || {};
      setEditForm({
        full_name: p.full_name || '',
        email: p.email || '',
        phone: p.phone || '',
        location: p.location || '',
        headline: p.headline || '',
        total_experience_years:
          p.total_experience_years === null || p.total_experience_years === undefined
            ? ''
            : String(p.total_experience_years),
        skills: Array.isArray(p.skills) ? p.skills.map((s) => s?.skill_name).filter(Boolean).join(', ') : '',
        resume_text: p.resume_text || '',
      });
    } catch (error) {
      toast.error('Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsList = (editForm.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        headline: editForm.headline.trim(),
        total_experience_years:
          editForm.total_experience_years === '' ? null : Number(editForm.total_experience_years),
        skills: skillsList,
      };

      await candidatesApi.update(candidateId, payload);
      toast.success('Candidate updated');
      setEditOpen(false);
      await fetchProfile();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const deriveCurrentRole = (p) => {
    const exp = normalizeExperienceList(p?.experience);
    if (!exp.length) {
      return {
        title: p?.headline || null,
        company: null,
      };
    }

    const norm = (v) => String(v || '').trim();
    const isPresent = (v) => {
      const s = norm(v).toLowerCase();
      return !s || s.includes('present') || s.includes('current');
    };

    const current = exp.find((e) => isPresent(e?.end_date)) || exp[0];
    return {
      title: norm(current?.title) || p?.headline || null,
      company: norm(current?.company) || null,
    };
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'SOURCED': return 'bg-slate-100 text-slate-700';
      case 'SCREENING': return 'bg-blue-100 text-blue-700';
      case 'ASSESSMENT_SENT':
      case 'ASSESSMENT_CLEARED': return 'bg-purple-100 text-purple-700';
      case 'INTERVIEW_1':
      case 'INTERVIEW_2':
      case 'INTERVIEW_3': return 'bg-amber-100 text-amber-700';
      case 'OFFER':
      case 'OFFER_ACCEPTED': return 'bg-emerald-100 text-emerald-700';
      case 'JOINED': return 'bg-green-500 text-white';
      case 'REJECTED':
      case 'DROPPED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Candidate not found</p>
        <Link to="/candidates">
          <Button variant="outline" className="mt-4">Back to Candidates</Button>
        </Link>
      </div>
    );
  }

  const currentRole = deriveCurrentRole(profile);
  const profileSourceBadge = getCandidateDisplaySource(profile);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/candidates')} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700" style={{ fontFamily: 'Outfit' }}>
              {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                  {profile.full_name}
                </h1>
                {profileSourceBadge && (
                  <Badge className={profileSourceBadge.className}>{profileSourceBadge.label}</Badge>
                )}
              </div>
              {profile.headline && (
                <p className="text-slate-600 mt-1">{profile.headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </a>
                )}
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-indigo-600">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </a>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                {profile.total_experience_years && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {profile.total_experience_years} years exp
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 ml-12 lg:ml-0">
          <Button
            variant="outline"
            data-testid="edit-candidate-btn"
            onClick={() => setEditOpen(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate details and save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Headline</Label>
                <Input value={editForm.headline} onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Total experience (years)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editForm.total_experience_years}
                  onChange={(e) => setEditForm({ ...editForm, total_experience_years: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Skills (comma separated)</Label>
                <Input value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Resume text</Label>
                <Textarea
                  rows={6}
                  value={editForm.resume_text}
                  onChange={(e) => setEditForm({ ...editForm, resume_text: e.target.value })}
                />
                <p className="text-xs text-slate-500">Resume text is shown on the profile page; editing it doesn’t rerun AI extraction.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications ({profile.applications?.length || 0})</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <Briefcase className="w-5 h-5 text-slate-500" />
                  Employee Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Title</div>
                    <div className="text-sm font-medium text-slate-900">
                      {currentRole.title || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Current Company</div>
                    <div className="text-sm font-medium text-slate-900">
                      {currentRole.company || '—'}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Skills</div>
                  {profile.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                          {skill.skill_name}
                          {skill.proficiency && (
                            <span className="ml-1 text-xs text-slate-400">({skill.proficiency})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No skills listed</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {/* (skills now shown inside Employee Details card) */}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Outfit' }}>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Applications</span>
                  <span className="font-semibold text-slate-900">{profile.applications?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Skills</span>
                  <span className="font-semibold text-slate-900">{profile.skills?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Experience</span>
                  <span className="font-semibold text-slate-900">{profile.experience?.length || 0} roles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Added</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Education */}
          {profile.education?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <GraduationCap className="w-5 h-5 text-slate-500" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{edu.degree}</h4>
                        <p className="text-sm text-slate-600">{edu.institution}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {edu.field && <span>{edu.field}</span>}
                          {edu.year && <span>• {edu.year}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resume Text */}
          {hasResumeDisplayContent(profile) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <FileText className="w-5 h-5 text-slate-500" />
                  Resume Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[32rem] overflow-y-auto">
                  <ResumeContentView profile={profile} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          {profile.applications?.length > 0 ? (
            <div className="space-y-4">
              {profile.applications.map((app) => (
                <Card key={app.id} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <Link to={`/jobs/${app.job?.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                            {app.job?.title || 'Unknown Job'}
                          </Link>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge className={getStageColor(app.stage)}>
                              {app.stage.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-slate-500">
                              Updated {new Date(app.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {app.fit_score && (
                        <div className="flex items-center gap-3">
                          <FitScoreRing score={app.fit_score.final_score} size={56} />
                          <div className="text-sm">
                            <p className="text-slate-600">Fit Score</p>
                            {app.fit_score.must_have_ok ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Requirements met
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Missing skills
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {app.fit_score && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No applications yet</h3>
                <p className="text-slate-500 text-center">
                  This candidate hasn't applied to any jobs yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="mt-6">
          {normalizeExperienceList(profile.experience).length > 0 ? (
            <div className="space-y-4">
              {normalizeExperienceList(profile.experience).map((exp, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Building className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{exp.title}</h3>
                        <p className="text-slate-600">{exp.company}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {exp.start_date || 'N/A'} - {exp.end_date || 'Present'}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="mt-3 text-sm text-slate-600">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No experience listed</h3>
                <p className="text-slate-500 text-center">
                  Upload a resume to automatically extract experience
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default CandidateProfilePage;
