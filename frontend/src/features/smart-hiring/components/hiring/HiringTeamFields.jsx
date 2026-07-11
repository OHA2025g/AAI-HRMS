import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { hiringApi } from '@/shared/lib/api';
import { toast } from 'sonner';

const ROLE_LABELS = {
  hiring_manager: 'Hiring Manager',
  technical_manager: 'Technical Manager',
  project_manager: 'Project Manager',
  recruiter: 'Recruiter / TA',
};

const EMPTY = '__none__';

export default function HiringTeamFields({ value, onChange, disabled = false }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hiringApi.listTeamMembers();
        if (!cancelled) setMembers(res.data?.items || []);
      } catch {
        if (!cancelled) toast.error('Could not load hiring team members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byRole = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      const r = m.role || 'other';
      if (!map[r]) map[r] = [];
      map[r].push(m);
    });
    return map;
  }, [members]);

  const fields = [
    { key: 'hiring_manager_id', role: 'hiring_manager' },
    { key: 'technical_manager_id', role: 'technical_manager' },
    { key: 'project_manager_id', role: 'project_manager' },
    { key: 'recruiter_id', role: 'recruiter' },
  ];

  const setField = (key, id) => {
    onChange({
      ...value,
      [key]: id === EMPTY ? null : id,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">Hiring team</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Assign stakeholders for this requisition. Access is limited to assigned roles.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, role }) => (
          <div key={key} className="space-y-2">
            <Label>{ROLE_LABELS[role] || role}</Label>
            <Select
              value={value?.[key] || EMPTY}
              onValueChange={(v) => setField(key, v)}
              disabled={disabled || loading}
            >
              <SelectTrigger data-testid={`hiring-team-${key}`}>
                <SelectValue placeholder={loading ? 'Loading…' : 'Unassigned'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY}>Unassigned</SelectItem>
                {(byRole[role] || members.filter((m) => m.role === role)).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
