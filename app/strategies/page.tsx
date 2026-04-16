"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStrategies, getStrategyMeta, shortModel, type MatrixCell } from "@/lib/api";

function fmt(val: number | null) {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  const color = val >= 0 ? "text-green-500" : "text-red-500";
  return (
    <span className={`font-mono font-semibold ${color} flex items-center gap-1`}>
      {val >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {val >= 0 ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
}

const MODEL_COLORS: Record<string, string> = {
  "Claude Haiku": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "GPT-4o-mini": "bg-green-500/10 text-green-400 border-green-500/20",
  "Gemini Flash 2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function StrategiesPage() {
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategies().then(d => {
      setCells(d);
      setLoading(false);
    });
  }, []);

  // Sort by mean return descending, nulls last
  const sorted = [...cells].sort(
    (a, b) => (b.mean_return_pct ?? -Infinity) - (a.mean_return_pct ?? -Infinity)
  );

  const hasData = sorted.some(c => c.mean_return_pct != null);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">AI Extension Trader</span>
        </Link>
        <Link href="/dashboard">
          <Button size="sm">Connect Alpaca</Button>
        </Link>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Strategy Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Live performance from {cells.length} strategy configurations tested since April 13, 2026.
            {!hasData && " First trade data available after April 18, 2026."}
          </p>
        </div>

        {/* Pre-experiment notice */}
        {!hasData && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-400/90">
            <p className="font-semibold">Experiment in progress — first trade runs Friday April 18, 2026</p>
            <p className="text-amber-400/70 text-xs mt-1">
              Returns shown once weekly trade data is available. Strategies and AI models are already configured and running in paper trials.
            </p>
          </div>
        )}

        {/* Strategy cards */}
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading strategies…</p>
        ) : (
          <div className="grid gap-3">
            {sorted.map((cell) => {
              const meta = getStrategyMeta(cell.strategy);
              const model = shortModel(cell.model);
              const modelColor = MODEL_COLORS[model] ?? "bg-muted text-muted-foreground";
              const isSelected = selected === cell.key;

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelected(isSelected ? null : cell.key)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm capitalize">{meta.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${modelColor}`}>
                          {model}
                        </span>
                        {cell.has_news && (
                          <Badge variant="secondary" className="text-xs">News</Badge>
                        )}
                        {cell.has_ratios && (
                          <Badge variant="secondary" className="text-xs">Ratios</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div>{fmt(cell.mean_return_pct)}</div>
                      <p className="text-xs text-muted-foreground">{cell.trial_count} trial{cell.trial_count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  {/* Expanded deploy panel */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">
                        Deploy this strategy to your Alpaca account. The same AI agent that runs in our experiment
                        will execute trades in your account every Friday at 4:30pm ET.
                      </p>
                      <Link href={`/dashboard?strategy=${cell.key}`} onClick={e => e.stopPropagation()}>
                        <Button size="sm" className="gap-1.5 shrink-0">
                          Deploy <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground pb-6">
          Past paper trading performance does not guarantee live results. Not investment advice.
          Mean return shown is the average across all trials in that strategy/model/config group.
        </p>
      </div>
    </main>
  );
}
