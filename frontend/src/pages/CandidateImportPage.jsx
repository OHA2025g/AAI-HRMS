import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidateImportApi } from '../lib/api';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Download,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import BulkUploadHero from '../components/bulk-upload/BulkUploadHero';
import BulkUploadTypePanel from '../components/bulk-upload/BulkUploadTypePanel';
import BulkUploadSteps from '../components/bulk-upload/BulkUploadSteps';
import BulkUploadDropZone from '../components/bulk-upload/BulkUploadDropZone';
import BulkUploadPreviewSnapshot from '../components/bulk-upload/BulkUploadPreviewSnapshot';
import BulkUploadAiPanel from '../components/bulk-upload/BulkUploadAiPanel';
import BulkUploadChecklist from '../components/bulk-upload/BulkUploadChecklist';
import BulkUploadQuickActions from '../components/bulk-upload/BulkUploadQuickActions';
import {
  buildSnapshotRows,
  progressLabelFromStep,
  progressPercentFromStep,
  UPLOAD_TYPES,
} from '../lib/bulkUploadUtils';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const STATUS_BADGE = {
  VALID: 'bu-row-badge valid',
  INVALID: 'bu-row-badge invalid',
  DUPLICATE: 'bu-row-badge duplicate',
};

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function CandidateImportPage() {
  const [step, setStep] = useState(0);
  const [schemaFields, setSchemaFields] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [batch, setBatch] = useState(null);
  const [mapping, setMapping] = useState({});
  const [missingRequired, setMissingRequired] = useState([]);
  const [columnRequiredHints, setColumnRequiredHints] = useState({});
  const [priorImportWarning, setPriorImportWarning] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [importOnlyValid, setImportOnlyValid] = useState(true);
  const [preview, setPreview] = useState(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyDetailOpen, setHistoryDetailOpen] = useState(false);
  const [uploadType, setUploadType] = useState('candidates');
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const historyRef = useRef(null);
  const mappingRef = useRef(null);

  useEffect(() => {
    candidateImportApi
      .getSchema()
      .then((res) => setSchemaFields(res.data?.fields || []))
      .catch(() => toast.error('Failed to load import schema'));
    candidateImportApi
      .history()
      .then((res) => setHistory(res.data?.items || []))
      .catch(() => {});
  }, [commitResult]);

  const dbFieldOptions = useMemo(
    () => schemaFields.map((f) => ({ value: f.field, label: f.label })),
    [schemaFields],
  );

  const handleDownloadTemplate = async () => {
    const type = UPLOAD_TYPES.find((t) => t.id === uploadType);
    if (type && !type.enabled) {
      toast.message('This upload type is coming soon');
      return;
    }
    setTemplateDownloading(true);
    try {
      const res = await candidateImportApi.downloadTemplate();
      downloadBlob(res.data, 'candidate_import_template.xlsx');
    } catch {
      toast.error('Template download failed');
    } finally {
      setTemplateDownloading(false);
    }
  };

  const applyAutoMapResult = useCallback((data) => {
    const next = {};
    Object.entries(data.mapping || {}).forEach(([col, field]) => {
      if (field) next[col] = field;
    });
    setMapping(next);
    setMissingRequired(data.missing_required_fields || []);
    setColumnRequiredHints(data.column_required_hints || {});
  }, []);

  const mappedFields = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping],
  );

  useEffect(() => {
    const nextMissing = [];
    if (!mappedFields.has('full_name')) nextMissing.push('full_name');
    if (!mappedFields.has('email') && !mappedFields.has('phone')) {
      nextMissing.push('email_or_phone');
    }
    setMissingRequired(nextMissing);
  }, [mappedFields]);

  const requiredFieldStatus = useMemo(() => {
    const labelFor = (field) =>
      schemaFields.find((f) => f.field === field)?.label ||
      (field === 'email_or_phone' ? 'Email or Phone' : field);
    return [
      { field: 'full_name', label: labelFor('full_name'), mapped: mappedFields.has('full_name') },
      {
        field: 'email_or_phone',
        label: labelFor('email_or_phone'),
        mapped: mappedFields.has('email') || mappedFields.has('phone'),
      },
    ];
  }, [mappedFields, schemaFields]);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select an Excel file first');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File exceeds 10 MB limit');
      return;
    }
    setUploading(true);
    try {
      const res = await candidateImportApi.upload(file);
      setBatch(res.data);
      setSelectedSheet(res.data.sheet_names?.[0] || 'Sheet1');
      setPriorImportWarning(res.data.prior_import_warning || null);
      const mapRes = await candidateImportApi.autoMap({
        batch_id: res.data.batch_id,
        excel_columns: res.data.columns,
      });
      applyAutoMapResult(mapRes.data);
      setStep(1);
      toast.success(`Uploaded ${res.data.detected_row_count} rows`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSheetChange = async (sheetName) => {
    if (!batch?.batch_id || !sheetName) return;
    setSelectedSheet(sheetName);
    setSheetLoading(true);
    try {
      const res = await candidateImportApi.sheetPreview({
        batch_id: batch.batch_id,
        sheet_name: sheetName,
      });
      setBatch((prev) => ({
        ...prev,
        columns: res.data.columns,
        detected_row_count: res.data.detected_row_count,
        sample_rows: res.data.sample_rows,
      }));
      const mapRes = await candidateImportApi.autoMap({
        batch_id: batch.batch_id,
        excel_columns: res.data.columns,
      });
      applyAutoMapResult(mapRes.data);
      toast.success(`Switched to sheet "${sheetName}" (${res.data.detected_row_count} rows)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not load sheet');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleAutoMap = async () => {
    if (!batch?.batch_id) return;
    try {
      const res = await candidateImportApi.autoMap({
        batch_id: batch.batch_id,
        excel_columns: batch.columns,
      });
      applyAutoMapResult(res.data);
      toast.success('Columns auto-mapped');
    } catch {
      toast.error('Auto-map failed');
    }
  };

  const handleValidate = async () => {
    if (!batch?.batch_id) return;
    setValidating(true);
    try {
      const res = await candidateImportApi.validatePreview({
        batch_id: batch.batch_id,
        sheet_name: selectedSheet || batch.sheet_names?.[0],
        mapping,
        duplicate_strategy: duplicateStrategy,
      });
      setPreview(res.data);
      setPriorImportWarning(res.data.prior_import_warning || null);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!batch?.batch_id) return;
    setCommitting(true);
    setConfirmOpen(false);
    try {
      const res = await candidateImportApi.commit({
        batch_id: batch.batch_id,
        import_only_valid: importOnlyValid,
        duplicate_strategy: duplicateStrategy,
      });
      setCommitResult(res.data);
      setStep(3);
      toast.success(`Imported ${res.data.inserted_count} candidates`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadErrors = async (batchId) => {
    const id = batchId || batch?.batch_id;
    if (!id) return;
    try {
      const res = await candidateImportApi.downloadErrors(id);
      downloadBlob(res.data, `import_errors_${id}.xlsx`);
    } catch {
      toast.error('Error report download failed');
    }
  };

  const openHistoryDetail = async (batchId) => {
    try {
      const res = await candidateImportApi.batchDetail(batchId);
      setHistoryDetail(res.data);
      setHistoryDetailOpen(true);
    } catch {
      toast.error('Could not load batch details');
    }
  };

  const resetWizard = useCallback(() => {
    setStep(0);
    setFile(null);
    setBatch(null);
    setMapping({});
    setMissingRequired([]);
    setColumnRequiredHints({});
    setPriorImportWarning(null);
    setSelectedSheet('');
    setPreview(null);
    setImportOnlyValid(true);
    setCommitResult(null);
  }, []);

  const importableCount = useMemo(() => {
    if (!preview) return 0;
    let count = importOnlyValid
      ? preview.valid_rows
      : preview.valid_rows + preview.invalid_rows;
    if (duplicateStrategy !== 'skip') {
      count += preview.duplicate_rows;
    }
    return count;
  }, [preview, importOnlyValid, duplicateStrategy]);

  const snapshotRows = useMemo(
    () =>
      buildSnapshotRows({
        batch,
        preview,
        selectedSheet,
        missingRequired,
      }),
    [batch, preview, selectedSheet, missingRequired],
  );

  const hasLiveSnapshot = Boolean(batch || preview);
  const progressLabel = progressLabelFromStep(step, file?.name);
  const progressPercent = progressPercentFromStep(step);

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMapping = () => {
    if (step < 1) {
      toast.message('Upload a workbook first to configure field mapping');
      return;
    }
    mappingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="bulk-upload-root">
      <BulkUploadHero
        onDownloadTemplate={handleDownloadTemplate}
        downloading={templateDownloading}
      />

      <div className="bu-hero-grid">
        <BulkUploadTypePanel uploadType={uploadType} onUploadTypeChange={setUploadType} />
        <BulkUploadSteps wizardStep={step} />
      </div>

      {step === 0 ? (
        <BulkUploadDropZone
          file={file}
          onFileChange={setFile}
          onUpload={handleUpload}
          uploading={uploading}
          disabled={uploadType !== 'candidates'}
          progressLabel={progressLabel}
          progressPercent={progressPercent}
        />
      ) : null}

      {step >= 1 && batch ? (
        <div className="bu-card bu-workflow" ref={mappingRef} data-testid="bulk-upload-mapping-panel">
          <div className="bu-workflow-head">
            <div>
              <h2>Column mapping</h2>
              <p className="bu-muted">
                Batch {batch.batch_id} · {batch.detected_row_count} rows · {batch.file_name}
              </p>
            </div>
            <button type="button" className="bu-btn-secondary" onClick={resetWizard}>
              Start over
            </button>
          </div>

          {batch.sheet_names?.length > 1 ? (
            <div className="bu-workflow-actions">
              <span className="bu-muted" style={{ alignSelf: 'center' }}>
                Worksheet
              </span>
              <Select value={selectedSheet} onValueChange={handleSheetChange} disabled={sheetLoading}>
                <SelectTrigger className="bu-select-trigger">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {batch.sheet_names.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sheetLoading ? <Loader2 className="bu-inline-spinner" aria-hidden /> : null}
            </div>
          ) : null}

          {priorImportWarning ? (
            <div className="bu-alert bu-alert-warn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <div>
                <b>Previously imported file</b>
                <p className="bu-muted" style={{ margin: '6px 0 0' }}>
                  {priorImportWarning.message}
                </p>
              </div>
            </div>
          ) : null}

          <p className="bu-label" style={{ marginTop: 8 }}>
            Required field mapping
          </p>
          <div className="bu-badge-row">
            {requiredFieldStatus.map(({ field, label, mapped }) => (
              <span key={field} className={`bu-field-badge ${mapped ? 'ok' : 'warn'}`}>
                {mapped ? '✓' : '!'} {label}
              </span>
            ))}
          </div>

          {missingRequired.length > 0 ? (
            <div className="bu-alert bu-alert-warn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <div>
                Map columns for:{' '}
                {missingRequired.map((f) => (f === 'email_or_phone' ? 'Email or Phone' : f)).join(', ')}
              </div>
            </div>
          ) : null}

          <div className="bu-workflow-actions">
            <button type="button" className="bu-btn-secondary" onClick={handleAutoMap}>
              Auto-map columns
            </button>
            <Select value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
              <SelectTrigger className="bu-select-trigger">
                <SelectValue placeholder="Duplicate strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip duplicates</SelectItem>
                <SelectItem value="update">Update duplicates</SelectItem>
                <SelectItem value="merge">Merge duplicates</SelectItem>
                <SelectItem value="create_new">Create new anyway</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bu-map-table-wrap">
            <table className="bu-map-table">
              <thead>
                <tr>
                  <th>Excel column</th>
                  <th>Database field</th>
                </tr>
              </thead>
              <tbody>
                {batch.columns.map((col) => {
                  const hint = columnRequiredHints[col];
                  const needsRequiredMapping =
                    hint &&
                    !mapping[col] &&
                    ((hint === 'full_name' && !mappedFields.has('full_name')) ||
                      (hint === 'email' && !mappedFields.has('email') && !mappedFields.has('phone')) ||
                      (hint === 'phone' && !mappedFields.has('email') && !mappedFields.has('phone')));
                  const hintLabel =
                    hint === 'full_name'
                      ? 'Full Name'
                      : hint === 'email'
                        ? 'Email'
                        : hint === 'phone'
                          ? 'Phone'
                          : hint;
                  return (
                    <tr key={col} style={needsRequiredMapping ? { background: '#fffbeb' } : undefined}>
                      <td>
                        <b>{col}</b>
                        {needsRequiredMapping ? (
                          <p className="bu-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                            Likely required: {hintLabel}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <Select
                          value={mapping[col] || '__none__'}
                          onValueChange={(v) =>
                            setMapping((prev) => {
                              const next = { ...prev };
                              if (v === '__none__') delete next[col];
                              else next[col] = v;
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="bu-select-trigger">
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Not mapped —</SelectItem>
                            {dbFieldOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {step === 1 ? (
            <div className="bu-workflow-actions">
              <button type="button" className="bu-btn-primary" onClick={handleValidate} disabled={validating}>
                {validating ? (
                  <>
                    <Loader2 className="bu-inline-spinner" aria-hidden />
                    Validating…
                  </>
                ) : (
                  <>
                    <ArrowRight className="bu-inline-spinner" style={{ animation: 'none' }} aria-hidden />
                    Validate & preview
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step >= 2 && preview ? (
        <div className="bu-card bu-workflow" data-testid="bulk-upload-preview-panel">
          <div className="bu-workflow-head">
            <div>
              <h2>Validation preview</h2>
              <p className="bu-muted">Review row-level validation before committing the import.</p>
            </div>
            {preview.invalid_rows > 0 || preview.duplicate_rows > 0 ? (
              <button type="button" className="bu-btn-secondary" onClick={() => handleDownloadErrors()}>
                <Download className="bu-inline-spinner" style={{ animation: 'none', width: 14, height: 14 }} />
                Error report
              </button>
            ) : null}
          </div>

          <div className="bu-kpi-row">
            {[
              { label: 'Total rows', value: preview.total_rows },
              { label: 'Valid', value: preview.valid_rows, good: true },
              { label: 'Invalid', value: preview.invalid_rows, bad: preview.invalid_rows > 0 },
              { label: 'Duplicates', value: preview.duplicate_rows },
            ].map(({ label, value, good, bad }) => (
              <div key={label} className={`bu-kpi ${good ? 'good' : bad ? 'bad' : ''}`}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>

          {preview.validation_summary ? (
            <div className="bu-kpi-row">
              {[
                ['Missing mandatory', preview.validation_summary.missing_mandatory],
                ['Invalid email', preview.validation_summary.invalid_email],
                ['Invalid phone', preview.validation_summary.invalid_phone],
                ['In-file duplicate', preview.validation_summary.in_file_duplicate],
              ].map(([label, count]) => (
                <div key={label} className={`bu-kpi ${count > 0 ? 'bad' : ''}`}>
                  <small>{label}</small>
                  <b>{count ?? 0}</b>
                </div>
              ))}
            </div>
          ) : null}

          <div className="bu-map-table-wrap">
            <table className="bu-map-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Match / notes</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {(preview.preview || []).map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>
                      <span className={STATUS_BADGE[row.status] || 'bu-row-badge'}>{row.status}</span>
                    </td>
                    <td>{row.transformed_candidate?.full_name}</td>
                    <td>{row.transformed_candidate?.email}</td>
                    <td>{row.transformed_candidate?.phone}</td>
                    <td className="bu-muted" style={{ maxWidth: 180 }}>
                      {row.status === 'DUPLICATE' && row.duplicate_match_reason ? (
                        <span>Dup: {row.duplicate_match_reason.replace(/_/g, ' ')}</span>
                      ) : null}
                      {(row.warnings || []).length > 0 ? (
                        <span>{(row.warnings || []).map((w) => w.warning).join('; ')}</span>
                      ) : row.status !== 'DUPLICATE' || !row.duplicate_match_reason ? (
                        '—'
                      ) : null}
                    </td>
                    <td style={{ color: '#dc2626', maxWidth: 200 }}>
                      {(row.errors || []).map((e) => e.error).join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {step === 2 ? (
            <div className="bu-workflow-actions" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Checkbox
                  id="import-only-valid"
                  checked={importOnlyValid}
                  onCheckedChange={(checked) => setImportOnlyValid(checked === true)}
                />
                <Label htmlFor="import-only-valid" className="text-sm font-normal cursor-pointer">
                  Import only valid rows (skip invalid rows on commit)
                </Label>
              </div>
              <div className="bu-workflow-actions">
                <button
                  type="button"
                  className="bu-btn-primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={committing || !importableCount}
                >
                  Import {importOnlyValid ? 'valid' : 'all'} records ({importableCount})
                </button>
                <button type="button" className="bu-btn-secondary" onClick={() => setStep(1)}>
                  Back to mapping
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 && commitResult ? (
        <div className="bu-card bu-workflow bu-alert-success" data-testid="bulk-upload-complete">
          <div className="bu-workflow-head">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 aria-hidden />
                Import complete
              </h2>
              <p className="bu-muted">
                Batch {commitResult.batch_id} · Status: {commitResult.status}
              </p>
            </div>
          </div>
          <div className="bu-kpi-row">
            {[
              ['Inserted', commitResult.inserted_count],
              ['Updated', commitResult.updated_count],
              ['Skipped (dup)', commitResult.skipped_duplicate_count],
              ['Failed', commitResult.failed_count],
            ].map(([label, value]) => (
              <div key={label} className={`bu-kpi ${label === 'Failed' && value > 0 ? 'bad' : 'good'}`}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="bu-workflow-actions">
            <Link to="/candidates" className="bu-btn-primary" style={{ textDecoration: 'none' }}>
              View candidates
            </Link>
            <button type="button" className="bu-btn-secondary" onClick={resetWizard}>
              New import
            </button>
          </div>
        </div>
      ) : null}

      {step > 0 ? (
        <div className="bu-card" style={{ marginTop: 20 }}>
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
      ) : null}

      <div className="bu-grid">
        <BulkUploadPreviewSnapshot rows={snapshotRows} hasLiveData={hasLiveSnapshot} />
        <BulkUploadAiPanel />
      </div>

      <div className="bu-grid">
        <BulkUploadChecklist />
        <BulkUploadQuickActions
          onViewHistory={scrollToHistory}
          onDownloadErrors={() => handleDownloadErrors()}
          onConfigureMapping={scrollToMapping}
          errorsDisabled={!batch?.batch_id}
        />
      </div>

      <div className="bu-card bu-history" ref={historyRef} data-testid="bulk-upload-history">
        <h2>Import history</h2>
        <p className="bu-muted">Recent bulk upload batches and their outcomes.</p>
        {history.length === 0 ? (
          <p className="bu-muted">No imports yet.</p>
        ) : (
          <div className="bu-map-table-wrap">
            <table className="bu-map-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Inserted</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.batch_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openHistoryDetail(h.batch_id)}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{h.batch_id}</td>
                    <td>{h.file_name}</td>
                    <td>{h.status}</td>
                    <td>{h.total_rows}</td>
                    <td>{h.inserted_count}</td>
                    <td>
                      <div>{h.uploaded_by_name || h.uploaded_by || '—'}</div>
                      <div className="bu-muted" style={{ fontSize: 12 }}>
                        {h.uploaded_at ? new Date(h.uploaded_at).toLocaleString() : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm import</DialogTitle>
            <DialogDescription>
              This will insert validated candidate records into the database. Duplicate strategy:{' '}
              <strong>{duplicateStrategy}</strong>.
              {!importOnlyValid ? (
                <span className="block mt-2 text-amber-800">
                  Invalid rows will also be attempted; rows that fail validation may be marked failed.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {duplicateStrategy === 'create_new' && preview?.duplicate_rows > 0 ? (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                You chose <strong>create new anyway</strong> with {preview.duplicate_rows} duplicate
                row(s). This may create additional candidate records for the same person.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <button type="button" className="bu-btn-secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="bu-btn-primary" onClick={handleCommit} disabled={committing}>
              {committing ? <Loader2 className="bu-inline-spinner" aria-hidden /> : 'Confirm import'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDetailOpen} onOpenChange={setHistoryDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import batch details</DialogTitle>
            <DialogDescription>{historyDetail?.batch_id}</DialogDescription>
          </DialogHeader>
          {historyDetail ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">File</span>
                <span>{historyDetail.file_name}</span>
                <span className="text-slate-500">Status</span>
                <span>{historyDetail.status}</span>
                <span className="text-slate-500">Sheet</span>
                <span>{historyDetail.sheet_name || '—'}</span>
                <span className="text-slate-500">Uploaded by</span>
                <span>{historyDetail.uploaded_by_name || historyDetail.uploaded_by || '—'}</span>
                <span className="text-slate-500">Total rows</span>
                <span>{historyDetail.total_rows}</span>
                <span className="text-slate-500">Valid / Invalid / Dup</span>
                <span>
                  {historyDetail.valid_rows} / {historyDetail.invalid_rows} / {historyDetail.duplicate_rows}
                </span>
                <span className="text-slate-500">Inserted / Updated / Skipped</span>
                <span>
                  {historyDetail.inserted_count} / {historyDetail.updated_count} / {historyDetail.skipped_count}
                </span>
              </div>
              {historyDetail.file_content_purged ? (
                <p className="text-xs text-slate-500">Upload file removed from storage after commit.</p>
              ) : null}
              {historyDetail.audit_events?.length > 0 ? (
                <div className="border-t pt-3">
                  <p className="font-medium text-slate-700 mb-2">Activity timeline</p>
                  <ul className="space-y-2">
                    {historyDetail.audit_events.map((ev, idx) => (
                      <li key={`${ev.action}-${idx}`} className="flex flex-col text-xs">
                        <span className="font-medium text-slate-800">
                          {(ev.action || '').replace('CANDIDATE_EXCEL_', '')}
                        </span>
                        <span className="text-slate-500">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}
                          {ev.uploaded_by_name || ev.uploaded_by
                            ? ` · ${ev.uploaded_by_name || ev.uploaded_by}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            {historyDetail?.has_errors ? (
              <button
                type="button"
                className="bu-btn-secondary"
                onClick={() => handleDownloadErrors(historyDetail.batch_id)}
              >
                Download errors
              </button>
            ) : null}
            <button type="button" className="bu-btn-secondary" onClick={() => setHistoryDetailOpen(false)}>
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
