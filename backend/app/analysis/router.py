import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rate_limiter import limiter
from app.models import Analysis, User
from app.schemas import AnalysisCreateResponse, AnalysisListItem, AnalysisResponse, PaginatedAnalyses
from app.auth.dependencies import get_current_user
from app.analysis.pdf_parser import extract_text_from_pdf
from app.analysis.service import create_analysis_record, run_analysis

router = APIRouter()
logger = logging.getLogger(__name__)


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except ValueError:
        return False


def _safe_json_loads(val: str | None) -> list[str] | None:
    if not val:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return None


@router.post("/", response_model=AnalysisCreateResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/hour")
async def create_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a resume PDF and job description to start an AI analysis."""
    # Validate file type
    if not resume.filename or not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    # Read and parse PDF
    pdf_bytes = await resume.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB.",
        )

    try:
        resume_text = extract_text_from_pdf(pdf_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    jd = job_description.strip()
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty",
        )
    if len(jd) > 50_000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description too long. Maximum 50,000 characters.",
        )

    # Create DB record
    analysis = create_analysis_record(
        db=db,
        user_id=current_user.id,
        resume_text=resume_text,
        job_description=jd,
    )
    await db.commit()
    await db.refresh(analysis)

    # Kick off background processing
    background_tasks.add_task(run_analysis, analysis.id)
    logger.info("Analysis %s created by user %s", analysis.id, current_user.id)

    return AnalysisCreateResponse(id=analysis.id, status=analysis.status)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status and results of a specific analysis."""
    if not _is_valid_uuid(analysis_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid analysis ID format")

    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return AnalysisResponse(
        id=analysis.id,
        status=analysis.status,
        job_description=analysis.job_description,
        match_score=analysis.match_score,
        matched_skills=_safe_json_loads(analysis.matched_skills),
        missing_skills=_safe_json_loads(analysis.missing_skills),
        suggestions=_safe_json_loads(analysis.suggestions),
        error_message=analysis.error_message,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
    )


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific analysis owned by the current user."""
    if not _is_valid_uuid(analysis_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid analysis ID format")

    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    await db.delete(analysis)
    await db.commit()
    logger.info("Analysis %s deleted by user %s", analysis_id, current_user.id)


@router.get("/", response_model=PaginatedAnalyses)
async def list_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List analyses for the current user, newest first, with pagination."""
    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(Analysis).where(Analysis.user_id == current_user.id)
    )
    total = count_result.scalar()

    # Paginated results
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    analyses = result.scalars().all()

    items = [
        AnalysisListItem(
            id=a.id,
            status=a.status,
            match_score=a.match_score,
            job_description_preview=a.job_description[:120] + ("..." if len(a.job_description) > 120 else ""),
            created_at=a.created_at,
        )
        for a in analyses
    ]

    return PaginatedAnalyses(items=items, total=total, has_more=(skip + limit) < total)
