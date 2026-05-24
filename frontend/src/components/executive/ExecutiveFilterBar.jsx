import React from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function ExecutiveFilterBar({
  filters,
  setFilters,
  clearFilters,
  activeChips,
  drillOpts,
  scopeHint,
  snapshots,
}) {
  const depts = drillOpts?.departments || [];
  const managers = drillOpts?.manager_roots || [];

  return (
    <Card
      className="sticky top-0 z-20 shadow-sm border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      data-testid="executive-filter-bar"
      role="region"
      aria-label="Executive KPI filters and reporting period"
    >
      <CardHeader className="py-3 pb-0">
        <CardTitle className="text-sm font-medium">Filters & reporting period</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3 pb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect
            label="Forecast horizon"
            value={String(filters.horizonMonths)}
            onValueChange={(v) => setFilters({ horizonMonths: Number(v) })}
            options={[
              { value: '1', label: '1 month' },
              { value: '3', label: '3 months' },
              { value: '6', label: '6 months' },
            ]}
            width="w-[130px]"
          />
          <FilterSelect
            label="Analytics window"
            value={String(filters.windowDays)}
            onValueChange={(v) => setFilters({ windowDays: Number(v) })}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
            width="w-[130px]"
          />
          <div className="min-w-[180px] flex-1">
            <p className="text-xs text-slate-500 mb-1">Department</p>
            <Select
              value={filters.department || '__all'}
              onValueChange={(v) => setFilters({ department: v === '__all' ? '' : v })}
            >
              <SelectTrigger data-testid="executive-filter-department">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All departments</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1">
            <p className="text-xs text-slate-500 mb-1">Team (manager subtree)</p>
            <Select
              value={filters.managerRootId || '__all'}
              onValueChange={(v) => setFilters({ managerRootId: v === '__all' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All teams</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {(m.full_name || m.id) + (m.department ? ` — ${m.department}` : '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1">
            <p className="text-xs text-slate-500 mb-1">Role contains</p>
            <Input
              placeholder="e.g. Engineer"
              aria-label="Role title contains"
              value={filters.roleContains}
              onChange={(e) => setFilters({ roleContains: e.target.value })}
            />
          </div>
          {snapshots?.length > 0 ? (
            <>
              <div className="min-w-[140px]">
                <p className="text-xs text-slate-500 mb-1">Compare period (current)</p>
                <Select
                  value={filters.comparePeriod || '__none'}
                  onValueChange={(v) => {
                    const period = v === '__none' ? '' : v;
                    const patch = { comparePeriod: period };
                    if (!period) patch.compareAgainst = '';
                    else if (filters.compareAgainst === period) patch.compareAgainst = '';
                    setFilters(patch);
                  }}
                >
                  <SelectTrigger className="w-[140px]" data-testid="executive-filter-compare">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {snapshots.map((s) => (
                      <SelectItem key={s.id} value={s.period}>
                        {s.period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filters.comparePeriod ? (
                <div className="min-w-[160px]">
                  <p className="text-xs text-slate-500 mb-1">Against period (baseline)</p>
                  <Select
                    value={filters.compareAgainst || '__auto'}
                    onValueChange={(v) =>
                      setFilters({ compareAgainst: v === '__auto' ? '' : v })
                    }
                  >
                    <SelectTrigger className="w-[160px]" data-testid="executive-filter-compare-against">
                      <SelectValue placeholder="Auto (prior)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto">Auto (prior period)</SelectItem>
                      {snapshots
                        .filter((s) => s.period !== filters.comparePeriod)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.period}>
                            {s.period}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="secondary">{scopeHint}</Badge>
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="gap-1 pr-1">
              {chip.label}
              <button
                type="button"
                className="rounded hover:bg-slate-200 p-0.5"
                onClick={() => {
                  if (chip.key === 'comparePeriod') {
                    setFilters({ comparePeriod: '', compareAgainst: '' });
                    return;
                  }
                  setFilters({
                    [chip.key]: chip.key === 'horizonMonths' ? 3 : chip.key === 'windowDays' ? 30 : '',
                  });
                }}
                aria-label={`Remove ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeChips.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
              Clear all
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onValueChange, options, width = 'w-[140px]' }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={width}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
