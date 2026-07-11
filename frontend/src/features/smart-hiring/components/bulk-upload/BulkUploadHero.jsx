import React from 'react';

export default function BulkUploadHero({ onDownloadTemplate, downloading }) {
  return (
    <header className="bu-page-head" data-testid="bulk-upload-hero">
      <div>
        <h1>Bulk Upload Command Center</h1>
        <p>
          Import requisitions, candidates and pipeline stages with AI validation before final import.
        </p>
      </div>
      <button
        type="button"
        className="bu-btn-primary"
        onClick={onDownloadTemplate}
        disabled={downloading}
        data-testid="bulk-download-template-btn"
      >
        {downloading ? 'Downloading…' : 'Download Template'}
      </button>
    </header>
  );
}
