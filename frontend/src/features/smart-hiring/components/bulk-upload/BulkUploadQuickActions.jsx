import React from 'react';

export default function BulkUploadQuickActions({
  onViewHistory,
  onDownloadErrors,
  onConfigureMapping,
  errorsDisabled,
}) {
  return (
    <div className="bu-card" data-testid="bulk-upload-quick-actions">
      <h2>Quick Actions</h2>
      <button type="button" className="bu-btn-secondary bu-btn-block" onClick={onViewHistory}>
        View Import History
      </button>
      <button
        type="button"
        className="bu-btn-secondary bu-btn-block"
        onClick={onDownloadErrors}
        disabled={errorsDisabled}
      >
        Download Error Report
      </button>
      <button type="button" className="bu-btn-secondary bu-btn-block" onClick={onConfigureMapping}>
        Configure Field Mapping
      </button>
    </div>
  );
}
