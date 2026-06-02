# Module 3 — Technical Interview with Facial Expression Analysis

Part of the **HCL AI-Powered Candidate Evaluation Platform** (Internship Project 4).

---

## Overview

Module 3 hosts a WebRTC video interview between an interviewer and a candidate powered by **Daily.co**. While the call is in progress, the frontend captures a video frame every **3 seconds**, sends it to the FastAPI backend, and **DeepFace** analyses the candidate's facial expression. The result is mapped to one of four interview labels — `confident`, `neutral`, `stressed`, `distracted` — and stored in PostgreSQL. The interviewer sees a live emotion dashboard during the call. After the session, Module 5 can pull an aggregated report via a dedicated API endpoint.

---

## Architecture

```
Browser (candidate)                 Browser (interviewer)
   │  video feed (WebRTC)                │  video feed (WebRTC)
   │  frame every 3 s ──────────────────▶│
   │                                     │  live emotion dashboard ◀──┐
   ▼                                     ▼                            │
Daily.co CDN (WebRTC media)              │                            │
                                         │                            │
   ┌──────────────── FastAPI ────────────┘                            │
   │  POST /sessions/{id}/frames  ──▶ DeepFace ──▶ PostgreSQL        │
   │  GET  /sessions/{id}/emotions ──────────────────────────────────┘
   │  GET  /sessions/{id}/report   ◀── Module 5
   └─────────────────────────────────────────────────────────────────
```

---

## Folder Structure

```
module3/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + lifespan
│   │   ├── config.py            # Pydantic settings (env-driven)
│   │   ├── database.py          # Async SQLAlchemy engine + session factory
│   │   ├── models.py            # InterviewSession, EmotionReading ORM models
│   │   ├── schemas.py           # Pydantic request/response models + SessionReport
│   │   ├── routers/
│   │   │   ├── sessions.py      # Session CRUD + Daily.co room lifecycle
│   │   │   ├── emotion.py       # Frame upload + live emotions feed
│   │   │   └── report.py        # Aggregated report for Module 5
│   │   └── services/
│   │       ├── daily_service.py # Daily.co REST API calls
│   │       └── emotion_service.py # DeepFace wrapper + emotion mapping
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + landing/session-create form
│   │   ├── main.jsx
│   │   ├── api/index.js         # Axios wrappers for all backend endpoints
│   │   ├── hooks/
│   │   │   ├── useDaily.js      # Daily.co call-object lifecycle hook
│   │   │   └── useFrameCapture.js # Canvas-based frame capture at 3-s intervals
│   │   ├── components/
│   │   │   ├── VideoCall.jsx    # Local <video> + remote participant list
│   │   │   ├── EmotionDashboard.jsx # Live polling dashboard (interviewer only)
│   │   │   └── EmotionChart.jsx # Recharts area chart of emotion over time
│   │   └── pages/
│   │       ├── InterviewerView.jsx  # Interviewer page: video + dashboard
│   │       └── CandidateView.jsx    # Candidate page: video only (no emotion shown)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── JUSTIFICATION.md
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create session + Daily.co room |
| `GET` | `/sessions/{id}` | Get session details |
| `PATCH` | `/sessions/{id}` | Update session status |
| `DELETE` | `/sessions/{id}` | Cancel session + delete room |
| `POST` | `/sessions/{id}/token` | Issue Daily.co meeting token |
| `POST` | `/sessions/{id}/frames` | Upload frame → DeepFace analysis |
| `GET` | `/sessions/{id}/emotions` | Live emotion feed (last N readings) |
| `GET` | `/sessions/{id}/report` | Aggregated report (Module 5 contract) |
| `GET` | `/health` | Health check |

Interactive docs: `http://localhost:8000/docs`

---

## Setup

### Prerequisites

- Docker & Docker Compose
- A Daily.co account with an API key (free tier works)

### 1. Configure environment

```bash
cd module3/backend
cp .env.example .env
# Edit .env and set DAILY_API_KEY=your_key_here
```

```bash
cd module3/frontend
cp .env.example .env
```

### 2. Run with Docker Compose

```bash
cd module3
docker compose up --build
```

Services:
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432

### 3. Run locally (without Docker)

**Backend:**
```bash
cd module3/backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in DAILY_API_KEY and DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd module3/frontend
npm install
cp .env.example .env
npm run dev
```

**Database:** Ensure PostgreSQL is running locally and `DATABASE_URL` in `.env` points to it. Tables are auto-created on first startup via SQLAlchemy `create_all`.

---

## Usage Flow

1. Open `http://localhost:5173`
2. Fill in candidate ID, interviewer ID, job role, your name, and role
3. Click **Start Interview Session** — this creates the Daily.co room
4. The interviewer is routed to `/interviewer?sessionId=<uuid>` and clicks **Join Interview Room**
5. Share the candidate URL: `/candidate?sessionId=<uuid>&name=<name>` with the candidate
6. During the call, frames are captured every 3 s from the candidate's webcam and emotion labels appear on the interviewer's dashboard
7. Interviewer clicks **End Interview** to complete the session
8. Module 5 calls `GET /sessions/{id}/report` to retrieve the aggregated emotion data

---

## Emotion Mapping

| DeepFace Emotions | Interview Label |
|-------------------|-----------------|
| `happy`, `surprise` | `confident` |
| `neutral` | `neutral` |
| `angry`, `fear`, `sad` | `stressed` |
| `disgust` | `distracted` |

---

## Module 5 Integration

Call `GET /sessions/{session_id}/report` after the session is completed.

Response schema (`SessionReport`):
```json
{
  "session_id": "uuid",
  "candidate_id": "string",
  "interviewer_id": "string",
  "job_role": "string | null",
  "status": "completed",
  "started_at": "ISO 8601",
  "ended_at": "ISO 8601",
  "total_frames_analyzed": 42,
  "emotion_totals": { "confident": 20, "neutral": 12, "stressed": 8, "distracted": 2 },
  "emotion_percentages": { "confident": 47.6, "neutral": 28.6, "stressed": 19.0, "distracted": 4.8 },
  "dominant_label": "confident",
  "average_confidence": 0.71,
  "timeline": [
    { "frame_index": 0, "label": "neutral", "confidence": 0.65, "captured_at": "..." },
    ...
  ]
}
```
