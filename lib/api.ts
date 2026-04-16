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
  const res = await fetch(`${AI_TRADER_API}/analytics/matrix`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAggregate() {
  const res = await fetch(`${AI_TRADER_API}/analytics/aggregate`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
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

export async function getAlpacaAuthorizeUrl(env: "paper" | "live"): Promise<string> {
  const res = await fetch(`${BACKEND}/auth/alpaca/authorize?env=${env}`);
  const data = await res.json();
  // Store state for CSRF verification
  if (typeof window !== "undefined") sessionStorage.setItem("oauth_state", data.state);
  return data.url;
}

export async function getUserAccount(userId: number) {
  const res = await fetch(`${BACKEND}/users/${userId}/account`);
  if (!res.ok) return null;
  return res.json();
}

export async function getSubscriptions(userId: number) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions`);
  if (!res.ok) return [];
  return res.json();
}

export async function createSubscription(userId: number, strategy: string, model: string) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy, model }),
  });
  return res.json();
}

export async function pauseSubscription(userId: number, subId: number, active: boolean) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions/${subId}?active=${active}`, {
    method: "PATCH",
  });
  return res.json();
}

export async function getTrades(userId: number) {
  const res = await fetch(`${BACKEND}/users/${userId}/trades`);
  if (!res.ok) return [];
  return res.json();
}
