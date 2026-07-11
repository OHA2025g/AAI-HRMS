import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { resourceSectionApi } from '@/shared/lib/api';
import { useAuth } from '@/shared/context/AuthContext';
import ResourceSectionBreadcrumbs from './ResourceSectionBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';

const TITLES = {
  classification: 'Classification & Segmentation',
  skills: 'Skills & Competencies',
  'availability-utilization': 'Availability & Utilization',
  bench: 'Bench Management',
  'deployment-readiness': 'Deployment Readiness',
  'demand-matching': 'Demand Matching',
  'mobility-career': 'Mobility & Career',
  'learning-certifications': 'Learning & Certifications',
  'cost-commercial': 'Cost & Commercial View',
  'attendance-leave-impact': 'Attendance & Leave Impact',
  'documents-compliance': 'Documents & Compliance',
  'notes-communication': 'Notes & Communication',
  analytics: 'Analytics',
  forecasting: 'Forecasting',
  'approvals-governance': 'Approvals & Governance',
  'ai-insights': 'AI Resource Insights',
};

const ResourceModulePage = ({ slug }) => {
  const title = TITLES[slug] || slug;
  const { user } = useAuth();
  const canApprove = ['admin', 'hr_admin'].includes(String(user?.role || '').toLowerCase());

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [classResourceId, setClassResourceId] = useState('');
  const [classTag, setClassTag] = useState('');
  const [skillForm, setSkillForm] = useState({
    resource_id: '',
    skill_name: '',
    skill_type: 'SECONDARY',
    skill_category: '',
    competency_level: '',
    proficiency_level: '',
    experience_years: '',
  });
  const [noteForm, setNoteForm] = useState({ resource_id: '', content: '', note_type: 'HR', title: '' });
  const [filterResourceId, setFilterResourceId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let res;
      switch (slug) {
        case 'classification':
          res = await resourceSectionApi.classificationList({ resource_id: filterResourceId || undefined });
          break;
        case 'skills':
          res = await resourceSectionApi.skillsList({ resource_id: filterResourceId || undefined });
          break;
        case 'availability-utilization':
          res = await resourceSectionApi.availabilityUtilization();
          break;
        case 'bench':
          res = await resourceSectionApi.bench();
          break;
        case 'deployment-readiness':
          res = await resourceSectionApi.deploymentReadiness();
          break;
        case 'demand-matching':
          res = await resourceSectionApi.demandMatching();
          break;
        case 'mobility-career':
          res = await resourceSectionApi.mobilityCareer();
          break;
        case 'learning-certifications':
          res = await resourceSectionApi.learningCertifications();
          break;
        case 'cost-commercial':
          res = await resourceSectionApi.costCommercial();
          break;
        case 'attendance-leave-impact':
          res = await resourceSectionApi.attendanceLeaveImpact();
          break;
        case 'documents-compliance':
          res = await resourceSectionApi.documentsCompliance();
          break;
        case 'notes-communication':
          res = await resourceSectionApi.notesList({ resource_id: filterResourceId || undefined });
          break;
        case 'analytics':
          res = await resourceSectionApi.analyticsSummary();
          break;
        case 'forecasting':
          res = await resourceSectionApi.forecasting();
          break;
        case 'approvals-governance':
          res = await resourceSectionApi.approvalsList();
          break;
        case 'ai-insights':
          res = await resourceSectionApi.aiInsights({ resource_id: filterResourceId || undefined });
          break;
        default:
          res = { data: {} };
      }
      setData(res.data);
    } catch {
      toast.error('Failed to load module');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when slug or filter changes
  }, [slug, filterResourceId]);

  const onAddClassification = async () => {
    try {
      await resourceSectionApi.classificationAdd({ resource_id: classResourceId.trim(), tag: classTag.trim() });
      toast.success('Tag added');
      setClassTag('');
      load();
    } catch {
      toast.error('Could not add classification');
    }
  };

  const onAddSkill = async () => {
    try {
      await resourceSectionApi.skillsCreate({
        resource_id: skillForm.resource_id.trim(),
        skill_name: skillForm.skill_name.trim(),
        skill_type: skillForm.skill_type,
        skill_category: skillForm.skill_category || undefined,
        competency_level: skillForm.competency_level || undefined,
        proficiency_level: skillForm.proficiency_level || undefined,
        experience_years: skillForm.experience_years ? Number(skillForm.experience_years) : undefined,
      });
      toast.success('Skill record created');
      setSkillForm({ ...skillForm, skill_name: '' });
      load();
    } catch {
      toast.error('Could not create skill');
    }
  };

  const onAddNote = async () => {
    try {
      await resourceSectionApi.notesCreate({
        resource_id: noteForm.resource_id.trim(),
        content: noteForm.content.trim(),
        note_type: noteForm.note_type,
        title: noteForm.title || undefined,
      });
      toast.success('Note added');
      setNoteForm({ ...noteForm, content: '', title: '' });
      load();
    } catch {
      toast.error('Could not add note');
    }
  };

  const onApproval = async (id, action) => {
    try {
      await resourceSectionApi.approvalAction(id, { action, reason: action === 'reject' ? 'Rejected in UI' : undefined });
      toast.success('Updated');
      load();
    } catch {
      toast.error('Approval action failed (approver role required)');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResourceSectionBreadcrumbs current={title} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-1 max-w-3xl">
            Workforce intelligence module — data is sourced from Mongo overlays plus employee master where applicable.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/resource-project-optimization/resource/dashboard">Dashboard</Link>
        </Button>
      </div>

      {(slug === 'classification' || slug === 'skills' || slug === 'notes-communication' || slug === 'ai-insights') && (
        <Card>
          <CardHeader>
            <CardTitle>Filter by resource</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div>
              <Label>Resource ID</Label>
              <Input className="mt-1 w-72 font-mono text-xs" value={filterResourceId} onChange={(e) => setFilterResourceId(e.target.value)} placeholder="Paste employee UUID" />
            </div>
            <Button type="button" variant="secondary" onClick={load}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {slug === 'classification' && (
        <Card>
          <CardHeader>
            <CardTitle>Add classification tag</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>Resource ID</Label>
              <Input className="mt-1 w-64 font-mono text-xs" value={classResourceId} onChange={(e) => setClassResourceId(e.target.value)} />
            </div>
            <div>
              <Label>Tag</Label>
              <Input className="mt-1 w-48" value={classTag} onChange={(e) => setClassTag(e.target.value)} placeholder="BILLABLE, HIGH_POTENTIAL…" />
            </div>
            <Button onClick={onAddClassification}>Add</Button>
          </CardContent>
        </Card>
      )}

      {slug === 'classification' && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link className="text-indigo-600 hover:underline font-mono text-xs" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        {r.resource_id?.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.tag}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{r.created_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'skills' && (
        <Card>
          <CardHeader>
            <CardTitle>New skill record</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Resource ID</Label>
              <Input className="mt-1 font-mono text-xs" value={skillForm.resource_id} onChange={(e) => setSkillForm({ ...skillForm, resource_id: e.target.value })} />
            </div>
            <div>
              <Label>Skill name</Label>
              <Input className="mt-1" value={skillForm.skill_name} onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Input className="mt-1" value={skillForm.skill_type} onChange={(e) => setSkillForm({ ...skillForm, skill_type: e.target.value })} placeholder="PRIMARY / SECONDARY" />
            </div>
            <div>
              <Label>Category</Label>
              <Input className="mt-1" value={skillForm.skill_category} onChange={(e) => setSkillForm({ ...skillForm, skill_category: e.target.value })} />
            </div>
            <div>
              <Label>Proficiency</Label>
              <Input className="mt-1" value={skillForm.proficiency_level} onChange={(e) => setSkillForm({ ...skillForm, proficiency_level: e.target.value })} />
            </div>
            <div>
              <Label>Experience years</Label>
              <Input className="mt-1" value={skillForm.experience_years} onChange={(e) => setSkillForm({ ...skillForm, experience_years: e.target.value })} />
            </div>
            <Button className="self-end" onClick={onAddSkill}>
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      {slug === 'skills' && (
        <Card>
          <CardHeader>
            <CardTitle>Skill records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.skill_name}</TableCell>
                    <TableCell>{r.skill_category || '—'}</TableCell>
                    <TableCell>{r.skill_type}</TableCell>
                    <TableCell>{r.proficiency_level || r.competency_level || '—'}</TableCell>
                    <TableCell>{r.experience_years ?? '—'}</TableCell>
                    <TableCell>{r.verified_flag ? 'Yes' : '—'}</TableCell>
                    <TableCell>
                      <Link className="text-indigo-600 text-xs" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'availability-utilization' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Availability rows</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Avail %</TableHead>
                    <TableHead>Deployable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.availability || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.current_availability_percent}</TableCell>
                      <TableCell>{r.deployable_capacity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Utilization snapshots</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Billable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.utilization_snapshots || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.snapshot_period}</TableCell>
                      <TableCell>{r.overall_utilization}</TableCell>
                      <TableCell>{r.billable_utilization}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {slug === 'bench' && (
        <Card>
          <CardHeader>
            <CardTitle>Bench pool</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Age days</TableHead>
                  <TableHead>Ready</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link className="text-indigo-600" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        {r.employee_name || r.resource_id?.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{r.department || '—'}</TableCell>
                    <TableCell>{r.bench_start_date}</TableCell>
                    <TableCell>{r.bench_age_days}</TableCell>
                    <TableCell>{r.ready_to_deploy_flag ? 'Yes' : '—'}</TableCell>
                    <TableCell>{r.risk_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'deployment-readiness' && (
        <Card>
          <CardHeader>
            <CardTitle>Readiness scorecards</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Cert</TableHead>
                  <TableHead>Calculated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      <Link className="text-indigo-600" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        {r.resource_id?.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>{r.deployment_readiness_score}</TableCell>
                    <TableCell>{r.skill_readiness}</TableCell>
                    <TableCell>{r.certification_readiness}</TableCell>
                    <TableCell className="text-xs">{r.calculated_on}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'demand-matching' && (
        <Card>
          <CardHeader>
            <CardTitle>Match results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link className="text-indigo-600 text-xs font-mono" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        {r.resource_id?.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.demand_id}</TableCell>
                    <TableCell>{r.fit_score}</TableCell>
                    <TableCell>{r.recommendation_rank}</TableCell>
                    <TableCell>{r.match_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'mobility-career' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mobility events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.mobility || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.event_type}</TableCell>
                      <TableCell>{r.event_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Career preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Mobility</TableHead>
                    <TableHead>Leadership track</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.career_preferences || []).map((r) => (
                    <TableRow key={r.resource_id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.mobility_preference}</TableCell>
                      <TableCell>{r.leadership_track ? 'Yes' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {slug === 'learning-certifications' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.learning || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.program_name}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Cert</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Mandatory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.certifications || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.certification_name}</TableCell>
                      <TableCell>{r.expiry_date}</TableCell>
                      <TableCell>{r.mandatory_flag ? 'Yes' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {slug === 'cost-commercial' && (
        <Card>
          <CardHeader>
            <CardTitle>Cost profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Internal rate</TableHead>
                  <TableHead>Billing rate</TableHead>
                  <TableHead>Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={`${r.resource_id}-${r.internal_cost_rate}`}>
                    <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell>{r.internal_cost_rate}</TableCell>
                    <TableCell>{r.billing_rate}</TableCell>
                    <TableCell>{r.margin_contribution_pct}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'attendance-leave-impact' && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance / leave impact</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Attendance %</TableHead>
                  <TableHead>Planned leave</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.attendance_pct}</TableCell>
                    <TableCell>{r.planned_leave_days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {slug === 'documents-compliance' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.documents || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.document_category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.compliance || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.checklist_item}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {slug === 'notes-communication' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>New note</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Resource ID</Label>
                <Input className="mt-1 font-mono text-xs" value={noteForm.resource_id} onChange={(e) => setNoteForm({ ...noteForm, resource_id: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Input className="mt-1" value={noteForm.note_type} onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input className="mt-1" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Content</Label>
                <Input className="mt-1" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
              </div>
              <Button onClick={onAddNote}>Save note</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.resource_id?.slice(0, 8)}</TableCell>
                      <TableCell>{r.note_type}</TableCell>
                      <TableCell>{r.title || r.content?.slice(0, 40)}</TableCell>
                      <TableCell className="text-xs">{r.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {slug === 'analytics' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.total_employees ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.active_employees ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Skill records</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.skill_records ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open bench rows</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.bench_open ?? '—'}</CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle>By department</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.by_department || []).map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{r._id || '—'}</TableCell>
                      <TableCell>{r.c}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {slug === 'forecasting' && (
        <Card>
          <CardHeader>
            <CardTitle>Workforce forecast (mock / seeded)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p>Horizon: {data?.horizon_months} months</p>
            <p>Bench FTE forecast: {data?.bench_fte_forecast}</p>
            <p>Capacity gap FTE: {data?.capacity_gap_fte}</p>
            <p>Hiring need FTE: {data?.hiring_need_fte}</p>
            <p>Skill hotspots: {(data?.skill_hotspots || []).join(', ')}</p>
            <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto">{JSON.stringify(data?.scenarios || [], null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {slug === 'approvals-governance' && (
        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id?.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Link className="text-indigo-600 text-xs" to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.resource_id)}`}>
                        Open
                      </Link>
                    </TableCell>
                    <TableCell>{r.approval_type}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-xs">{r.submitted_on}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {r.status === 'PENDING' && canApprove ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => onApproval(r.id, 'approve')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onApproval(r.id, 'reject')}>
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!canApprove ? <p className="text-xs text-slate-500 mt-2">Approvals require admin or hr_admin.</p> : null}
          </CardContent>
        </Card>
      )}

      {slug === 'ai-insights' && (
        <Card>
          <CardHeader>
            <CardTitle>AI / mock insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.items || []).map((x) => (
              <div key={x.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{x.insight_type}</span>
                  {x.is_mock ? <Badge variant="secondary">Mock</Badge> : null}
                </div>
                <p className="text-xs text-slate-500 mt-1">Resource: {x.resource_id}</p>
                <pre className="text-xs mt-2 text-slate-600 overflow-auto">{JSON.stringify(x.insight_payload, null, 2)}</pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResourceModulePage;
