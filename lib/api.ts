const AI_TRADER_API = process.env.NEXT_PUBLIC_AI_TRADER_API || "https://ai-trader-jylt.onrender.com";

export type Benchmark = { label: string; ticker: string; return_pct: number };
export type BenchmarkData = { avg_ai_return: number; since_date: string; benchmarks: Benchmark[] };

export async function fetchBenchmarks(): Promise<BenchmarkData | null> {
  try {
    const res = await fetch("/api/benchmarks");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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

export type CustomSubscriptionConfig = {
  strategy: string;
  model: string;
  ai_api_key: string;
  stock_universe: "sp500" | "tech" | "small_cap";
  aggression: "conservative" | "moderate" | "aggressive" | "speculative";
  has_news: boolean;
  has_ratios: boolean;
};

export async function createCustomSubscription(
  userId: number,
  sessionToken: string,
  config: CustomSubscriptionConfig
) {
  const res = await fetch(`${BACKEND}/users/${userId}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
    body: JSON.stringify({ ...config, is_custom: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to create custom strategy");
  return data;
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

// --- Community Trial Platform ---
const AI_TRADER_BACKEND = process.env.NEXT_PUBLIC_AI_TRADER_API || "https://ai-trader-jylt.onrender.com";

function communityHeaders(token: string): Record<string, string> {
  return { "X-Community-Token": token };
}

function communityAuthHeaders(token: string): Record<string, string> {
  return { "Content-Type": "application/json", "X-Community-Token": token };
}

export type CommunityTrial = {
  id: number;
  name: string;
  strategy: string;
  model: string;
  stock_universe: string;
  aggression: string;
  data_sources: Record<string, unknown>;
  starting_capital: number;
  status: string;
  is_public: boolean;
  created_at: string;
  last_ai_run_date: string | null;
  current_value: number | null;
  return_pct: number | null;
};

export type CommunityTrade = {
  id: number;
  timestamp: string;
  ticker: string;
  action: string;
  shares: number;
  price: number;
  reasoning: string;
  portfolio_value_after: number;
};

export async function communityRegister(email: string, password: string): Promise<{ user_id: number; token: string }> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Registration failed");
  return data;
}

export async function communityLogin(email: string, password: string): Promise<{ user_id: number; token: string }> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Login failed");
  return data;
}

export async function communityGetTrials(token: string): Promise<CommunityTrial[]> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/trials`, {
    headers: communityHeaders(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function communityGetTrial(token: string, trialId: number): Promise<CommunityTrial | null> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/trials/${trialId}`, {
    headers: communityHeaders(token),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function communityGetTrades(token: string, trialId: number): Promise<CommunityTrade[]> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/trials/${trialId}/trades`, {
    headers: communityHeaders(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function communityCreateTrial(
  token: string,
  payload: {
    strategy: string;
    model: string;
    ai_api_key: string;
    stock_universe: string;
    aggression: string;
    data_sources: Record<string, unknown>;
    is_public: boolean;
    name?: string;
  }
): Promise<CommunityTrial> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/trials`, {
    method: "POST",
    headers: communityAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to create trial");
  return data;
}

export async function communityDeleteTrial(token: string, trialId: number): Promise<boolean> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/trials/${trialId}`, {
    method: "DELETE",
    headers: communityHeaders(token),
  });
  return res.ok;
}

export async function communityGetDataSources() {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/data-sources`);
  if (!res.ok) return [];
  return res.json();
}

export async function communityGetModels(): Promise<string[]> {
  const res = await fetch(`${AI_TRADER_BACKEND}/community/models`);
  if (!res.ok) return [];
  return res.json();
}
