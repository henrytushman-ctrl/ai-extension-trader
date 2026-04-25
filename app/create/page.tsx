"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { communityCreateTrial, communityGetDataSources, communityGetModels, getStrategyMeta } from "@/lib/api";

const STRATEGIES = ["value", "momentum", "growth", "mean_reversion", "sentiment", "macro", "dividend"];
const UNIVERSES = [
  { id: "sp500", label: "S&P 500", description: "~500 large-cap US stocks" },
  { id: "tech", label: "Tech", description: "Top 20 tech stocks" },
  { id: "small_cap", label: "Small cap", description: "15 small-cap stocks" },
];
const AGGRESSION_LEVELS = [
  { id: "conservative", label: "Conservative", description: "Max 10% position, 20% cash floor, no shorts" },
  { id: "moderate", label: "Moderate", description: "Max 20% position, 5% cash floor, shorts up to 30%" },
  { id: "aggressive", label: "Aggressive", description: "Max 30% position, max 50% short exposure" },
  { id: "speculative", label: "Speculative", description: "Max 50% position, max 80% short exposure" },
];

type DataSource = { id: string; label: string; description: string; cost: string };

function modelProvider(model: string) {
  if (model.includes("claude")) return "Anthropic";
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) return "OpenAI";
  if (model.startsWith("gemini")) return "Google";
  return "Other";
}

function modelProviderKey(model: string) {
  const p = modelProvider(model);
  if (p === "Anthropic") return "Anthropic API key (console.anthropic.com)";
  if (p === "OpenAI") return "OpenAI API key (platform.openai.com)";
  if (p === "Google") return "Google AI API key (aistudio.google.com)";
  return "API key";
}

export default function CreatePage() {
  const router = useRouter();
  const [strategy, setStrategy] = useState("momentum");
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const [aiApiKey, setAiApiKey] = useState("");
  const [universe, setUniverse] = useState("sp500");
  const [aggression, setAggression] = useState("moderate");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedNews, setSelectedNews] = useState<string[]>([]);
  const [useRatios, setUseRatios] = useState(false);

  const [models, setModels] = useState<string[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    communityGetModels().then(setModels);
    communityGetDataSources().then(setDataSources);
  }, []);

  function toggleNews(id: string) {
    setSelectedNews(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiApiKey.trim()) { setError("API key is required."); return; }
    setLoading(true);
    setError("");
    try {
      const trial = await communityCreateTrial("", {
        strategy,
        model,
        ai_api_key: aiApiKey.trim(),
        stock_universe: universe,
        aggression,
        data_sources: { ratios: useRatios, news: selectedNews },
        is_public: isPublic,
      });
      router.push(`/trials/${trial.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create trial");
    } finally {
      setLoading(false);
    }
  }

  const newsDataSources = dataSources.filter(d => d.id !== "price" && d.id !== "edgar" && d.id !== "ratios");
  const providerKeyLabel = modelProviderKey(model);

  return (
    <main className="flex-1">
      <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto w-full space-y-8 pb-16">
        <div className="space-y-1">
          <Link href="/my-trials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> My trials
          </Link>
          <h1 className="text-xl font-bold pt-2">New trial</h1>
          <p className="text-sm text-muted-foreground">
            Configure your AI trading trial. It will run every Friday at 4:30pm ET using the same paper-trading engine as our main experiment.
          </p>
        </div>

        {/* Strategy */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Strategy</h2>
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

        {/* Model + API key */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">AI model</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(models.length ? models : ["claude-haiku-4-5-20251001", "gpt-4o-mini", "gemini-2.0-flash"]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  model === m ? "border-primary/60 bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                <p className="text-xs font-medium font-mono">{m}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{modelProvider(m)}</p>
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
              Encrypted and stored securely. Only used to call your chosen model each Friday.
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
                onClick={() => setUniverse(u.id)}
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

        {/* Aggression */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Risk level</h2>
          <div className="grid grid-cols-2 gap-2">
            {AGGRESSION_LEVELS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAggression(a.id)}
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
            <p className="text-xs text-muted-foreground">Price data and SEC filings (EDGAR) are always included for free.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
              <input type="checkbox" checked={useRatios} onChange={e => setUseRatios(e.target.checked)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Financial ratios</span>
                  <Badge variant="secondary" className="text-xs">Free tier</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">P/E, P/B, D/E ratios via FMP. Helps value and growth strategies.</p>
              </div>
            </label>

            {newsDataSources.map(ds => (
              <label key={ds.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedNews.includes(ds.id)}
                  onChange={() => toggleNews(ds.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ds.label}</span>
                    <Badge variant="secondary" className="text-xs">{ds.cost}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ds.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Visibility</h2>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium">Share results publicly</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your trial results contribute to the community experiment and appear in the public leaderboard.
                Your API key is never shared.
              </p>
            </div>
          </label>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || !aiApiKey.trim()}>
          {loading ? "Launching trial…" : "Launch trial"}
        </Button>

        <p className="text-xs text-muted-foreground text-center pb-6">
          Trials run in paper money only — no real funds. Each trial starts with $100,000 virtual capital.
        </p>
      </form>
    </main>
  );
}
