# Module 3 — Technical Justification Document

**Project:** HCL AI-Powered Candidate Evaluation Platform
**Module:** 3 — Technical Interview with Facial Expression Analysis
**Prepared for:** HCL Internship Review Board
**Date:** March 2026

---

## 1. Daily.co vs. Alternatives for WebRTC Video

### Decision: Daily.co

Daily.co was selected as the WebRTC infrastructure layer for Module 3. The decision was made after evaluating four candidate platforms:

| Criterion | Daily.co | Twilio Video | Agora | Jitsi (self-hosted) |
|-----------|----------|--------------|-------|----------------------|
| REST API for room/token management | ✅ Clean, well-documented | ✅ Good | ✅ Good | ❌ No hosted API |
| Client SDK (React-compatible) | ✅ `@daily-co/daily-js` | ✅ | ✅ | ✅ (iFrame or JS) |
| Meeting recording (cloud) | ✅ Built-in, per-room toggle | ✅ (expensive) | ✅ | ❌ Requires extra infra |
| Free-tier suitability for a prototype | ✅ 2,000 participant-minutes/month free | ❌ Credit card required | ❌ Credit card required | ✅ Free but ops burden |
| Token-scoped participant permissions | ✅ `is_owner` flag, per-token props | ✅ | ✅ | ❌ Limited |
| Operational complexity | Low (fully managed) | Low | Medium | High |

**Why not Twilio:** Twilio Video is mature but more expensive for prototypes and its API surface is larger than needed. The per-minute pricing model makes cost estimation harder at the intern-project scale.

**Why not Agora:** Agora's latency advantage matters for high-participant scenarios (gaming, livestreams) but adds SDK complexity. Its token generation requires a server-side signing key and a more involved auth flow, which is overhead for a two-participant interview.

**Why not Jitsi:** Jitsi is free and open-source, but self-hosting adds infrastructure responsibility (Docker, STUN/TURN, SSL) that is out of scope for this module. The `@jitsi/react-sdk` is less polished than Daily.co's native JS SDK for custom UI builds.

**Why Daily.co:** The combination of a clean REST API for room lifecycle management, a first-class JavaScript SDK, built-in cloud recording, and a generous free tier makes Daily.co the lowest-friction choice for a two-participant interview prototype. Meeting tokens with `is_owner` semantics cleanly map to the interviewer/candidate role split this module requires.

---

## 2. DeepFace vs. Alternatives for Emotion Recognition

### Decision: DeepFace

| Criterion | DeepFace | FER (py-feat / fer) | Azure Face API | AWS Rekognition |
|-----------|----------|---------------------|----------------|-----------------|
| Deployment model | Local / offline | Local / offline | Cloud (REST) | Cloud (REST) |
| PII / GDPR exposure | None (all local) | None (all local) | Frames sent to Microsoft | Frames sent to Amazon |
| Cost | Free | Free | ~$1/1,000 calls | ~$1/1,000 faces |
| Accuracy on unconstrained video | High (FaceNet, ArcFace backends) | Moderate (CNN-based) | Very high | Very high |
| Latency (per frame) | 150–400 ms locally | 80–200 ms | 200–500 ms (network) | 200–600 ms (network) |
| Setup complexity | pip install; auto-downloads weights | pip install | Azure subscription + key | AWS account + IAM |
| Offline capability | ✅ Full | ✅ Full | ❌ Requires internet | ❌ Requires internet |

**Why not FER (py-feat):** The `fer` library is simpler but less accurate on real-world interview conditions (varied lighting, partial occlusion, glasses). DeepFace's modular backend system (OpenCV → MTCNN → RetinaFace detection, FaceNet → ArcFace recognition) gives more robust results with `enforce_detection=False` as a graceful fallback.

**Why not Azure / AWS:** Sending unencrypted candidate video frames to a third-party cloud service during an active interview raises significant GDPR and data-minimisation concerns (see Section 6). For an HCL internal platform, running inference locally on the application server eliminates that data transfer entirely.

