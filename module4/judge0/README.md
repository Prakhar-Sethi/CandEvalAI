# Judge0 CE — Self-Hosted Code Execution

Judge0 CE is the open-source, self-hostable code execution engine used by Module 4.
It runs fully locally — no API keys, no usage limits, no internet required after setup.

## What it supports (configured in this project)

| Language | Judge0 Language ID |
|----------|--------------------|
| Python 3 | 71 |
| JavaScript (Node.js) | 63 |
| Java | 62 |
| C++ (GCC) | 54 |

## Setup (included in root docker-compose.yml)

Judge0 CE is already configured as part of the root `docker-compose.yml`.
Simply run from the project root:

```bash
docker compose up -d
```

Judge0 will be available at **http://localhost:2358** after ~60 seconds.

## Verify Judge0 is running

```bash
curl http://localhost:2358/health
# Expected: {"health":"OK"}
```

Check available languages:
```bash
curl http://localhost:2358/languages | python -m json.tool | head -40
```

## Manual test (Python 3)

```bash
curl -X POST http://localhost:2358/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello, Judge0!\")",
    "language_id": 71,
    "stdin": "",
    "wait": true
  }'
```

Expected response includes `"stdout": "Hello, Judge0!\n"` and `"status": {"id": 3, "description": "Accepted"}`.

## Judge0 Status Codes

| ID | Description |
|----|-------------|
| 1 | In Queue |
| 2 | Processing |
| 3 | Accepted (correct) |
| 4 | Wrong Answer |
| 5 | Time Limit Exceeded |
| 6 | Compilation Error |
| 7-12 | Runtime Errors |
| 13 | Internal Error |
| 14 | Exec Format Error |

## Architecture

```
module4-backend (FastAPI)
        │
        │  POST /submissions  (submit code + stdin + expected_output)
        │  GET  /submissions/{token} (poll for result)
        ▼
    judge0:2358  (REST API server)
        │
        ├── judge0-worker  (executes code in isolated containers)
        ├── judge0-redis   (job queue)
        └── judge0-postgres (submission storage)
```

## Resource requirements

Judge0 worker requires Docker's ability to run privileged containers (for isolation).
Minimum recommended: 2 CPU cores, 4GB RAM for the judge0 stack.

## Troubleshooting

**Judge0 health check fails:**
```bash
docker logs hcl_judge0
docker logs hcl_judge0_worker
```

**Code always times out:**
Increase `time_limit` in submission payload. Default is 5 seconds.

**Missing language:**
Check supported languages: `curl http://localhost:2358/languages`
Language IDs may differ from defaults if using a custom Judge0 build.

**Worker not processing:**
```bash
docker restart hcl_judge0_worker
```

## Official Resources

- Judge0 CE GitHub: https://github.com/judge0/judge0
- API Docs: https://judge0.com/ce (self-hosted docs available via /docs on your instance)
- Docker Hub: https://hub.docker.com/r/judge0/judge0
