"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  communityGetTrial,
  communityGetTrades,
  communityDeleteTrial,
  getStrategyMeta,
  shortModel,
  type CommunityTrial,
  type CommunityTrade,
} from "@/lib/api";

export default function TrialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const trialId = Number(params.id);

  const [trial, setTrial] = useState<CommunityTrial | null>(null);
  const [trades, setTrades] = useState<CommunityTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ct_token");
    if (!token) { router.push("/login"); return; }
    Promise.all([
      communityGetTrial(token, trialId),
      communityGetTrades(token, trialId),
    ]).then(([t, tr]) => {
      setTrial(t);
      setTrades(tr);
      setLoading(false);
    });
  }, [router, trialId]);

  async function handleDelete() {
    if (!confirm("Stop and delete this trial? This cannot be undone.")) return;
    const token = localStorage.getItem("ct_token");
    if (!token) return;
    setDeleting(true);
    await communityDeleteTrial(token, trialId);
    router.push("/my-trials");
  }

  if (loading) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!trial) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">Trial not found.</p>
        <Link href="/my-trials"><Button variant="outline" size="sm" className="mt-3">← My trials</Button></Link>
      </main>
    );
  }

  const meta = getStrategyMeta(trial.strategy);
  const isPositive = (trial.return_pct ?? 0) >= 0;
  const pnl = trial.current_value != null ? trial.current_value - trial.starting_capital : null;

  return (
    <main className="flex-1">
      <div className="p-6 max-w-2xl mx-auto w-full space-y-8 pb-16">
        <Link href="/my-trials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> My trials
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold capitalize">{meta.label}</h1>
            <span className="text-sm text-muted-foreground font-mono">{shortModel(trial.model)}</span>
            {trial.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
          <p className="text-xs text-muted-foreground">
            {trial.stock_universe} universe · {trial.aggression} risk ·
            Started {new Date(trial.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Performance */}
        <div className="border border-border rounded-xl p-6 space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Portfolio performance</p>
          {trial.current_value != null && pnl != null ? (
            <div className="space-y-1">
              <p className="text-4xl font-bold font-mono">
                ${trial.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? "+" : ""}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {" "}({isPositive ? "+" : ""}{trial.return_pct?.toFixed(2)}%)
              </div>
              <p className="text-xs text-muted-foreground">Starting capital: ${trial.starting_capital.toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Returns appear after the first trade runs (Fridays at 4:30pm ET).</p>
          )}
        </div>

        {/* Trades */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Trade history</h2>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trades yet. First run is this Friday at 4:30pm ET.</p>
          ) : (
            <div className="space-y-2">
              {trades.map(trade => (
                <div key={trade.id} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{trade.ticker}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${
                          trade.action === "buy" || trade.action === "cover" ? "text-green-400"
                          : trade.action === "sell" || trade.action === "short" ? "text-red-400"
                          : ""
                        }`}
                      >
                        {trade.action}
                      </Badge>
                    </div>
                    {trade.reasoning && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 max-w-xs">
                        {trade.reasoning}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-mono">{trade.shares.toFixed(0)} @ ${trade.price.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive gap-1.5"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting…" : "Stop and delete trial"}
          </Button>
        </div>
      </div>
    </main>
  );
}
