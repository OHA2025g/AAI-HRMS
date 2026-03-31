import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Video,
  Building,
  Phone,
  Loader2,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { API_BASE_URL as API_URL } from '../lib/apiBaseUrl';

const InterviewsPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    application_id: '',
    round: 1,
    mode: 'VIRTUAL',
    scheduled_start: '',
    scheduled_end: '',
    meeting_link: '',
    notes: ''
  });

  // Feedback form state
  const [feedbackData, setFeedbackData] = useState({
    decision: '',
    score: '',
    strengths: '',
    concerns: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interviewsRes, appsRes] = await Promise.all([
        axios.get(`${API_URL}/interviews`),
        axios.get(`${API_URL}/applications`)
      ]);
      setInterviews(interviewsRes.data);
      // Filter applications that are in interview stages
      setApplications(appsRes.data.filter(app => 
        ['SCREENING', 'ASSESSMENT_CLEARED', 'INTERVIEW_1', 'INTERVIEW_2'].includes(app.stage)
      ));
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.application_id || !formData.scheduled_start) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/interviews`, formData);
      toast.success('Interview scheduled successfully!');
      setShowModal(false);
      setFormData({
        application_id: '',
        round: 1,
        mode: 'VIRTUAL',
        scheduled_start: '',
        scheduled_end: '',
        meeting_link: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview || !feedbackData.decision) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/interviews/${selectedInterview.id}/feedback`, feedbackData);
      toast.success('Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setFeedbackData({
        decision: '',
        score: '',
        strengths: '',
        concerns: '',
        notes: ''
      });
      setSelectedInterview(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInterview = async (interviewId) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await axios.delete(`${API_URL}/interviews/${interviewId}`);
      toast.success('Interview cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel interview');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'VIRTUAL': return <Video className="w-4 h-4" />;
      case 'ONSITE': return <Building className="w-4 h-4" />;
      case 'PHONE': return <Phone className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'STRONG_YES': return 'text-emerald-600';
      case 'YES': return 'text-green-600';
      case 'MAYBE': return 'text-amber-600';
      case 'NO': return 'text-red-500';
      case 'STRONG_NO': return 'text-red-600';
      default: return 'text-slate-600';
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

  const upcomingInterviews = interviews.filter(i => i.status === 'SCHEDULED');
  const completedInterviews = interviews.filter(i => i.status === 'COMPLETED');

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
            Interviews
          </h1>
          <p className="text-slate-600 mt-1">Schedule and manage candidate interviews</p>
        </div>
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="schedule-interview-btn">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit' }}>Schedule Interview</DialogTitle>
              <DialogDescription>Select a candidate and set the interview details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Candidate *</Label>
                <Select 
                  value={formData.application_id} 
                  onValueChange={(v) => setFormData({ ...formData, application_id: v })}
                >
                  <SelectTrigger data-testid="interview-candidate-select">
                    <SelectValue placeholder="Select a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.candidate?.full_name} - {app.job?.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select 
                    value={String(formData.round)} 
                    onValueChange={(v) => setFormData({ ...formData, round: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Round 1</SelectItem>
                      <SelectItem value="2">Round 2</SelectItem>
                      <SelectItem value="3">Round 3</SelectItem>
                      <SelectItem value="4">HR Round</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select 
                    value={formData.mode} 
                    onValueChange={(v) => setFormData({ ...formData, mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="ONSITE">On-site</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                    required
                    data-testid="interview-start-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_end}
                    onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Meeting Link</Label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  data-testid="interview-link-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes for the interview..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  disabled={submitting || !formData.application_id || !formData.scheduled_start}
                  data-testid="schedule-interview-submit-btn"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Schedule
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {upcomingInterviews.length}
            </div>
            <p className="text-sm text-slate-500">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {completedInterviews.length}
            </div>
            <p className="text-sm text-slate-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Outfit' }}>
              {completedInterviews.filter(i => i.feedback?.some(f => ['STRONG_YES', 'YES'].includes(f.decision))).length}
            </div>
            <p className="text-sm text-slate-500">Positive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {interviews.length}
            </div>
            <p className="text-sm text-slate-500">Total</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interviews List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : interviews.length > 0 ? (
        <motion.div variants={containerVariants} className="space-y-4">
          {/* Upcoming Section */}
          {upcomingInterviews.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>
                Upcoming Interviews
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingInterviews.map((interview) => (
                  <motion.div key={interview.id} variants={itemVariants}>
                    <Card className="card-hover" data-testid={`interview-card-${interview.id}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {interview.candidate?.full_name}
                              </h3>
                              <p className="text-sm text-slate-500">{interview.job?.title}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(interview.status)}>
                            {interview.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {new Date(interview.scheduled_start).toLocaleDateString()} at{' '}
                              {new Date(interview.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getModeIcon(interview.mode)}
                            <span>Round {interview.round} - {interview.mode}</span>
                          </div>
                          {interview.meeting_link && (
                            <a 
                              href={interview.meeting_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <Video className="w-4 h-4" />
                              Join Meeting
                            </a>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedInterview(interview);
                              setShowFeedbackModal(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Feedback
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancelInterview(interview.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {completedInterviews.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 mt-8" style={{ fontFamily: 'Outfit' }}>
                Completed Interviews
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedInterviews.map((interview) => (
                  <motion.div key={interview.id} variants={itemVariants}>
                    <Card className="card-hover">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {interview.candidate?.full_name}
                              </h3>
                              <p className="text-sm text-slate-500">{interview.job?.title}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(interview.status)}>
                            {interview.status}
                          </Badge>
                        </div>

                        <div className="text-sm text-slate-600 mb-4">
                          <span>
                            {new Date(interview.scheduled_start).toLocaleDateString()} - Round {interview.round}
                          </span>
                        </div>

                        {/* Feedback Summary */}
                        {interview.feedback?.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            {interview.feedback.map((fb, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{fb.reviewer_name}</span>
                                <span className={`font-medium ${getDecisionColor(fb.decision)}`}>
                                  {fb.decision.replace(/_/g, ' ')}
                                  {fb.score && ` (${fb.score}/10)`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No interviews scheduled
              </h3>
              <p className="text-slate-500 text-center mb-4">
                Schedule your first interview to get started
              </p>
              <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Submit Interview Feedback</DialogTitle>
            <DialogDescription>
              {selectedInterview?.candidate?.full_name} - Round {selectedInterview?.round}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Decision *</Label>
              <Select 
                value={feedbackData.decision} 
                onValueChange={(v) => setFeedbackData({ ...feedbackData, decision: v })}
              >
                <SelectTrigger data-testid="feedback-decision-select">
                  <SelectValue placeholder="Select your decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRONG_YES">Strong Yes</SelectItem>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="MAYBE">Maybe</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                  <SelectItem value="STRONG_NO">Strong No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Score (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={feedbackData.score}
                onChange={(e) => setFeedbackData({ ...feedbackData, score: e.target.value })}
                placeholder="Optional score"
              />
            </div>

            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                value={feedbackData.strengths}
                onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
                placeholder="What impressed you about the candidate?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Concerns</Label>
              <Textarea
                value={feedbackData.concerns}
                onChange={(e) => setFeedbackData({ ...feedbackData, concerns: e.target.value })}
                placeholder="Any areas of concern?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={feedbackData.notes}
                onChange={(e) => setFeedbackData({ ...feedbackData, notes: e.target.value })}
                placeholder="Any other notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700" 
                disabled={submitting || !feedbackData.decision}
                data-testid="submit-feedback-btn"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default InterviewsPage;
