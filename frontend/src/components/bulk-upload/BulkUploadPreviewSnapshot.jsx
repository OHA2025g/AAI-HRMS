import React from 'react';
import { fmtRecords, statusClass } from '../../lib/bulkUploadUtils';

export default function BulkUploadPreviewSnapshot({ rows, hasLiveData }) {
  return (
    <div className="bu-card bu-preview" data-testid="bulk-upload-preview-snapshot">
      <h2>Preview & Validation Snapshot</h2>
      <p className="bu-muted">
        {hasLiveData
          ? 'Review uploaded sheets and validation status before import.'
          : 'Once uploaded, records will appear here for review before import.'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Sheet</th>
            <th>Records</th>
            <th>Validation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sheet}>
              <td>{row.sheet}</td>
              <td>{fmtRecords(row.records)}</td>
              <td>{row.validation}</td>
              <td>
                <span className={statusClass(row.status)}>
                  {row.status === 'ready' ? 'Ready' : row.status === 'review' ? 'Review' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
