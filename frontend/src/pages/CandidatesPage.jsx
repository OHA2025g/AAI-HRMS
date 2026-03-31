import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { candidatesApi } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Search, 
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Loader2,
  Filter,
  X,
  Eye,
  Upload,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const CandidatesPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Add candidate form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    total_experience_years: '',
    skills: '',
    source: 'DIRECT_UPLOAD',
    resume_text: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [sourceFilter]);

  const fetchCandidates = async () => {
    try {
      const params = sourceFilter !== 'all' ? { source: sourceFilter } : {};
      const response = await candidatesApi.list(params);
      setCandidates(response.data);
    } catch (error) {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const data = {
        ...formData,
        skills: skillsArray,
        total_experience_years: formData.total_experience_years ? parseFloat(formData.total_experience_years) : null
      };
      await candidatesApi.create(data);
      toast.success('Candidate added successfully');
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        headline: '',
        total_experience_years: '',
        skills: '',
        source: 'DIRECT_UPLOAD',
        resume_text: ''
      });
      fetchCandidates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.pdf', '.docx'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExt)) {
      toast.error('Only PDF and DOCX files are supported');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'DIRECT_UPLOAD');

      const response = await candidatesApi.uploadResume(formData);
      
      if (response.data.is_new) {
        toast.success('Resume parsed! New candidate created');
      } else {
        toast.success('Resume parsed! Existing candidate updated');
      }
      
      setShowAddModal(false);
      fetchCandidates();
      
      // Navigate to the new candidate's profile
      if (response.data.candidate_id) {
        navigate(`/candidates/${response.data.candidate_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse resume');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredCandidates = (candidates || []).filter((c) => {
    const q = (searchQuery || '').toLowerCase();
    const name = (c?.full_name || '').toLowerCase();
    const email = (c?.email || '').toLowerCase();
    const headline = (c?.headline || '').toLowerCase();
    return name.includes(q) || email.includes(q) || headline.includes(q);
  });

  const getSourceColor = (source) => {
    switch (source) {
      case 'LINKEDIN': return 'bg-blue-100 text-blue-700';
      case 'REFERRAL': return 'bg-amber-100 text-amber-700';
      case 'NAUKRI': return 'bg-purple-100 text-purple-700';
      case 'INDEED': return 'bg-indigo-100 text-indigo-700';
      case 'DIRECT_UPLOAD': return 'bg-slate-100 text-slate-700';
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
            Candidates
          </h1>
          <p className="text-slate-600 mt-1">{candidates.length} total candidates</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-candidate-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit' }}>Add New Candidate</DialogTitle>
              <DialogDescription>Upload a resume or enter details manually</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Resume</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <div className="space-y-4">
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleResumeUpload}
                      className="hidden"
                      data-testid="resume-upload-input"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                        <p className="text-sm text-slate-600">Parsing resume with AI...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-700">Click to upload resume</p>
                        <p className="text-xs text-slate-500 mt-1">PDF or DOCX (max 10MB)</p>
                      </>
                    )}
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-indigo-800">
                      <FileText className="w-4 h-4 inline mr-1" />
                      AI will automatically extract name, contact info, skills, and experience from the resume.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="mt-4">
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                        data-testid="candidate-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="candidate-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="candidate-phone-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience (years)</Label>
                      <Input
                        id="experience"
                        type="number"
                        step="0.5"
                        value={formData.total_experience_years}
                        onChange={(e) => setFormData({ ...formData, total_experience_years: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headline">Headline / Current Title</Label>
                    <Input
                      id="headline"
                      placeholder="e.g., Senior Data Analyst at Tech Corp"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      data-testid="candidate-headline-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      placeholder="e.g., Python, SQL, Power BI, Excel"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      data-testid="candidate-skills-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIRECT_UPLOAD">Direct Upload</SelectItem>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                        <SelectItem value="NAUKRI">Naukri</SelectItem>
                        <SelectItem value="INDEED">Indeed</SelectItem>
                        <SelectItem value="REFERRAL">Referral</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={submitting} data-testid="submit-candidate-btn">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Candidate'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-candidates-input"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="source-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="DIRECT_UPLOAD">Direct Upload</SelectItem>
            <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
            <SelectItem value="NAUKRI">Naukri</SelectItem>
            <SelectItem value="INDEED">Indeed</SelectItem>
            <SelectItem value="REFERRAL">Referral</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Candidates List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id}>
              <Card className="card-hover group h-full" data-testid={`candidate-card-${candidate.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-700 font-semibold text-sm">
                        {(candidate.full_name || 'NA').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <Badge className={`text-xs ${getSourceColor(candidate.source)}`}>
                      {(candidate.source || 'OTHER').replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors" style={{ fontFamily: 'Outfit' }}>
                    {candidate.full_name || 'Unnamed Candidate'}
                  </h3>
                  
                  {candidate.headline && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-1">{candidate.headline}</p>
                  )}

                  <div className="space-y-1.5 mb-4 text-sm text-slate-500">
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                    )}
                    {candidate.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                    {candidate.total_experience_years && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>{candidate.total_experience_years} years exp</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {candidate.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {candidate.skills.slice(0, 4).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill.skill_name}
                        </Badge>
                      ))}
                      {candidate.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{candidate.skills.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Link to={`/candidates/${candidate.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No candidates found
              </h3>
              <p className="text-slate-500 text-center mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first candidate to get started'}
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CandidatesPage;
