import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Presentation, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

export function ExecutivePageHeader({
  generatedAt,
  onRefresh,
  refetching,
  presentationMode,
  onPresentationModeChange,
  analystMode,
  onAnalystModeChange,
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1
          className="text-2xl md:text-3xl font-bold text-slate-900"
          style={{ fontFamily: 'Outfit' }}
          data-testid="executive-kpi-heading"
        >
          Executive KPI Dashboard
        </h1>
        <p className="text-slate-600 mt-1 max-w-2xl">
          Cross-workforce health, skills, engagement, retention risk, hiring quality, and automation ROI.
        </p>
        {generatedAt ? (
          <p className="text-xs text-slate-500 mt-2">Data as of {new Date(generatedAt).toLocaleString()}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="analyst-mode" checked={analystMode} onCheckedChange={onAnalystModeChange} />
          <Label htmlFor="analyst-mode" className="text-xs text-slate-600">
            Analyst view
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="presentation-mode" checked={presentationMode} onCheckedChange={onPresentationModeChange} />
          <Label htmlFor="presentation-mode" className="text-xs text-slate-600 flex items-center gap-1">
            <Presentation className="h-3.5 w-3.5" /> Board mode
          </Label>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/executive-kpi">KPI config</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refetching} data-testid="executive-refresh-btn">
          {refetching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>
    </div>
  );
}
