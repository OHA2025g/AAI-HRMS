const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

export function getDifficultyOptions() {
  return DIFFICULTY_OPTIONS;
}

export function formatQuestionTypeLabel(type) {
  const t = (type || '').toUpperCase();
  if (t === 'MCQ') return 'MCQ';
  if (t === 'SHORT_ANSWER') return 'SHORT_ANSWER';
  if (t === 'CODING') return 'CODING';
  if (t === 'SQL') return 'SQL';
  if (t === 'CASE_STUDY') return 'CASE_STUDY';
  return t || 'Question';
}

export function questionTypeChipClass(type) {
  const t = (type || '').toUpperCase();
  if (t === 'MCQ') return 'gray';
  if (t === 'SHORT_ANSWER') return 'orange';
  return 'gray';
}

export function questionNavTitle(question, index) {
  const skill = (question?.skill_tested || '').trim();
  if (skill) return skill.length > 28 ? `${skill.slice(0, 28)}…` : skill;
  const text = (question?.question_text || '').trim();
  if (!text) return `Question ${index + 1}`;
  const words = text.replace(/\?+$/, '').split(/\s+/).slice(0, 3).join(' ');
  return words.length > 24 ? `${words.slice(0, 24)}…` : words;
}

export function questionNavSubtitle(question) {
  const type = formatQuestionTypeLabel(question?.question_type);
  const marks = question?.max_marks ?? 10;
  const typeLabel =
    type === 'SHORT_ANSWER'
      ? 'Short answer'
      : type === 'MCQ'
        ? 'MCQ'
        : type.replace(/_/g, ' ');
  return `${typeLabel} · ${marks} marks`;
}

export function questionReviewStatus(question) {
  const text = (question?.question_text || '').trim();
  if (!text) return 'Review';
  const type = (question?.question_type || '').toUpperCase();
  if (type === 'MCQ') {
    const hasOptions = Array.isArray(question.options) && question.options.length >= 2;
    const hasKey = Boolean((question.answer_key || '').trim());
    return hasOptions && hasKey ? 'Ready' : 'Review';
  }
  const hasKey = Boolean((question.answer_key || '').trim());
  return hasKey ? 'Ready' : 'Review';
}

export function countReviewedQuestions(questions) {
  return (questions || []).filter((q) => questionReviewStatus(q) === 'Ready').length;
}

export function computeReviewStats(draft, questions, passThreshold) {
  const totalQuestions = questions?.length || 0;
  const totalMarks =
    draft?.total_marks ??
    (questions || []).reduce((sum, q) => sum + (Number(q.max_marks) || 10), 0);
  const duration = draft?.duration_minutes ?? 60;
  const pass = Number(passThreshold) || 70;
  return {
    totalQuestions,
    totalMarks,
    duration,
    pass,
    reviewed: countReviewedQuestions(questions),
  };
}

export function buildQualitySummary(draft) {
  const guide = (draft?.rubric?.grading_guide || '').trim();
  if (guide) return guide;
  const title = (draft?.title || '').trim();
  if (title) {
    return `Questions are aligned to ${title.toLowerCase()} competencies and role expectations.`;
  }
  return 'Questions are aligned to job skills, seniority, and assessment type expectations.';
}

export function buildQuestionRationale(question) {
  const skill = (question?.skill_tested || '').trim();
  if (skill) {
    return `Validates ${skill.toLowerCase()} before moving to deeper scenario-based questions.`;
  }
  return null;
}
