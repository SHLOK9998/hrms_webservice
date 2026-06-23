from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URL: str 
    DATABASE_NAME: str 
    SECRET_KEY: str 
    ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    GEMINI_API_KEY: Optional[str] = None
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str

    class Config:
        env_file = ".env"

settings = Settings()
