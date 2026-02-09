import json
import logging
import re

import httpx

from app.config import settings
from app.schemas import AIAnalysisResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an expert resume analyst. You will be given a candidate's resume text and a job description.

Analyze them and return ONLY valid JSON (no markdown, no explanation) with these exact keys:

{
  "match_score": <number 0-100 representing how well the resume matches the job>,
  "matched_skills": [<list of skills from the job description that the candidate has>],
  "missing_skills": [<list of skills from the job description that the candidate lacks>],
  "suggestions": [<list of 3-5 specific, actionable suggestions to improve the resume for this job>]
}

Rules:
- match_score must be a number between 0 and 100
- matched_skills and missing_skills should be concise skill names
- suggestions should be specific and actionable, not generic advice
- Return ONLY the JSON object, nothing else
"""


def _build_prompt(resume_text: str, job_description: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"=== RESUME ===\n{resume_text}\n\n"
        f"=== JOB DESCRIPTION ===\n{job_description}"
    )


def _extract_json(text: str) -> dict:
    """Try to extract a JSON object from the model response.

    Handles cases where the model wraps JSON in markdown code blocks
    or adds extra text around it.
    """
    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON within markdown code fences
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from model response: {text[:200]}")


async def analyze_resume(resume_text: str, job_description: str) -> AIAnalysisResult:
    """Send resume + job description to Ollama and return structured analysis.

    Retries up to 2 times on failure.
    """
    prompt = _build_prompt(resume_text, job_description)
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 2048,
        },
    }

    last_error: Exception | None = None

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()

            data = response.json()
            raw_text = data.get("response", "")
            parsed = _extract_json(raw_text)

            # Validate against our schema
            result = AIAnalysisResult(**parsed)

            # Clamp score to 0-100
            result.match_score = max(0.0, min(100.0, result.match_score))

            return result

        except Exception as exc:
            last_error = exc
            logger.warning(
                "Ollama attempt %d/3 failed: %s", attempt + 1, exc
            )

    raise RuntimeError(
        f"Failed to get valid analysis from Ollama after 3 attempts: {last_error}"
    )
