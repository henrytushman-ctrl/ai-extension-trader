"""
Alpaca OAuth and trading API helpers.
Docs: https://docs.alpaca.markets/reference/oauth-overview
"""
import httpx
from backend.config import settings

ALPACA_OAUTH_AUTHORIZE = "https://app.alpaca.markets/oauth/authorize"
ALPACA_TOKEN_URL = "https://api.alpaca.markets/oauth/token"
ALPACA_API_PAPER = "https://paper-api.alpaca.markets/v2"
ALPACA_API_LIVE = "https://api.alpaca.markets/v2"


def get_authorize_url(state: str, env: str = "paper") -> str:
    """Build the URL to redirect users to for OAuth consent."""
    scope = "account:write trading"
    return (
        f"{ALPACA_OAUTH_AUTHORIZE}"
        f"?response_type=code"
        f"&client_id={settings.alpaca_client_id}"
        f"&redirect_uri={settings.alpaca_redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )


def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    resp = httpx.post(ALPACA_TOKEN_URL, data={
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.alpaca_client_id,
        "client_secret": settings.alpaca_client_secret,
        "redirect_uri": settings.alpaca_redirect_uri,
    })
    resp.raise_for_status()
    return resp.json()


def get_account(access_token: str, env: str = "paper") -> dict:
    """Fetch account details (id, buying power, portfolio value, etc.)."""
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.get(f"{base}/account", headers={"Authorization": f"Bearer {access_token}"})
    resp.raise_for_status()
    return resp.json()


def get_positions(access_token: str, env: str = "paper") -> list[dict]:
    """Fetch all open positions."""
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.get(f"{base}/positions", headers={"Authorization": f"Bearer {access_token}"})
    resp.raise_for_status()
    return resp.json()


def submit_order(
    access_token: str,
    ticker: str,
    qty: float,
    side: str,           # "buy" or "sell"
    env: str = "paper",
) -> dict:
    """Submit a market order. Returns Alpaca order object."""
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.post(
        f"{base}/orders",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "symbol": ticker,
            "qty": str(round(qty, 2)),
            "side": side,
            "type": "market",
            "time_in_force": "day",
        },
    )
    resp.raise_for_status()
    return resp.json()
