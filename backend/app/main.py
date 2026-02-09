from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.auth.router import router as auth_router
from app.analysis.router import router as analysis_router
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler

from slowapi.errors import RateLimitExceeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="AI Resume Job Matcher",
    description="Upload your resume, paste a job description, and get an AI-powered skill match analysis.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(analysis_router, prefix="/analysis", tags=["Analysis"])


@app.get("/health")
async def health():
    return {"status": "ok"}
