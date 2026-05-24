import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart3, Loader2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const DEFAULT_STAGE_SLA = {
  SCREENING: 14,
  ASSESSMENT_SENT: 10,
  ASSESSMENT_CLEARED: 14,
  INTERVIEW_1: 21,
  INTERVIEW_2: 14,
  INTERVIEW_3: 14,
  HR_ROUND: 14,
  OFFER: 7,
};

const AdminHiringDashboardConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lowFitThreshold, setLowFitThreshold] = useState('50');
  const [stuckCriticalCount, setStuckCriticalCount] = useState('25');
  const [monthlyHireTarget, setMonthlyHireTarget] = useState('10');
  const [staleReqZeroDays, setStaleReqZeroDays] = useState('90');
  const [stageSlaDays, setStageSlaDays] = useState({ ...DEFAULT_STAGE_SLA });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminApi.getHiringDashboardConfig();
      const data = res.data || {};
      setLowFitThreshold(String(data.low_fit_threshold ?? 50));
      setStuckCriticalCount(String(data.stuck_critical_count ?? 25));
      setMonthlyHireTarget(String(data.monthly_hire_target ?? 10));
      setStaleReqZeroDays(String(data.stale_req_zero_interviews_days ?? 90));
      setStageSlaDays({ ...DEFAULT_STAGE_SLA, ...(data.stage_sla_days || {}) });
    } catch {
      setLoadError('Failed to load hiring dashboard configuration.');
      toast.error('Failed to load hiring dashboard configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateHiringDashboardConfig({
        low_fit_threshold: Number(lowFitThreshold),
        stuck_critical_count: Number(stuckCriticalCount),
        monthly_hire_target: Number(monthlyHireTarget),
        stale_req_zero_interviews_days: Number(staleReqZeroDays),
        stage_sla_days: Object.fromEntries(
          Object.entries(stageSlaDays).map(([k, v]) => [k, Number(v) || 0])
        ),
      });
      toast.success('Hiring dashboard thresholds saved');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setLowFitThreshold('50');
    setStuckCriticalCount('25');
    setMonthlyHireTarget('10');
    setStaleReqZeroDays('90');
    setStageSlaDays({ ...DEFAULT_STAGE_SLA });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <BarChart3 className="h-7 w-7 text-indigo-600" />
          Smart Hiring Dashboard config
        </h1>
        <p className="text-slate-600 mt-1">
          Alert thresholds, SLA days, and trend hire target used by the hiring-pack API.
        </p>
        <Button variant="link" className="px-0 h-auto text-indigo-600" asChild>
          <Link to="/dashboard">Open Smart Hiring Dashboard</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : loadError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-red-800 text-sm">{loadError}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert thresholds</CardTitle>
              <CardDescription>Changes apply on the next hiring-pack request (cache invalidates immediately).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="low-fit">Low fit threshold (%)</Label>
                  <Input
                    id="low-fit"
                    type="number"
                    min={0}
                    max={100}
                    value={lowFitThreshold}
                    onChange={(e) => setLowFitThreshold(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stuck-critical">Stuck candidates — critical count</Label>
                  <Input
                    id="stuck-critical"
                    type="number"
                    min={1}
                    value={stuckCriticalCount}
                    onChange={(e) => setStuckCriticalCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire-target">Monthly hire target (trends line)</Label>
                  <Input
                    id="hire-target"
                    type="number"
                    min={0}
                    value={monthlyHireTarget}
                    onChange={(e) => setMonthlyHireTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stale-zero">Stale req with zero interviews (days)</Label>
                  <Input
                    id="stale-zero"
                    type="number"
                    min={30}
                    value={staleReqZeroDays}
                    onChange={(e) => setStaleReqZeroDays(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage SLA (max days before “stuck” alert)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stageSlaDays).map(([stage, days]) => (
                <div key={stage} className="grid grid-cols-2 gap-4 items-center">
                  <Label htmlFor={`sla-${stage}`}>{stage.replace(/_/g, ' ')}</Label>
                  <Input
                    id={`sla-${stage}`}
                    type="number"
                    min={1}
                    value={days}
                    onChange={(e) =>
                      setStageSlaDays((prev) => ({ ...prev, [stage]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} data-testid="hiring-dashboard-config-save">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save configuration
            </Button>
            <Button type="button" variant="outline" onClick={resetDefaults}>
              Reset to defaults
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminHiringDashboardConfigPage;
