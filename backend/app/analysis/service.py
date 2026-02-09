import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import Analysis
from app.analysis.pdf_parser import extract_text_from_pdf
from app.analysis.ai_engine import analyze_resume

logger = logging.getLogger(__name__)


async def run_analysis(analysis_id: str) -> None:
    """Background task: parse PDF text, call Ollama, save results."""
    async with async_session() as db:
        result = await db.execute(
            select(Analysis).where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if analysis is None:
            logger.error("Analysis %s not found", analysis_id)
            return

        # Mark as processing
        analysis.status = "processing"
        await db.commit()

        try:
            # Call Ollama AI
            ai_result = await analyze_resume(
                analysis.resume_text, analysis.job_description
            )

            # Save results
            analysis.match_score = ai_result.match_score
            analysis.matched_skills = json.dumps(ai_result.matched_skills)
            analysis.missing_skills = json.dumps(ai_result.missing_skills)
            analysis.suggestions = json.dumps(ai_result.suggestions)
            analysis.status = "completed"
            analysis.completed_at = datetime.now(timezone.utc)

        except Exception as exc:
            logger.exception("Analysis %s failed: %s", analysis_id, exc)
            analysis.status = "failed"
            analysis.error_message = str(exc)

        await db.commit()


def create_analysis_record(
    db: AsyncSession,
    user_id: str,
    resume_text: str,
    job_description: str,
) -> Analysis:
    """Create a new pending analysis record."""
    analysis = Analysis(
        user_id=user_id,
        resume_text=resume_text,
        job_description=job_description,
        status="pending",
    )
    db.add(analysis)
    return analysis
