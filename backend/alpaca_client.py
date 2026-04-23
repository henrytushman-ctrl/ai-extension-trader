"""
Alpaca trading API helpers. Uses API key authentication (APCA-API-KEY-ID / APCA-API-SECRET-KEY).
"""
import httpx

ALPACA_API_PAPER = "https://paper-api.alpaca.markets/v2"
ALPACA_API_LIVE = "https://api.alpaca.markets/v2"


def _headers(api_key: str, api_secret: str) -> dict:
    return {
        "APCA-API-KEY-ID": api_key,
        "APCA-API-SECRET-KEY": api_secret,
    }


def get_account(api_key: str, api_secret: str, env: str = "paper") -> dict:
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.get(f"{base}/account", headers=_headers(api_key, api_secret))
    resp.raise_for_status()
    return resp.json()


def get_positions(api_key: str, api_secret: str, env: str = "paper") -> list[dict]:
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.get(f"{base}/positions", headers=_headers(api_key, api_secret))
    resp.raise_for_status()
    return resp.json()


def submit_order(
    api_key: str,
    api_secret: str,
    ticker: str,
    qty: float,
    side: str,
    env: str = "paper",
) -> dict:
    base = ALPACA_API_PAPER if env == "paper" else ALPACA_API_LIVE
    resp = httpx.post(
        f"{base}/orders",
        headers=_headers(api_key, api_secret),
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
