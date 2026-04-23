"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStrategyMeta, shortModel, type MatrixCell } from "@/lib/api";

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

export default function StrategiesList({ cells }: { cells: MatrixCell[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = [...cells].sort(
    (a, b) => (b.mean_return_pct ?? -Infinity) - (a.mean_return_pct ?? -Infinity)
  );
  const hasData = sorted.some(c => c.mean_return_pct != null);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Strategy Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          {cells.length} strategy configurations running live since April 2026.
          {!hasData && " Returns appear after the first full week of trades."}
        </p>
      </div>

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
                  ? "border-primary/60 bg-primary/10"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm capitalize">{meta.label}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${modelColor}`}>
                      {model}
                    </span>
                    {cell.has_news && <Badge variant="secondary" className="text-xs">News</Badge>}
                    {cell.has_ratios && <Badge variant="secondary" className="text-xs">Ratios</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                </div>

                <div className="text-right shrink-0 space-y-1.5">
                  <div>{fmt(cell.mean_return_pct)}</div>
                  <p className="text-xs text-muted-foreground">{cell.trial_count} trial{cell.trial_count !== 1 ? "s" : ""}</p>
                  <Link
                    href={`/simulate?strategy=${cell.strategy}&model=${encodeURIComponent(cell.model)}&has_news=${cell.has_news}&has_ratios=${cell.has_ratios}&return_pct=${cell.mean_return_pct ?? ""}&trial_count=${cell.trial_count}`}
                    onClick={e => e.stopPropagation()}
                    className="block text-xs text-primary hover:underline underline-offset-2 font-medium"
                  >
                    Try it free →
                  </Link>
                </div>
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Deploy this strategy to your Alpaca account. The same AI agent that runs in our experiment
                    will execute trades in your account every Friday at 4:30pm ET.
                  </p>
                  <Link href={`/dashboard?strategy=${cell.strategy}&model=${encodeURIComponent(cell.model)}`} onClick={e => e.stopPropagation()}>
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

      <p className="text-xs text-muted-foreground pb-6">
        Past paper trading performance does not guarantee live results. Not investment advice.
        Mean return shown is the average across all trials in that strategy/model/config group.
      </p>
    </div>
  );
}
