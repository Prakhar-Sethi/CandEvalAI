# Module 3 — AI Technical Interview with Facial Expression Analysis

Part of the **HCL AI-Powered Candidate Evaluation Platform** (Internship Project 4).

---

## Overview

Module 3 conducts a fully AI-driven technical interview. **Claude (Anthropic)** plays the role of the interviewer, asking adaptive technical questions based on the candidate's job role. The candidate answers via voice or text through a browser-based interface. Throughout the session, the candidate's webcam feed is analyzed by **DeepFace** every 3 seconds to detect facial expressions — mapping them to interview-relevant labels: `confident`, `neutral`, or `stressed`. On completion, Claude generates a structured assessment combining answer quality and behavioral data. The full report is exposed for Module 5 via a REST endpoint.

---

## Architecture

```
Candidate Browser
   │  webcam frames every 3 s ──▶ DeepFace ──▶ PostgreSQL
   │  text/voice answers ─────────────────────────────────▶ Claude (AI Interviewer)
   │                                                              │
   │◀──────────────────── AI questions + assessment ─────────────┘
   │
   ▼
FastAPI Backend
   ├── POST /sessions                  — create session, AI sends greeting
   ├── POST /sessions/{id}/message     — candidate sends answer, AI replies
   ├── POST /sessions/{id}/frames      — webcam frame → DeepFace emotion
   ├── GET  /sessions/{id}/emotions    — live emotion feed
   └── GET  /sessions/{id}/report      — final report (for Module 5)
```

---

## Folder Structure

```
module3/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Pydantic settings (env-driven)
│   │   ├── database.py          # Async SQLAlchemy engine
│   │   ├── models.py            # InterviewSession, EmotionReading
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── sessions.py      # Session + AI conversation endpoints
│   │   │   ├── emotion.py       # Frame upload + emotions feed
│   │   │   └── report.py        # Aggregated report for Module 5
│   │   └── services/
│   │       ├── ai_service.py    # Claude AI interviewer (Anthropic SDK)
│   │       └── emotion_service.py # DeepFace wrapper + emotion mapping
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/index.js         # Axios API wrappers
│       └── pages/
│           ├── Landing.jsx      # Candidate login form
│           ├── Interview.jsx    # AI interview UI (webcam + chat + emotions)
│           └── Report.jsx       # Post-interview report + charts
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create session; AI generates greeting + first question |
| `GET` | `/sessions/{id}` | Get session details + conversation history |
| `POST` | `/sessions/{id}/message` | Send candidate answer; AI replies with next question |
| `POST` | `/sessions/{id}/frames` | Upload webcam frame → DeepFace emotion analysis |
| `GET` | `/sessions/{id}/emotions` | Live emotion feed (last N readings) |
| `GET` | `/sessions/{id}/report` | Full report: transcript + emotions + AI assessment |
| `GET` | `/health` | Health check |

Interactive docs: `http://localhost:8000/docs`

---

## Setup

### Prerequisites

- Docker & Docker Compose
- An Anthropic API key (`sk-ant-...`)

### 1. Configure environment

```bash
cd module3/backend
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=your_key_here
```

### 2. Run with Docker Compose

```bash
cd module3
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

### 3. Run locally (without Docker)

**Backend:**
```bash
cd module3/backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd module3/frontend
npm install
npm run dev
```

---

## Interview Flow

1. Candidate opens `http://localhost:5173`
2. Enters name and job role → clicks **Begin Interview**
3. Backend creates session; Claude generates a greeting + first technical question
4. Browser prompts for webcam access; emotion analysis begins immediately
5. Candidate answers via **voice** (speech-to-text) or **text input**
6. Claude responds with follow-up questions or probes (6 questions total)
7. After the final answer, Claude wraps up and generates an assessment
8. Candidate is redirected to the **Report** page showing:
   - AI assessment (technical score, strengths, recommendation)
   - Emotion distribution pie chart
   - Confidence timeline line chart
   - Full interview transcript

---

## Emotion Mapping

| DeepFace Emotions | Interview Label |
|-------------------|-----------------|
| `happy`, `surprise` | `confident` |
| `neutral` | `neutral` |
| `angry`, `fear`, `sad`, `disgust` | `stressed` |

---

## Module 5 Integration

Call `GET /sessions/{session_id}/report` after the session is completed.

Key fields in the response:
```json
{
  "session_id": "uuid",
  "candidate_name": "string",
  "job_role": "string | null",
  "status": "completed",
  "total_frames_analyzed": 42,
  "emotion_breakdown": { "confident": 20, "neutral": 12, "stressed": 10 },
  "emotion_percentages": { "confident": 47.6, "neutral": 28.6, "stressed": 23.8 },
  "dominant_label": "confident",
  "average_confidence": 0.71,
  "ai_assessment": "## Technical Assessment\nScore: 8/10 ...",
  "transcript": [
    { "role": "assistant", "content": "Hello! ..." },
    { "role": "user", "content": "I would start by ..." }
  ],
  "timeline": [...]
}
```
