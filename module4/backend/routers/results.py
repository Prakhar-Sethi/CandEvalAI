from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import defaultdict

from database import get_db
from models import CodingSubmission, Problem

router = APIRouter(tags=["results"])


@router.get("/module4/result/{candidate_id}")
async def get_result(candidate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CodingSubmission)
        .where(CodingSubmission.candidate_id == candidate_id)
        .order_by(CodingSubmission.submitted_at.desc())
    )
    submissions = result.scalars().all()

    if not submissions:
        raise HTTPException(404, f"No submissions for candidate {candidate_id}")

    # Best submission per problem
    best: dict[str, CodingSubmission] = {}
    for s in submissions:
        if s.problem_id not in best or s.passed_tests > best[s.problem_id].passed_tests:
            best[s.problem_id] = s

    # Fetch problem titles
    prob_ids = list(best.keys())
    prob_result = await db.execute(select(Problem).where(Problem.id.in_(prob_ids)))
    problems = {p.id: p for p in prob_result.scalars().all()}

    problems_attempted = len(best)
    problems_solved = sum(1 for s in best.values() if s.status == "Accepted")
    total_score = round(
        sum((s.passed_tests / s.total_tests * 100) if s.total_tests > 0 else 0 for s in best.values())
        / max(len(best), 1),
        1
    )

    return {
        "candidate_id": candidate_id,
        "problems_attempted": problems_attempted,
        "problems_solved": problems_solved,
        "total_score": total_score,
        "submissions": [
            {
                "problem_id": s.problem_id,
                "title": problems.get(s.problem_id, type("P", (), {"title": "Unknown"})()).title,
                "status": s.status,
                "passed_tests": s.passed_tests,
                "total_tests": s.total_tests,
                "score": round((s.passed_tests / s.total_tests * 100) if s.total_tests > 0 else 0, 1),
                "attempt_count": s.attempt_number,
                "language": s.language_name,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in best.values()
        ],
    }
