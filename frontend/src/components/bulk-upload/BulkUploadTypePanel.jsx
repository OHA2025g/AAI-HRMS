import React from 'react';
import { UPLOAD_TYPES } from '../../lib/bulkUploadUtils';

export default function BulkUploadTypePanel({ uploadType, onUploadTypeChange }) {
  const selected = UPLOAD_TYPES.find((t) => t.id === uploadType) || UPLOAD_TYPES[0];

  return (
    <div className="bu-card bu-upload-type" data-testid="bulk-upload-type-panel">
      <div className="bu-label">EXCEL UPLOAD TYPE</div>
      <select
        className="bu-big-select"
        value={uploadType}
        onChange={(e) => onUploadTypeChange(e.target.value)}
        data-testid="bulk-upload-type-select"
      >
        {UPLOAD_TYPES.map((type) => (
          <option key={type.id} value={type.id} disabled={!type.enabled}>
            {type.label}
            {!type.enabled ? ' (coming soon)' : ''}
          </option>
        ))}
      </select>
      <p className="bu-muted">{selected.description}</p>
      <div className="bu-template">
        <span className="bu-chip">xlsx</span>
        <b>{selected.templateName}</b>
      </div>
    </div>
  );
}
