# Smart Hiring (Talent Acquisition) — User Guide

Smart Hiring is the **Talent Acquisition** module in AAI‑HRMS. It helps HR and hiring teams **create jobs**, **ingest candidates**, **compute AI fit scores**, and **move candidates through a pipeline** with interviews and assessments.

## Access

- **Web UI (Docker default):** `http://localhost:3001`
- **Module navigation:** Left sidebar → **Smart Hiring (Talent Acquisition)** → Jobs / Candidates / Pipeline / Interviews / Referrals / Assessments

## End-to-end workflow (recommended)

1. **Create a Job** (Jobs → Create Job)
2. **Add Candidates** (Candidates → Upload Resume / Manual Entry) or **Submit Referrals**
3. **Find AI Matches** for the job (Job Details → Find Matches)
4. **Add top matches to the Pipeline**
5. **Manage stages** via drag-and-drop (Pipeline)
6. **Schedule Interviews** + submit feedback (Interviews)
7. **Generate Assessments** aligned to the job (Assessments)

## Jobs

### Create a new job (with AI JD analysis)

Path: **Smart Hiring → Jobs → Create Job**

You’ll complete a 3-step flow:

- **Step 1 — Basic Info**
  - **Job Title** (required)
  - **Job Description** (required)
  - Optional: Location, Work Mode (Remote/Hybrid/On-site), Seniority
  - When you submit, the system will run **AI analysis** on the JD.
- **Step 2 — Skills**
  - Add skills (comma-free; add one at a time)
  - Mark at least one as **Must-Have** (required)
  - Must-have skills are used to qualify/disqualify fit scoring.
- **Step 3 — Review & Create**
  - Confirm details and create the job

What AI does after job creation (visible on Job Details):
- **Normalizes job title** (if applicable)
- Builds a **Scoring Rubric** (thresholds + weights)
- Extracts **AI responsibilities/activities**
- Stores **Required Skills** (Must-have vs Good-to-have)

### Job detail page: candidates, matches, and pipeline

Path: **Jobs → View Details**

Key actions:
- **Find Matches**: runs AI matching and returns ranked candidates with a **Fit Score**.
- **Add to Pipeline**: adds a matched candidate to this job’s pipeline at stage **SOURCED**.
- **Pipeline button**: opens the job’s pipeline view.
- Optional demo: **Play Demo (Generate 50)** creates demo candidates for testing and then runs matching.

## Candidates

Path: **Smart Hiring → Candidates**

You can add candidates in two ways:

### Option A — Upload Resume (recommended)

- Click **Add Candidate**
- Choose **Upload Resume**
- Upload **PDF** or **DOCX** (max **10MB**)

What happens:
- The resume is parsed and key fields (name/contact/skills/experience) are extracted.
- If the candidate already exists, their profile is **updated**.
- You are navigated to the **Candidate Profile** page.

### Option B — Manual entry

Use this when you don’t have a resume file.
- Add name (required), optional email/phone/headline/location/experience
- Add skills (comma-separated)
- Choose a source (Direct Upload / LinkedIn / Naukri / Indeed / Referral)

### Candidate profile

Path: **Candidates → View Profile**

Includes:
- Overview (contact, headline, skills)
- Resume content (if uploaded)
- Applications list (jobs the candidate is in) + **Fit Score** per application when available

## AI Matching & Fit Score

Fit scoring is shown in:
- **Job Details → Candidates tab** (for candidates already added to the job)
- **Job Details → AI Matches tab** (for newly matched candidates)
- **Pipeline cards** (ring score + must-have OK/missing)
- **Candidate Profile → Applications**

Typical interpretation:
- **Final fit score**: overall percentage.
- **Must-have OK**: indicates whether required skills are satisfied.

## Pipeline (Kanban)

Path: **Smart Hiring → Pipeline**

### Select a job
- Use the **job dropdown** (the page focuses on OPEN jobs).
- The pipeline URL uses a query param like `.../pipeline?job=<jobId>`.

### Stages

The pipeline is a drag-and-drop Kanban board with these stages:

- **SOURCED**
- **SCREENING**
- **ASSESSMENT_SENT**
- **INTERVIEW_1**
- **OFFER**
- **JOINED**

Move a candidate by **dragging their card** between columns. The stage updates immediately and the pipeline refreshes if something fails.

### Interview proposals (HR approval)

If enabled for a job, the Pipeline page may show **Interview Proposals (HR Approval)**:
- The system proposes interview slots for top ranked matches.
- HR can **Approve Slot 1**, **Approve Slot 2**, or **Reject** with a reason.
- After approval/rejection, the pipeline and proposals refresh.

## Interviews

Path: **Smart Hiring → Interviews**

### Schedule an interview

- Click **Schedule Interview**
- Select a candidate (this is tied to an **application** in the pipeline)
- Choose round (1/2/3/HR round), mode (Virtual/On-site/Phone)
- Set **Start Time** (required) and optional End Time and Meeting Link

### Submit feedback

From an interview card, click **Feedback** and submit:
- Decision (Strong Yes / Yes / Maybe / No / Strong No)
- Optional score (1–10), strengths, concerns, notes

## Referrals

Path: **Smart Hiring → Referrals**

Use referrals to submit candidates against an **open job**.

### Submit a referral

- Click **Submit Referral**
- Choose a job
- Enter candidate name (required) and optional contact details
- Optional: attach **resume file (PDF/DOCX)** and/or paste **resume text**

What happens:
- The candidate is created/updated.
- A **job fit score** may be computed and shown in the success message.
- Referred candidates are intended to be added into the hiring flow for tracking.

## Assessments

Path: **Smart Hiring → Assessments**

### Generate an AI assessment for a job

- Click **Generate Assessment**
- Select an **OPEN job**
- Enter a title (required)
- Choose type:
  - SCREENING (Quick)
  - CORE_SKILL
  - WORK_SIMULATION
  - BEHAVIORAL
- Set duration (minutes)

### Preview an assessment

Open any assessment and click **Preview** to view:
- Questions (MCQ or free response)
- Marks per question
- Skill tested (when available)

## Troubleshooting (common)

- **No matches found**
  - Ensure you have candidates in the system (upload resumes first).
  - Ensure the job has **skills** and at least one **must-have**.
  - Try **Play Demo (Generate 50)** on the Job Details page to populate test candidates.
- **Resume upload fails**
  - Only **.pdf** and **.docx** are supported.
  - Max size is **10MB**.
- **Can’t see a job in Pipeline dropdown**
  - The pipeline list focuses on **OPEN** jobs. Check the job status.

