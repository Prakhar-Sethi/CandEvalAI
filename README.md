# HCL AI-Powered Candidate Evaluation Platform

Internship Project 4 — A full-stack, AI-powered candidate evaluation system.

## Modules

| Module | Name | Status | Port (Backend) | Port (Frontend) |
|--------|------|--------|----------------|-----------------|
| Module 2 | Dynamic Written Test | ✅ Complete | 8002 | 3002 |
| Module 3 | Video Interview + Facial Analysis | ✅ Complete | 8003 | 3003 |
| Module 4 | Online Coding Test | ✅ Complete | 8004 | 3004 |

## Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         PostgreSQL 16            │
                    │         (shared DB)              │
                    └────────┬──────────┬─────────────┘
                             │          │
              ┌──────────────┘          └──────────────┐
              │                                        │
   ┌──────────▼──────────┐              ┌──────────────▼──────────┐
   │   Module 2 Backend  │              │   Module 4 Backend      │
   │   FastAPI :8002     │              │   FastAPI :8004         │
   │   flan-t5-base      │              │   httpx → Judge0 CE     │
   │   sentence-xformers │              │                         │
   └──────────┬──────────┘              └──────────────┬──────────┘
              │                                        │
   ┌──────────▼──────────┐              ┌──────────────▼──────────┐
   │  Module 2 Frontend  │              │  Module 4 Frontend      │
   │  React+Vite :3002   │              │  React+Vite :3004       │
   │  Timed MCQ + SA UI  │              │  Monaco Editor UI       │
   └─────────────────────┘              └──────────────┬──────────┘
                                                       │
                                        ┌──────────────▼──────────┐
                                        │   Judge0 CE :2358       │
                                        │   (code execution)      │
                                        │   + Redis + Postgres    │
                                        └─────────────────────────┘
```

## Quick Start

### Prerequisites
- Docker Desktop (with Docker Compose v2)
- 8GB RAM recommended (Judge0 + ML models)

### 1. Clone / navigate to project
```bash
cd hcl_project_4
```

### 2. Start everything
```bash
docker compose up -d --build
```

> First run will download ~2GB of ML models (flan-t5-base + sentence-transformers).
> They are cached in a Docker volume so subsequent starts are fast.

### 3. Wait for services
```bash
docker compose ps
```

All services should show `healthy` or `running`. Judge0 takes ~60 seconds to initialize.

### 4. Access the apps

| App | URL |
|-----|-----|
| Module 2 (Written Test) | http://localhost:3002 |
| Module 4 (Coding Test) | http://localhost:3004 |
| Module 2 API docs | http://localhost:8002/docs |
| Module 4 API docs | http://localhost:8004/docs |
| Judge0 API | http://localhost:2358 |

---

## Module 2 — Dynamic Written Test

### What it does
1. Accepts candidate info + skill list (Python, SQL, Java, etc.)
2. Uses **flan-t5-base** (local, CPU-only) to generate MCQ and short-answer questions
3. Serves a **timed test** (30 min default) via React frontend
4. Auto-grades MCQs; grades short answers via **cosine similarity** (all-MiniLM-L6-v2)
5. Stores all results in PostgreSQL

### Module 5 Contract
```
GET http://localhost:8002/module2/result/{candidate_id}
```
Response:
```json
{
  "candidate_id": "...",
  "score": 72.5,
  "total": 100,
  "breakdown": [
    {"skill": "Python", "questions_attempted": 3, "questions_correct": 2, "points": 25, "max_points": 30}
  ]
}
```

---

## Module 4 — Online Coding Test

### What it does
1. Presents programming problems in a **Monaco editor** (LeetCode-style UI)
2. Submits code to **self-hosted Judge0 CE** for sandboxed execution
3. Runs against visible + hidden test cases; shows pass/fail per case
4. Computes code quality heuristics (comment ratio, line length, naming conventions)
5. Logs all submissions, time taken, and attempt counts

### Supported Languages
| Language | Judge0 ID |
|----------|-----------|
| Python 3 | 71 |
| JavaScript | 63 |
| Java | 62 |
| C++ | 54 |

### Module 5 Contract
```
GET http://localhost:8004/module4/result/{candidate_id}
```
Response:
```json
{
  "candidate_id": "...",
  "problems_attempted": 2,
  "problems_solved": 1,
  "total_score": 66.7,
  "submissions": [...]
}
```

---

## Development (without Docker)

### Module 2 Backend
```bash
cd module2/backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL to point to local postgres
uvicorn main:app --reload --port 8002
```

### Module 2 Frontend
```bash
cd module2/frontend
npm install
VITE_API_URL=http://localhost:8002 npm run dev
```

### Module 4 Backend
```bash
cd module4/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8004
# Seed sample problems:
python seed.py
```

### Module 4 Frontend
```bash
cd module4/frontend
npm install
VITE_API_URL=http://localhost:8004 npm run dev
```

### Judge0 CE (standalone)
See [module4/judge0/README.md](module4/judge0/README.md)

---

## Environment Variables

### Module 2 Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | asyncpg connection string |
| `MODEL_CACHE_DIR` | `/app/model_cache` | Where HuggingFace models are cached |

### Module 4 Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | asyncpg connection string |
| `JUDGE0_URL` | `http://judge0:2358` | Judge0 CE base URL |

---

## Stopping & Cleanup
```bash
# Stop all services (keep data)
docker compose down

# Stop and remove all data (full reset)
docker compose down -v
```

---

## Tech Stack Summary

| Layer | Module 2 | Module 4 |
|-------|----------|----------|
| Backend | FastAPI | FastAPI |
| ORM | SQLAlchemy 2.0 async | SQLAlchemy 2.0 async |
| DB Driver | asyncpg | asyncpg |
| Database | PostgreSQL 16 | PostgreSQL 16 |
| AI/ML | flan-t5-base, all-MiniLM-L6-v2 | — |
| Code Execution | — | Judge0 CE (self-hosted) |
| Frontend | React 18 + Vite + Tailwind | React 18 + Vite + Tailwind |
| UI Theme | Dark glassmorphism | Dark glassmorphism |
| Font | Plus Jakarta Sans | Plus Jakarta Sans + JetBrains Mono |
