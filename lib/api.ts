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
