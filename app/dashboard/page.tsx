"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, CheckCircle2, Circle, ExternalLink, PauseCircle, PlayCircle, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAlpacaAuthorizeUrl, getStrategyMeta, getUserAccount, getSubscriptions, createSubscription, pauseSubscription, shortModel } from "@/lib/api";
import { Suspense } from "react";

type BackendSub = {
  id: number;
  strategy: string;
  model: string;
  active: boolean;
  created_at: string;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<number | null>(null);
  const [alpacaEnv, setAlpacaEnv] = useState<"paper" | "live">("paper");
  const [account, setAccount] = useState<Record<string, string> | null>(null);
  const [subscription, setSubscription] = useState<BackendSub | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const strategyParam = searchParams.get("strategy");

  useEffect(() => {
    const storedUserId = localStorage.getItem("aiet_user_id");
    const storedEnv = localStorage.getItem("aiet_env") as "paper" | "live" | null;
    if (!storedUserId) return;
    const uid = Number(storedUserId);
    setUserId(uid);
    if (storedEnv) setAlpacaEnv(storedEnv);
    // Fetch account + subscriptions from backend
    getUserAccount(uid).then(acct => { if (acct) setAccount(acct); });
    getSubscriptions(uid).then((subs: BackendSub[]) => {
      const active = subs.find(s => s.active) ?? subs[0] ?? null;
      setSubscription(active);
    });
  }, []);

  async function handleConnect(env: "paper" | "live") {
    setConnecting(true);
    localStorage.setItem("aiet_pending_env", env);
    try {
      const url = await getAlpacaAuthorizeUrl(env);
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    localStorage.removeItem("aiet_user_id");
    localStorage.removeItem("aiet_env");
    setUserId(null);
    setAccount(null);
    setSubscription(null);
  }

  async function handleDeploy(strategyKey: string) {
    if (!userId) return;
    setDeploying(true);
    try {
      const sub = await createSubscription(userId, strategyKey, "claude-haiku-4-5-20251001");
      setSubscription(sub);
    } finally {
      setDeploying(false);
    }
  }

  async function handleToggle() {
    if (!subscription || !userId) return;
    const updated = await pauseSubscription(userId, subscription.id, !subscription.active);
    setSubscription(updated);
  }

  const connected = !!userId && !!account;
  const meta = subscription ? getStrategyMeta(subscription.strategy) : null;

  return (
    <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your brokerage connection and active strategy.</p>
      </div>

      {/* Step 1: Connect Alpaca */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {connected
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <Circle className="w-4 h-4 text-muted-foreground" />}
            Step 1 — Connect your Alpaca account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!connected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We use Alpaca&apos;s OAuth flow — we never see your password or hold your funds. You can revoke access anytime from Alpaca&apos;s settings.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleConnect("paper")}
                  disabled={connecting}
                  variant="outline"
                  className="flex-1"
                >
                  {connecting ? "Redirecting to Alpaca…" : "Connect Paper Account"}
                </Button>
                <Button
                  onClick={() => handleConnect("live")}
                  disabled={connecting}
                  className="flex-1"
                >
                  {connecting ? "Redirecting to Alpaca…" : "Connect Live Account"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Start with paper trading to test the strategy before using real money.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  Connected — {alpacaEnv === "paper" ? "Paper account" : "Live account"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alpaca · OAuth ·{" "}
                  {alpacaEnv === "live"
                    ? <span className="text-amber-400">Real money</span>
                    : <span>Paper money only</span>}
                </p>
                {account && (
                  <p className="text-xs text-muted-foreground">
                    Portfolio value: ${parseFloat(account.portfolio_value ?? "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {" · "}Cash: ${parseFloat(account.cash ?? "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-1.5 text-muted-foreground">
                <Unplug className="w-3 h-3" /> Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Pick or show active strategy */}
      <Card className={!connected ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {subscription
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <Circle className="w-4 h-4 text-muted-foreground" />}
            Step 2 — Active strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!subscription ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No active strategy. Browse the marketplace to pick one.
              </p>
              {strategyParam ? (
                <div className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{getStrategyMeta(strategyParam).label}</p>
                    <p className="text-xs text-muted-foreground">{getStrategyMeta(strategyParam).description}</p>
                  </div>
                  <Button size="sm" onClick={() => handleDeploy(strategyParam)} disabled={deploying}>
                    {deploying ? "Deploying…" : "Deploy"}
                  </Button>
                </div>
              ) : (
                <Link href="/strategies">
                  <Button variant="outline" size="sm">Browse strategies →</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{meta?.label}</span>
                    <Badge variant={subscription.active ? "default" : "secondary"} className="text-xs">
                      {subscription.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{meta?.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Model: {shortModel(subscription.model)} · Executes Fridays 4:30pm ET
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggle}
                  className="gap-1.5 shrink-0"
                >
                  {subscription.active
                    ? <><PauseCircle className="w-3 h-3" /> Pause</>
                    : <><PlayCircle className="w-3 h-3" /> Resume</>
                  }
                </Button>
              </div>

              <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-xs">Next execution</p>
                <p className="text-xs">Friday, April 18, 2026 · 4:30pm ET</p>
                <p className="text-xs">The AI will review your {alpacaEnv} portfolio and submit trade decisions to Alpaca.</p>
              </div>

              <div className="flex gap-2">
                <Link href="/strategies" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">Switch strategy</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setSubscription(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Trades (empty state) */}
      <Card className={!subscription ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Circle className="w-4 h-4 text-muted-foreground" />
            Step 3 — Trade history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Trade history will appear here after the first execution on April 18.
          </p>
        </CardContent>
      </Card>

      {/* Alpaca link */}
      {connected && (
        <div className="text-center">
          <a
            href={alpacaEnv === "paper" ? "https://app.alpaca.markets/paper-trading/dashboard" : "https://app.alpaca.markets/dashboard"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View positions in Alpaca <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pb-6">
        Not financial advice. AI trades based on the same strategy prompt used in the experiment.
        You retain full control — disconnect or pause at any time.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">AI Extension Trader</span>
        </Link>
        <Link href="/strategies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Strategies
        </Link>
      </nav>
      <Suspense>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
