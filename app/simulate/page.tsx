"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchBenchmarks, getStrategyMeta, shortModel, type BenchmarkData } from "@/lib/api";

const STARTING_CAPITAL = 10_000;

const MODEL_COLORS: Record<string, string> = {
  "Claude Haiku": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "GPT-4o-mini": "bg-green-500/10 text-green-400 border-green-500/20",
  "Gemini Flash 2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function SimulateContent() {
  const searchParams = useSearchParams();

  const strategy = searchParams.get("strategy") ?? "";
  const model = searchParams.get("model") ?? "";
  const hasNews = searchParams.get("has_news") === "true";
  const hasRatios = searchParams.get("has_ratios") === "true";
  const returnPct = parseFloat(searchParams.get("return_pct") ?? "NaN");
  const trialCount = parseInt(searchParams.get("trial_count") ?? "0", 10);

  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);

  useEffect(() => {
    fetchBenchmarks().then(setBenchmarks);
  }, []);

  if (!strategy || !model) {
    return (
      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-sm text-muted-foreground">Strategy not found.</p>
        <Link href="/strategies"><Button variant="outline" size="sm">← Back to strategies</Button></Link>
      </div>
    );
  }

  const meta = getStrategyMeta(strategy);
  const modelLabel = shortModel(model);
  const modelColor = MODEL_COLORS[modelLabel] ?? "bg-muted text-muted-foreground";

  const hasReturn = !isNaN(returnPct);
  const currentValue = hasReturn ? STARTING_CAPITAL * (1 + returnPct / 100) : null;
  const pnl = currentValue != null ? currentValue - STARTING_CAPITAL : null;
  const isPositive = returnPct >= 0;

  const spx = benchmarks?.benchmarks.find(b => b.ticker === "^GSPC");
  const spxReturn = spx?.return_pct ?? null;
  const sinceDate = benchmarks?.since_date
    ? new Date(benchmarks.since_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "April 13, 2026";

  const outperforming = spxReturn != null && hasReturn && returnPct > spxReturn;

  return (
    <div className="p-6 max-w-2xl mx-auto w-full space-y-8 pb-16">
      <Link href="/strategies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to strategies
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold capitalize">{meta.label}</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${modelColor}`}>
            {modelLabel}
          </span>
          {hasNews && <Badge variant="secondary" className="text-xs">News</Badge>}
          {hasRatios && <Badge variant="secondary" className="text-xs">Ratios</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>

      {/* Simulated portfolio */}
      <div className="border border-border rounded-xl p-6 space-y-5">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Simulated portfolio</p>
          <p className="text-xs text-muted-foreground">
            If you had deployed ${STARTING_CAPITAL.toLocaleString()} on {sinceDate}
          </p>
        </div>

        {currentValue != null && pnl != null ? (
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
        ) : (
          <p className="text-sm text-muted-foreground">Returns appear after the first full week of trades.</p>
        )}

        {/* vs benchmark */}
        {spxReturn != null && hasReturn && (
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">vs S&amp;P 500</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">This strategy</p>
                <p className={`text-xl font-mono font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  {isPositive ? "+" : ""}{returnPct.toFixed(2)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">S&amp;P 500</p>
                <p className={`text-xl font-mono font-semibold ${spxReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {spxReturn >= 0 ? "+" : ""}{spxReturn.toFixed(2)}%
                </p>
              </div>
            </div>
            <p className={`text-xs ${outperforming ? "text-green-400" : "text-muted-foreground"}`}>
              {outperforming
                ? `Outperforming the S&P 500 by ${(returnPct - spxReturn).toFixed(2)}pp`
                : `Underperforming the S&P 500 by ${(spxReturn - returnPct).toFixed(2)}pp`}
            </p>
          </div>
        )}
      </div>

      {/* About */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">About this simulation</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Based on {trialCount} live AI paper-trading {trialCount === 1 ? "trial" : "trials"} running
          this exact strategy since {sinceDate}. Each trial starts with $100,000 in a paper account.
          The return shown is the mean across all {trialCount} trials.
          Every Friday at 4:30pm ET, the AI reviews the S&P 500 and submits trade decisions.
        </p>
        <p className="text-xs text-muted-foreground">
          Paper trading results do not guarantee live performance. Not investment advice.
        </p>
      </div>

      {/* CTA */}
      <div className="border border-primary/30 bg-primary/5 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold">Deploy this strategy to your Alpaca account</h2>
        <p className="text-sm text-muted-foreground">
          The same AI agent runs in your real (or paper) brokerage account every Friday. Connect your Alpaca API key to get started.
        </p>
        <Link href={`/dashboard?strategy=${strategy}&model=${encodeURIComponent(model)}`}>
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
