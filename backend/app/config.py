from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"

    # JWT
    jwt_secret: str = "change-me-to-a-random-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Database
    database_url: str = "sqlite+aiosqlite:///./app.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
