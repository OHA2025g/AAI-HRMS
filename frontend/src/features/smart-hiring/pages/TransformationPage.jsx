import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { transformationApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Loader2, Target, Rocket, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const statusColor = {
  in_progress: 'bg-indigo-100 text-indigo-700',
  planned: 'bg-slate-100 text-slate-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const priorityColor = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-amber-100 text-amber-700',
  P2: 'bg-blue-100 text-blue-700',
};

const TransformationPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await transformationApi.getModules();
        setData(res.data);
      } catch (error) {
        toast.error('Failed to load transformation roadmap');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const modules = data?.modules || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          BRD + SRS Transformation
        </h1>
        <p className="text-slate-600 mt-1">
          Evolving AAI-HRMS into an AI-powered workforce intelligence platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-600" />
            Target Platform Vision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-800 font-medium">{data?.platform_vision || 'AI-Powered Workforce Intelligence Platform'}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            {Object.entries(data?.business_impact || {}).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3 bg-slate-50">
                <p className="font-semibold text-slate-900 capitalize">{k}</p>
                <p className="text-slate-600 mt-1">{v}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Card key={m.id} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                <span>{m.id} - {m.name}</span>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColor[m.priority] || priorityColor.P2}>{m.priority}</Badge>
                  <Badge className={statusColor[m.status] || statusColor.planned}>{m.status.replace('_', ' ')}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Current State</p>
                <p className="text-slate-600">{m.current_state}</p>
              </div>
              {(m.achieved || []).length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Achieved (as shipped)
                  </p>
                  <ul className="list-disc ml-5 text-slate-700 mt-2 space-y-1">
                    {(m.achieved || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">Gap</p>
                <p className="text-slate-600">{m.gap}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Target State</p>
                <p className="text-slate-600">{m.target_state}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 flex items-center gap-1"><Target className="w-4 h-4" /> BRD</p>
                <ul className="list-disc ml-5 text-slate-600">
                  {(m.brd || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> SRS Functional</p>
                <ul className="list-disc ml-5 text-slate-600">
                  {(m.srs_functional || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900">SRS Non-Functional</p>
                <ul className="list-disc ml-5 text-slate-600">
                  {(m.srs_non_functional || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default TransformationPage;
