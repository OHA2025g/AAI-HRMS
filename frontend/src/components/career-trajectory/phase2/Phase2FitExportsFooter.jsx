import React from 'react';

export default function Phase2FitExportsFooter({ onExport, disabled }) {
  return (
    <div className="p2-footer-actions" data-testid="phase2-export-footer">
      <div className="p2-exports">
        <button
          type="button"
          className="p2-btn secondary"
          onClick={() => onExport('pdf')}
          disabled={disabled}
          data-testid="phase2-export-pdf"
        >
          ⇩ Export PDF
        </button>
        <button
          type="button"
          className="p2-btn secondary"
          onClick={() => onExport('csv')}
          disabled={disabled}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="p2-btn secondary"
          onClick={() => onExport('xlsx')}
          disabled={disabled}
          data-testid="phase2-export-xlsx"
        >
          Export XLSX
        </button>
        <button
          type="button"
          className="p2-btn secondary"
          onClick={() => onExport('json')}
          disabled={disabled}
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}
