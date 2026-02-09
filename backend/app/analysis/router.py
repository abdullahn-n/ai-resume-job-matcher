import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rate_limiter import limiter
from app.models import Analysis, User
from app.schemas import AnalysisCreateResponse, AnalysisListItem, AnalysisResponse
from app.auth.dependencies import get_current_user
from app.analysis.pdf_parser import extract_text_from_pdf
from app.analysis.service import create_analysis_record, run_analysis

router = APIRouter()


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

    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty",
        )

    # Create DB record
    analysis = create_analysis_record(
        db=db,
        user_id=current_user.id,
        resume_text=resume_text,
        job_description=job_description.strip(),
    )
    await db.commit()
    await db.refresh(analysis)

    # Kick off background processing
    background_tasks.add_task(run_analysis, analysis.id)

    return AnalysisCreateResponse(id=analysis.id, status=analysis.status)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status and results of a specific analysis."""
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
        matched_skills=json.loads(analysis.matched_skills) if analysis.matched_skills else None,
        missing_skills=json.loads(analysis.missing_skills) if analysis.missing_skills else None,
        suggestions=json.loads(analysis.suggestions) if analysis.suggestions else None,
        error_message=analysis.error_message,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
    )


@router.get("/", response_model=list[AnalysisListItem])
async def list_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all analyses for the current user, newest first."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return [
        AnalysisListItem(
            id=a.id,
            status=a.status,
            match_score=a.match_score,
            job_description_preview=a.job_description[:120] + ("..." if len(a.job_description) > 120 else ""),
            created_at=a.created_at,
        )
        for a in analyses
    ]
