# AAI-HRMS - Agentic AI HR Management System

## Product Requirements Document (PRD)

### Original Problem Statement
Build an **Agentic AI-driven HR Management System** that automates:
- Intelligent candidate sourcing with AI-powered matching
- Resume parsing and skill extraction
- Fit scoring (70% skill match, 60% activity similarity)
- One-click referral automation
- AI-generated assessments from job descriptions
- ATS pipeline management with Kanban view
- Campus placement hiring (Phase 2)

### User Personas
1. **HR Recruiter** - Creates jobs, reviews candidates, manages pipeline
2. **Talent Acquisition Head** - Views analytics, manages team
3. **Hiring Manager** - Reviews shortlists, provides feedback
4. **Employee** - Submits referrals, tracks status
5. **Candidate** - Takes assessments, views job status

### Core Requirements (Static)
- JD intake with AI-powered normalization
- Candidate management with skills tracking
- Fit scoring engine (skill match ≥70%, activity match ≥60%)
- ATS pipeline with stage management
- Employee referral portal
- AI assessment generator
- Dashboard with analytics

### Technical Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI-compatible API
- **Auth**: JWT-based authentication
- **UI Components**: Drag-n-drop Kanban, Recharts, Framer Motion

---

## What's Been Implemented (MVP - Phase 1)

### Date: 2026-01-26

#### Backend (FastAPI)
- [x] JWT Authentication (register, login, token refresh)
- [x] Jobs CRUD with AI-powered JD analysis
- [x] Candidates CRUD with skills management
- [x] Applications (ATS pipeline) with stage tracking
- [x] Fit Scoring Engine with AI-powered matching
- [x] Referrals system
- [x] AI Assessment Generator (GPT-5.2)
- [x] Dashboard statistics API
- [x] Pipeline Kanban API

#### Frontend (React)
- [x] Login/Register pages with modern UI
- [x] Dashboard with Bento grid stats
- [x] Jobs list with search/filter
- [x] Create Job wizard (3-step) with AI analysis
- [x] Job detail page with AI matches
- [x] Candidates list with source filtering
- [x] Pipeline Kanban with drag-and-drop
- [x] Referrals portal (one-click)
- [x] Assessments page with AI generation
- [x] Collapsible sidebar navigation

#### AI Features
- [x] JD Structuring Agent - extracts skills, activities, rubric
- [x] Fit Scoring Agent - computes skill/activity match %
- [x] Assessment Builder Agent - generates questions from JD

---

## What's Been Implemented (Phase 2)

### Date: 2026-01-26

#### Backend Updates
- [x] Resume upload endpoint with PDF/DOCX parsing
- [x] AI-powered resume data extraction (name, skills, experience, education)
- [x] Candidate profile API with full details
- [x] Interview scheduling CRUD
- [x] Interview feedback submission
- [x] Notifications system (create, list, mark read)
- [x] Stage change notifications (background tasks)

#### Frontend Updates
- [x] Resume upload modal with drag & drop
- [x] Tabs for Upload Resume vs Manual Entry
- [x] Candidate Profile page with:
  - Overview (skills, stats, education, resume content)
  - Applications tab (with fit scores per job)
  - Experience tab
- [x] Interviews page with:
  - Schedule Interview modal
  - Upcoming/Completed interview sections
  - Interview stats dashboard
  - Feedback submission modal
- [x] Notifications dropdown in header
- [x] Unread count badge on bell icon
- [x] Updated sidebar with Interviews link

#### AI Features (Phase 2)
- [x] Resume Parser Agent - extracts structured data from PDF/DOCX

---

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [x] Resume file upload with PDF/DOCX parsing ✅
- [x] Candidate profile detail page ✅
- [x] Interview scheduling module ✅
- [x] Email notifications for stage changes ✅

### P1 (High Priority)
- [ ] Bulk candidate import (CSV)
- [ ] Advanced search with boolean queries
- [ ] Assessment attempt tracking
- [ ] Offer letter generation
- [ ] Interview calendar view

### P2 (Medium Priority)
- [ ] Campus hiring module (colleges, drives)
- [ ] Analytics dashboard with charts
- [ ] Multi-tenant organization support
- [ ] Referral rewards tracking
- [ ] Email templates customization

### P3 (Nice to Have)
- [ ] LinkedIn profile import (compliant)
- [ ] Proctoring for assessments
- [ ] Video interview integration
- [ ] Mobile responsive improvements
- [ ] Candidate self-service portal

---

## Next Action Items

1. **Bulk Candidate Import (CSV)**
   - Add CSV upload endpoint
   - Parse and validate CSV data
   - Batch create candidates

2. **Interview Calendar View**
   - Add calendar component
   - Weekly/monthly view
   - Slot availability management

3. **Assessment Attempt Tracking**
   - Candidate test assignments
   - Progress tracking
   - Results and scoring

4. **Offer Letter Generation**
   - Template management
   - Dynamic field population
   - PDF generation and download
