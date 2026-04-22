from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field

from app.models import SessionStatus, InterviewLabel


# ── Session schemas ──────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    candidate_name: str = Field(..., min_length=1, max_length=255)
    job_role: Optional[str] = Field(None, max_length=255)


class MessageRequest(BaseModel):
    """Candidate sends a response to the AI interviewer."""
    content: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    """AI interviewer's reply."""
    ai_message: str
    question_count: int
    is_complete: bool
    session_status: SessionStatus


class SessionResponse(BaseModel):
    id: UUID
    candidate_name: str
    job_role: Optional[str]
    status: SessionStatus
    messages: List[dict]
    question_count: int
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    ai_assessment: Optional[str]

    model_config = {"from_attributes": True}


class SessionStartResponse(BaseModel):
    """Returned when a session is created — includes AI's opening greeting."""
    id: UUID
    candidate_name: str
    job_role: Optional[str]
    status: SessionStatus
    greeting: str  # AI's opening message
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Emotion schemas ───────────────────────────────────────────────────────────

class FrameUpload(BaseModel):
    frame_b64: str = Field(..., description="Base64-encoded JPEG image data")
    frame_index: int = Field(..., ge=0)
    captured_at: Optional[datetime] = None


class EmotionReadingResponse(BaseModel):
    id: UUID
    session_id: UUID
    captured_at: datetime
    frame_index: int
    raw_emotions: dict[str, Any]
    dominant_raw_emotion: str
    interview_label: InterviewLabel
    confidence_score: float

    model_config = {"from_attributes": True}


# ── Report schema ─────────────────────────────────────────────────────────────

class EmotionTimeline(BaseModel):
    frame_index: int
    label: InterviewLabel
    confidence: float
    captured_at: datetime


class SessionReport(BaseModel):
    session_id: UUID
    candidate_name: str
    job_role: Optional[str]
    status: SessionStatus
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    total_frames_analyzed: int
    emotion_breakdown: dict[str, int]
    emotion_percentages: dict[str, float]
    dominant_label: str
    average_confidence: float
    timeline: List[EmotionTimeline]
    ai_assessment: Optional[str]
    transcript: List[dict]
