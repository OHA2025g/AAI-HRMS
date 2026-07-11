export const UPLOAD_TYPES = [
  {
    id: 'candidates',
    label: 'Candidates',
    description:
      'Import candidate profiles into the talent pool with AI column mapping, duplicate detection, and validation before commit.',
    templateName: 'candidate_import_template.xlsx',
    enabled: true,
  },
  {
    id: 'requisitions',
    label: 'Job Requisitions & Pipeline',
    description:
      'Upload requisition sheets and optional pipeline sheets. Pipeline rows link candidates to a requisition and set their current stage.',
    templateName: 'job_requisition_import_template.xlsx',
    enabled: false,
  },
  {
    id: 'feedback',
    label: 'Interview Feedback',
    description: 'Import structured interview feedback and scorecards.',
    templateName: 'interview_feedback_template.xlsx',
    enabled: false,
  },
  {
    id: 'offers',
    label: 'Offer & Joining',
    description: 'Import offer letters and joining status updates.',
    templateName: 'offer_joining_template.xlsx',
    enabled: false,
  },
];

export const MOCK_SNAPSHOT_ROWS = [
  {
    sheet: 'Requisitions',
    records: 141,
    validation: 'Required fields ready',
    status: 'ready',
  },
  {
    sheet: 'Pipeline',
    records: 1455,
    validation: '12 missing candidate emails',
    status: 'review',
  },
  {
    sheet: 'Candidate Mapping',
    records: 1455,
    validation: 'Duplicate check pending',
    status: 'pending',
  },
];

export function mockStepFromWizardStep(step) {
  if (step <= 0) return 1;
  if (step <= 2) return 2;
  return 3;
}

export function progressPercentFromStep(step) {
  if (step <= 0) return 33;
  if (step === 1) return 55;
  if (step === 2) return 72;
  return 100;
}

export function progressLabelFromStep(step, fileName) {
  if (step <= 0) {
    return fileName
      ? `Step 1 of 3 · ${fileName} selected`
      : 'Step 1 of 3 · Waiting for workbook';
  }
  if (step === 1) return 'Step 2 of 3 · Mapping columns & checking records';
  if (step === 2) return 'Step 2 of 3 · Review validation snapshot';
  if (step === 3) return 'Step 3 of 3 · Import complete';
  return 'Step 1 of 3 · Waiting for workbook';
}

export function buildSnapshotRows({ batch, preview, selectedSheet, missingRequired }) {
  if (preview) {
    const rows = [
      {
        sheet: selectedSheet || 'Candidates',
        records: preview.total_rows,
        validation:
          preview.invalid_rows > 0
            ? `${preview.invalid_rows} invalid row(s) · ${preview.duplicate_rows} duplicate(s)`
            : 'Required fields ready',
        status: preview.invalid_rows > 0 || preview.duplicate_rows > 0 ? 'review' : 'ready',
      },
    ];
    if (preview.duplicate_rows > 0) {
      rows.push({
        sheet: 'Duplicate check',
        records: preview.duplicate_rows,
        validation: 'Review duplicate strategy before import',
        status: 'pending',
      });
    }
    return rows;
  }

  if (batch) {
    return [
      {
        sheet: selectedSheet || batch.sheet_names?.[0] || 'Candidates',
        records: batch.detected_row_count,
        validation: missingRequired?.length
          ? 'Required fields need mapping'
          : 'Auto-map complete · ready to validate',
        status: missingRequired?.length ? 'pending' : 'review',
      },
    ];
  }

  return MOCK_SNAPSHOT_ROWS;
}

export function statusClass(status) {
  if (status === 'ready') return 'bu-status bu-status-ready';
  if (status === 'review') return 'bu-status bu-status-warn';
  return 'bu-status bu-status-pending';
}

export function fmtRecords(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN');
}
