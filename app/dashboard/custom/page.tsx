"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCustomSubscription, getStrategyMeta } from "@/lib/api";

const STRATEGIES = ["value", "momentum", "growth", "mean_reversion", "sentiment", "macro", "dividend"];

const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku", provider: "Anthropic", cost: "~$0.08/MTok" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet", provider: "Anthropic", cost: "~$3/MTok" },
  { id: "gpt-4o-mini", label: "GPT-4o-mini", provider: "OpenAI", cost: "~$0.15/MTok" },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", cost: "~$2.50/MTok" },
  { id: "gemini-2.0-flash", label: "Gemini Flash 2", provider: "Google", cost: "~$0.10/MTok" },
  { id: "gemini-2.0-flash-lite", label: "Gemini Flash 2 Lite", provider: "Google", cost: "~$0.04/MTok" },
];

const UNIVERSES = [
  { id: "sp500", label: "S&P 500", description: "~50 large-cap US stocks" },
  { id: "tech", label: "Tech", description: "Top 20 tech stocks" },
  { id: "small_cap", label: "Small cap", description: "15 small-cap stocks" },
];

const AGGRESSION_LEVELS = [
  { id: "conservative", label: "Conservative", description: "Max 10% position, no shorts, 20% cash floor" },
  { id: "moderate", label: "Moderate", description: "Max 20% position, shorts up to 30%, 5% cash floor" },
  { id: "aggressive", label: "Aggressive", description: "Max 30% position, shorts up to 50%" },
  { id: "speculative", label: "Speculative", description: "Max 50% position, shorts up to 80%" },
];

const PROVIDER_KEY_LABEL: Record<string, string> = {
  Anthropic: "Anthropic API key (console.anthropic.com)",
  OpenAI: "OpenAI API key (platform.openai.com)",
  Google: "Google AI API key (aistudio.google.com)",
};

const MODEL_PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  OpenAI: "bg-green-500/10 text-green-400 border-green-500/20",
  Google: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function CustomStrategyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [validating, setValidating] = useState(true);

  // Form state
  const [strategy, setStrategy] = useState("momentum");
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const [aiApiKey, setAiApiKey] = useState("");
  const [universe, setUniverse] = useState<"sp500" | "tech" | "small_cap">("sp500");
  const [aggression, setAggression] = useState<"conservative" | "moderate" | "aggressive" | "speculative">("moderate");
  const [hasNews, setHasNews] = useState(true);
  const [hasRatios, setHasRatios] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const uid = localStorage.getItem("aiet_user_id");
    const token = localStorage.getItem("aiet_session_token");
    if (!uid || !token) {
      router.push("/dashboard");
      return;
    }
    setUserId(Number(uid));
    setSessionToken(token);
    setValidating(false);
  }, [router]);

  const selectedModel = MODELS.find(m => m.id === model);
  const providerKeyLabel = selectedModel ? PROVIDER_KEY_LABEL[selectedModel.provider] : "API key";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !sessionToken) return;
    if (!aiApiKey.trim()) {
      setError("API key is required for custom strategies.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createCustomSubscription(userId, sessionToken, {
        strategy,
        model,
        ai_api_key: aiApiKey.trim(),
        stock_universe: universe,
        aggression,
        has_news: hasNews,
        has_ratios: hasRatios,
      });
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to deploy custom strategy");
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto w-full space-y-8 pb-16">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-xl font-bold pt-2">Build custom strategy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure every parameter — strategy template, AI model, universe, risk, data sources.
            Bring your own API key. The strategy runs against your Alpaca account every Friday at 4:30pm ET.
          </p>
        </div>

        {/* Strategy template */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Strategy template</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STRATEGIES.map(s => {
              const meta = getStrategyMeta(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrategy(s)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    strategy === s ? "border-primary/60 bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meta.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI model */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">AI model</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODELS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  model === m.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${MODEL_PROVIDER_COLORS[m.provider]}`}>
                    {m.provider}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{m.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.cost}</p>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{providerKeyLabel}</label>
            <input
              type="password"
              placeholder="sk-..."
              value={aiApiKey}
              onChange={e => setAiApiKey(e.target.value)}
              className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Encrypted at rest. Used only to call your chosen model when the strategy runs.
            </p>
          </div>
        </div>

        {/* Universe */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Stock universe</h2>
          <div className="grid grid-cols-3 gap-2">
            {UNIVERSES.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUniverse(u.id as typeof universe)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  universe === u.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                <p className="text-sm font-medium">{u.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{u.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Risk profile</h2>
          <div className="grid grid-cols-2 gap-2">
            {AGGRESSION_LEVELS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAggression(a.id as typeof aggression)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  aggression === a.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data sources */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">Data sources</h2>
            <p className="text-xs text-muted-foreground">Price data is always included. Toggle additional context the AI sees.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
              <input type="checkbox" checked={hasRatios} onChange={e => setHasRatios(e.target.checked)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Financial ratios</span>
                  <Badge variant="secondary" className="text-xs">P/E · P/B · D/E</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Useful for value, growth, and dividend strategies.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
              <input type="checkbox" checked={hasNews} onChange={e => setHasNews(e.target.checked)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">News headlines</span>
                  <Badge variant="secondary" className="text-xs">Sentiment-aware</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Recent market-moving news. Most useful for sentiment, momentum, and macro strategies.</p>
              </div>
            </label>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting || !aiApiKey.trim()}>
          {submitting ? "Deploying…" : "Deploy custom strategy"}
        </Button>

        <p className="text-xs text-muted-foreground text-center pb-6">
          Your strategy will replace any currently active subscription.
          You can pause or remove it from the dashboard at any time.
        </p>
      </form>
    </main>
  );
}
