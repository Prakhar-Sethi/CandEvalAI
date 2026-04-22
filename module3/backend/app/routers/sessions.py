"""
Session lifecycle + AI interview conversation routes.

POST   /sessions                          – create session, AI sends greeting
GET    /sessions/{session_id}             – fetch session details
POST   /sessions/{session_id}/message     – send candidate message, get AI response
"""
import logging
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import InterviewSession, SessionStatus
from app.schemas import (
    SessionCreate,
    SessionResponse,
    SessionStartResponse,
    MessageRequest,
    MessageResponse,
)
from app.config import get_settings
from app.services import ai_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post("", response_model=SessionStartResponse, status_code=status.HTTP_201_CREATED)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new AI interview session.
    Claude generates the opening greeting and first question immediately.
    """
    session = InterviewSession(
        candidate_name=payload.candidate_name,
        job_role=payload.job_role,
        status=SessionStatus.ACTIVE,
        messages=[],
        question_count=0,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()

    # Get AI greeting + first question
    try:
        greeting = ai_service.build_greeting(payload.candidate_name, payload.job_role)
    except Exception as exc:
        logger.error("AI greeting failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service unavailable: {exc}. Is Ollama running?")

    session.messages = [{"role": "assistant", "content": greeting}]
    session.question_count = 1

    await db.commit()
    await db.refresh(session)

    return SessionStartResponse(
        id=session.id,
        candidate_name=session.candidate_name,
        job_role=session.job_role,
        status=session.status,
        greeting=greeting,
        created_at=session.created_at,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(session_id, db)


@router.post("/{session_id}/message", response_model=MessageResponse)
async def send_message(
    session_id: UUID,
    payload: MessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Candidate sends a response; Claude replies with the next question or wrap-up.
    """
    session = await _get_or_404(session_id, db)

    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Interview is already completed.")

    # Append candidate's message
    messages = list(session.messages or [])
    messages.append({"role": "user", "content": payload.content})

    # Get AI response
    try:
        ai_text, is_complete = ai_service.get_next_response(
            candidate_name=session.candidate_name,
            job_role=session.job_role,
            messages=messages,
            question_count=session.question_count,
            max_questions=settings.max_interview_questions,
        )
    except Exception as exc:
        logger.error("AI response failed: %s", exc)
        raise HTTPException(status_code=502, detail="AI service error. Please retry.")

    messages.append({"role": "assistant", "content": ai_text})

    # Update session
    session.messages = messages
    if not is_complete:
        session.question_count = session.question_count + 1
    else:
        session.status = SessionStatus.COMPLETED
        session.ended_at = datetime.now(timezone.utc)

        # Generate assessment asynchronously (fire-and-forget via sync call)
        try:
            emotion_summary = await _compute_emotion_summary(session_id, db)
            assessment = ai_service.generate_assessment(
                candidate_name=session.candidate_name,
                job_role=session.job_role,
                messages=messages,
                emotion_summary=emotion_summary,
            )
            session.ai_assessment = assessment
        except Exception as exc:
            logger.warning("Assessment generation failed: %s", exc)

    await db.commit()
    await db.refresh(session)

    return MessageResponse(
        ai_message=ai_text,
        question_count=session.question_count,
        is_complete=is_complete,
        session_status=session.status,
    )


# ── helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(session_id: UUID, db: AsyncSession) -> InterviewSession:
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return session


async def _compute_emotion_summary(session_id: UUID, db: AsyncSession) -> dict:
    from app.models import EmotionReading
    from sqlalchemy import func

    result = await db.execute(
        select(EmotionReading).where(EmotionReading.session_id == session_id)
    )
    readings = result.scalars().all()

    if not readings:
        return {"dominant_label": "neutral", "average_confidence": 0.5,
                "confident_pct": 0, "stressed_pct": 0}

    counts = {"confident": 0, "neutral": 0, "stressed": 0}
    total_confidence = 0.0
    for r in readings:
        counts[r.interview_label.value] = counts.get(r.interview_label.value, 0) + 1
        total_confidence += r.confidence_score

    total = len(readings)
    dominant = max(counts, key=lambda k: counts[k])
    return {
        "dominant_label": dominant,
        "average_confidence": total_confidence / total,
        "confident_pct": (counts["confident"] / total) * 100,
        "stressed_pct": (counts["stressed"] / total) * 100,
    }
