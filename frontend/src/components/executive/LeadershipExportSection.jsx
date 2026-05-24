import React, { useState } from 'react';
import { toast } from 'sonner';
import { executiveApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function LeadershipExportSection({
  periodYm,
  setPeriodYm,
  horizonMonths,
  windowDays,
  snapshots,
  onSnapshotsReload,
  department,
  managerRootId,
  roleContains,
}) {
  const drillPayload = {
    department: department || undefined,
    manager_root_id: managerRootId || undefined,
    role_title_contains: roleContains?.trim() || undefined,
  };
  const [exportBusy, setExportBusy] = useState(false);

  const downloadPack = async (snapshotId, format) => {
    try {
      const res = await executiveApi.downloadM9ExportPack(snapshotId, format);
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m9-snapshot-${snapshotId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const createSnapshot = async () => {
    setExportBusy(true);
    try {
      const res = await executiveApi.createM9MonthlySnapshot({
        period: periodYm,
        horizon_months: horizonMonths,
        window_days: windowDays,
        ...drillPayload,
      });
      toast.success(`Snapshot ${res.data?.id?.slice(0, 8)}… created`);
      await onSnapshotsReload?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Snapshot failed');
    } finally {
      setExportBusy(false);
    }
  };

  const downloadFullLeadershipPack = async () => {
    setExportBusy(true);
    try {
      const res = await executiveApi.downloadM9FullLeadershipPack({
        period: periodYm,
        horizon_months: horizonMonths,
        window_days: windowDays,
        ...drillPayload,
      });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m9-full-leadership-pack-${periodYm}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Leadership pack downloaded');
      await onSnapshotsReload?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'ZIP export failed');
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <Card id="reports">
      <CardHeader>
        <CardTitle>Leadership reports</CardTitle>
        <CardDescription>Monthly snapshots and board-ready export packs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <p className="text-xs text-slate-500 mb-1">Period (YYYY-MM)</p>
            <Input className="w-[140px]" value={periodYm} onChange={(e) => setPeriodYm(e.target.value)} />
          </div>
          <Button onClick={createSnapshot} disabled={exportBusy}>
            {exportBusy ? 'Working…' : 'Generate snapshot'}
          </Button>
          <Button
            variant="secondary"
            onClick={downloadFullLeadershipPack}
            disabled={exportBusy}
            data-testid="executive-download-full-pack"
          >
            Download full pack (ZIP)
          </Button>
        </div>
        {snapshots.length === 0 ? (
          <p className="text-slate-500 text-sm">No snapshots yet — generate one for period-over-period comparison.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Downloads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.period}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {['csv', 'pdf', 'json'].map((fmt) => (
                      <Button key={fmt} type="button" variant="outline" size="sm" onClick={() => downloadPack(s.id, fmt)}>
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
