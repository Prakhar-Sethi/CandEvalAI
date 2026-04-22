"""
Report route — aggregates session data for Module 5.

GET /sessions/{session_id}/report  →  SessionReport
"""
from uuid import UUID
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import InterviewSession, EmotionReading, InterviewLabel
from app.schemas import SessionReport, EmotionTimeline

router = APIRouter(prefix="/sessions", tags=["Report"])


@router.get("/{session_id}/report", response_model=SessionReport)
async def get_session_report(session_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Aggregated report for a completed interview session.
    Includes emotion analytics, AI assessment, and full transcript.
    """
    s_result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = s_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    e_result = await db.execute(
        select(EmotionReading)
        .where(EmotionReading.session_id == session_id)
        .order_by(EmotionReading.frame_index)
    )
    readings = e_result.scalars().all()
    total = len(readings)

    if total == 0:
        return SessionReport(
            session_id=session.id,
            candidate_name=session.candidate_name,
            job_role=session.job_role,
            status=session.status,
            started_at=session.started_at,
            ended_at=session.ended_at,
            total_frames_analyzed=0,
            emotion_breakdown={"confident": 0, "neutral": 0, "stressed": 0},
            emotion_percentages={"confident": 0.0, "neutral": 0.0, "stressed": 0.0},
            dominant_label="neutral",
            average_confidence=0.0,
            timeline=[],
            ai_assessment=session.ai_assessment,
            transcript=session.messages or [],
        )

    label_counts: Counter = Counter(r.interview_label.value for r in readings)
    avg_confidence = sum(r.confidence_score for r in readings) / total
    dominant_label = label_counts.most_common(1)[0][0]

    breakdown = {
        "confident": label_counts.get("confident", 0),
        "neutral": label_counts.get("neutral", 0),
        "stressed": label_counts.get("stressed", 0),
    }
    percentages = {k: round(v / total * 100, 2) for k, v in breakdown.items()}

    timeline = [
        EmotionTimeline(
            frame_index=r.frame_index,
            label=r.interview_label,
            confidence=r.confidence_score,
            captured_at=r.captured_at,
        )
        for r in readings
    ]

    return SessionReport(
        session_id=session.id,
        candidate_name=session.candidate_name,
        job_role=session.job_role,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        total_frames_analyzed=total,
        emotion_breakdown=breakdown,
        emotion_percentages=percentages,
        dominant_label=dominant_label,
        average_confidence=round(avg_confidence, 4),
        timeline=timeline,
        ai_assessment=session.ai_assessment,
        transcript=session.messages or [],
    )
