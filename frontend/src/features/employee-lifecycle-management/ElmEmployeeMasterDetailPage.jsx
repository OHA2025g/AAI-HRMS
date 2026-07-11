import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Loader2 } from 'lucide-react';
import { employeeLifecycleManagementApi } from '@/shared/lib/api';

const MiniTable = ({ title, rows, columns }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{rows?.length || 0} records</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).slice(0, 10).map((r, idx) => (
              <TableRow key={r.id || idx}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{typeof c.render === 'function' ? c.render(r) : r?.[c.key] ?? '-'}</TableCell>
                ))}
              </TableRow>
            ))}
            {(rows || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-sm text-muted-foreground">
                  No records.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default function ElmEmployeeMasterDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await employeeLifecycleManagementApi.getEmployeeBundle(id);
        setBundle(res.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load employee bundle');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const emp = bundle?.employee || {};
  const skills = useMemo(() => (Array.isArray(emp.skills) ? emp.skills : []), [emp.skills]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{emp.full_name || 'Employee'}</div>
          <div className="text-sm text-muted-foreground">
            {emp.employee_code || emp.id} · {emp.department || '-'} · {emp.location || '-'}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'secondary'}>{emp.status || '-'}</Badge>
            {skills.slice(0, 6).map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to={`/employee-lifecycle-management/employee-master/${encodeURIComponent(id)}/edit`}>Edit</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entry">Pre-Boarding / Onboarding</TabsTrigger>
          <TabsTrigger value="docs">Documents & Compliance</TabsTrigger>
          <TabsTrigger value="probation">Probation</TabsTrigger>
          <TabsTrigger value="notes">Notes & History</TabsTrigger>
          <TabsTrigger value="exit">Exit / Offboarding</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Employee profile</CardTitle>
              <CardDescription>Canonical master record</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Email</div>
                <div>{emp.email || emp.official_email || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Role</div>
                <div>{emp.role_title || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Joining date</div>
                <div>{emp.join_date || emp.joining_date || '-'}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entry" className="space-y-3">
          <MiniTable
            title="Pre-boarding"
            rows={bundle?.preboarding}
            columns={[
              { key: 'preboarding_status', label: 'Status' },
              { key: 'joining_date_confirmed', label: 'Joining date' },
              { key: 'communication_status', label: 'Communication' },
              { key: 'asset_readiness_flag', label: 'Asset ready', render: (r) => (r.asset_readiness_flag ? 'Yes' : 'No') },
            ]}
          />
          <MiniTable
            title="Onboarding"
            rows={bundle?.onboarding}
            columns={[
              { key: 'onboarding_status', label: 'Status' },
              { key: 'onboarding_start_date', label: 'Start' },
              { key: 'hr_induction_status', label: 'HR induction' },
              { key: 'access_status', label: 'Access' },
            ]}
          />
        </TabsContent>

        <TabsContent value="docs" className="space-y-3">
          <MiniTable
            title="Documents"
            rows={bundle?.documents}
            columns={[
              { key: 'document_category', label: 'Category' },
              { key: 'title', label: 'Title' },
              { key: 'verification_status', label: 'Verification' },
              { key: 'uploaded_at', label: 'Uploaded' },
            ]}
          />
          <MiniTable
            title="BGV cases"
            rows={bundle?.bgv}
            columns={[
              { key: 'bgv_vendor', label: 'Vendor' },
              { key: 'bgv_overall_status', label: 'Status' },
              { key: 'risk_flag', label: 'Risk', render: (r) => (r.risk_flag ? 'Yes' : 'No') },
              { key: 'completed_on', label: 'Completed' },
            ]}
          />
        </TabsContent>

        <TabsContent value="probation" className="space-y-3">
          <MiniTable
            title="Probation"
            rows={bundle?.probation}
            columns={[
              { key: 'probation_status', label: 'Status' },
              { key: 'probation_start_date', label: 'Start' },
              { key: 'probation_end_date', label: 'End' },
              { key: 'review_date', label: 'Review' },
            ]}
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-3">
          <MiniTable
            title="Lifecycle notes"
            rows={bundle?.notes}
            columns={[
              { key: 'note_type', label: 'Type' },
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Created' },
            ]}
          />
        </TabsContent>

        <TabsContent value="exit" className="space-y-3">
          <MiniTable
            title="Resignations"
            rows={bundle?.resignation}
            columns={[
              { key: 'approval_status', label: 'Approval' },
              { key: 'resignation_submitted_on', label: 'Submitted' },
              { key: 'last_working_day', label: 'LWD' },
              { key: 'exit_status', label: 'Exit status' },
            ]}
          />
          <MiniTable
            title="Notice periods"
            rows={bundle?.notice}
            columns={[
              { key: 'notice_status', label: 'Status' },
              { key: 'notice_start_date', label: 'Start' },
              { key: 'notice_end_date', label: 'End' },
              { key: 'handover_status', label: 'Handover' },
            ]}
          />
          <MiniTable
            title="Offboarding clearance"
            rows={bundle?.clearance}
            columns={[
              { key: 'final_exit_approval', label: 'Final approval' },
              { key: 'hr_clearance', label: 'HR' },
              { key: 'it_clearance', label: 'IT' },
              { key: 'finance_clearance', label: 'Finance' },
            ]}
          />
        </TabsContent>

        <TabsContent value="ai" className="space-y-3">
          <MiniTable
            title="AI insights"
            rows={bundle?.ai_insights}
            columns={[
              { key: 'insight_type', label: 'Type' },
              { key: 'score', label: 'Score' },
              { key: 'generated_at', label: 'Generated' },
              { key: 'source_type', label: 'Source' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

