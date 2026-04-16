from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets

from backend.db import get_db, engine, Base
from backend.models import User, Subscription, UserTrade, BrokerEnv
from backend.alpaca_client import get_authorize_url, exchange_code, get_account
from backend.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Extension Trader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# OAuth flow
# ---------------------------------------------------------------------------

@app.get("/auth/alpaca/authorize")
def alpaca_authorize(env: str = Query("paper")):
    """Return the Alpaca OAuth URL to redirect the user to."""
    state = secrets.token_urlsafe(16)
    url = get_authorize_url(state=state, env=env)
    return {"url": url, "state": state}


@app.get("/auth/alpaca/callback")
def alpaca_callback(code: str, state: str, env: str = Query("paper"), db: Session = Depends(get_db)):
    """Handle OAuth callback — exchange code for token, create/update user."""
    try:
        token_data = exchange_code(code)
    except Exception as e:
        raise HTTPException(400, f"Token exchange failed: {e}")

    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")

    # Get Alpaca account ID to identify the user
    try:
        account = get_account(access_token, env)
        alpaca_id = account["id"]
    except Exception as e:
        raise HTTPException(400, f"Could not fetch Alpaca account: {e}")

    user = db.query(User).filter_by(alpaca_account_id=alpaca_id).first()
    if user:
        user.access_token = access_token
        if refresh_token:
            user.refresh_token = refresh_token
        user.environment = BrokerEnv(env)
    else:
        user = User(
            alpaca_account_id=alpaca_id,
            access_token=access_token,
            refresh_token=refresh_token,
            environment=BrokerEnv(env),
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "environment": env}


# ---------------------------------------------------------------------------
# User & account
# ---------------------------------------------------------------------------

@app.get("/users/{user_id}/account")
def get_user_account(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    try:
        account = get_account(user.access_token, user.environment.value)
        return {
            "user_id": user_id,
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


@app.get("/users/{user_id}/subscriptions")
def list_subscriptions(user_id: int, db: Session = Depends(get_db)):
    subs = db.query(Subscription).filter_by(user_id=user_id).all()
    return [
        {
            "id": s.id,
            "strategy": s.strategy,
            "model": s.model,
            "has_news": s.has_news,
            "has_ratios": s.has_ratios,
            "active": s.active,
            "created_at": s.created_at.isoformat(),
        }
        for s in subs
    ]


@app.post("/users/{user_id}/subscriptions")
def create_subscription(user_id: int, req: SubscribeRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # Deactivate existing subscriptions (one active at a time for MVP)
    db.query(Subscription).filter_by(user_id=user_id, active=True).update({"active": False})
    sub = Subscription(
        user_id=user_id,
        strategy=req.strategy,
        model=req.model,
        has_news=req.has_news,
        has_ratios=req.has_ratios,
        active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "strategy": sub.strategy, "model": sub.model, "active": sub.active}


@app.patch("/users/{user_id}/subscriptions/{sub_id}")
def update_subscription(user_id: int, sub_id: int, active: bool, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=user_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.active = active
    db.commit()
    return {"id": sub.id, "active": sub.active}


# ---------------------------------------------------------------------------
# Trades
# ---------------------------------------------------------------------------

@app.get("/users/{user_id}/trades")
def list_trades(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    trades = (
        db.query(UserTrade)
        .filter_by(user_id=user_id)
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
def run_all(db: Session = Depends(get_db)):
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
