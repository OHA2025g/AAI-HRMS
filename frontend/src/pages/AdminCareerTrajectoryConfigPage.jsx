import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { careerTrajectoryApi } from '../lib/api';
import { OVERALL_WEIGHT_LABELS, SUB_WEIGHT_GROUPS } from '../lib/careerTrajectoryConfig';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const buildDefaultSubWeights = () => {
  const out = {};
  SUB_WEIGHT_GROUPS.forEach((g) => {
    out[g.dimension] = {};
    g.fields.forEach((f) => {
      out[g.dimension][f.key] = f.defaultWeight;
    });
  });
  return out;
};

const AdminCareerTrajectoryConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({});
  const [subWeights, setSubWeights] = useState(buildDefaultSubWeights);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fairness, setFairness] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await careerTrajectoryApi.getConfig();
      const ow = res.data?.overall_weights || {};
      setWeights(ow);
      setSubWeights({ ...buildDefaultSubWeights(), ...(res.data?.sub_weights || {}) });
      setUpdatedAt(res.data?.updated_at || null);
      try {
        const fair = await careerTrajectoryApi.getFairnessSummary({ limit: 500, days: 90 });
        setFairness(fair.data);
      } catch {
        setFairness(null);
      }
    } catch {
      toast.error('Failed to load career trajectory scoring config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weightSum = useMemo(
    () => Object.values(weights).reduce((a, v) => a + (Number(v) || 0), 0),
    [weights]
  );

  const resetDefaults = () => {
    const defaults = {};
    OVERALL_WEIGHT_LABELS.forEach(({ key, defaultWeight }) => {
      defaults[key] = defaultWeight;
    });
    setWeights(defaults);
    setSubWeights(buildDefaultSubWeights());
  };

  const save = async () => {
    if (Math.abs(weightSum - 1) > 0.02) {
      toast.error('Overall weights should sum to approximately 1.0');
      return;
    }
    setSaving(true);
    try {
      const payload = { overall_weights: {}, sub_weights: {} };
      OVERALL_WEIGHT_LABELS.forEach(({ key }) => {
        payload.overall_weights[key] = Number(weights[key]) || 0;
      });
      SUB_WEIGHT_GROUPS.forEach((g) => {
        payload.sub_weights[g.dimension] = {};
        g.fields.forEach((f) => {
          payload.sub_weights[g.dimension][f.key] = Number(subWeights[g.dimension]?.[f.key]) || 0;
        });
      });
      await careerTrajectoryApi.updateConfig(payload);
      toast.success('Career trajectory weights saved');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <Sparkles className="h-7 w-7 text-indigo-600" />
          Career trajectory scoring
        </h1>
        <p className="text-slate-600 mt-1">
          Adjust composite and dimension sub-weights. Changes apply to new analyses.
        </p>
        <Button variant="link" className="px-0 h-auto text-indigo-600" asChild>
          <Link to="/ai-hiring/candidate-fit/career-trajectory">Open trajectory analyzer</Link>
        </Button>
      </div>

      {fairness ? (
        <Card data-testid="career-traj-fairness-dashboard">
          <CardHeader>
            <CardTitle className="text-base">Fairness monitoring (90 days)</CardTitle>
            <CardDescription>
              Aggregated DEI guardrail results across trajectory reports
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Reports sampled</p>
              <p className="text-xl font-semibold">{fairness.total_reports}</p>
            </div>
            <div>
              <p className="text-slate-500">Passed</p>
              <p className="text-xl font-semibold text-green-700">{fairness.passed}</p>
            </div>
            <div>
              <p className="text-slate-500">Review required</p>
              <p className="text-xl font-semibold text-amber-700">{fairness.review_required}</p>
            </div>
            <div>
              <p className="text-slate-500">Pass rate</p>
              <p className="text-xl font-semibold">{fairness.pass_rate_pct}%</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overall">
        <TabsList>
          <TabsTrigger value="overall">Overall weights</TabsTrigger>
          <TabsTrigger value="sub">Dimension sub-weights</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <Card>
            <CardHeader>
              <CardTitle>Overall score weights</CardTitle>
              <CardDescription>
                Sum: {weightSum.toFixed(3)} {updatedAt ? `· Last updated ${new Date(updatedAt).toLocaleString()}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                OVERALL_WEIGHT_LABELS.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-2 gap-4 items-center">
                    <Label htmlFor={`w-${key}`}>{label}</Label>
                    <Input
                      id={`w-${key}`}
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={weights[key] ?? ''}
                      onChange={(e) => setWeights((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sub" className="space-y-4">
          {SUB_WEIGHT_GROUPS.map((group) => (
            <Card key={group.dimension}>
              <CardHeader>
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-2 gap-4 items-center">
                    <Label htmlFor={`sw-${group.dimension}-${f.key}`}>{f.label}</Label>
                    <Input
                      id={`sw-${group.dimension}-${f.key}`}
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={subWeights[group.dimension]?.[f.key] ?? ''}
                      onChange={(e) =>
                        setSubWeights((prev) => ({
                          ...prev,
                          [group.dimension]: {
                            ...(prev[group.dimension] || {}),
                            [f.key]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {!loading && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} data-testid="career-traj-config-save">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save all weights
          </Button>
          <Button type="button" variant="outline" onClick={resetDefaults}>
            Reset to defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const res = await careerTrajectoryApi.trainMlCalibration(200, 'trajectory');
                toast.success(`ML trained (${res.data?.samples || 0} samples, trajectory labels)`);
              } catch (e) {
                toast.error(e?.response?.data?.detail?.message || e?.response?.data?.detail || 'Train failed');
              }
            }}
          >
            Train ML (trajectory)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const res = await careerTrajectoryApi.trainMlCalibration(200, 'hr');
                toast.success(`ML trained (${res.data?.samples || 0} samples, HR stage labels)`);
              } catch (e) {
                toast.error(e?.response?.data?.detail?.message || e?.response?.data?.detail || 'HR train failed');
              }
            }}
          >
            Train ML (HR outcomes)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const res = await careerTrajectoryApi.exportTraining({ format: 'csv', limit: 200 });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'career-trajectory-training.csv';
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                toast.error('Training export failed');
              }
            }}
          >
            Download training export
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminCareerTrajectoryConfigPage;
