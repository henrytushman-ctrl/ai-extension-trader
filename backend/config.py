from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./aiet.db"
    secret_key: str = "dev-secret-change-in-production"

    # Alpaca OAuth app credentials
    alpaca_client_id: str = ""
    alpaca_client_secret: str = ""
    alpaca_redirect_uri: str = "http://localhost:3000/dashboard/callback"

    # AI model keys (reused from AI Trader)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # News
    newsdata_api_key: str = ""

    # Frontend URL (for CORS)
    frontend_url: str = "http://localhost:3000"

    # AI Trader API (for pulling strategy performance data)
    ai_trader_api: str = "https://ai-trader-jylt.onrender.com"

    class Config:
        env_file = ".env"


settings = Settings()
