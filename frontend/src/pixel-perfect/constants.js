/** Default insight cards from smart_hiring_pixel_perfect_react/src/data/overview.js */
export const PIXEL_PERFECT_INSIGHTS = [
  {
    severity: 'red',
    title: 'High risk of hiring delay',
    message: 'Engineering has 87% probability of delay due to low interview conversion.',
    action_label: 'View Details',
  },
  {
    severity: 'orange',
    title: 'Interview bottleneck',
    message: '32 interviews pending feedback. Candidate experience may be impacted.',
    action_label: 'Take Action',
  },
  {
    severity: 'blue',
    title: 'High-fit talent available',
    message: '78 high-fit candidates are waiting. Move them forward to speed up hiring.',
    action_label: 'Review Fits',
  },
  {
    severity: 'green',
    title: 'Offer acceptance improving',
    message: 'Offer acceptance rate improved by 5.4%. Continue current strategy.',
    action_label: 'View Trend',
  },
];

export const PIXEL_PERFECT_DEPARTMENT_RISK = [
  { department: 'Engineering', risk_level: 'high', dot_count: 5 },
  { department: 'Data Science', risk_level: 'high', dot_count: 4 },
  { department: 'Product', risk_level: 'medium', dot_count: 3 },
  { department: 'Sales', risk_level: 'low', dot_count: 3 },
  { department: 'Finance', risk_level: 'low', dot_count: 2 },
];

export const PIXEL_PERFECT_TALENT_INTEL = [
  { skill: 'Python', pct: 82 },
  { skill: 'GenAI', pct: 62 },
  { skill: 'Azure', pct: 52 },
  { skill: 'Data Engineering', pct: 45 },
  { skill: 'MLOps', pct: 33 },
];

export const PIXEL_PERFECT_RECRUITERS = [
  { recruiter_id: 'r1', recruiter_name: 'Rahul Sharma', reqs: 18, fill_rate_pct: 85, health_score: 92 },
  { recruiter_id: 'r2', recruiter_name: 'Neha Verma', reqs: 16, fill_rate_pct: 78, health_score: 89 },
  { recruiter_id: 'r3', recruiter_name: 'Priya Nair', reqs: 14, fill_rate_pct: 65, health_score: 77 },
  { recruiter_id: 'r4', recruiter_name: 'Amit Singh', reqs: 12, fill_rate_pct: 48, health_score: 61 },
];

export const PIXEL_PERFECT_SMART_ACTIONS = [
  { id: 'approve-offers', label: 'Approve Offers', count: 3 },
  { id: 'review-high-fit', label: 'Review High-Fit', count: 18 },
  { id: 'schedule-interviews', label: 'Schedule Interviews', count: 27 },
  { id: 'escalate-delays', label: 'Escalate Delays', count: 4 },
  { id: 'hiring-risks', label: 'Hiring Risks', count: 2 },
];

export const PIXEL_PERFECT_FUNNEL = [
  { stage: 'APPLICATIONS', label: 'Applications', count: 1455 },
  { stage: 'SCREENED', label: 'Screened', count: 812 },
  { stage: 'ASSESSMENT', label: 'Assessment', count: 465 },
  { stage: 'INTERVIEW', label: 'Interview', count: 112 },
  { stage: 'OFFER', label: 'Offer', count: 21 },
  { stage: 'JOINED', label: 'Joined', count: 8 },
];
