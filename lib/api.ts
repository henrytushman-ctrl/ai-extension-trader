const AI_TRADER_API = process.env.NEXT_PUBLIC_AI_TRADER_API || "https://ai-trader-jylt.onrender.com";

export type Strategy = {
  key: string;
  label: string;
  description: string;
  model: string;
  mean_return_pct: number | null;
  trial_count: number;
  has_news: boolean;
  has_ratios: boolean;
};

export type MatrixCell = {
  key: string;
  strategy: string;
  model: string;
  has_news: boolean;
  has_ratios: boolean;
  trial_count: number;
  mean_return_pct: number | null;
};

export async function fetchStrategies(): Promise<MatrixCell[]> {
  try {
    const res = await fetch("/api/strategies");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const STRATEGY_META: Record<string, { label: string; description: string }> = {
  value: {
    label: "Value",
    description: "Buy undervalued stocks trading below intrinsic value with strong cash generation.",
  },
  momentum: {
    label: "Momentum",
    description: "Ride stocks with strong, sustained upward price trends. Rotate into top performers.",
  },
  growth: {
    label: "Growth",
    description: "Find companies with exceptional revenue and earnings growth. Hold winners long-term.",
  },
  mean_reversion: {
    label: "Mean Reversion",
    description: "Buy temporarily oversold stocks. Profit from price normalization.",
  },
  sentiment: {
    label: "Sentiment",
    description: "React to market-moving news and analyst actions. Buy positive catalysts early.",
  },
  macro: {
    label: "Macro",
    description: "Position based on broad macroeconomic signals and sector rotation.",
  },
  dividend: {
    label: "Dividend",
    description: "Build a portfolio of reliable, growing dividend payers with sustainable payouts.",
  },
};

export function getStrategyMeta(key: string) {
  return STRATEGY_META[key] ?? { label: key, description: "" };
}

export function shortModel(model: string) {
  if (model.includes("haiku")) return "Claude Haiku";
  if (model.includes("sonnet")) return "Claude Sonnet";
  if (model.startsWith("gpt-4o-mini")) return "GPT-4o-mini";
  if (model.startsWith("gemini-2")) return "Gemini Flash 2";
  return model;
}

// --- Backend API ---
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function connectWithApiKey(
  apiKey: string,
  apiSecret: string,
  env: "paper" | "live"
): Promise<{ user_id: number; session_token: string; environment: string }> {
  const res = await fetch(`${BACKEND}/auth/alpaca/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret, env }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Connection failed");
  return data;
}

function authHeaders(sessionToken: string): Record<string, string> {
  return { "X-Session-Token": sessionToken };
}

export async function getUserAccount(userId: number, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/account`, {
    headers: authHeaders(sessionToken),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getSubscriptions(userId: number, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions`, {
    headers: authHeaders(sessionToken),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createSubscription(userId: number, strategy: string, model: string, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
    body: JSON.stringify({ strategy, model }),
  });
  return res.json();
}

export async function pauseSubscription(userId: number, subId: number, active: boolean, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions/${subId}?active=${active}`, {
    method: "PATCH",
    headers: authHeaders(sessionToken),
  });
  return res.json();
}

export async function deleteSubscription(userId: number, subId: number, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions/${subId}`, {
    method: "DELETE",
    headers: authHeaders(sessionToken),
  });
  return res.ok;
}

export async function getTrades(userId: number, sessionToken: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/trades`, {
    headers: authHeaders(sessionToken),
  });
  if (!res.ok) return [];
  return res.json();
}
