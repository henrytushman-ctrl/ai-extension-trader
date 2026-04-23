"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStrategies, fetchBenchmarks, getStrategyMeta, shortModel, type MatrixCell, type BenchmarkData } from "@/lib/api";

const STARTING_CAPITAL = 10_000;

const MODEL_COLORS: Record<string, string> = {
  "Claude Haiku": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "GPT-4o-mini": "bg-green-500/10 text-green-400 border-green-500/20",
  "Gemini Flash 2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function SimulateContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [cell, setCell] = useState<MatrixCell | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStrategies(), fetchBenchmarks()])
      .then(([cells, bm]) => {
        const found = cells.find(c => c.key === key) ?? null;
        setCell(found);
        setBenchmarks(bm);
      })
      .finally(() => setLoading(false));
  }, [key]);

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto w-full">
        <p className="text-sm text-muted-foreground py-12 text-center">Loading simulation…</p>
      </div>
    );
  }

  if (!cell) {
    return (
      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-sm text-muted-foreground">Strategy not found.</p>
        <Link href="/strategies"><Button variant="outline" size="sm">← Back to strategies</Button></Link>
      </div>
    );
  }

  const meta = getStrategyMeta(cell.strategy);
  const model = shortModel(cell.model);
  const modelColor = MODEL_COLORS[model] ?? "bg-muted text-muted-foreground";

  const returnPct = cell.mean_return_pct ?? 0;
  const currentValue = STARTING_CAPITAL * (1 + returnPct / 100);
  const pnl = currentValue - STARTING_CAPITAL;
  const isPositive = returnPct >= 0;

  const spx = benchmarks?.benchmarks.find(b => b.ticker === "^GSPC");
  const spxReturn = spx?.return_pct ?? null;
  const spxValue = spxReturn != null ? STARTING_CAPITAL * (1 + spxReturn / 100) : null;
  const sinceDate = benchmarks?.since_date ?? "April 13, 2026";

  const outperforming = spxReturn != null && returnPct > spxReturn;

  return (
    <div className="p-6 max-w-2xl mx-auto w-full space-y-8 pb-16">
      {/* Back */}
      <Link href="/strategies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to strategies
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold capitalize">{meta.label}</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${modelColor}`}>
            {model}
          </span>
          {cell.has_news && <Badge variant="secondary" className="text-xs">News</Badge>}
          {cell.has_ratios && <Badge variant="secondary" className="text-xs">Ratios</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>

      {/* Simulated portfolio */}
      <div className="border border-border rounded-xl p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Simulated portfolio</p>
          <p className="text-xs text-muted-foreground">
            If you had deployed ${STARTING_CAPITAL.toLocaleString()} on {sinceDate}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-4xl font-bold font-mono">
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? "+" : ""}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {" "}({isPositive ? "+" : ""}{returnPct.toFixed(2)}%)
          </div>
          <p className="text-xs text-muted-foreground">Since {sinceDate}</p>
        </div>

        {/* vs benchmark */}
        {spxReturn != null && spxValue != null && (
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">vs S&amp;P 500</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">This strategy</p>
                <p className={`text-lg font-mono font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  {isPositive ? "+" : ""}{returnPct.toFixed(2)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">S&amp;P 500</p>
                <p className={`text-lg font-mono font-semibold ${spxReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {spxReturn >= 0 ? "+" : ""}{spxReturn.toFixed(2)}%
                </p>
              </div>
            </div>
            {cell.mean_return_pct != null && (
              <p className={`text-xs ${outperforming ? "text-green-400" : "text-muted-foreground"}`}>
                {outperforming
                  ? `Outperforming the S&P 500 by ${(returnPct - spxReturn).toFixed(2)}pp`
                  : `Underperforming the S&P 500 by ${(spxReturn - returnPct).toFixed(2)}pp`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* About */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">About this simulation</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Based on {cell.trial_count} live AI paper-trading {cell.trial_count === 1 ? "trial" : "trials"} running
          this exact strategy since {sinceDate}. Each trial starts with $100,000 in a paper account.
          The return shown is the mean across all {cell.trial_count} trials.
          Every Friday at 4:30pm ET, the AI reviews the S&P 500 and submits trade decisions.
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          Paper trading results do not guarantee live performance. Not investment advice.
        </p>
      </div>

      {/* CTA */}
      <div className="border border-primary/30 bg-primary/5 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold">Deploy this strategy to your Alpaca account</h2>
        <p className="text-sm text-muted-foreground">
          The same AI agent runs in your real (or paper) brokerage account. Connect your Alpaca API key to get started.
        </p>
        <Link href={`/dashboard?strategy=${cell.strategy}&model=${encodeURIComponent(cell.model)}`}>
          <Button className="gap-1.5">
            Deploy now <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SimulatePage() {
  return (
    <main className="flex-1">
      <Suspense>
        <SimulateContent />
      </Suspense>
    </main>
  );
}
