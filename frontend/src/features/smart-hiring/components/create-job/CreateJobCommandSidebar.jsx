import React from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';

const CHECKLIST = [
  { key: 'basic', step: 1, text: 'Basic information step is active and ready for classification.' },
  { key: 'role', step: 2, text: 'Add title, location, experience, and role summary.' },
  { key: 'skills', step: 3, text: 'Enter mandatory and good-to-have skill signals.' },
  { key: 'publish', step: 4, text: 'Review and publish once required fields are complete.' },
];

export default function CreateJobCommandSidebar({
  currentStep,
  readinessPct,
  preview,
  isEdit,
}) {
  return (
    <aside className="cj-side-stack">
      <section className="cj-panel cj-ai-panel">
        <div className="cj-ai-head">
          <div className="cj-ai-icon" aria-hidden>
            <Sparkles size={23} strokeWidth={2} />
          </div>
          <div>
            <h3>AI Setup Assistant</h3>
            <p>Guides classification, JD quality, skills, and matching readiness.</p>
          </div>
        </div>
        <div className="cj-readiness">
          <div className="cj-readiness-top">
            <strong>Requisition Readiness</strong>
            <span>{readinessPct}%</span>
          </div>
          <div className="cj-progress">
            <i style={{ width: `${readinessPct}%` }} />
          </div>
          <div className="cj-check-list">
            {CHECKLIST.map((item, idx) => {
              const done = currentStep > item.step || (currentStep === item.step && idx === 0);
              return (
                <div key={item.key} className={`cj-check-item ${done ? 'done' : ''}`}>
                  <span className="cj-check-dot">{done ? '✓' : item.step}</span>
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="cj-tip-card">
          <div className="cj-tip-icon" aria-hidden>
            <Lightbulb size={17} strokeWidth={2} />
          </div>
          <div>
            <strong>Smart Suggestion</strong>
            <span>
              Start with business pillar and department. AI can then recommend relevant skills and
              assessments for this job family.
            </span>
          </div>
        </div>
      </section>

      <section className="cj-panel cj-preview-panel">
        <div className="cj-preview-title">
          <h3>Live Requisition Preview</h3>
          <span>{isEdit ? 'Editing' : 'Draft'}</span>
        </div>
        <div className="cj-preview-list">
          <div className="cj-preview-row">
            <small>Business Pillar</small>
            <strong>{preview.pillar}</strong>
          </div>
          <div className="cj-preview-row">
            <small>Department / Sub-department</small>
            <strong>{preview.department}</strong>
          </div>
          <div className="cj-preview-row">
            <small>Project ID</small>
            <strong>{preview.project}</strong>
          </div>
          <div className="cj-preview-row">
            <small>Job Title</small>
            <strong>{preview.title}</strong>
          </div>
        </div>
        <div className="cj-tag-cloud">
          <span className="cj-skill-tag purple">AI Match</span>
          <span className="cj-skill-tag teal">Candidate Sourcing</span>
          <span className="cj-skill-tag amber">Assessment Routing</span>
        </div>
      </section>
    </aside>
  );
}