**Why DeepFace:** It is the most capable open-source facial analysis library available in Python, with production-quality pre-trained models accessible via a single `pip install`. It supports seven discrete emotions (the exact set this module maps from), multiple detector backends, and requires no API key. The `enforce_detection=False` parameter ensures the system degrades gracefully when no face is detected rather than crashing the frame pipeline.

---

## 3. Emotion Mapping Strategy

DeepFace outputs **seven raw emotion probabilities** (0–100 scale, summing to 100):
`angry`, `disgust`, `fear`, `happy`, `sad`, `surprise`, `neutral`

These are mapped to **four interview-relevant labels** using a **weighted bucket vote**:

```
confident   ←  happy (×1.0) + surprise (×0.6)
neutral     ←  neutral (×1.0)
stressed    ←  angry (×1.0) + fear (×0.9) + sad (×0.7)
distracted  ←  disgust (×1.0)
```

### Rationale for Each Mapping

**confident ← happy + surprise**
In an interview context, a candidate displaying genuine happiness (smiling, relaxed facial muscles) is expressing positive engagement and self-assurance. Surprise at a moderate level correlates with active intellectual engagement ("I find this problem interesting") rather than distress. The lower weight (0.6) on surprise prevents a momentary startle from dominating.

**neutral ← neutral**
A composed, neutral expression is the baseline professional state during a technical interview. It represents focused concentration rather than a negative emotional state.

**stressed ← angry + fear + sad**
All three represent negative arousal states with distinct facial action units (AU4 brow lowering, AU20 lip stretching for fear, AU15 lip corner depressor for sad). In the interview context these co-occur with cognitive overload or anxiety. `angry` receives the highest weight because it most visibly manifests as jaw tension and furrowed brows under exam pressure. `sad` receives a lower weight (0.7) because momentary downward gaze (which FaceNet may interpret as sad) does not always indicate distress.

**distracted ← disgust**
Disgust in an interview setting is most likely a marker of disengagement or aversion — the candidate is not paying attention or finds the task unpleasant. Its AU9 (nose wrinkle) and AU17 (chin raiser) pattern is distinct enough that it rarely appears as a false positive for the other labels.

### Normalisation and Confidence Score

Raw emotion values are normalised to sum to 1.0 before the weighted bucket vote. The winning bucket's score is divided by the sum of all bucket scores to produce a `confidence_score` in [0, 1]. This allows Module 5 to weight readings differently (e.g., discard readings where confidence < 0.4).

---

## 4. FastAPI + Async SQLAlchemy

**FastAPI** was chosen because:
- Native `async/await` support allows the server to handle multiple concurrent frame uploads without blocking on I/O.
- Automatic OpenAPI (Swagger) documentation generation (`/docs`) is essential for demonstrating the Module 3 ↔ Module 5 contract to reviewers.
- Pydantic V2 validation provides precise, self-documenting request/response schemas with zero boilerplate.
- It shares the Python ecosystem with DeepFace, eliminating language-boundary overhead.

**Async SQLAlchemy (asyncpg driver)** was chosen because:
- Frame uploads arrive concurrently (every 3 seconds per active session, multiple sessions possible). An async ORM prevents database I/O from blocking the event loop.
- `asyncpg` is the fastest PostgreSQL driver for Python, with benchmark throughput 3–5× higher than `psycopg2` in async contexts.
- SQLAlchemy 2.0's declarative model system gives full ORM convenience (relationships, cascades) while remaining compatible with raw SQL when needed.

---

## 5. Frame-Based Analysis vs. Real-Time Stream

### Why every 3 seconds, not a live video stream?

Sending raw video streams to the backend for ML inference would require either:
- **WebSocket streaming of raw frames:** Very high bandwidth (640×480 JPEG at 30 fps ≈ 3–10 MB/s per candidate), exceeding practical bandwidth on an intern-project deployment.
- **Server-side WebRTC recording + async ML batch:** Introduces high latency before the interviewer sees any emotion data.

**3-second interval analysis** is the engineering sweet spot:

