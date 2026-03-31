import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  X,
  Plus,
  Loader2,
  CheckCircle,
  Briefcase,
  MapPin,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const CreateJobPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('hybrid');
  const [seniority, setSeniority] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState([]);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);

  const addSkill = (isMustHave = false) => {
    if (!skillInput.trim()) return;
    const skill = skillInput.trim();
    
    if (isMustHave && !mustHaveSkills.includes(skill)) {
      setMustHaveSkills([...mustHaveSkills, skill]);
      if (!skillsNeeded.includes(skill)) {
        setSkillsNeeded([...skillsNeeded, skill]);
      }
    } else if (!skillsNeeded.includes(skill)) {
      setSkillsNeeded([...skillsNeeded, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill, isMustHave = false) => {
    if (isMustHave) {
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    } else {
      setSkillsNeeded(skillsNeeded.filter(s => s !== skill));
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    }
  };

  const toggleMustHave = (skill) => {
    if (mustHaveSkills.includes(skill)) {
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    } else {
      setMustHaveSkills([...mustHaveSkills, skill]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setAnalyzing(true);
    
    try {
      const jobData = {
        title,
        description,
        location,
        work_mode: workMode,
        seniority,
        skills_needed: skillsNeeded,
        must_have_skills: mustHaveSkills
      };

      const res = await jobsApi.create(jobData);
      toast.success('Job created successfully! AI has analyzed your JD.');
      const createdId = res?.data?.id;
      navigate(createdId ? `/jobs/${createdId}` : '/jobs');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const isStep1Valid = title.trim() && description.trim();
  const isStep2Valid = skillsNeeded.length > 0 && mustHaveSkills.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Create New Job
          </h1>
          <p className="text-slate-600">AI will analyze your JD automatically</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            <span className={`text-sm hidden sm:block ${step >= s ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 1 ? 'Basic Info' : s === 2 ? 'Skills' : 'Review'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Basic Information</CardTitle>
            <CardDescription>Enter the job title and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Senior Data Analyst"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="job-title-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="location"
                    placeholder="e.g., New York, NY"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                    data-testid="job-location-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work Mode</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger data-testid="work-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Seniority Level</Label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger data-testid="seniority-select">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Mid">Mid-Level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter the full job description. Include responsibilities, requirements, and any other relevant details. Our AI will analyze this to extract skills and activities."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                data-testid="job-description-input"
              />
              <p className="text-xs text-slate-500">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI will automatically extract skills and responsibilities from your description
              </p>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!isStep1Valid}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-step-btn"
              >
                Next: Add Skills
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Skills */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Required Skills</CardTitle>
            <CardDescription>Add skills and mark must-have requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Add Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Python, SQL, Power BI"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  data-testid="skill-input"
                />
                <Button variant="outline" onClick={() => addSkill()} data-testid="add-skill-btn">
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => addSkill(true)}
                  className="bg-red-100 text-red-700 hover:bg-red-200"
                  data-testid="add-must-have-btn"
                >
                  Must-Have
                </Button>
              </div>
            </div>

            {skillsNeeded.length > 0 && (
              <div className="space-y-3">
                <Label>Skills List (click to toggle must-have)</Label>
                <div className="flex flex-wrap gap-2">
                  {skillsNeeded.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className={`cursor-pointer transition-colors py-1.5 px-3 ${
                        mustHaveSkills.includes(skill) 
                          ? 'badge-must-have' 
                          : 'badge-good-to-have'
                      }`}
                      onClick={() => toggleMustHave(skill)}
                    >
                      {skill}
                      {mustHaveSkills.includes(skill) && (
                        <span className="ml-1 text-xs">(Required)</span>
                      )}
                      <button
                        className="ml-2 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSkill(skill);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Must-Have Skills:</strong> Candidates will be filtered if they don't have these skills. 
                Mark at least one skill as must-have.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="prev-step-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!isStep2Valid}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-review-btn"
              >
                Review & Create
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Review & Create</CardTitle>
            <CardDescription>Review your job details before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                    {title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {location}
                      </span>
                    )}
                    <Badge variant="secondary">{workMode}</Badge>
                    {seniority && <Badge variant="secondary">{seniority}</Badge>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-4">
                  {description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skillsNeeded.map((skill) => (
                    <Badge
                      key={skill}
                      className={mustHaveSkills.includes(skill) ? 'badge-must-have' : 'badge-good-to-have'}
                    >
                      {skill}
                      {mustHaveSkills.includes(skill) && ' *'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-indigo-900">AI Analysis</p>
                <p className="text-sm text-indigo-700">
                  When you create this job, our AI will analyze the description to extract additional skills, 
                  responsibilities, and create a scoring rubric for candidate matching.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} data-testid="back-to-skills-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="create-job-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {analyzing ? 'AI Analyzing...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default CreateJobPage;
