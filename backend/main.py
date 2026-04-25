from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets

from backend.db import get_db, engine, Base
from backend.models import User, Subscription, UserTrade, BrokerEnv
from backend.alpaca_client import get_account
from backend.config import settings
from backend.crypto import encrypt_token, decrypt_token

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Idempotent ALTER TABLE migrations for columns added after initial deploy."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR DEFAULT NULL",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS has_news BOOLEAN DEFAULT TRUE",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS has_ratios BOOLEAN DEFAULT TRUE",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stock_universe VARCHAR DEFAULT 'sp500'",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS aggression VARCHAR DEFAULT 'moderate'",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT DEFAULT NULL",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()


_run_migrations()

app = FastAPI(title="AI Extension Trader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth dependency — validates X-Session-Token ownership
# ---------------------------------------------------------------------------

def require_user(
    user_id: int,
    x_session_token: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if not user or user.session_token != x_session_token:
        raise HTTPException(401, "Unauthorized")
    return user


# ---------------------------------------------------------------------------
# Admin dependency
# ---------------------------------------------------------------------------

def require_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(401, "Unauthorized")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# API key connect flow
# ---------------------------------------------------------------------------

class ConnectRequest(BaseModel):
    api_key: str
    api_secret: str
    env: str = "paper"


@app.post("/auth/alpaca/connect")
def alpaca_connect(req: ConnectRequest, db: Session = Depends(get_db)):
    """Verify Alpaca API key + secret, create/update user, return session token."""
    if req.env not in ("paper", "live"):
        raise HTTPException(400, "env must be 'paper' or 'live'")

    try:
        account = get_account(req.api_key, req.api_secret, req.env)
        alpaca_id = account["id"]
    except Exception as e:
        raise HTTPException(400, f"Invalid credentials: {e}")

    enc_key = encrypt_token(req.api_key)
    enc_secret = encrypt_token(req.api_secret)
    session_token = secrets.token_urlsafe(32)

    user = db.query(User).filter_by(alpaca_account_id=alpaca_id).first()
    if user:
        user.access_token = enc_key
        user.refresh_token = enc_secret
        user.environment = BrokerEnv(req.env)
        user.session_token = session_token
    else:
        user = User(
            alpaca_account_id=alpaca_id,
            access_token=enc_key,
            refresh_token=enc_secret,
            environment=BrokerEnv(req.env),
            session_token=session_token,
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "session_token": session_token, "environment": req.env}


# ---------------------------------------------------------------------------
# User & account
# ---------------------------------------------------------------------------

@app.get("/users/{user_id}/account")
def get_user_account(user: User = Depends(require_user)):
    try:
        api_key = decrypt_token(user.access_token)
        api_secret = decrypt_token(user.refresh_token) if user.refresh_token else ""
        account = get_account(api_key, api_secret, user.environment.value)
        return {
            "user_id": user.id,
            "environment": user.environment.value,
            "portfolio_value": account.get("portfolio_value"),
            "cash": account.get("cash"),
            "buying_power": account.get("buying_power"),
        }
    except Exception as e:
        raise HTTPException(400, f"Alpaca error: {e}")


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

class SubscribeRequest(BaseModel):
    strategy: str
    model: str = "claude-haiku-4-5-20251001"
    has_news: bool = True
    has_ratios: bool = True
    stock_universe: str = "sp500"
    aggression: str = "moderate"
    is_custom: bool = False
    ai_api_key: str | None = None  # user-provided AI provider key (only for custom strategies)


@app.get("/users/{user_id}/subscriptions")
def list_subscriptions(user: User = Depends(require_user), db: Session = Depends(get_db)):
    subs = db.query(Subscription).filter_by(user_id=user.id).all()
    return [
        {
            "id": s.id,
            "strategy": s.strategy,
            "model": s.model,
            "has_news": s.has_news,
            "has_ratios": s.has_ratios,
            "stock_universe": s.stock_universe,
            "aggression": s.aggression,
            "is_custom": s.is_custom,
            "active": s.active,
            "created_at": s.created_at.isoformat(),
        }
        for s in subs
    ]


@app.post("/users/{user_id}/subscriptions")
def create_subscription(req: SubscribeRequest, user: User = Depends(require_user), db: Session = Depends(get_db)):
    if req.stock_universe not in ("sp500", "tech", "small_cap"):
        raise HTTPException(400, "stock_universe must be sp500, tech, or small_cap")
    if req.aggression not in ("conservative", "moderate", "aggressive", "speculative"):
        raise HTTPException(400, "aggression must be conservative, moderate, aggressive, or speculative")
    if req.is_custom and not req.ai_api_key:
        raise HTTPException(400, "Custom strategies require your own AI API key")

    # Deactivate existing subscriptions (one active at a time for MVP)
    db.query(Subscription).filter_by(user_id=user.id, active=True).update({"active": False})
    sub = Subscription(
        user_id=user.id,
        strategy=req.strategy,
        model=req.model,
        has_news=req.has_news,
        has_ratios=req.has_ratios,
        stock_universe=req.stock_universe,
        aggression=req.aggression,
        is_custom=req.is_custom,
        ai_api_key_encrypted=encrypt_token(req.ai_api_key) if req.ai_api_key else None,
        active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "strategy": sub.strategy,
        "model": sub.model,
        "stock_universe": sub.stock_universe,
        "aggression": sub.aggression,
        "is_custom": sub.is_custom,
        "active": sub.active,
    }


@app.patch("/users/{user_id}/subscriptions/{sub_id}")
def update_subscription(sub_id: int, active: bool, user: User = Depends(require_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=user.id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.active = active
    db.commit()
    return {"id": sub.id, "active": sub.active}


@app.delete("/users/{user_id}/subscriptions/{sub_id}")
def delete_subscription(sub_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=user.id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    db.delete(sub)
    db.commit()
    return {"deleted": sub_id}


# ---------------------------------------------------------------------------
# Trades
# ---------------------------------------------------------------------------

@app.get("/users/{user_id}/trades")
def list_trades(limit: int = 50, user: User = Depends(require_user), db: Session = Depends(get_db)):
    trades = (
        db.query(UserTrade)
        .filter_by(user_id=user.id)
        .order_by(UserTrade.executed_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "ticker": t.ticker,
            "action": t.action,
            "shares": t.shares,
            "price": t.price,
            "reasoning": t.reasoning,
            "executed_at": t.executed_at.isoformat(),
            "alpaca_order_id": t.alpaca_order_id,
        }
        for t in trades
    ]


# ---------------------------------------------------------------------------
# Manual trigger (for testing / GitHub Actions)
# ---------------------------------------------------------------------------

@app.post("/run-all")
def run_all(_: None = Depends(require_admin), db: Session = Depends(get_db)):
    """Run the weekly AI trading step for all active subscriptions."""
    from backend.executor import run_user_step

    users = db.query(User).all()
    results = []
    for user in users:
        active_subs = db.query(Subscription).filter_by(user_id=user.id, active=True).all()
        for sub in active_subs:
            result = run_user_step(user, sub, db)
            results.append(result)

    return {"ran": len(results), "results": results}
