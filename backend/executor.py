"""
Execution engine: runs one weekly AI trading step for a subscribed user.
Mirrors the logic in AI Trader's live_trader.py, but executes against Alpaca API
instead of a paper DB.
"""
from datetime import date, datetime
import yfinance as yf
from sqlalchemy.orm import Session

from backend.models import User, Subscription, UserTrade
from backend.alpaca_client import get_account, get_positions, submit_order
from backend.agents import run_agent
from backend.config import settings


SP500_SAMPLE = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "BRK-B", "UNH", "LLY",
    "JPM", "V", "XOM", "AVGO", "PG", "MA", "HD", "CVX", "MRK", "ABBV",
    "COST", "PEP", "ADBE", "KO", "WMT", "BAC", "MCD", "CRM", "NFLX", "TMO",
    "CSCO", "ACN", "PFE", "LIN", "ABT", "DHR", "TXN", "NKE", "NEE", "PM",
    "RTX", "ORCL", "QCOM", "AMGN", "UPS", "HON", "IBM", "CAT", "SPGI", "GS",
]


def _fetch_prices(tickers: list[str]) -> dict[str, float]:
    prices = {}
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            p = t.fast_info.get("last_price") or t.fast_info.get("previousClose")
            if p:
                prices[ticker] = float(p)
        except Exception:
            continue
    return prices


def _fetch_ratios(tickers: list[str]) -> dict[str, dict]:
    ratios = {}
    for ticker in tickers[:20]:  # cap to avoid rate limits
        try:
            info = yf.Ticker(ticker).info
            ratios[ticker] = {
                "pe_ratio": info.get("trailingPE"),
                "pb_ratio": info.get("priceToBook"),
                "debt_to_equity": info.get("debtToEquity"),
            }
        except Exception:
            continue
    return ratios


def run_user_step(user: User, sub: Subscription, db: Session) -> dict:
    """Run one weekly trading step for a user subscription."""
    env = user.environment.value
    today = date.today()

    # 1. Get account state from Alpaca
    try:
        account = get_account(user.access_token, env)
        cash = float(account.get("cash", 0))
        portfolio_value = float(account.get("portfolio_value", cash))
    except Exception as e:
        return {"error": f"Alpaca account fetch failed: {e}"}

    # 2. Get current positions from Alpaca
    try:
        positions = get_positions(user.access_token, env)
    except Exception as e:
        return {"error": f"Alpaca positions fetch failed: {e}"}

    holdings = {
        p["symbol"]: {
            "shares": float(p["qty"]),
            "avg_cost": float(p["avg_entry_price"]),
        }
        for p in positions
    }

    portfolio = {"cash": cash, "holdings": holdings}

    # 3. Fetch market data
    universe = SP500_SAMPLE
    prices = _fetch_prices(universe)
    if not prices:
        return {"error": "Could not fetch prices"}

    ratios = _fetch_ratios(list(holdings.keys()) + universe[:20]) if sub.has_ratios else {}

    # 4. Run AI agent
    result = run_agent(
        strategy=sub.strategy,
        model=sub.model,
        portfolio=portfolio,
        prices=prices,
        ratios=ratios,
        news=[],       # TODO: wire news providers
        on_date=today,
        universe=universe,
        aggression="moderate",
    )

    # 5. Apply hard position limits before executing
    trades = _apply_limits(result.get("trades", []), portfolio_value, prices)

    # 6. Execute trades on Alpaca
    executed = []
    for decision in trades:
        ticker = decision["ticker"]
        action = decision["action"]
        shares = float(decision.get("shares", 0))
        price = prices.get(ticker, 0)

        if shares <= 0 or action == "hold" or price <= 0:
            continue

        alpaca_side = "buy" if action in ("buy",) else "sell"

        try:
            order = submit_order(user.access_token, ticker, shares, alpaca_side, env)
            order_id = order.get("id")
        except Exception as e:
            order_id = None
            print(f"  Order failed {ticker}: {e}")

        db.add(UserTrade(
            user_id=user.id,
            subscription_id=sub.id,
            executed_at=datetime.utcnow(),
            ticker=ticker,
            action=action,
            shares=shares,
            price=price,
            reasoning=decision.get("reasoning", ""),
            alpaca_order_id=order_id,
        ))
        executed.append(f"{action} {shares:.0f} {ticker} @ ${price:.2f}")

    db.commit()
    return {
        "user_id": user.id,
        "strategy": sub.strategy,
        "model": sub.model,
        "date": today.isoformat(),
        "trades": executed,
        "summary": result.get("summary", ""),
    }


def _apply_limits(trades: list[dict], portfolio_value: float, prices: dict) -> list[dict]:
    """Hard-enforce: max 20% per position, max 50% turnover."""
    if portfolio_value <= 0:
        return []
    max_pos = 0.20 * portfolio_value
    max_turnover = 0.50 * portfolio_value
    spent = 0.0
    out = []
    for d in trades:
        ticker = d.get("ticker", "")
        shares = float(d.get("shares", 0))
        price = prices.get(ticker, 0)
        if shares <= 0 or price <= 0:
            continue
        value = shares * price
        value = min(value, max_pos, max_turnover - spent)
        if value < price:
            continue
        d = dict(d)
        d["shares"] = value / price
        spent += value
        out.append(d)
    return out
