"""
AI Interviewer Service using Ollama (local LLM — completely free, no API key).

Ollama runs locally and serves models like llama3.2 via a simple REST API.
Docker Compose brings up the Ollama container automatically.
"""
import logging
from typing import List, Dict, Tuple

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


INTERVIEWER_SYSTEM = """You are an expert technical interviewer at HCL Technologies conducting a job interview.
Your role:
- Ask ONE focused technical question at a time based on the candidate's job role
- Briefly acknowledge their previous answer before asking the next question
- Probe deeper when answers are vague or incomplete
- Be professional, encouraging, and fair
- Cover fundamentals, practical scenarios, problem-solving, and best practices

Rules:
- NEVER ask multiple questions at once
- Keep responses concise — 2-4 sentences then your question
- Make questions specific to the stated job role
- Do not reveal you are an AI unless directly asked

When wrapping up: thank the candidate and tell them the interview is complete."""


def _chat(messages: List[Dict]) -> str:
    """Call the Ollama /api/chat endpoint synchronously."""
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 400,
        },
    }
    try:
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except httpx.ConnectError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {settings.ollama_base_url}. "
            "Make sure Ollama is running (docker compose up)."
        )


def build_greeting(candidate_name: str, job_role: str | None) -> str:
    """Generate the AI interviewer's opening message + first question."""
    role_text = job_role or "Software Engineer"
    messages = [
        {"role": "system", "content": INTERVIEWER_SYSTEM},
        {
            "role": "user",
            "content": (
                f"[START INTERVIEW] Candidate name: {candidate_name}. "
                f"Job role: {role_text}. "
                "Greet them warmly, briefly introduce yourself as the HCL technical interviewer, "
                "and ask your first technical question relevant to their role."
            ),
        },
    ]
    return _chat(messages)


def get_next_response(
    candidate_name: str,
    job_role: str | None,
    messages: List[Dict],
    question_count: int,
    max_questions: int,
) -> Tuple[str, bool]:
    """
    Get the AI interviewer's next message.
    Returns (ai_text, is_interview_complete).
    """
    is_complete = False
    api_messages = [{"role": "system", "content": INTERVIEWER_SYSTEM}] + messages

    if question_count >= max_questions:
        api_messages.append({
            "role": "user",
            "content": (
                "[SYSTEM NOTE] This was the final question. "
                "Thank the candidate, tell them the interview is complete, "
                "and let them know HCL will be in touch. Do NOT ask any more questions."
            ),
        })
        is_complete = True

    return _chat(api_messages), is_complete


def generate_assessment(
    candidate_name: str,
    job_role: str | None,
    messages: List[Dict],
    emotion_summary: Dict,
) -> str:
    """Generate a post-interview assessment."""
    transcript_lines = []
    for m in messages:
        if m["role"] == "system" or m.get("content", "").startswith("[SYSTEM"):
            continue
        role = "Interviewer" if m["role"] == "assistant" else candidate_name
        transcript_lines.append(f"{role}: {m['content']}")
    transcript = "\n\n".join(transcript_lines)

    prompt = f"""You are evaluating a technical interview for a {job_role or 'Software Engineer'} position.
Candidate: {candidate_name}

INTERVIEW TRANSCRIPT:
{transcript}

BEHAVIORAL METRICS (facial expression analysis):
- Dominant emotional state: {emotion_summary.get('dominant_label', 'N/A')}
- Average confidence score: {emotion_summary.get('average_confidence', 0):.0%}
- Confident frames: {emotion_summary.get('confident_pct', 0):.0f}%
- Stressed frames: {emotion_summary.get('stressed_pct', 0):.0f}%

Write a structured assessment with these exact sections:

## Technical Assessment
Score: X/10
[2-3 sentences on technical depth and accuracy]

## Communication Skills
Score: X/10
[1-2 sentences on clarity and structure]

## Key Strengths
- [bullet]
- [bullet]

## Areas for Improvement
- [bullet]
- [bullet]

## Behavioral Indicators
[1-2 sentences on the facial expression data]

## Overall Recommendation
**[STRONG HIRE / HIRE / CONSIDER / DECLINE]**
[1 sentence justification]"""

    return _chat([{"role": "user", "content": prompt}])
