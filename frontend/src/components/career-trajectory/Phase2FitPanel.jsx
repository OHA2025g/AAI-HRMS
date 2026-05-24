import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Users, Download } from 'lucide-react';
import { toast } from 'sonner';
import { employeeApi, phase2FitApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { Phase2CandidateSelect } from './Phase2CandidateSelect';
import { Phase2GuidanceSections } from './Phase2GuidanceSections';

const NONE_MANAGER = '__none__';

export function Phase2FitPanel({
  candidateId,
  trajectoryReportId,
  jobId,
  phase1Ready = false,
  showCandidatePicker = false,
  lockToCandidate = false,
  candidateDisplayName,
  onCandidateChange,
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [report, setReport] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const pinnedToProfile = Boolean(lockToCandidate && candidateId);
  const allowCandidatePicker = showCandidatePicker && !pinnedToProfile;

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoadError(null);
    try {
      const res = await phase2FitApi.getByCandidate(candidateId);
      setReport(res.data);
    } catch {
      setReport(null);
      setLoadError('Could not load Phase 2 simulation. Run a new simulation or try again.');
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await employeeApi.list({ limit: 200 });
        const rows = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setEmployees(rows);
      } catch {
        if (alive) setEmployees([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runSimulation = async () => {
    if (!candidateId) {
      toast.error(
        allowCandidatePicker
          ? 'Select a candidate first'
          : 'No candidate selected for this simulation'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await phase2FitApi.simulate({
        candidate_id: candidateId,
        trajectory_report_id: trajectoryReportId || undefined,
        job_id: jobId || undefined,
        manager_employee_id:
          managerEmployeeId && managerEmployeeId !== NONE_MANAGER ? managerEmployeeId : undefined,
      });
      setReport(res.data);
      toast.success('Phase 2 contextual fit simulation complete');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Phase 2 simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async (format) => {
    if (!report?.id) {
      toast.error('Run Phase 2 simulation first');
      return;
    }
    try {
      const res = await phase2FitApi.exportReport(report.id, format);
      const blob =
        format === 'pdf' || format === 'csv'
          ? res.data
          : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phase2-fit-${report.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Export failed');
    }
  };

  const managerLabel = (emp) => {
    const name = emp.full_name || emp.name || emp.email || emp.id;
    const code = emp.employee_code ? ` (${emp.employee_code})` : '';
    return `${name}${code}`;
  };

  return (
    <Card data-testid="phase2-fit-panel">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Phase 2 — Leadership & manager fit
        </CardTitle>
        <CardDescription>
          Leadership style, communication signals, and manager working-style alignment (requires Phase 1 trajectory).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pinnedToProfile ? (
          <div
            className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm"
            data-testid="phase2-locked-candidate"
          >
            <p className="font-semibold text-indigo-950">
              Simulating for: {candidateDisplayName || 'This candidate'}
            </p>
            <p className="text-indigo-900/80 mt-1">
              Phase 2 uses this profile&apos;s Phase 1 career trajectory only — not other candidates.
            </p>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : null}

        {allowCandidatePicker ? (
          <Phase2CandidateSelect
            candidateId={candidateId}
            jobId={jobId}
            onSelect={onCandidateChange}
          />
        ) : null}

        {pinnedToProfile ? (
          <Collapsible open={managerPickerOpen} onOpenChange={setManagerPickerOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-indigo-700 hover:text-indigo-900"
                data-testid="phase2-manager-advanced-toggle"
              >
                {managerPickerOpen
                  ? 'Hide hiring manager comparison'
                  : 'Optional: compare against a specific hiring manager'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 max-w-md pt-2">
              <Label htmlFor="phase2-manager-select">Hiring manager (optional)</Label>
              <p className="text-xs text-slate-500">
                Employees from your org directory — not candidates. Default uses the archetype ideal profile.
              </p>
              <Select
                value={managerEmployeeId || NONE_MANAGER}
                onValueChange={setManagerEmployeeId}
              >
                <SelectTrigger id="phase2-manager-select" data-testid="phase2-manager-select">
                  <SelectValue placeholder="Archetype ideal profile (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_MANAGER}>Archetype ideal profile (default)</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {managerLabel(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="space-y-2 max-w-md">
            <Label htmlFor="phase2-manager-select">Hiring manager (optional)</Label>
            <p className="text-xs text-slate-500">
              Compare manager working-style fit against an employee profile or the default archetype — this is not a candidate list.
            </p>
            <Select
              value={managerEmployeeId || NONE_MANAGER}
              onValueChange={setManagerEmployeeId}
            >
              <SelectTrigger id="phase2-manager-select" data-testid="phase2-manager-select">
                <SelectValue placeholder="Archetype ideal profile (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_MANAGER}>Archetype ideal profile (default)</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {managerLabel(emp)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          onClick={runSimulation}
          disabled={loading || !candidateId || !phase1Ready}
          data-testid="phase2-run-btn"
          title={
            !candidateId
              ? allowCandidatePicker
                ? 'Select a candidate above'
                : 'Candidate context missing'
              : !phase1Ready
                ? 'Complete Phase 1 career trajectory first'
                : undefined
          }
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Run Phase 2 simulation
        </Button>
        {!candidateId && allowCandidatePicker ? (
          <p className="text-sm text-slate-500">
            Select a Phase 1–ready candidate above to enable simulation.
          </p>
        ) : null}
        {candidateId && !phase1Ready ? (
          <p className="text-sm text-amber-700">Phase 1 trajectory is required before running Phase 2.</p>
        ) : null}
        {report ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-5 shadow-sm">
              <p
                className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent"
                style={{ fontFamily: 'Outfit' }}
                data-testid="phase2-contextual-fit-score"
              >
                {Math.round(report.overall_contextual_fit_score)}%
                <span className="text-lg font-semibold text-slate-600 ml-1">contextual fit</span>
              </p>
              <p className="text-slate-700 mt-2 leading-relaxed">{report.executive_summary}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200">
                  Leadership: {report.leadership_style?.primary_style?.name}
                </Badge>
                <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 border-violet-200">
                  Manager fit: {Math.round(report.manager_fit?.manager_fit_score || 0)}%
                </Badge>
                <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
                  Communication: {Math.round(report.communication?.overall_communication_score || 0)}%
                </Badge>
                {report.manager_fit?.risk_level ? (
                  <Badge
                    variant="outline"
                    className={
                      report.manager_fit.risk_level === 'Low'
                        ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                        : report.manager_fit.risk_level === 'High'
                          ? 'border-rose-300 text-rose-800 bg-rose-50'
                          : 'border-amber-300 text-amber-800 bg-amber-50'
                    }
                  >
                    Risk: {report.manager_fit.risk_level}
                  </Badge>
                ) : null}
              </div>
            </div>
            {(report.manager_fit?.friction_points || []).length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="font-semibold text-amber-900 mb-2">Friction points</p>
                <ul className="space-y-2">
                  {report.manager_fit.friction_points.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-amber-950">
                      <span className="text-amber-500 font-bold">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Phase2GuidanceSections report={report} />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExport('pdf')}
                data-testid="phase2-export-pdf"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExport('csv')}>
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExport('xlsx')}
                data-testid="phase2-export-xlsx"
              >
                Export XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExport('json')}>
                Export JSON
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No Phase 2 report yet. Run simulation after Phase 1 analysis.</p>
        )}
      </CardContent>
    </Card>
  );
}
