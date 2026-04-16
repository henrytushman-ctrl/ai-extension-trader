"""
AI agent caller — mirrors AI Trader's executor.py/model_client.py.
Kept as a single file for simplicity; same logic, different package.
"""
from datetime import date

STRATEGIES: dict[str, str] = {
    "value": (
        "ROLE: You are a value investor managing a portfolio.\n\n"
        "OBJECTIVE: Buy undervalued stocks trading below intrinsic value. "
        "Seek companies with durable competitive advantages, strong cash generation, "
        "and depressed prices relative to fundamentals. Hold until the market corrects the mispricing.\n\n"
        "SELECTION CRITERIA:\n1. Low P/E and P/B ratios relative to sector peers\n"
        "2. High free cash flow yield and low debt-to-equity\n"
        "3. Stable or growing earnings with no signs of fundamental deterioration\n\n"
        "EXIT RULES:\n- Sell when the stock reaches fair value or fundamentals deteriorate materially\n"
        "- Sell when a clearly superior value opportunity exists elsewhere\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "momentum": (
        "ROLE: You are a momentum trader managing a portfolio.\n\n"
        "OBJECTIVE: Ride stocks with strong, sustained upward price trends. "
        "Capture trend continuation by rotating into the universe's top performers. "
        "Exit laggards quickly and concentrate in leaders.\n\n"
        "SELECTION CRITERIA:\n1. Strong recent price performance (top quartile over past 12 weeks)\n"
        "2. Price near 52-week high with increasing volume confirming the trend\n"
        "3. Positive relative strength vs. the broader universe\n\n"
        "EXIT RULES:\n- Sell any position that falls out of the top half of relative strength\n"
        "- Sell any position showing sustained volume decline into price weakness\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "growth": (
        "ROLE: You are a growth investor managing a portfolio.\n\n"
        "OBJECTIVE: Find companies with exceptional and accelerating revenue and earnings growth. "
        "Prioritize large addressable markets and durable competitive moats. "
        "Hold winners long-term; growth trajectory matters more than current valuation.\n\n"
        "SELECTION CRITERIA:\n1. High and accelerating revenue growth rate (above 20% year-over-year)\n"
        "2. Expanding gross margins indicating operating leverage\n"
        "3. Large total addressable market with clear path to sustained growth\n\n"
        "EXIT RULES:\n- Sell when revenue growth decelerates significantly for two or more consecutive periods\n"
        "- Sell when the competitive moat shows signs of erosion\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "mean_reversion": (
        "ROLE: You are a mean reversion trader managing a portfolio.\n\n"
        "OBJECTIVE: Buy temporarily oversold stocks and sell temporarily overbought ones. "
        "Profit from price normalization when deviation from fair value lacks fundamental cause.\n\n"
        "SELECTION CRITERIA:\n1. Stock has declined significantly from recent highs without fundamental deterioration\n"
        "2. Valuation has compressed to levels historically associated with recovery\n"
        "3. No ongoing negative catalyst that would justify a permanent repricing\n\n"
        "EXIT RULES:\n- Sell when the stock recovers to its recent trading range or estimated fair value\n"
        "- Sell immediately if a fundamental negative catalyst emerges\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "sentiment": (
        "ROLE: You are a sentiment-driven investor managing a portfolio.\n\n"
        "OBJECTIVE: React to market-moving news, analyst actions, and investor sentiment shifts. "
        "Buy into positive catalysts before consensus fully prices them.\n\n"
        "SELECTION CRITERIA:\n1. Positive news catalyst: earnings beat, analyst upgrade, or product launch\n"
        "2. Broad positive sentiment not yet fully reflected in price action\n"
        "3. Strong near-term momentum confirming the sentiment shift\n\n"
        "EXIT RULES:\n- Sell on negative news, analyst downgrades, or earnings misses\n"
        "- Sell when positive sentiment fades and price momentum reverses\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "macro": (
        "ROLE: You are a macro investor managing a portfolio.\n\n"
        "OBJECTIVE: Position the portfolio based on broad macroeconomic and sector rotation signals. "
        "Favor defensive sectors in deteriorating conditions and cyclicals in expansions.\n\n"
        "SELECTION CRITERIA:\n1. Sector or stock aligned with the current macro regime\n"
        "2. Relative valuation attractive vs. other sectors given the macro backdrop\n"
        "3. Catalyst exists (policy change, data release) that will drive the thesis\n\n"
        "EXIT RULES:\n- Sell when the macro regime shifts and the original thesis no longer holds\n"
        "- Sell when the sector has re-rated and no longer offers a valuation advantage\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
    "dividend": (
        "ROLE: You are a dividend income investor managing a portfolio.\n\n"
        "OBJECTIVE: Build a portfolio of reliable, growing dividend payers. "
        "Prioritize stable cash flows and long dividend growth histories.\n\n"
        "SELECTION CRITERIA:\n1. High dividend yield with a long, uninterrupted dividend growth history\n"
        "2. Low payout ratio (below 70%) indicating dividend sustainability\n"
        "3. Stable or growing free cash flow sufficient to cover and grow the dividend\n\n"
        "EXIT RULES:\n- Sell immediately on any dividend cut or suspension announcement\n"
        "- Sell when the payout ratio exceeds 85% or free cash flow deteriorates materially\n\n"
        "CONSTRAINTS: Apply the risk profile instructions provided exactly."
    ),
}

AGGRESSION_LABELS = {
    "moderate": "RISK PROFILE: moderate. Balance growth and risk.",
    "conservative": "RISK PROFILE: conservative. Preserve capital; avoid shorts.",
    "aggressive": "RISK PROFILE: aggressive. Maximize returns.",
}

TRADE_TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "trades": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "action": {"type": "string", "enum": ["buy", "sell", "hold"]},
                    "shares": {"type": "number"},
                    "reasoning": {"type": "string"},
                },
                "required": ["ticker", "action"],
            },
        },
        "summary": {"type": "string"},
    },
    "required": ["trades", "summary"],
}


