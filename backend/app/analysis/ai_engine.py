import json
import logging
import re

import httpx

from app.config import settings
from app.schemas import AIAnalysisResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an expert resume analyst and career coach. You will be given a candidate's resume text and a job description.

Your task: analyze how well the resume matches the job and return structured JSON feedback.

Return ONLY a valid JSON object with these exact keys (no markdown, no explanation, no extra text):

{
  "match_score": <number 0-100>,
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
}

Detailed rules:
- "match_score": A number between 0 and 100 representing overall fit. Consider skills, experience level, domain knowledge, and tools.
- "matched_skills": Skills, technologies, or qualifications from the job description that the candidate clearly demonstrates in their resume. Use concise names (e.g., "Python", "Project Management", "AWS").
- "missing_skills": Skills, technologies, or qualifications required or preferred in the job description that are NOT evident in the resume.
- "suggestions": Exactly 3 to 5 specific, actionable suggestions to improve the resume FOR THIS SPECIFIC JOB. Each suggestion should reference a concrete change (e.g., "Add a section highlighting your experience with Docker and containerization").

Edge cases:
- If the resume is very short or vague, still do your best to extract skills and provide suggestions. Note the lack of detail in your suggestions.
- If the job description is vague, focus on the skills that are mentioned and suggest adding commonly expected skills for that role.
- Always return valid JSON, nothing else.

EXAMPLE INPUT:
Resume: "Software engineer with 5 years experience in Python, Django, PostgreSQL. Built REST APIs serving 10K+ users."
Job: "Looking for a backend developer with Python, FastAPI, Docker, and AWS experience."

EXAMPLE OUTPUT:
{
  "match_score": 62,
  "matched_skills": ["Python", "Backend Development", "REST APIs", "PostgreSQL"],
  "missing_skills": ["FastAPI", "Docker", "AWS"],
  "suggestions": [
    "Highlight your Django REST framework experience and draw parallels to FastAPI since both are Python web frameworks",
    "Add any Docker experience, even from personal projects or development environments",
    "Include any cloud platform experience (AWS, GCP, Azure) or mention willingness to learn",
    "Quantify your API performance metrics to strengthen the backend developer narrative"
  ]
}

Now analyze the following:
"""


def _build_prompt(resume_text: str, job_description: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n"
        f"=== RESUME ===\n{resume_text}\n\n"
        f"=== JOB DESCRIPTION ===\n{job_description}"
    )


def _extract_json(text: str) -> dict:
    """Try to extract a JSON object from the model response."""
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

    # Try to find first { ... } block (greedy, dotall)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from model response: {text[:300]}")


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
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()

            data = response.json()
            raw_text = data.get("response", "")
            logger.info("Ollama response length: %d chars (attempt %d)", len(raw_text), attempt + 1)
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