| Approach | Bandwidth | Latency to interviewer | Complexity |
|----------|-----------|------------------------|------------|
| 30 fps stream | ~5 MB/s | Real-time | Very high |
| 1-second interval | ~150 KB/s | 1 s | High |
| **3-second interval** | **~50 KB/s** | **3 s** | **Low** |
| 10-second interval | ~15 KB/s | 10 s | Low |

Three seconds is below the perceptual threshold for a "live" dashboard update (users perceive ≤5 s polls as near-real-time) while keeping bandwidth usage negligible even at 10 concurrent sessions. Each frame is compressed to JPEG at 70% quality before base64 encoding, yielding ~15–25 KB per frame.

The 3-second interval also provides enough temporal resolution to capture state transitions (e.g., candidate becomes stressed when a hard question is asked, then recovers) without over-sampling stable expressions.

---

## 6. Privacy, Consent, and Ethics Considerations

### Candidate Consent
- The candidate UI displays an explicit notice: *"Your session is being recorded for evaluation purposes."*
- In production, this notice should be backed by a terms-of-service checkbox before the candidate is permitted to join the room.
- Session recording via Daily.co cloud recording is only enabled for the interviewer's token (`is_owner=true`). The candidate cannot independently initiate recording.

### Data Minimisation
- Raw video frames are **not persisted** on the backend. Only the resulting emotion label, confidence score, and raw probability vector are stored. The frame bytes are discarded after DeepFace analysis returns.
- DeepFace runs locally on the application server. No frames are transmitted to third-party APIs.

### Algorithmic Bias
- DeepFace's pre-trained models may perform less accurately on candidates from under-represented demographic groups (a documented limitation of CNN-based facial recognition). This system is **advisory only** — no hiring decision should be made solely on the emotion labels it produces.
- The interviewer dashboard is labelled as an "assistance tool," and the HCL review process should require human override authority on all Module 3 signals.

### GDPR / Data Retention
- Emotion readings are associated with a `session_id`, not directly with PII. The `candidate_id` is a platform-internal identifier.
- In production, a data retention policy should define a maximum age for `EmotionReading` rows, enforced via a scheduled DELETE job.

---

## 7. JSON Contract with Module 5

Module 5 (Final Evaluation) should call the following endpoint after a session is completed:

```
GET /sessions/{session_id}/report
```

**Authentication:** Bearer token (platform-level JWT, to be implemented in Module 1 auth layer).

**Response schema (`SessionReport`):**

```json
{
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "candidate_id": "cand_001",
  "interviewer_id": "int_007",
  "job_role": "Backend Engineer",
  "status": "completed",
  "started_at": "2026-03-18T10:00:00Z",
  "ended_at": "2026-03-18T10:47:33Z",
  "total_frames_analyzed": 952,
  "emotion_totals": {
    "confident": 451,
    "neutral": 287,
    "stressed": 189,
    "distracted": 25
  },
  "emotion_percentages": {
    "confident": 47.37,
    "neutral": 30.15,
    "stressed": 19.85,
    "distracted": 2.63
  },
  "dominant_label": "confident",
  "average_confidence": 0.7134,
  "timeline": [
    {
      "frame_index": 0,
      "label": "neutral",
      "confidence": 0.62,
      "captured_at": "2026-03-18T10:00:03Z"
    }
    // ... one entry per analyzed frame
  ]
}
```

### Module 5 Usage Guidance

- `emotion_percentages.confident` and `emotion_percentages.stressed` are the primary signals. A suggested weightings for inclusion in an overall interview score:
  - `confident %` → positive weight (recommend range: 0.3× of module 3 score)
  - `stressed %` → negative weight (recommend range: −0.2× of module 3 score)
  - `distracted %` → strong negative weight (recommend range: −0.3× of module 3 score)
- `average_confidence` can gate the reliability of the signal: if `average_confidence < 0.45`, DeepFace had difficulty detecting the candidate's face consistently (poor lighting, camera angle) and the emotion data should be discarded from the final score.
- The `timeline` array enables Module 5 to produce a per-question emotion breakdown if question timestamps are available from Module 2 (the structured interview questionnaire module).
