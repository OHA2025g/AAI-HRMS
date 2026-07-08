import React from 'react';
import { toast } from 'sonner';
import { careerTrajectoryApi, phase2FitApi } from '../../../lib/api';
import { downloadPhase1Export, downloadPhase2Export } from '../../../lib/candidateDetailTrajectoryUtils';

const FORMATS = [
  { key: 'pdf', label: 'Export PDF', icon: 'download' },
  { key: 'csv', label: 'Export CSV', icon: 'table' },
  { key: 'xlsx', label: 'Export XLSX', icon: 'grid' },
  { key: 'json', label: 'Export JSON', icon: 'json' },
];

function ExportIcon({ type }) {
  if (type === 'table') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }
  if (type === 'grid') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 4h16v16H4z" />
        <path d="M4 10h16M10 4v16" />
      </svg>
    );
  }
  if (type === 'json') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export default function TrajectoryExportRow({ phase1Report, phase2Report }) {
  const handleExport = async (format) => {
    try {
      if (phase2Report?.id) {
        await downloadPhase2Export(phase2Report.id, format, phase2FitApi);
      } else if (phase1Report?.id) {
        await downloadPhase1Export(phase1Report.id, format, careerTrajectoryApi);
      } else {
        toast.error('Run trajectory analysis first');
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Export failed');
    }
  };

  return (
    <div className="cdt-export-row" data-testid="trajectory-export-row">
      {FORMATS.map((fmt) => (
        <button
          key={fmt.key}
          type="button"
          className="cdt-export-btn"
          onClick={() => handleExport(fmt.key)}
          data-testid={`phase2-export-${fmt.key}`}
        >
          <ExportIcon type={fmt.icon} />
          {fmt.label}
        </button>
      ))}
    </div>
  );
}