def _build_context(
    portfolio: dict,
    prices: dict[str, float],
    ratios: dict[str, dict],
    news: list,
    on_date: date,
    universe: list[str],
    aggression: str = "moderate",
) -> str:
    total_value = portfolio["cash"] + sum(
        h["shares"] * prices.get(t, h["avg_cost"])
        for t, h in portfolio["holdings"].items()
    )
    lines = [
        f"Date: {on_date.isoformat()}",
        f"Portfolio value: ${total_value:,.2f}",
        f"Cash: ${portfolio['cash']:,.2f}",
        "",
        "=== Current Holdings ===",
    ]
    if portfolio["holdings"]:
        for ticker, h in portfolio["holdings"].items():
            price = prices.get(ticker, h["avg_cost"])
            pnl = (price - h["avg_cost"]) * h["shares"]
            lines.append(f"  {ticker}: {h['shares']:.0f} shares @ avg ${h['avg_cost']:.2f} | current ${price:.2f} | P&L ${pnl:+,.2f}")
    else:
        lines.append("  (no positions)")

    held = set(portfolio["holdings"].keys())
    display = list(held) + [t for t in sorted(universe) if t not in held][:50]
    lines += ["", "=== Market Data ==="]
    for ticker in display:
        price = prices.get(ticker)
        if not price:
            continue
        ratio = ratios.get(ticker, {})
        parts = [f"  {ticker}: ${price:.2f}"]
        if ratio.get("pe_ratio"):
            parts.append(f"P/E {ratio['pe_ratio']:.1f}")
        if ratio.get("pb_ratio"):
            parts.append(f"P/B {ratio['pb_ratio']:.1f}")
        lines.append(" | ".join(parts))

    lines += [
        "",
        AGGRESSION_LABELS.get(aggression, AGGRESSION_LABELS["moderate"]),
        "",
        "Based on the above, decide what trades to make.",
        "Use the submit_trades tool to return your decisions.",
    ]
    return "\n".join(lines)


def _call_claude(system: str, user: str) -> dict:
    import anthropic, json
    from backend.config import settings
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        tools=[{"name": "submit_trades", "description": "Submit trading decisions.", "input_schema": TRADE_TOOL_SCHEMA}],
        tool_choice={"type": "tool", "name": "submit_trades"},
        messages=[{"role": "user", "content": user}],
    )
    for block in resp.content:
        if block.type == "tool_use" and block.name == "submit_trades":
            return block.input
    return {"trades": [], "summary": "No decision."}


def _call_openai(model: str, system: str, user: str) -> dict:
    import json
    from openai import OpenAI
    from backend.config import settings
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=model, temperature=0,
        tools=[{"type": "function", "function": {"name": "submit_trades", "description": "Submit trading decisions.", "parameters": TRADE_TOOL_SCHEMA}}],
        tool_choice={"type": "function", "function": {"name": "submit_trades"}},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    for choice in resp.choices:
        for call in (choice.message.tool_calls or []):
            if call.function.name == "submit_trades":
                return json.loads(call.function.arguments)
    return {"trades": [], "summary": "No decision."}


def _call_gemini(system: str, user: str) -> dict:
    import json
    from openai import OpenAI
    from backend.config import settings
    client = OpenAI(
        api_key=settings.google_api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    resp = client.chat.completions.create(
        model="gemini-2.0-flash", temperature=0,
        tools=[{"type": "function", "function": {"name": "submit_trades", "description": "Submit trading decisions.", "parameters": TRADE_TOOL_SCHEMA}}],
        tool_choice={"type": "function", "function": {"name": "submit_trades"}},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    for choice in resp.choices:
        for call in (choice.message.tool_calls or []):
            if call.function.name == "submit_trades":
                return json.loads(call.function.arguments)
    return {"trades": [], "summary": "No decision."}


def run_agent(
    strategy: str,
    model: str,
    portfolio: dict,
    prices: dict[str, float],
    ratios: dict[str, dict],
    news: list,
    on_date: date,
    universe: list[str],
    aggression: str = "moderate",
) -> dict:
    system_prompt = STRATEGIES.get(strategy, STRATEGIES["value"])
    user_message = _build_context(portfolio, prices, ratios, news, on_date, universe, aggression)

    if model.startswith("gpt"):
        return _call_openai(model, system_prompt, user_message)
    elif model.startswith("gemini"):
        return _call_gemini(system_prompt, user_message)
    else:
        return _call_claude(system_prompt, user_message)
