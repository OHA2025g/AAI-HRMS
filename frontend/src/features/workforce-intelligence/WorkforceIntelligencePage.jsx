import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { workforceIntelligenceApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const HORIZON_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
];

const WorkforceIntelligencePage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [horizonMonths, setHorizonMonths] = useState(3);

  const load = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await workforceIntelligenceApi.getForecast(horizonMonths, forceRefresh);
      setData(res.data || null);
    } catch (e) {
      toast.error('Failed to load workforce intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizonMonths]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const top = data?.top_forecast_gaps || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Workforce Intelligence</h1>
          <p className="text-slate-600">Phase-3 Demand-Supply forecasting (M3)</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={String(horizonMonths)} onValueChange={(v) => setHorizonMonths(Number(v))}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Horizon" />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => load(true)}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Skills tracked</p><p className="text-2xl font-bold">{data?.skills_total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Current Demand</p><p className="text-2xl font-bold">{data?.demand_current_total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Forecast Demand</p><p className="text-2xl font-bold">{data?.demand_forecast_total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Forecast Gap</p><p className="text-2xl font-bold">{data?.forecast_gap_total || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Forecasted Skill Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-slate-500">No forecast gap data yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">Horizon: {horizonMonths} months</Badge>
                <Badge variant="secondary">Generated at: {data?.generated_at ? String(data.generated_at).slice(0, 19).replace('T', ' ') : '-'}</Badge>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={top}>
                  <XAxis dataKey="skill_name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="forecast_gap" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Details (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? null : (
            <div className="space-y-3">
              {top.map((r) => (
                <div key={r.skill_name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.skill_name}</div>
                    <div className="text-xs text-slate-600">
                      Demand now: {r.demand_current} | Supply: {r.supply_count} | Forecast demand: {r.demand_forecast}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{r.priority}</Badge>
                    <Badge variant="outline">Gap: {r.forecast_gap} ({r.forecast_gap_pct}%)</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkforceIntelligencePage;

