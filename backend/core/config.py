from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEPMS Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "super-secret-local-jwt-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Supabase (for cloud sync logic)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # POS Workflow Mode: SINGLE_COUNTER or DUAL_COUNTER
    POS_WORKFLOW_MODE: str = "SINGLE_COUNTER"
    
    # WhatsApp testing config
    TEST_WHATSAPP_NUMBER: str = "+920000000000"

    # WhatsApp Report Bot
    # Comma-separated authorized phone numbers (E.164 without +), e.g. 923144236077
    WHATSAPP_BOT_WHITELIST: Optional[str] = None
    # URL of this FastAPI backend (used by the Node Baileys service)
    BACKEND_URL: str = "http://localhost:8000"

    # AI / Generative APIs
    GEMINI_API_KEY: Optional[str] = None    
    class Config:
        env_file = ".env"

settings = Settings()
