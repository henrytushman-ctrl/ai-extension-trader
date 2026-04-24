"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { communityGetTrials, getStrategyMeta, shortModel, type CommunityTrial } from "@/lib/api";

function fmt(val: number | null) {
  if (val == null) return <span className="text-muted-foreground text-xs">No data yet</span>;
  const color = val >= 0 ? "text-green-500" : "text-red-500";
  return (
    <span className={`font-mono font-semibold text-sm ${color} flex items-center gap-1`}>
      {val >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {val >= 0 ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
}

export default function MyTrialsPage() {
  const router = useRouter();
  const [trials, setTrials] = useState<CommunityTrial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ct_token");
    if (!token) { router.push("/login"); return; }
    communityGetTrials(token).then(t => { setTrials(t); setLoading(false); });
  }, [router]);

  return (
    <main className="flex-1">
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold">My trials</h1>
            <p className="text-sm text-muted-foreground">
              {trials.length} trial{trials.length !== 1 ? "s" : ""} running
            </p>
          </div>
          <Link href="/create">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New trial
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : trials.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No trials yet.</p>
            <Link href="/create">
              <Button size="sm">Launch your first trial →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {trials.map(trial => {
              const meta = getStrategyMeta(trial.strategy);
              return (
                <Link key={trial.id} href={`/trials/${trial.id}`}>
                  <div className="border border-border rounded-lg p-4 hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm capitalize">{meta.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">{shortModel(trial.model)}</span>
                          {trial.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{trial.stock_universe} · {trial.aggression}</p>
                        <p className="text-xs text-muted-foreground">
                          Started {new Date(trial.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {trial.last_ai_run_date && ` · Last run ${new Date(trial.last_ai_run_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {fmt(trial.return_pct)}
                        {trial.current_value != null && (
                          <p className="text-xs text-muted-foreground">
                            ${trial.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
