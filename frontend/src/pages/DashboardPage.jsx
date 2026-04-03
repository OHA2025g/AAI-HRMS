import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Briefcase, 
  Users, 
  GitBranch, 
  UserPlus,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Sparkles,
  Target,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const pipelineData = stats?.applications_by_stage ? 
    Object.entries(stats.applications_by_stage)
      .filter(([stage, count]) => count > 0 || ['SOURCED', 'SCREENING', 'INTERVIEW_1', 'OFFER', 'JOINED'].includes(stage))
      .slice(0, 6)
      .map(([stage, count]) => ({
        name: stage.replace(/_/g, ' '),
        value: count
      })) : [];

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-slate-900"
            style={{ fontFamily: 'Outfit' }}
            data-testid="dashboard-heading"
          >
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Welcome back! Here's your hiring overview.</p>
        </div>
        <Link to="/jobs/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 hidden sm:flex" data-testid="create-job-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Open Jobs</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit' }}>
                  {stats?.open_jobs || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <span className="text-slate-500">{stats?.total_jobs || 0} total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Candidates</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit' }}>
                  {stats?.total_candidates || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span>Growing pool</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Applications</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit' }}>
                  {stats?.total_applications || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>In pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Hired</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit' }}>
                  {stats?.applications_by_stage?.JOINED || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span>Joined</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
                Pipeline Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={pipelineData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500">
                  <GitBranch className="w-12 h-12 mb-3 text-slate-300" />
                  <p>No pipeline data yet</p>
                  <Link to="/jobs/new" className="text-indigo-600 text-sm mt-2 hover:underline">
                    Create your first job
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/jobs/new" className="block">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:border-indigo-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Create AI-Powered Job</p>
                      <p className="text-sm text-slate-500">Auto-analyze JD with AI</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>

              <Link to="/candidates" className="block">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Add Candidate</p>
                      <p className="text-sm text-slate-500">Upload resume or profile</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </Link>

              <Link to="/referrals" className="block">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Submit Referral</p>
                      <p className="text-sm text-slate-500">One-click candidate referral</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
                Recent Activity
              </CardTitle>
              <Link to="/pipeline">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recent_activities?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_activities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{activity.candidate_name}</p>
                        <p className="text-xs text-slate-500">{activity.job_title}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activity.stage.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">Start by creating a job or adding candidates</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
