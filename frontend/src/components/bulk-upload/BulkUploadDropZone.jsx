import React, { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';

export default function BulkUploadDropZone({
  file,
  onFileChange,
  onUpload,
  uploading,
  disabled,
  progressLabel,
  progressPercent,
}) {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileChange(dropped);
  };

  return (
    <div className="bu-card" data-testid="bulk-upload-drop-card">
      <div
        className="bu-upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        data-testid="bulk-upload-drop-zone"
      >
        <div>
          <div className="bu-upload-icon" aria-hidden>
            <Upload className="bu-upload-icon-svg" />
          </div>
          <h2>Drop workbook here or choose file</h2>
          <p className="bu-muted">
            Supports .xlsx and .csv. Maximum file size 10 MB. AI will validate duplicates, missing
            fields and pipeline mapping.
          </p>
          <div className="bu-upload-actions">
            <button
              type="button"
              className="bu-btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              data-testid="bulk-choose-file-btn"
            >
              Choose File
            </button>
            <button
              type="button"
              className="bu-btn-secondary"
              onClick={onUpload}
              disabled={!file || uploading || disabled}
              data-testid="bulk-upload-continue-btn"
            >
              {uploading ? (
                <>
                  <Loader2 className="bu-inline-spinner" aria-hidden />
                  Uploading…
                </>
              ) : (
                'Upload & Continue'
              )}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="bu-hidden-input"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            data-testid="bulk-file-input"
          />
          {file ? (
            <p className="bu-file-selected" data-testid="bulk-selected-file">
              Selected: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : null}
        </div>
      </div>
      <div className="bu-bottom-actions">
        <div>
          <b>Upload progress</b>
          <p className="bu-muted bu-progress-label">{progressLabel}</p>
        </div>
        <div className="bu-progress">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
